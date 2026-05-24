import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
});

const createGiftCardSchema = z.object({
  initialBalance: z.number().int().positive(),
  code: z.string().min(1).max(50).optional(),
  customerId: z.string().min(1).optional(),
  currencyCode: z.string().length(3).optional(),
  expiresAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

const updateGiftCardSchema = z.object({
  status: z.enum(["active", "disabled"]).optional(),
  note: z.string().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  customerId: z.string().nullable().optional(),
});

const creditDebitSchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().optional(),
  orderId: z.string().min(1).optional(),
});

export async function giftCardRoutes(app: FastifyInstance) {
  // ── List gift cards ──────────────────────────────────────────────────────
  app.get("/admin/gift-cards", { preHandler: [app.authenticate] }, async (req, reply) => {
    const filters = paginationSchema.parse(req.query);
    return reply.send(await service.listGiftCards(req.actor, filters));
  });

  // ── Get gift card by ID ──────────────────────────────────────────────────
  app.get(
    "/admin/gift-cards/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getGiftCardById(req.actor, req.params.id));
    }
  );

  // ── Create gift card ─────────────────────────────────────────────────────
  app.post("/admin/gift-cards", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = createGiftCardSchema.parse(req.body);
    return reply.status(201).send(await service.createGiftCard(req.actor, body));
  });

  // ── Update gift card ─────────────────────────────────────────────────────
  app.patch(
    "/admin/gift-cards/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateGiftCardSchema.parse(req.body);
      return reply.send(await service.updateGiftCard(req.actor, req.params.id, body));
    }
  );

  // ── Credit gift card ─────────────────────────────────────────────────────
  app.post(
    "/admin/gift-cards/:id/credit",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const { amount, note } = creditDebitSchema.parse(req.body);
      return reply.send(await service.creditGiftCard(req.actor, req.params.id, amount, note));
    }
  );

  // ── Debit gift card ──────────────────────────────────────────────────────
  app.post(
    "/admin/gift-cards/:id/debit",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const { amount, note, orderId } = creditDebitSchema.parse(req.body);
      return reply.send(
        await service.debitGiftCard(req.actor, req.params.id, amount, note, orderId)
      );
    }
  );

  // ── Storefront balance lookup ─────────────────────────────────────────────
  // Anonymous-friendly — no auth, but rate-limited to deter code enumeration.
  app.post(
    "/storefront/gift-cards/lookup",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (req: any, reply: any) => {
      const { code } = z.object({ code: z.string().min(1).max(50) }).parse(req.body);
      const card = await service.lookupGiftCardByCode(code);
      if (!card) {
        return reply.status(404).send({
          type: "about:blank",
          title: "Gift card not found",
          status: 404,
          code: "NOT_FOUND",
        });
      }
      return reply.send(card);
    }
  );
}
