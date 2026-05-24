/**
 * Service layer for facet filters.
 *
 * Admin flow: super_admins CRUD filter definitions via `/admin/facet-filters`.
 *
 * Storefront flow: `buildStorefrontFacets()` reads the enabled set and
 * populates each filter's available options by running a small aggregation
 * query against the live catalog. The payload is shaped so the storefront can
 * render each filter with zero catalog-specific logic — it just maps over
 * `options` with the given `displayType`.
 */
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError } from "../../lib/errors.js";
import { db } from "../../db/index.js";
import {
  products,
  productTags,
  productOptions,
  productOptionValues,
  variantSelectedOptions,
  variants,
  collections,
  collectionProducts,
  vendors,
  productMetafields,
  variantMetafields,
} from "../../db/schema/index.js";
import * as repo from "./repository.js";
import type {
  CreateFacetFilterDto,
  UpdateFacetFilterDto,
  StorefrontFacet,
  StorefrontFacetOption,
} from "./types.js";

// ─── Admin CRUD ────────────────────────────────────────────────────────────

export async function adminListFacetFilters(actor: AuthActor) {
  assertPermission(actor, "facet-filter:manage:any");
  return repo.listFacetFilters({ vendorId: null });
}

export async function adminCreateFacetFilter(
  actor: AuthActor,
  data: CreateFacetFilterDto
) {
  assertPermission(actor, "facet-filter:manage:any");
  return repo.createFacetFilter({
    vendorId: null,
    data,
    userId: actor.type === "admin" ? actor.id : undefined,
  });
}

export async function adminUpdateFacetFilter(
  actor: AuthActor,
  id: string,
  data: UpdateFacetFilterDto
) {
  assertPermission(actor, "facet-filter:manage:any");
  const existing = await repo.findFacetFilterById(id);
  if (!existing) throw new NotFoundError("Filter not found");
  const updated = await repo.updateFacetFilter(
    id,
    data,
    actor.type === "admin" ? actor.id : undefined
  );
  if (!updated) throw new NotFoundError("Filter not found");
  return updated;
}

export async function adminDeleteFacetFilter(actor: AuthActor, id: string) {
  assertPermission(actor, "facet-filter:manage:any");
  const deleted = await repo.softDeleteFacetFilter(
    id,
    actor.type === "admin" ? actor.id : undefined
  );
  if (!deleted) throw new NotFoundError("Filter not found");
  return { ok: true };
}

export async function adminReorderFacetFilters(
  actor: AuthActor,
  ids: string[]
) {
  assertPermission(actor, "facet-filter:manage:any");
  // Guard against ids from a different scope.
  const rows = await repo.findByIds(ids);
  const badScope = rows.some((r) => r.vendorId !== null);
  if (badScope) throw new NotFoundError("Filter not found");
  await repo.reorderFacetFilters({
    vendorId: null,
    ids,
    userId: actor.type === "admin" ? actor.id : undefined,
  });
  return { ok: true };
}

// ─── Storefront read ───────────────────────────────────────────────────────

/**
 * Build the populated facet payload for the storefront. One small aggregation
 * query per enabled filter — the resulting N+1 is bounded by the admin's own
 * filter count (typically ≤ 10), not by the catalog size.
 */
export async function buildStorefrontFacets(): Promise<StorefrontFacet[]> {
  const definitions = await repo.listEnabledForStorefront();

  const facets: StorefrontFacet[] = [];
  for (const def of definitions) {
    const facet: StorefrontFacet = {
      key: def.key,
      label: def.label,
      sourceType: def.sourceType,
      displayType: def.displayType,
      config: def.config ?? null,
      options: [],
      range: null,
    };

    switch (def.sourceType) {
      case "variant_price":
        facet.range = await computePriceRange();
        break;
      case "variant_option":
        facet.options = await variantOptionFacet(def.sourceRef);
        break;
      case "variant_metafield":
      case "product_metafield":
        facet.options = await metafieldFacet(
          def.sourceType === "variant_metafield" ? "variant" : "product",
          def.sourceRef
        );
        break;
      case "collection":
        facet.options = await collectionFacet();
        break;
      case "tag":
        facet.options = await tagFacet();
        break;
      case "vendor":
        facet.options = await vendorFacet();
        break;
      case "rating":
        // Static 1-5 set; counts are expensive and usually unnecessary here.
        facet.options = [5, 4, 3, 2, 1].map((r) => ({
          value: String(r),
          label: `${r}★ & up`,
        }));
        break;
      case "availability":
        facet.options = [
          { value: "in_stock", label: "In stock" },
          { value: "on_sale", label: "On sale" },
        ];
        break;
    }

    // Hide empty groups (unless it's a slider/toggle/rating which always renders).
    const alwaysShow =
      def.sourceType === "variant_price" ||
      def.sourceType === "availability" ||
      def.sourceType === "rating";
    if (alwaysShow || facet.options.length > 0) facets.push(facet);
  }

  return facets;
}

// ─── Source aggregators ────────────────────────────────────────────────────

