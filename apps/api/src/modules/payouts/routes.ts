import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const listAllPayoutsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "scheduled", "paid", "failed", "cancelled"]).optional(),
  vendorId: z.string().min(1).optional(),
});

const createPayoutSchema = z.object({
  vendorId: z.string().min(1),
  currencyCode: z.string().length(3),
  vendorOrderIds: z.array(z.string().min(1)).min(1),
  note: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(["scheduled", "paid", "failed", "cancelled"]),
});

const financialRateLimit = {
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
};

export async function payoutRoutes(app: FastifyInstance) {
  app.get(
    "/admin/payouts",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const filters = listAllPayoutsSchema.parse(req.query);
      return reply.send(await service.listAllPayouts(req.actor, filters));
    }
  );

  app.get(
    "/admin/vendors/:vendorId/payouts",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.listPayoutsForVendor(req.actor, req.params.vendorId));
    }
  );

  app.get(
    "/admin/vendors/:vendorId/payout-eligibles",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.listEligibleForPayout(req.actor, req.params.vendorId));
    }
  );

  app.post(
    "/admin/vendors/:vendorId/financials/:vendorOrderId",
    { preHandler: [app.authenticate], ...financialRateLimit },
    async (
      req: any,
      reply: any
    ) => {
      return reply
        .status(201)
        .send(await service.generateVendorOrderFinancial(req.actor, req.params.vendorOrderId));
    }
  );

  app.post(
    "/admin/payouts",
    { preHandler: [app.authenticate], ...financialRateLimit },
    async (req: FastifyRequest, reply) => {
      const body = createPayoutSchema.parse(req.body);
      return reply.status(201).send(await service.createPayout(req.actor, body));
    }
  );

  app.patch(
    "/admin/payouts/:id/status",
    { preHandler: [app.authenticate], ...financialRateLimit },
    async (req: any, reply: any) => {
      const { status } = statusSchema.parse(req.body);
      return reply.send(await service.updatePayoutStatus(req.actor, req.params.id, status));
    }
  );
}
