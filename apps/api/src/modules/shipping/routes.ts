import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const createZoneSchema = z.object({
  name: z.string().min(1).max(255),
  countries: z.array(z.string().length(2)).default([]),
  isRestOfWorld: z.boolean().optional(),
});

const updateZoneSchema = createZoneSchema.partial();

const createRateSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["flat_rate", "weight_based", "price_based", "free"]).optional(),
  price: z.number().int().min(0).optional(),
  minWeight: z.number().int().min(0).nullish(),
  maxWeight: z.number().int().min(0).nullish(),
  minOrderAmount: z.number().int().min(0).nullish(),
  maxOrderAmount: z.number().int().min(0).nullish(),
  freeAboveAmount: z.number().int().min(0).nullish(),
  estimatedDaysMin: z.number().int().min(0).nullish(),
  estimatedDaysMax: z.number().int().min(0).nullish(),
  isActive: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

const updateRateSchema = createRateSchema.partial();

const shippingQuerySchema = z.object({
  countryCode: z.string().length(2),
  weight: z.coerce.number().int().min(0).default(0),
  subtotal: z.coerce.number().int().min(0).default(0),
});

export async function shippingRoutes(app: FastifyInstance) {
  // ── Admin: List zones with rates ─────────────────────────────────────────
  app.get(
    "/admin/shipping/zones",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const result = await service.listShippingZones(req.actor);
      return reply.send(result);
    }
  );

  // ── Admin: Create zone ───────────────────────────────────────────────────
  app.post(
    "/admin/shipping/zones",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = createZoneSchema.parse(req.body);
      const result = await service.createShippingZone(req.actor, body);
      return reply.status(201).send(result);
    }
  );

  // ── Admin: Update zone ───────────────────────────────────────────────────
  app.patch(
    "/admin/shipping/zones/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = updateZoneSchema.parse(req.body);
      const result = await service.updateShippingZone(req.actor, req.params.id, body);
      return reply.send(result);
    }
  );

  // ── Admin: Delete zone (soft delete) ─────────────────────────────────────
  app.delete(
    "/admin/shipping/zones/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const result = await service.deleteShippingZone(req.actor, req.params.id);
      return reply.send(result);
    }
  );

  // ── Admin: Create rate in zone ───────────────────────────────────────────
  app.post(
    "/admin/shipping/zones/:zoneId/rates",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = createRateSchema.parse(req.body);
      const result = await service.createShippingRate(req.actor, req.params.zoneId, body);
      return reply.status(201).send(result);
    }
  );

  // ── Admin: Update rate ───────────────────────────────────────────────────
  app.patch(
    "/admin/shipping/rates/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = updateRateSchema.parse(req.body);
      const result = await service.updateShippingRate(req.actor, req.params.id, body);
      return reply.send(result);
    }
  );

  // ── Admin: Delete rate ───────────────────────────────────────────────────
  app.delete(
    "/admin/shipping/rates/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const result = await service.deleteShippingRate(req.actor, req.params.id);
      return reply.send(result);
    }
  );

  // ── Storefront: Get available rates for a country (public) ───────────────
  app.get("/storefront/shipping/rates", async (req: any, reply) => {
    const { countryCode, weight, subtotal } = shippingQuerySchema.parse(req.query);
    const rates = await service.calculateShipping(countryCode, weight, subtotal);
    return reply.send(rates);
  });
}
