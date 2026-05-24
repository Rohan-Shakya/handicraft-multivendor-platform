import { z } from "zod";

export const createCollectionSchema = z.object({
  title: z.string().min(1).max(255),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Handle must be lowercase alphanumeric with dashes"),
  description: z.string().optional(),
  type: z.enum(["manual", "smart"]).default("manual"),
  status: z.enum(["active", "draft", "archived"]).default("draft"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  imageFileId: z.string().optional(),
  imageAlt: z.string().optional(),
  sortOrder: z.enum([
    "manual", "best_selling", "created_desc", "created_asc",
    "updated_desc", "updated_asc", "title_asc", "title_desc",
    "price_asc", "price_desc",
  ]).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoCanonicalUrl: z.string().optional(),
});

export const updateCollectionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Handle must be lowercase alphanumeric with dashes")
    .optional(),
  description: z.string().optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  imageFileId: z.string().nullable().optional(),
  imageAlt: z.string().nullable().optional(),
  sortOrder: z.enum([
    "manual", "best_selling", "created_desc", "created_asc",
    "updated_desc", "updated_asc", "title_asc", "title_desc",
    "price_asc", "price_desc",
  ]).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoCanonicalUrl: z.string().optional(),
});

export const collectionProductSchema = z.object({
  productId: z.string(),
});

export const collectionFiltersSchema = z.object({
  status: z.enum(["active", "draft", "archived"]).optional(),
  type: z.enum(["manual", "smart"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
