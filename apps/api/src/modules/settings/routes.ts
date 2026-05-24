import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const updateSettingsSchema = z.record(
  z.string(),
  z.string().nullable()
);

export async function settingsRoutes(app: FastifyInstance) {
  // Admin — get all settings
  app.get(
    "/admin/settings",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const result = await service.getAll(req.actor);
      return reply.send(result);
    }
  );

  // Admin — update settings (partial update)
  app.put(
    "/admin/settings",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = updateSettingsSchema.parse(req.body);
      const result = await service.update(req.actor, body);
      return reply.send(result);
    }
  );

  // Storefront — public settings (no auth)
  app.get("/storefront/settings", async (_req, reply) => {
    const result = await service.getPublicSettings();
    return reply.send(result);
  });
}
