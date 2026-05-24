import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AuthActor } from "@repo/types";
import { z } from "zod";
import * as service from "./service.js";
import { idempotencyGet, idempotencySet } from "../../lib/redis.js";

const addressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  province: z.string().optional(),
  provinceCode: z.string().optional(),
  country: z.string().min(1),
  countryCode: z.string().length(2),
  zip: z.string().min(1),
});

const checkoutSchema = z.object({
  cartId: z.string().min(1),
  shippingAddressId: z.string().min(1).optional(),
  shippingAddress: addressSchema.optional(),
  billingAddressId: z.string().min(1).optional(),
  billingAddress: addressSchema.optional(),
  sameAsBilling: z.boolean().default(true),
  note: z.string().optional(),
  giftCardCode: z.string().trim().min(1).max(64).optional(),
});

async function optionalAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await req.jwtVerify<AuthActor>();
    req.actor = payload;
  } catch {
    // guest
  }
}

export async function checkoutRoutes(app: FastifyInstance) {
  // Preview checkout (no side effects — returns totals + vendor groups)
  app.get(
    "/storefront/checkout/preview",
    { preHandler: [optionalAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { cartId } = z.object({ cartId: z.string().min(1) }).parse(req.query);
      const sessionId = req.headers["x-session-id"] as string | undefined;
      const preview = await service.previewCheckout(req.actor, cartId, sessionId);
      return reply.send(preview);
    }
  );

  // Place order
  app.post(
    "/storefront/checkout",
    { preHandler: [optionalAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = checkoutSchema.parse(req.body);
      const sessionId = req.headers["x-session-id"] as string | undefined;

      // Idempotency: if the client supplies the same Idempotency-Key within the
      // TTL window, return the cached response instead of creating a new order.
      const idempotencyKey = req.headers["idempotency-key"];
      const idemKey =
        typeof idempotencyKey === "string" && idempotencyKey.length >= 8 && idempotencyKey.length <= 128
          ? idempotencyKey
          : null;

      if (idemKey) {
        // Scope by cartId + actor/session so keys can't be replayed across carts.
        const scope = `checkout:${body.cartId}:${req.actor?.id ?? sessionId ?? "guest"}`;
        const cached = await idempotencyGet<Record<string, unknown>>(scope, idemKey);
        if (cached) {
          return reply.status(201).send(cached);
        }

        const order = await service.checkout(req.actor, body, sessionId);
        await idempotencySet(scope, idemKey, order);
        return reply.status(201).send(order);
      }

      // `order.created` is enqueued atomically inside placeOrder via the
      // transactional outbox — no post-tx fire-and-forget here.
      const order = await service.checkout(req.actor, body, sessionId);
      return reply.status(201).send(order);
    }
  );
}
