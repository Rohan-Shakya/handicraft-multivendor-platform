import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const createEndpointSchema = z.object({
  targetUrl: z.string().url(),
  secret: z.string().min(16),
  description: z.string().optional(),
  subscribedEvents: z.array(z.string()).optional(),
});

const updateEndpointSchema = z.object({
  targetUrl: z.string().url().optional(),
  secret: z.string().min(16).optional(),
  description: z.string().optional(),
  subscribedEvents: z.array(z.string()).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

const listEventsQuerySchema = z.object({
  eventType: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function webhookRoutes(app: FastifyInstance) {
  // ─── Endpoints CRUD ──────────────────────────────────────────────────────

  app.post(
    "/admin/webhooks/endpoints",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = createEndpointSchema.parse(req.body);
      return reply.status(201).send(await service.createEndpoint(req.actor, body));
    }
  );

  app.get(
    "/admin/webhooks/endpoints",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.listEndpoints(req.actor));
    }
  );

  app.get(
    "/admin/webhooks/endpoints/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getEndpoint(req.actor, req.params.id));
    }
  );

  app.patch(
    "/admin/webhooks/endpoints/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateEndpointSchema.parse(req.body);
      return reply.send(await service.updateEndpoint(req.actor, req.params.id, body));
    }
  );

  app.delete(
    "/admin/webhooks/endpoints/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.deleteEndpoint(req.actor, req.params.id));
    }
  );

  // ─── Events ──────────────────────────────────────────────────────────────

  app.get(
    "/admin/webhooks/events",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const filters = listEventsQuerySchema.parse(req.query);
      return reply.send(await service.listEvents(req.actor, filters));
    }
  );

  app.get(
    "/admin/webhooks/events/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getEventWithDeliveries(req.actor, req.params.id));
    }
  );

  app.post(
    "/admin/webhooks/events/:id/redeliver",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.queueRedelivery(req.actor, req.params.id));
    }
  );
}
