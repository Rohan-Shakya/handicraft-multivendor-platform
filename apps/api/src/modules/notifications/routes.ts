import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { notificationPreferences } from "../../db/schema/index.js";
import { generateId } from "../../lib/id.js";
import * as service from "./service.js";

const preferencesSchema = z.object({
  emailOrderUpdates: z.boolean().optional(),
  emailPromotions: z.boolean().optional(),
  emailNewsletter: z.boolean().optional(),
  emailSecurityAlerts: z.boolean().optional(),
  emailVendorUpdates: z.boolean().optional(),
  emailReviewReminders: z.boolean().optional(),
  inAppOrderUpdates: z.boolean().optional(),
  inAppPromotions: z.boolean().optional(),
  inAppSystemAlerts: z.boolean().optional(),
});

export async function notificationRoutes(app: FastifyInstance) {
  app.get(
    "/storefront/notifications",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      return reply.send(await service.listMyNotifications(req.actor));
    }
  );

  app.post(
    "/storefront/notifications/:id/read",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.markNotificationRead(req.actor, req.params.id));
    }
  );

  app.post(
    "/storefront/notifications/read-all",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      await service.markAllNotificationsRead(req.actor);
      return reply.status(204).send();
    }
  );

  // ── Notification preferences ─────────────────────────────────────────────

  app.get(
    "/notifications/preferences",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      const isCustomer = req.actor.type === "customer";
      const condition = isCustomer
        ? eq(notificationPreferences.customerId, req.actor.id)
        : eq(notificationPreferences.userId, req.actor.id);

      const [prefs] = await db.select().from(notificationPreferences).where(condition);

      if (!prefs) {
        // Return defaults
        return reply.send({
          emailOrderUpdates: true,
          emailPromotions: true,
          emailNewsletter: true,
          emailSecurityAlerts: true,
          emailVendorUpdates: true,
          emailReviewReminders: true,
          inAppOrderUpdates: true,
          inAppPromotions: false,
          inAppSystemAlerts: true,
        });
      }

      return reply.send({
        emailOrderUpdates: prefs.emailOrderUpdates,
        emailPromotions: prefs.emailPromotions,
        emailNewsletter: prefs.emailNewsletter,
        emailSecurityAlerts: prefs.emailSecurityAlerts,
        emailVendorUpdates: prefs.emailVendorUpdates,
        emailReviewReminders: prefs.emailReviewReminders,
        inAppOrderUpdates: prefs.inAppOrderUpdates,
        inAppPromotions: prefs.inAppPromotions,
        inAppSystemAlerts: prefs.inAppSystemAlerts,
      });
    }
  );

  app.put(
    "/notifications/preferences",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      const data = preferencesSchema.parse(req.body);
      const isCustomer = req.actor.type === "customer";
      const condition = isCustomer
        ? eq(notificationPreferences.customerId, req.actor.id)
        : eq(notificationPreferences.userId, req.actor.id);

      const [existing] = await db.select().from(notificationPreferences).where(condition);

      if (existing) {
        await db
          .update(notificationPreferences)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(notificationPreferences.id, existing.id));
      } else {
        await db.insert(notificationPreferences).values({
          id: generateId(),
          userId: isCustomer ? null : req.actor.id,
          customerId: isCustomer ? req.actor.id : null,
          ...data,
        });
      }

      return reply.send({ message: "Preferences updated" });
    }
  );
}
