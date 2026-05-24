import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string().min(1).max(255),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Handle must be lowercase alphanumeric with dashes"),
  description: z.string().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
});

export const adminCreateProductSchema = z.object({
  vendorId: z.string().min(1),
  title: z.string().min(1).max(255),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Handle must be lowercase alphanumeric with dashes"),
  description: z.string().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
});

export const updateProductSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  productType: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
});

export const createOptionSchema = z.object({
  name: z.string().min(1).max(100),
  position: z.number().int().min(0).optional(),
  values: z.array(
    z.object({
      value: z.string().min(1).max(100),
      position: z.number().int().min(0).optional(),
    })
  ).min(1),
});

export const createVariantSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).optional().nullable(),
  costPerItem: z.number().min(0).optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  taxable: z.boolean().optional(),
  inventoryTracked: z.boolean().optional(),
  inventoryPolicy: z.enum(["deny", "continue"]).optional(),
  requiresShipping: z.boolean().optional(),
  weightValue: z.number().min(0).optional().nullable(),
  weightUnit: z.enum(["g", "kg", "lb", "oz"]).optional(),
  countryOfOrigin: z.string().max(2).optional().nullable(),
  harmonizedSystemCode: z.string().max(20).optional().nullable(),
  inventoryQuantity: z.number().int().min(0).optional(),
  selectedOptions: z.array(
    z.object({
      optionId: z.string(),
      optionValueId: z.string(),
    })
  ),
});

/**
 * Treat empty strings and `null` as "field cleared" so admin forms can post
 * input.value directly without per-caller massaging. `z.coerce.number()`
 * unhelpfully turns `null` into `0`, so we union-narrow on the cleared
 * cases first and only coerce when we have a real value.
 */
const nullableNumber = z
  .union([z.literal(""), z.null(), z.coerce.number().min(0)])
  .transform((v) => (v === "" || v === null ? null : v))
  .optional();

// Numeric fields use coercion so admin forms can post raw string input values
// without an extra parseFloat at every call site.
export const updateVariantSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  price: z.coerce.number().min(0).optional(),
  compareAtPrice: nullableNumber,
  costPerItem: nullableNumber,
  status: z.enum(["active", "inactive", "archived"]).optional(),
  taxable: z.boolean().optional(),
  inventoryTracked: z.boolean().optional(),
  inventoryPolicy: z.enum(["deny", "continue"]).optional(),
  requiresShipping: z.boolean().optional(),
  weightValue: nullableNumber,
  weightUnit: z.enum(["g", "kg", "lb", "oz"]).optional(),
  countryOfOrigin: z.string().max(2).optional().nullable(),
  harmonizedSystemCode: z.string().max(20).optional().nullable(),
  featuredImageId: z.string().optional().nullable(),
  /**
   * On-hand inventory for the variant's default stock location. When provided
   * we upsert the row in `inventory_items` — see `repo.updateVariant`. The
   * variant page sends this alongside the variant fields so one save call
   * updates pricing + inventory together.
   */
  availableQuantity: z.coerce.number().int().min(0).optional(),
});

/**
 * Split a comma-separated query param (`?collection=a,b,c`) into a non-empty
 * string[]. Returns `undefined` when the param is absent or all-empty so the
 * repository can skip the filter entirely.
 */
const csv = z
  .string()
  .optional()
  .transform((v) =>
    v
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined
  )
  .transform((arr) => (arr && arr.length > 0 ? arr : undefined));

const boolFlag = z
  .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
  .optional()
  .transform((v) => (v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : undefined));

export const productFiltersSchema = z.object({
  vendorId: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Storefront filter params — accepted as comma-separated lists.
  collection: csv,
  vendor: csv,
  tag: csv,
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  inStock: boolFlag,
  onSale: boolFlag,
  campaignId: z.string().optional(),
  sort: z
    .enum([
      "created_at_desc",
      "created_at_asc",
      "price_asc",
      "price_desc",
      "title_asc",
      "title_desc",
    ])
    .optional(),
});
