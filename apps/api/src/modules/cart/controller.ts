import type { FastifyRequest, FastifyReply } from "fastify";
import * as service from "./service.js";
import {
  addCartItemSchema,
  updateCartItemSchema,
  addWishlistItemSchema,
} from "./schema.js";

// ─── Cart controllers ─────────────────────────────────────────────────────────

export async function getCart(req: FastifyRequest, reply: FastifyReply) {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  const result = await service.getOrCreateCart(req.actor, sessionId);
  return reply.send(result);
}

export async function addItem(req: FastifyRequest, reply: FastifyReply) {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  const body = addCartItemSchema.parse(req.body);
  const result = await service.addItem(req.actor, body, sessionId);
  return reply.send(result);
}

export async function updateItem(
  req: any,
  reply: FastifyReply
) {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  const body = updateCartItemSchema.parse(req.body);
  const result = await service.updateItem(
    req.actor,
    req.params.itemId,
    body,
    sessionId
  );
  return reply.send(result);
}

export async function removeItem(
  req: any,
  reply: FastifyReply
) {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  const result = await service.removeItem(
    req.actor,
    req.params.itemId,
    sessionId
  );
  return reply.send(result);
}

export async function clearCart(req: FastifyRequest, reply: FastifyReply) {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  const result = await service.clearCart(req.actor, sessionId);
  return reply.send(result);
}

// ─── Wishlist controllers ─────────────────────────────────────────────────────

export async function getWishlist(req: FastifyRequest, reply: FastifyReply) {
  const result = await service.getWishlist(req.actor);
  return reply.send(result);
}

export async function addToWishlist(req: FastifyRequest, reply: FastifyReply) {
  const { productId } = addWishlistItemSchema.parse(req.body);
  const result = await service.addToWishlist(req.actor, productId);
  return reply.status(201).send(result);
}

export async function removeFromWishlist(
  req: any,
  reply: FastifyReply
) {
  const result = await service.removeFromWishlist(
    req.actor,
    req.params.productId
  );
  return reply.send(result);
}
