import { z } from "zod";

export const addCartItemSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int().min(1).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const addWishlistItemSchema = z.object({
  productId: z.string(),
});

export const getCartSchema = z.object({
  sessionId: z.string().optional(),
});
