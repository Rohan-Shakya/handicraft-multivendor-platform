import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const createFulfillmentSchema = z.object({
  vendorOrderId: z.string().min(1),
  carrier: z.string().optional(),
  service: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  items: z
    .array(z.object({ orderItemId: z.string().min(1), quantity: z.number().int().positive() }))
    .min(1),
});

const updateTrackingSchema = z.object({
  carrier: z.string().optional(),
  service: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
});

const deliveryStatusSchema = z.object({
  status: z.enum([
    "not_shipped",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "returned",
    "failed",
  ]),
});

const markShippedSchema = z.object({
  carrier: z.string().optional(),
  service: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
});

const fulfillmentRateLimit = {
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
};

export async function fulfillmentRoutes(app: FastifyInstance) {
  // ── Vendor: Create fulfillment ──────────────────────────────────────────
  app.post(
    "/vendor/fulfillments",
    { preHandler: [app.authenticate], ...fulfillmentRateLimit },
    async (req: FastifyRequest, reply) => {
      const body = createFulfillmentSchema.parse(req.body);
      return reply.status(201).send(await service.createFulfillment(req.actor, body));
    }
  );

  // ── Vendor: Cancel fulfillment ──────────────────────────────────────────
  app.post(
    "/vendor/fulfillments/:id/cancel",
    { preHandler: [app.authenticate], ...fulfillmentRateLimit },
    async (req: any, reply: any) => {
      return reply.send(await service.cancelFulfillment(req.actor, req.params.id));
    }
  );

  // ── Vendor: List fulfillments for a vendor order ────────────────────────
  app.get(
    "/vendor/orders/:vendorOrderId/fulfillments",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.listFulfillmentsForVendorOrder(req.actor, req.params.vendorOrderId)
      );
    }
  );

  // ── Vendor: Update tracking info ────────────────────────────────────────
  app.patch(
    "/vendor/fulfillments/:id/tracking",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateTrackingSchema.parse(req.body);
      return reply.send(await service.updateFulfillmentTracking(req.actor, req.params.id, body));
    }
  );

  // ── Vendor: Update delivery status (generic) ───────────────────────────
  app.patch(
    "/vendor/orders/:vendorOrderId/delivery-status",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = deliveryStatusSchema.parse(req.body);
      return reply.send(
        await service.updateDeliveryStatus(req.actor, req.params.vendorOrderId, body.status)
      );
    }
  );

  // ── Vendor: Mark as shipped (convenience) ───────────────────────────────
  app.post(
    "/vendor/orders/:vendorOrderId/ship",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = markShippedSchema.parse(req.body ?? {});
      const tracking = Object.keys(body).length > 0 ? body : undefined;
      return reply.send(
        await service.markAsShipped(req.actor, req.params.vendorOrderId, tracking)
      );
    }
  );

  // ── Vendor: Mark as delivered (convenience) ─────────────────────────────
  app.post(
    "/vendor/orders/:vendorOrderId/deliver",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.markAsDelivered(req.actor, req.params.vendorOrderId));
    }
  );

  // ── Admin: Create fulfillment for any vendor order ─────────────────────
  app.post(
    "/admin/fulfillments",
    { preHandler: [app.authenticate], ...fulfillmentRateLimit },
    async (req: FastifyRequest, reply) => {
      const body = createFulfillmentSchema.parse(req.body);
      const result = await service.createFulfillmentAdmin(req.actor, body);
      return reply.status(201).send(result);
    }
  );

  // ── Admin: List fulfillments for a vendor order ───────────────────────
  app.get(
    "/admin/vendor-orders/:vendorOrderId/fulfillments",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.listFulfillmentsAdmin(req.actor, req.params.vendorOrderId)
      );
    }
  );

  // ── Admin: Update tracking on a fulfillment ───────────────────────────
  app.patch(
    "/admin/fulfillments/:id/tracking",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateTrackingSchema.parse(req.body);
      const result = await service.updateFulfillmentTrackingAdmin(req.actor, req.params.id, body);
      return reply.send(result);
    }
  );

  // ── Admin: Cancel a fulfillment ───────────────────────────────────────
  app.post(
    "/admin/fulfillments/:id/cancel",
    { preHandler: [app.authenticate], ...fulfillmentRateLimit },
    async (req: any, reply: any) => {
      const result = await service.cancelFulfillmentAdmin(req.actor, req.params.id);
      return reply.send(result);
    }
  );

  // ── Admin: Update delivery status ─────────────────────────────────────
  app.patch(
    "/admin/vendor-orders/:vendorOrderId/delivery-status",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const { status } = deliveryStatusSchema.parse(req.body);
      const result = await service.updateDeliveryStatusAdmin(req.actor, req.params.vendorOrderId, status);
      return reply.send(result);
    }
  );
}
