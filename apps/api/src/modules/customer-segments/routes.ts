import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).optional(),
  type: z.enum(["dynamic", "manual", "system"]).optional(),
  status: z.enum(["active", "archived"]).optional(),
  description: z.string().nullish(),
  ruleJson: z.unknown().optional(),
});

const updateSchema = createSchema.partial();

const addMemberSchema = z.object({
  customerId: z.string().min(1),
});

const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function customerSegmentRoutes(app: FastifyInstance) {
  app.post(
    "/admin/customer-segments",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = createSchema.parse(req.body);
      return reply.status(201).send(await service.createCustomerSegment(req.actor, body));
    }
  );

  app.get(
    "/admin/customer-segments",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.listCustomerSegments(req.actor));
    }
  );

  app.get(
    "/admin/customer-segments/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getCustomerSegmentById(req.actor, req.params.id));
    }
  );

  app.patch(
    "/admin/customer-segments/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateSchema.parse(req.body);
      return reply.send(
        await service.updateCustomerSegment(req.actor, req.params.id, body)
      );
    }
  );

  app.delete(
    "/admin/customer-segments/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.deleteCustomerSegment(req.actor, req.params.id));
    }
  );

  app.get(
    "/admin/customer-segments/:id/members",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const query = listMembersQuerySchema.parse(req.query);
      return reply.send(await service.listMembers(req.actor, req.params.id, query));
    }
  );

  app.post(
    "/admin/customer-segments/:id/members",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = addMemberSchema.parse(req.body);
      return reply
        .status(201)
        .send(await service.addMember(req.actor, req.params.id, body.customerId));
    }
  );

  app.delete(
    "/admin/customer-segments/:id/members/:customerId",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.removeMember(req.actor, req.params.id, req.params.customerId)
      );
    }
  );
}
