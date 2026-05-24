import { z } from "zod";
import { isReservedSlug } from "@repo/config";

export const createVendorSchema = z.object({
  // Required
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes")
    .refine((s) => !isReservedSlug(s), "Slug is reserved"),
  userEmail: z.string().email(),
  userPassword: z.string().min(8),

  // Optional business info
  legalName: z.string().max(255).optional(),
  bio: z.string().max(2000).optional(),
  websiteUrl: z.string().url().optional(),
  primaryEmail: z.string().email().optional(),
  supportEmail: z.string().email().optional(),
  billingEmail: z.string().email().optional(),
  primaryPhone: z.string().max(50).optional(),
  supportPhone: z.string().max(50).optional(),
  countryCode: z.string().max(2).optional(),
  currencyCode: z.string().max(3).optional(),
  timezone: z.string().max(100).optional(),
  vatNumber: z.string().max(100).optional(),
  taxId: z.string().max(100).optional(),
  registrationNumber: z.string().max(100).optional(),
  commissionBps: z.number().int().min(0).max(10000).optional(),

  // Media
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  legalName: z.string().max(255).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  primaryEmail: z.string().email().optional().nullable(),
  supportEmail: z.string().email().optional().nullable(),
  billingEmail: z.string().email().optional().nullable(),
  primaryPhone: z.string().max(50).optional().nullable(),
  supportPhone: z.string().max(50).optional().nullable(),
  countryCode: z.string().max(2).optional().nullable(),
  currencyCode: z.string().max(3).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  vatNumber: z.string().max(100).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  registrationNumber: z.string().max(100).optional().nullable(),
  commissionBps: z.number().int().min(0).max(10000).optional(),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
});

export const updateVendorPageSchema = z.object({
  bio: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
});

export const setVendorStatusSchema = z.object({
  status: z.enum(["active", "suspended", "pending", "rejected"]),
  reason: z.string().max(1000).optional(),
});

export const vendorFiltersSchema = z.object({
  status: z.enum(["active", "suspended", "pending", "rejected"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Public-facing filters for /storefront/vendors. `status` is forced to
 * "active" by the service, so the schema doesn't accept it.
 */
export const publicVendorFiltersSchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});
