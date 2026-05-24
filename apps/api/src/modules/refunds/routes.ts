import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const financialRateLimit = {
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
};

const listRefundsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["pending", "processed", "failed", "cancelled"]).optional(),
});

const createRefundSchema = z.object({
  orderId: z.string().min(1),
  vendorOrderId: z.string().min(1).optional(),
  paymentId: z.string().min(1).optional(),
  reason: z
    .enum(["customer_request", "out_of_stock", "damaged", "fraud", "shipping_failure", "other"])
    .optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().positive(),
        amount: z.number().positive(),
      })
    )
    .default([]),
  shippingAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

export async function refundRoutes(app: FastifyInstance) {
  // List all refunds (admin)
  app.get(
    "/admin/refunds",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      const filters = listRefundsQuerySchema.parse(req.query);
      return reply.send(await service.listAllRefunds(req.actor, filters));
    }
  );

  app.get(
    "/admin/orders/:orderId/refunds",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.listRefundsForOrder(req.actor, req.params.orderId));
    }
  );

  app.get(
    "/admin/refunds/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getRefundById(req.actor, req.params.id));
    }
  );

  app.post(
    "/admin/refunds",
    { preHandler: [app.authenticate], ...financialRateLimit },
    app.withIdempotency("refunds.create", async (req: FastifyRequest, reply) => {
      const body = createRefundSchema.parse(req.body);
      return reply.status(201).send(await service.createRefund(req.actor, body));
    })
  );

  app.post(
    "/admin/refunds/:id/process",
    { preHandler: [app.authenticate], ...financialRateLimit },
    app.withIdempotency("refunds.process", async (req: any, reply: any) => {
      return reply.send(await service.processRefund(req.actor, req.params.id));
    })
  );
}
