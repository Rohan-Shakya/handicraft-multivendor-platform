import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  body: z.string().optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(255).optional(),
  body: z.string().optional(),
});

export const moderateReviewSchema = z.object({
  status: z.enum(["pending", "published", "rejected"]),
});

export const reviewFiltersSchema = z.object({
  productId: z.string().optional(),
  status: z.enum(["pending", "published", "rejected"]).optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const publicReviewFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
