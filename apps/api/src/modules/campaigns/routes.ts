import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";
import { getActiveCampaignForHero } from "../discounts/auto-discount.js";

const handleRe = /^[a-z0-9][a-z0-9-]*$/;
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const createSchema = z.object({
  handle: z.string().min(2).max(80).regex(handleRe, "Lowercase letters, digits, hyphens"),
  title: z.string().min(1).max(120),
  headline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  heroImageUrl: z.string().url().optional(),
  ctaText: z.string().max(40).optional(),
  ctaUrl: z.string().url().or(z.string().startsWith("/")).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  status: z.enum(["draft", "scheduled", "active", "ended", "archived"]).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  accentColor: hexColor.optional(),
  backgroundColor: hexColor.optional(),
  discountIds: z.array(z.string()).optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "scheduled", "active", "ended", "archived"]).optional(),
});

const eventSchema = z.object({
  campaignId: z.string(),
  type: z.enum(["impression", "click"]),
  sessionId: z.string().optional(),
  surface: z.string().max(40).optional(),
});

export async function campaignRoutes(app: FastifyInstance) {
  // ── Admin CRUD ────────────────────────────────────────────────────────────
  app.get("/admin/campaigns", { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const filters = listQuerySchema.parse(req.query);
    return reply.send(await service.listCampaigns(req.actor, filters));
  });

  app.get(
    "/admin/campaigns/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getCampaignById(req.actor, req.params.id));
    }
  );

  app.post(
    "/admin/campaigns",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = createSchema.parse(req.body);
      const created = await service.createCampaign(req.actor, body);
      return reply.status(201).send(created);
    }
  );

  app.patch(
    "/admin/campaigns/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateSchema.parse(req.body);
      return reply.send(await service.updateCampaign(req.actor, req.params.id, body));
    }
  );

  app.delete(
    "/admin/campaigns/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.archiveCampaign(req.actor, req.params.id));
    }
  );

  app.get(
    "/admin/campaigns/:id/analytics",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getCampaignAnalytics(req.actor, req.params.id));
    }
  );

  // ── Storefront (public) ───────────────────────────────────────────────────

  /** Returns the single highest-priority active campaign for the homepage hero,
   *  or null if no campaign is currently running. */
  app.get(
    "/storefront/campaigns/active",
    {
      // Storefront homepage is high-RPS — cache hit is the common case but
      // protect against bursts hitting an empty cache.
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (_req: any, reply: any) => {
      const campaign = await getActiveCampaignForHero();
      return reply.send({ campaign });
    }
  );

  /** Sale landing page — campaign + its discounts. The product list for the
   *  landing page is fetched separately via /storefront/products?campaignId=… */
  app.get(
    "/storefront/sales/:handle",
    async (req: any, reply: any) => {
      const handle = req.params.handle as string;
      const campaign = await service.getCampaignByHandlePublic(handle);
      if (!campaign) {
        return reply.status(404).send({
          type: "about:blank",
          title: "Sale not found",
          status: 404,
          code: "NOT_FOUND",
        });
      }
      return reply.send(campaign);
    }
  );

  /** Record an impression or click event from the storefront. Conversions are
   *  written server-side at order placement (not from the client). */
  app.post(
    "/storefront/campaigns/events",
    {
      // Light rate-limit to deter spam — the client is supposed to dedupe by
      // session, this is just a backstop.
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (req: any, reply: any) => {
      const body = eventSchema.parse(req.body);
      await service.recordCampaignEvent({
        campaignId: body.campaignId,
        type: body.type,
        sessionId: body.sessionId ?? null,
        customerId: req.actor?.type === "customer" ? req.actor.id : null,
        surface: body.surface ?? null,
      });
      return reply.status(204).send();
    }
  );
}