async function computePriceRange() {
  const [row] = await db
    .select({
      min: sql<string | null>`MIN(${variants.price}::numeric)`,
      max: sql<string | null>`MAX(${variants.price}::numeric)`,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(
      and(
        isNull(variants.deletedAt),
        isNull(products.deletedAt),
        eq(products.status, "active")
      )
    );
  const min = row?.min ? Math.floor(Number(row.min)) : 0;
  const max = row?.max ? Math.ceil(Number(row.max)) : 1000;
  return { min, max: Math.max(min + 1, max) };
}

async function collectionFacet(): Promise<StorefrontFacetOption[]> {
  const rows = await db
    .select({
      value: collections.handle,
      label: collections.title,
      count: sql<number>`COUNT(DISTINCT ${collectionProducts.productId})`,
    })
    .from(collections)
    .leftJoin(
      collectionProducts,
      eq(collectionProducts.collectionId, collections.id)
    )
    .leftJoin(
      products,
      and(
        eq(products.id, collectionProducts.productId),
        isNull(products.deletedAt),
        eq(products.status, "active")
      )
    )
    .where(
      and(isNull(collections.deletedAt), eq(collections.status, "active"))
    )
    .groupBy(collections.handle, collections.title, collections.id)
    .orderBy(collections.title);
  return rows
    .filter((r) => Number(r.count) > 0)
    .map((r) => ({ value: r.value, label: r.label, count: Number(r.count) }));
}

async function tagFacet(): Promise<StorefrontFacetOption[]> {
  const rows = await db
    .select({
      value: productTags.tag,
      count: sql<number>`COUNT(DISTINCT ${productTags.productId})`,
    })
    .from(productTags)
    .innerJoin(products, eq(products.id, productTags.productId))
    .where(and(isNull(products.deletedAt), eq(products.status, "active")))
    .groupBy(productTags.tag)
    .orderBy(productTags.tag);
  return rows.map((r) => ({
    value: r.value,
    label: toTitle(r.value),
    count: Number(r.count),
  }));
}

async function vendorFacet(): Promise<StorefrontFacetOption[]> {
  const rows = await db
    .select({
      value: vendors.slug,
      label: vendors.name,
      count: sql<number>`COUNT(DISTINCT ${products.id})`,
    })
    .from(vendors)
    .leftJoin(
      products,
      and(
        eq(products.vendorId, vendors.id),
        isNull(products.deletedAt),
        eq(products.status, "active")
      )
    )
    .where(eq(vendors.status, "active"))
    .groupBy(vendors.slug, vendors.name, vendors.id)
    .orderBy(vendors.name);
  return rows
    .filter((r) => Number(r.count) > 0)
    .map((r) => ({ value: r.value, label: r.label, count: Number(r.count) }));
}

async function variantOptionFacet(
  optionName: string | null
): Promise<StorefrontFacetOption[]> {
  if (!optionName) return [];
  // All option values of any active product whose option name matches.
  const rows = await db
    .select({
      value: productOptionValues.value,
      count: sql<number>`COUNT(DISTINCT ${variants.productId})`,
    })
    .from(productOptionValues)
    .innerJoin(productOptions, eq(productOptions.id, productOptionValues.optionId))
    .innerJoin(
      variantSelectedOptions,
      eq(variantSelectedOptions.optionValueId, productOptionValues.id)
    )
    .innerJoin(variants, eq(variants.id, variantSelectedOptions.variantId))
    .innerJoin(products, eq(products.id, variants.productId))
    .where(
      and(
        eq(sql`lower(${productOptions.name})`, optionName.toLowerCase()),
        isNull(variants.deletedAt),
        isNull(products.deletedAt),
        eq(products.status, "active")
      )
    )
    .groupBy(productOptionValues.value)
    .orderBy(productOptionValues.value);
  return rows.map((r) => ({
    value: r.value,
    label: r.value,
    count: Number(r.count),
  }));
}

async function metafieldFacet(
  ownerType: "product" | "variant",
  ref: string | null
): Promise<StorefrontFacetOption[]> {
  if (!ref) return [];
  const [namespace, key] = ref.split(".");
  if (!namespace || !key) return [];

  // Metafield values are stored as JSON. For filtering, we coerce to text and
  // group by the string form. Arrays / objects aren't faceted — use a scalar
  // metafield (string, int, bool) for filters.
  if (ownerType === "product") {
    const rows = await db
      .select({
        value: sql<string>`${productMetafields.valueJson}::text`,
        count: sql<number>`COUNT(DISTINCT ${productMetafields.productId})`,
      })
      .from(productMetafields)
      .innerJoin(products, eq(products.id, productMetafields.productId))
      .where(
        and(
          eq(productMetafields.namespace, namespace),
          eq(productMetafields.key, key),
          isNull(products.deletedAt),
          eq(products.status, "active")
        )
      )
      .groupBy(sql`${productMetafields.valueJson}::text`)
      .orderBy(sql`${productMetafields.valueJson}::text`);
    return rowsToOptions(rows);
  }

  const rows = await db
    .select({
      value: sql<string>`${variantMetafields.valueJson}::text`,
      count: sql<number>`COUNT(DISTINCT ${variantMetafields.variantId})`,
    })
    .from(variantMetafields)
    .innerJoin(variants, eq(variants.id, variantMetafields.variantId))
    .innerJoin(products, eq(products.id, variants.productId))
    .where(
      and(
        eq(variantMetafields.namespace, namespace),
        eq(variantMetafields.key, key),
        isNull(variants.deletedAt),
        isNull(products.deletedAt),
        eq(products.status, "active")
      )
    )
    .groupBy(sql`${variantMetafields.valueJson}::text`)
    .orderBy(sql`${variantMetafields.valueJson}::text`);
  return rowsToOptions(rows);
}

/** Strip JSON quotes from scalar strings ("Wool" → Wool) and drop empty rows. */
function rowsToOptions(
  rows: Array<{ value: string | null; count: number }>
): StorefrontFacetOption[] {
  return rows
    .map((r) => {
      let raw = (r.value ?? "").trim();
      // `"wool"` → wool; leave arrays/objects untouched so they're filtered out.
      if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
      return { raw, count: Number(r.count) };
    })
    .filter((r) => r.raw.length > 0 && !r.raw.startsWith("[") && !r.raw.startsWith("{"))
    .map((r) => ({ value: r.raw, label: toTitle(r.raw), count: r.count }));
}

function toTitle(s: string) {
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
