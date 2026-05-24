import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const createZoneSchema = z.object({
  name: z.string().min(1).max(255),
  countryCode: z.string().length(2),
  provinceCode: z.string().max(10).nullish(),
  behavior: z.enum(["exclusive", "inclusive"]).optional(),
  isActive: z.boolean().optional(),
});

const updateZoneSchema = createZoneSchema.partial();

const createRateSchema = z.object({
  name: z.string().min(1).max(255),
  rateBps: z.number().int().min(0).max(10000),
  isCompound: z.boolean().optional(),
  isShippingTaxed: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateRateSchema = createRateSchema.partial();

export async function taxRoutes(app: FastifyInstance) {
  // ── Admin: List zones with rates ─────────────────────────────────────────
  app.get(
    "/admin/tax/zones",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const result = await service.listTaxZones(req.actor);
      return reply.send(result);
    }
  );

  // ── Admin: Create zone ───────────────────────────────────────────────────
  app.post(
    "/admin/tax/zones",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = createZoneSchema.parse(req.body);
      const result = await service.createTaxZone(req.actor, body);
      return reply.status(201).send(result);
    }
  );

  // ── Admin: Update zone ───────────────────────────────────────────────────
  app.patch(
    "/admin/tax/zones/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = updateZoneSchema.parse(req.body);
      const result = await service.updateTaxZone(req.actor, req.params.id, body);
      return reply.send(result);
    }
  );

  // ── Admin: Delete zone (soft delete) ─────────────────────────────────────
  app.delete(
    "/admin/tax/zones/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const result = await service.deleteTaxZone(req.actor, req.params.id);
      return reply.send(result);
    }
  );

  // ── Admin: Create rate in zone ───────────────────────────────────────────
  app.post(
    "/admin/tax/zones/:zoneId/rates",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = createRateSchema.parse(req.body);
      const result = await service.createTaxRate(req.actor, req.params.zoneId, body);
      return reply.status(201).send(result);
    }
  );

  // ── Admin: Update rate ───────────────────────────────────────────────────
  app.patch(
    "/admin/tax/rates/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = updateRateSchema.parse(req.body);
      const result = await service.updateTaxRate(req.actor, req.params.id, body);
      return reply.send(result);
    }
  );

  // ── Admin: Delete rate ───────────────────────────────────────────────────
  app.delete(
    "/admin/tax/rates/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const result = await service.deleteTaxRate(req.actor, req.params.id);
      return reply.send(result);
    }
  );
}
