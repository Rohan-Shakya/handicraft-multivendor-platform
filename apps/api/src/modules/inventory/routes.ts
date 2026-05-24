import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const adjustSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, { message: "Delta must be non-zero" }),
  reason: z.enum(["manual", "correction", "restock", "import"]),
  note: z.string().optional(),
});

const updateSettingsSchema = z.object({
  tracked: z.boolean().optional(),
  reorderThreshold: z.number().int().min(0).nullable().optional(),
  allowBackorder: z.boolean().optional(),
});

export async function inventoryRoutes(app: FastifyInstance) {
  // List inventory items for vendor
  app.get(
    "/vendor/inventory",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const filters = paginationSchema.parse(req.query);
      return reply.send(await service.listInventory(req.actor, filters));
    }
  );

  // Get inventory for a specific variant
  app.get(
    "/vendor/inventory/:variantId",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      return reply.send(
        await service.getInventoryByVariant(req.actor, req.params.variantId)
      );
    }
  );

  // Manual stock adjustment
  app.post(
    "/vendor/inventory/:variantId/adjust",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = adjustSchema.parse(req.body);
      return reply.send(
        await service.adjustInventory(req.actor, req.params.variantId, body)
      );
    }
  );

  // Update inventory settings (tracked, reorderThreshold, allowBackorder)
  app.patch(
    "/vendor/inventory/:variantId",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = updateSettingsSchema.parse(req.body);
      return reply.send(
        await service.updateInventorySettings(req.actor, req.params.variantId, body)
      );
    }
  );
}
