import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  vendorId: z.string().nullable().optional(),
  scopes: z.array(z.string().min(1)).min(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function apiKeyRoutes(app: FastifyInstance) {
  // Admin + vendor — list keys scoped to caller.
  app.get(
    "/admin/api-keys",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      return reply.send(await service.listApiKeys(req.actor));
    }
  );
  app.get(
    "/vendor/api-keys",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      return reply.send(await service.listApiKeys(req.actor));
    }
  );

  // Create — plaintext key returned once in the response body.
  app.post(
    "/admin/api-keys",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      const body = createSchema.parse(req.body);
      return reply.status(201).send(await service.createApiKey(req.actor, body));
    }
  );
  app.post(
    "/vendor/api-keys",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      const body = createSchema.parse(req.body);
      return reply.status(201).send(await service.createApiKey(req.actor, body));
    }
  );

  // Revoke.
  app.post<{ Params: { id: string } }>(
    "/admin/api-keys/:id/revoke",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      return reply.send(await service.revokeApiKey(req.actor, req.params.id));
    }
  );
  app.post<{ Params: { id: string } }>(
    "/vendor/api-keys/:id/revoke",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      return reply.send(await service.revokeApiKey(req.actor, req.params.id));
    }
  );
}
