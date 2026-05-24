import { z } from "zod";

const handleRegex = /^[a-z0-9-]+$/;

// ─── Pages ────────────────────────────────────────────────────────────────────

export const createPageSchema = z.object({
  title: z.string().min(1).max(255),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(handleRegex, "Handle must be lowercase alphanumeric with dashes"),
  body: z.string().optional(),
  status: z.enum(["published", "draft"]).default("draft"),
  isVisible: z.boolean().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
  seoCanonicalUrl: z.string().max(2048).optional().nullable(),
  ogImageFileId: z.string().optional().nullable(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(handleRegex, "Handle must be lowercase alphanumeric with dashes")
    .optional(),
  body: z.string().optional().nullable(),
  status: z.enum(["published", "draft"]).optional(),
  isVisible: z.boolean().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
  seoCanonicalUrl: z.string().max(2048).optional().nullable(),
  ogImageFileId: z.string().optional().nullable(),
});

// ─── Blogs ────────────────────────────────────────────────────────────────────

export const createBlogSchema = z.object({
  title: z.string().min(1).max(255),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(handleRegex, "Handle must be lowercase alphanumeric with dashes"),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["published", "draft"]).default("draft"),
  commentStatus: z.enum(["enabled", "moderated", "disabled"]).default("enabled"),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
});

export const updateBlogSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(handleRegex, "Handle must be lowercase alphanumeric with dashes")
    .optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["published", "draft"]).optional(),
  commentStatus: z.enum(["enabled", "moderated", "disabled"]).optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
});

// ─── Blog Posts ───────────────────────────────────────────────────────────────

export const createBlogPostSchema = z.object({
  blogId: z.string().min(1),
  title: z.string().min(1).max(255),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(handleRegex, "Handle must be lowercase alphanumeric with dashes"),
  body: z.string().optional(),
  excerpt: z.string().max(500).optional().nullable(),
  featuredImageFileId: z.string().optional().nullable(),
  imageAlt: z.string().max(255).optional().nullable(),
  status: z.enum(["published", "draft"]).default("draft"),
  isVisible: z.boolean().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
  tags: z.array(z.string().min(1).max(100)).optional(),
});

export const updateBlogPostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(handleRegex, "Handle must be lowercase alphanumeric with dashes")
    .optional(),
  body: z.string().optional().nullable(),
  excerpt: z.string().max(500).optional().nullable(),
  featuredImageFileId: z.string().optional().nullable(),
  imageAlt: z.string().max(255).optional().nullable(),
  blogId: z.string().min(1).optional(),
  status: z.enum(["published", "draft"]).optional(),
  isVisible: z.boolean().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
  tags: z.array(z.string().min(1).max(100)).optional(),
});

// ─── Filters ──────────────────────────────────────────────────────────────────

export const contentFiltersSchema = z.object({
  status: z.enum(["published", "draft"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const blogPostFiltersSchema = z.object({
  blogId: z.string().optional(),
  status: z.enum(["published", "draft"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
