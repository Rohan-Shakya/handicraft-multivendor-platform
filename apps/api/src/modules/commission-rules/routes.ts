import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createSchema = z.object({
  name: z.string().min(1).max(255),
  scope: z.enum(["default", "vendor"]),
  vendorId: z.string().min(1).nullish(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  type: z.enum(["bps", "flat_fee"]),
  value: z.string(),
  currencyCode: z.string().nullish(),
  appliesToShipping: z.boolean().optional(),
  startsAt: z.string().datetime({ offset: true }).nullish(),
  endsAt: z.string().datetime({ offset: true }).nullish(),
});

const updateSchema = createSchema.partial();

export async function commissionRuleRoutes(app: FastifyInstance) {
  app.post(
    "/admin/commission-rules",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = createSchema.parse(req.body);
      return reply.status(201).send(await service.createCommissionRule(req.actor, body));
    }
  );

  app.get(
    "/admin/commission-rules",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const { page, limit } = paginationSchema.parse(req.query);
      return reply.send(await service.listCommissionRules(req.actor, { page, limit }));
    }
  );

  app.get(
    "/admin/commission-rules/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getCommissionRuleById(req.actor, req.params.id));
    }
  );

  app.patch(
    "/admin/commission-rules/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateSchema.parse(req.body);
      return reply.send(await service.updateCommissionRule(req.actor, req.params.id, body));
    }
  );

  app.delete(
    "/admin/commission-rules/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.deleteCommissionRule(req.actor, req.params.id));
    }
  );
}
