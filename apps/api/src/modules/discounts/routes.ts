import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AuthActor } from "@repo/types";
import { z } from "zod";
import * as service from "./service.js";
import * as cartRepo from "../cart/repository.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";

const createDiscountSchema = z.object({
  scope: z.enum(["platform", "vendor", "targeted_vendors"]).default("platform"),
  vendorId: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["draft", "active"]).default("draft"),
  type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
  method: z.enum(["code", "automatic"]).default("code"),
  campaignId: z.string().optional(),
  targetType: z.enum(["order", "shipping"]).default("order"),
  value: z.number().positive(),
  minimumSubtotal: z.number().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
  oncePerCustomer: z.boolean().default(false),
  firstOrderOnly: z.boolean().default(false),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  vendorTargetIds: z.array(z.string().min(1)).optional(),
  productIds: z.array(z.string().min(1)).optional(),
  collectionIds: z.array(z.string().min(1)).optional(),
});

const updateDiscountSchema = createDiscountSchema.partial();

const createCodeSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  usageLimit: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

const applyCodeSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  cartId: z.string().min(1),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  scope: z.string().optional(),
});

async function optionalAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await req.jwtVerify<AuthActor>();
    req.actor = payload;
  } catch {
    // guest
  }
}

export async function discountRoutes(app: FastifyInstance) {
  // ── Admin CRUD ────────────────────────────────────────────────────────────
  app.get("/admin/discounts", { preHandler: [app.authenticate] }, async (req, reply) => {
    const filters = paginationSchema.parse(req.query);
    return reply.send(await service.listDiscounts(req.actor, filters));
  });

  app.get(
    "/admin/discounts/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getDiscountById(req.actor, req.params.id));
    }
  );

  app.post("/admin/discounts", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = createDiscountSchema.parse(req.body);
    return reply.status(201).send(await service.createDiscount(req.actor, body));
  });

  app.patch(
    "/admin/discounts/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateDiscountSchema.parse(req.body);
      return reply.send(await service.updateDiscount(req.actor, req.params.id, body as any));
    }
  );

  app.delete(
    "/admin/discounts/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.archiveDiscount(req.actor, req.params.id));
    }
  );

  // ── Discount codes ────────────────────────────────────────────────────────
  app.get(
    "/admin/discounts/:discountId/codes",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.listDiscountCodes(req.actor, req.params.discountId)
      );
    }
  );

  app.post(
    "/admin/discounts/:discountId/codes",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = createCodeSchema.parse(req.body);
      return reply.status(201).send(
        await service.createDiscountCode(req.actor, {
          ...body,
          discountId: req.params.discountId,
        })
      );
    }
  );

  // ── Storefront: Apply discount to cart ────────────────────────────────────
  app.post(
    "/storefront/cart/apply-discount",
    { preHandler: [optionalAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { code, cartId } = applyCodeSchema.parse(req.body);
      const sessionId = req.headers["x-session-id"] as string | undefined;

      // Validate cart ownership
      const cart = await cartRepo.findCartById(cartId);
      if (!cart) throw new NotFoundError("Cart not found");

      const actor = req.actor;
      if (actor?.type === "customer") {
        if (cart.customerId !== actor.id) throw new ForbiddenError("Not your cart");
      } else {
        if (!sessionId || cart.sessionId !== sessionId) throw new ForbiddenError("Not your cart");
      }

      const customerId = actor?.type === "customer" ? actor.id : undefined;
      const result = await service.applyDiscountCode({
        code,
        cartId,
        customerId,
        cartSubtotal: parseFloat(cart.itemsSubtotalPrice),
        sessionId,
      });

      return reply.send(result);
    }
  );
}
