import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../../db/index.js";
import {
  newsletterSubscribers,
  newsletterCampaigns,
  customerSegmentMembers,
  customers,
} from "../../db/schema/index.js";
import { eq, and, isNull, desc, inArray, sql } from "drizzle-orm";
import { sendEmail } from "../../lib/email.js";
import { newsletterWelcomeEmail } from "../../lib/email-templates.js";
import { assertPermission } from "../../lib/permissions.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";

const subscribeSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
});

const createCampaignSchema = z.object({
  subject: z.string().min(1).max(200),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  segmentId: z.string().optional(),
});

const listCampaignsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function newsletterRoutes(app: FastifyInstance) {
  // POST /storefront/newsletter/subscribe
  app.post(
    "/storefront/newsletter/subscribe",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { email } = subscribeSchema.parse(req.body);

      // Check if already subscribed
      const [existing] = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, email))
        .limit(1);

      if (existing) {
        if (existing.unsubscribedAt) {
          await db
            .update(newsletterSubscribers)
            .set({ unsubscribedAt: null, subscribedAt: new Date() })
            .where(eq(newsletterSubscribers.id, existing.id));
          // Re-subscribe — send welcome again. Best-effort, never blocks the response.
          const t = newsletterWelcomeEmail({ email });
          sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text }).catch(() => {});
          return reply.status(200).send({ message: "Successfully re-subscribed" });
        }
        return reply.status(200).send({ message: "Already subscribed" });
      }

      await db.insert(newsletterSubscribers).values({
        id: crypto.randomUUID(),
        email,
      });

      // Welcome email — fire-and-forget so SMTP issues don't fail the API call.
      const t = newsletterWelcomeEmail({ email });
      sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text }).catch(() => {});

      return reply.status(201).send({ message: "Successfully subscribed" });
    }
  );

  // POST /storefront/newsletter/unsubscribe
  app.post(
    "/storefront/newsletter/unsubscribe",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { email } = subscribeSchema.parse(req.body);

      const [existing] = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, email))
        .limit(1);

      if (!existing || existing.unsubscribedAt) {
        return reply.status(200).send({ message: "Not subscribed" });
      }

      await db
        .update(newsletterSubscribers)
        .set({ unsubscribedAt: new Date() })
        .where(eq(newsletterSubscribers.id, existing.id));

      return reply.status(200).send({ message: "Successfully unsubscribed" });
    }
  );

  // ── Admin: Newsletter campaigns ───────────────────────────────────────────

  /** List previously-sent + draft campaigns. */
  app.get(
    "/admin/newsletter/campaigns",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      assertPermission(req.actor, "settings:manage");
      const { page, limit } = listCampaignsSchema.parse(req.query);
      const offset = (page - 1) * limit;
      const [rows, countRow] = await Promise.all([
        db
          .select()
          .from(newsletterCampaigns)
          .orderBy(desc(newsletterCampaigns.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(newsletterCampaigns),
      ]);
      return reply.send({
        data: rows,
        total: Number(countRow[0]?.count ?? 0),
        page,
        limit,
      });
    }
  );

  /** Estimate recipient count BEFORE sending — lets the admin double-check. */
  app.get(
    "/admin/newsletter/recipient-count",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      assertPermission(req.actor, "settings:manage");
      const segmentId = (req.query?.segmentId as string | undefined) || undefined;
      const count = await countRecipients(segmentId);
      return reply.send({ count });
    }
  );

  /** Create + immediately send a newsletter campaign. */
  app.post(
    "/admin/newsletter/campaigns",
    {
      preHandler: [app.authenticate],
      // Hard cap on sends — marketing blasts should never be triggered in
      // rapid succession.
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (req: any, reply: any) => {
      assertPermission(req.actor, "settings:manage");
      const body = createCampaignSchema.parse(req.body);

      const recipients = await resolveRecipientEmails(body.segmentId);

      const id = generateId();
      await db.insert(newsletterCampaigns).values({
        id,
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        bodyText: body.bodyText ?? null,
        segmentId: body.segmentId ?? null,
        recipientCount: recipients.length,
        sentByUserId: req.actor.id,
        sentAt: new Date(),
      });

      // Fan out the emails. We send sequentially with a small await to be
      // gentle on SMTP — for large lists this should move to a BullMQ worker
      // with rate-limited workers; for a template-sized list it's fine inline.
      let delivered = 0;
      for (const r of recipients) {
        try {
          await sendEmail({
            to: r.email,
            subject: body.subject,
            html: body.bodyHtml,
            text: body.bodyText ?? stripHtml(body.bodyHtml),
            category: "newsletter",
            recipient: r.customerId ? { customerId: r.customerId } : undefined,
          });
          delivered++;
        } catch {
          // best-effort
        }
      }

      await logAudit({
        actorUserId: auditActorId(req.actor),
        entityType: "newsletter_campaign",
        entityId: id,
        action: "newsletter.campaign_sent",
        metadata: {
          recipientCount: recipients.length,
          delivered,
          subject: body.subject,
          segmentId: body.segmentId ?? null,
        },
      });

      return reply.status(201).send({
        id,
        recipientCount: recipients.length,
        delivered,
      });
    }
  );
}

/** Count recipients without enumerating — used for the "Will send to N" hint. */
async function countRecipients(segmentId?: string): Promise<number> {
  if (segmentId) {
    const [row] = await db
      .select({ count: sql<number>`count(distinct ${customers.email})` })
      .from(customerSegmentMembers)
      .innerJoin(customers, eq(customers.id, customerSegmentMembers.customerId))
      .where(
        and(
          eq(customerSegmentMembers.segmentId, segmentId),
          isNull(customers.deletedAt),
          eq(customers.emailMarketingSubscribed, true)
        )
      );
    return Number(row?.count ?? 0);
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(newsletterSubscribers)
    .where(isNull(newsletterSubscribers.unsubscribedAt));
  return Number(row?.count ?? 0);
}

/**
 * Resolve the actual list of email addresses to send to. When a segment is
 * supplied, target the customers in that segment who've opted in to marketing.
 * Without a segment, target the public newsletter_subscribers list.
 */
async function resolveRecipientEmails(
  segmentId?: string
): Promise<Array<{ email: string; customerId?: string }>> {
  if (segmentId) {
    const rows = await db
      .select({ email: customers.email, customerId: customers.id })
      .from(customerSegmentMembers)
      .innerJoin(customers, eq(customers.id, customerSegmentMembers.customerId))
      .where(
        and(
          eq(customerSegmentMembers.segmentId, segmentId),
          isNull(customers.deletedAt),
          eq(customers.emailMarketingSubscribed, true)
        )
      );
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (seen.has(r.email)) return false;
      seen.add(r.email);
      return true;
    });
  }
  const rows = await db
    .select({ email: newsletterSubscribers.email })
    .from(newsletterSubscribers)
    .where(isNull(newsletterSubscribers.unsubscribedAt));
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)))
    .map((r) => ({ email: r.email }));
}

/** Quick + lossy HTML → text fallback for `bodyText` when admin doesn't supply one. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
