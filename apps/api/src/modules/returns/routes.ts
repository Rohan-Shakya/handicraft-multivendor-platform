import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const returnItemSchema = z.object({
  orderItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  reason: z
    .enum(["damaged", "wrong_item", "not_as_described", "no_longer_needed", "size_issue", "other"])
    .optional(),
  note: z.string().optional(),
});

const createReturnSchema = z.object({
  orderId: z.string().min(1),
  vendorOrderId: z.string().min(1).optional(),
  reason: z
    .enum(["damaged", "wrong_item", "not_as_described", "no_longer_needed", "size_issue", "other"])
    .optional(),
  note: z.string().optional(),
  items: z.array(returnItemSchema).min(1),
});

const rejectSchema = z.object({ note: z.string().optional() });

const listReturnsQuerySchema = z.object({
  orderId: z.string().min(1).optional(),
  status: z.enum(["requested", "approved", "rejected", "received", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const financialRateLimit = {
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
};

export async function returnRoutes(app: FastifyInstance) {
  // ── Customer ──────────────────────────────────────────────────────────────
  app.post(
    "/storefront/returns",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      const body = createReturnSchema.parse(req.body);
      return reply.status(201).send(await service.requestReturn(req.actor, body));
    }
  );

  app.get(
    "/storefront/returns",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      return reply.send(await service.listMyReturns(req.actor));
    }
  );

  // ── Admin ─────────────────────────────────────────────────────────────────
  app.get(
    "/admin/returns",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      const filters = listReturnsQuerySchema.parse(req.query);
      return reply.send(await service.listReturns(req.actor, filters));
    }
  );

  app.post(
    "/admin/returns/:id/approve",
    { preHandler: [app.authenticate], ...financialRateLimit },
    async (req: any, reply: any) => {
      return reply.send(await service.approveReturn(req.actor, req.params.id));
    }
  );

  app.post(
    "/admin/returns/:id/reject",
    { preHandler: [app.authenticate], ...financialRateLimit },
    async (req: any, reply: any) => {
      const body = rejectSchema.parse(req.body);
      return reply.send(await service.rejectReturn(req.actor, req.params.id, body.note));
    }
  );

  app.post(
    "/admin/returns/:id/received",
    { preHandler: [app.authenticate], ...financialRateLimit },
    async (req: any, reply: any) => {
      return reply.send(await service.markReturnReceived(req.actor, req.params.id));
    }
  );
}
