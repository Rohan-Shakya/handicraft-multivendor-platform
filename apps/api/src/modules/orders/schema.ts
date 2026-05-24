import { z } from "zod";

const orderStatusValues = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export const createOrderSchema = z.object({
  cartId: z.string(),
  shippingAddressId: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusValues),
});

export const updateOrderItemStatusSchema = z.object({
  status: z.enum(orderStatusValues),
});

export const orderFiltersSchema = z.object({
  customerId: z.string().optional(),
  status: z.enum(orderStatusValues).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const orderItemFiltersSchema = z.object({
  orderId: z.string().optional(),
  status: z.enum(orderStatusValues).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
