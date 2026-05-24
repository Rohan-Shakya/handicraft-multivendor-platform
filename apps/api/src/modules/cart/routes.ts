import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AuthActor } from "@repo/types";
import * as ctrl from "./controller.js";
import * as service from "./service.js";
import { z } from "zod";

async function optionalAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await req.jwtVerify<AuthActor>();
    req.actor = payload;
  } catch {
    // Guest — req.actor remains undefined
  }
}

const applyDiscountSchema = z.object({
  code: z.string().min(1).toUpperCase(),
});

export async function cartRoutes(app: FastifyInstance) {
  // ── Cart — optional auth (guests use X-Session-Id header) ────────────────
  app.get("/storefront/cart", { preHandler: [optionalAuth] }, ctrl.getCart);
  app.post("/storefront/cart/items", { preHandler: [optionalAuth] }, ctrl.addItem);
  app.patch("/storefront/cart/items/:itemId", { preHandler: [optionalAuth] }, ctrl.updateItem);
  app.delete("/storefront/cart/items/:itemId", { preHandler: [optionalAuth] }, ctrl.removeItem);
  app.delete("/storefront/cart", { preHandler: [optionalAuth] }, ctrl.clearCart);

  // ── Discount codes on cart ────────────────────────────────────────────────
  // Validation of the code and computation of the discount amount is handled
  // by the discounts module service; here we just route to the cart service.
  app.post(
    "/storefront/cart/discounts",
    { preHandler: [optionalAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const sessionId = req.headers["x-session-id"] as string | undefined;
      const { code } = applyDiscountSchema.parse(req.body);
      // The checkout/discounts service will validate and compute the amount.
      // For now, the caller must provide the validated discount data.
      // Real application: import from discounts service and call validateAndApply.
      // This route is intentionally left as a pass-through to the discounts module.
      return reply.status(501).send({ message: "Use /storefront/cart/apply-discount" });
    }
  );

  app.delete(
    "/storefront/cart/discounts/:code",
    { preHandler: [optionalAuth] },
    async (req: any, reply: FastifyReply) => {
      const sessionId = req.headers["x-session-id"] as string | undefined;
      const cartResult = await service.getOrCreateCart(req.actor, sessionId);
      if (!cartResult) return reply.status(404).send({ message: "Cart not found" });
      const result = await service.removeDiscountFromCart(
        req.actor,
        cartResult.id,
        req.params.code.toUpperCase(),
        sessionId
      );
      return reply.send(result);
    }
  );

  // ── Wishlist — authenticated customers only ───────────────────────────────
  app.get("/storefront/wishlist", { preHandler: [app.authenticate] }, ctrl.getWishlist);
  app.post("/storefront/wishlist", { preHandler: [app.authenticate] }, ctrl.addToWishlist);
  app.delete(
    "/storefront/wishlist/:productId",
    { preHandler: [app.authenticate] },
    ctrl.removeFromWishlist
  );
}
