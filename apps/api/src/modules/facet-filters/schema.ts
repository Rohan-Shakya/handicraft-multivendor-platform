import { z } from "zod";

/**
 * URL-safe slug. Lowercase letters, digits, hyphens only. Matches the DB
 * check constraint (`key = lower(key)`) plus query-param friendliness.
 */
const keySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "Key must be a lowercase slug");

export const sourceTypeSchema = z.enum([
  "variant_price",
  "variant_option",
  "variant_metafield",
  "product_metafield",
  "collection",
  "tag",
  "vendor",
  "rating",
  "availability",
]);

export const displayTypeSchema = z.enum([
  "checkbox",
  "radio",
  "slider",
  "swatch",
  "toggle",
]);

const baseShape = {
  key: keySchema,
  label: z.string().min(1).max(120),
  sourceType: sourceTypeSchema,
  sourceRef: z.string().max(200).nullable().optional(),
  displayType: displayTypeSchema,
  config: z.record(z.unknown()).nullable().optional(),
  position: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
} as const;

const SOURCE_TYPES_REQUIRING_REF = new Set([
  "variant_metafield",
  "product_metafield",
  "variant_option",
]);

export const createFacetFilterSchema = z
  .object(baseShape)
  .superRefine((val, ctx) => {
    if (SOURCE_TYPES_REQUIRING_REF.has(val.sourceType) && !val.sourceRef) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceRef"],
        message: "sourceRef is required for this source type",
      });
    }
  });

export const updateFacetFilterSchema = z
  .object(baseShape)
  .partial()
  .superRefine((val, ctx) => {
    // Only validate when sourceType is being explicitly changed.
    if (val.sourceType && SOURCE_TYPES_REQUIRING_REF.has(val.sourceType)) {
      // If caller explicitly cleared sourceRef, that's invalid.
      if (val.sourceRef === null || val.sourceRef === "") {
        ctx.addIssue({
          code: "custom",
          path: ["sourceRef"],
          message: "sourceRef is required for this source type",
        });
      }
    }
  });

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const listQuerySchema = z.object({
  enabled: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
    .transform((v) =>
      v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : undefined
    ),
});
