import { eq, and, or, sql, isNull, inArray, ilike, asc, desc, gte, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  products,
  productOptions,
  productOptionValues,
  productImages,
  productTags,
  variants,
  variantImages,
  variantSelectedOptions,
  inventoryItems,
  collections,
  collectionProducts,
  vendors,
  discounts,
  discountProducts,
  discountCollections,
  discountVendorTargets,
} from "../../db/schema/index.js";
import type {
  CreateProductDto,
  UpdateProductDto,
  CreateOptionDto,
  CreateVariantDto,
  UpdateVariantDto,
  ProductFilters,
} from "./types.js";

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function generateId() {
  return crypto.randomUUID();
}

/**
 * Resolve the set of product ids eligible for a campaign's discounts.
 *
 * Returns the literal string "all" when at least one active discount on the
 * campaign has no product/collection targets AND a scope that covers the whole
 * catalogue (platform). The caller treats that as "skip the filter, every
 * product qualifies".
 *
 * For vendor / targeted_vendors scope with no targets, every product under
 * those vendors qualifies — included in the returned set.
 */
async function resolveCampaignEligibleProductIds(
  campaignId: string
): Promise<Set<string> | "all"> {
  const discountRows = await db
    .select({
      id: discounts.id,
      scope: discounts.scope,
      vendorId: discounts.vendorId,
    })
    .from(discounts)
    .where(
      and(
        eq(discounts.campaignId, campaignId),
        eq(discounts.status, "active"),
        isNull(discounts.deletedAt)
      )
    );

  if (discountRows.length === 0) return new Set();

  const ids = discountRows.map((d) => d.id);
  const [productTargets, collectionTargets, vendorTargets] = await Promise.all([
    db
      .select({ discountId: discountProducts.discountId, productId: discountProducts.productId })
      .from(discountProducts)
      .where(inArray(discountProducts.discountId, ids)),
    db
      .select({
        discountId: discountCollections.discountId,
        collectionId: discountCollections.collectionId,
      })
      .from(discountCollections)
      .where(inArray(discountCollections.discountId, ids)),
    db
      .select({
        discountId: discountVendorTargets.discountId,
        vendorId: discountVendorTargets.vendorId,
      })
      .from(discountVendorTargets)
      .where(inArray(discountVendorTargets.discountId, ids)),
  ]);

  const productTargetsByDiscount = new Map<string, Set<string>>();
  for (const t of productTargets) {
    const set = productTargetsByDiscount.get(t.discountId) ?? new Set();
    set.add(t.productId);
    productTargetsByDiscount.set(t.discountId, set);
  }
  const collectionTargetsByDiscount = new Map<string, Set<string>>();
  for (const t of collectionTargets) {
    const set = collectionTargetsByDiscount.get(t.discountId) ?? new Set();
    set.add(t.collectionId);
    collectionTargetsByDiscount.set(t.discountId, set);
  }
  const vendorTargetsByDiscount = new Map<string, Set<string>>();
  for (const t of vendorTargets) {
    const set = vendorTargetsByDiscount.get(t.discountId) ?? new Set();
    set.add(t.vendorId);
    vendorTargetsByDiscount.set(t.discountId, set);
  }

  // First pass: if any discount has scope=platform AND no product/collection
  // targets, the campaign covers the entire catalogue. Short-circuit.
  for (const d of discountRows) {
    const hasProductTarget = (productTargetsByDiscount.get(d.id)?.size ?? 0) > 0;
    const hasCollectionTarget = (collectionTargetsByDiscount.get(d.id)?.size ?? 0) > 0;
    if (d.scope === "platform" && !hasProductTarget && !hasCollectionTarget) {
      return "all";
    }
  }

  // Otherwise build the explicit eligible-product set.
  const eligible = new Set<string>();

  // Explicit product targets.
  for (const set of productTargetsByDiscount.values()) {
    for (const id of set) eligible.add(id);
  }

  // Expand collection targets.
  const allCollectionIds = [
    ...new Set(collectionTargets.map((t) => t.collectionId)),
  ];
  if (allCollectionIds.length > 0) {
    const rows = await db
      .select({ productId: collectionProducts.productId })
      .from(collectionProducts)
      .where(inArray(collectionProducts.collectionId, allCollectionIds));
    for (const r of rows) eligible.add(r.productId);
  }

  // Untargeted vendor / targeted_vendors discounts: pull every active product
  // under the implied vendor set.
  const impliedVendorIds = new Set<string>();
  for (const d of discountRows) {
    const hasProductTarget = (productTargetsByDiscount.get(d.id)?.size ?? 0) > 0;
    const hasCollectionTarget = (collectionTargetsByDiscount.get(d.id)?.size ?? 0) > 0;
    if (hasProductTarget || hasCollectionTarget) continue;
    if (d.scope === "vendor" && d.vendorId) {
      impliedVendorIds.add(d.vendorId);
    } else if (d.scope === "targeted_vendors") {
      const set = vendorTargetsByDiscount.get(d.id);
      if (set) for (const v of set) impliedVendorIds.add(v);
    }
  }
  if (impliedVendorIds.size > 0) {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          inArray(products.vendorId, [...impliedVendorIds]),
          isNull(products.deletedAt),
          eq(products.status, "active")
        )
      );
    for (const r of rows) eligible.add(r.id);
  }

  return eligible;
}

export async function findProducts(vendorId: string | undefined, filters: ProductFilters) {
  const {
    page = 1,
    limit = 20,
    status,
    search,
    collection,
    vendor: vendorSlugs,
    tag,
    priceMin,
    priceMax,
    inStock,
    onSale,
    campaignId,
    sort,
  } = filters;
  const offset = (page - 1) * limit;

  // Each storefront filter becomes a subquery returning matching productIds.
  // Using subqueries (rather than JOINs) keeps pagination on `products` stable
  // — no duplicate rows when a product matches multiple tags/collections.
  const conditions: Array<ReturnType<typeof eq> | undefined> = [
    isNull(products.deletedAt),
    vendorId ? eq(products.vendorId, vendorId) : undefined,
    status ? eq(products.status, status) : undefined,
    search ? ilike(products.title, `%${escapeLike(search)}%`) : undefined,
  ];

  if (collection && collection.length > 0) {
    conditions.push(
      inArray(
        products.id,
        db
          .select({ productId: collectionProducts.productId })
          .from(collectionProducts)
          .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
          .where(inArray(collections.handle, collection))
      )
    );
  }

  if (vendorSlugs && vendorSlugs.length > 0) {
    conditions.push(
      inArray(
        products.vendorId,
        db
          .select({ id: vendors.id })
          .from(vendors)
          .where(inArray(vendors.slug, vendorSlugs))
      )
    );
  }

  if (tag && tag.length > 0) {
    conditions.push(
      inArray(
        products.id,
        db
          .select({ productId: productTags.productId })
          .from(productTags)
          .where(inArray(productTags.tag, tag))
      )
    );
  }

  if (priceMin != null || priceMax != null) {
    const priceConditions = [
      priceMin != null
        ? gte(sql`${variants.price}::numeric`, String(priceMin))
        : undefined,
      priceMax != null
        ? lte(sql`${variants.price}::numeric`, String(priceMax))
        : undefined,
      isNull(variants.deletedAt),
    ].filter(Boolean) as ReturnType<typeof eq>[];

    conditions.push(
      inArray(
        products.id,
        db
          .select({ productId: variants.productId })
          .from(variants)
          .where(and(...priceConditions))
      )
    );
  }

  if (onSale) {
    // Has at least one variant with compareAtPrice > price.
    conditions.push(
      inArray(
        products.id,
        db
          .select({ productId: variants.productId })
          .from(variants)
          .where(
            and(
              isNull(variants.deletedAt),
              sql`${variants.compareAtPrice} IS NOT NULL`,
              sql`${variants.compareAtPrice}::numeric > ${variants.price}::numeric`
            )
          )
      )
    );
  }

  if (inStock) {
    // Has at least one variant with available inventory > 0.
    conditions.push(
      inArray(
        products.id,
        db
          .select({ productId: variants.productId })
          .from(variants)
          .innerJoin(inventoryItems, eq(inventoryItems.variantId, variants.id))
          .where(
            and(isNull(variants.deletedAt), gte(inventoryItems.availableQuantity, 1))
          )
      )
    );
  }

  // Campaign eligibility filter — for the /sale/[handle] landing page. A
  // product is eligible if any active discount on the campaign targets it,
  // either directly or via a collection it belongs to, OR the campaign has at
  // least one discount with no targets in a matching scope (platform / vendor /
  // targeted_vendors).
  if (campaignId) {
    const eligibleIds = await resolveCampaignEligibleProductIds(campaignId);
    if (eligibleIds === "all") {
      // Platform-wide untargeted discount — no extra filter, all products
      // qualify (e.g. "20% off everything for 11.11").
    } else if (eligibleIds.size === 0) {
      // No matches — short-circuit to "no products".
      conditions.push(sql`false`);
    } else {
      conditions.push(inArray(products.id, [...eligibleIds]));
    }
  }

  const where =
    conditions.filter(Boolean).length > 0
      ? and(...(conditions.filter(Boolean) as ReturnType<typeof eq>[]))
      : undefined;

  // Sort clause. Default = newest first (matches admin expectation).
  const orderBy = (() => {
    switch (sort) {
      case "created_at_asc":
        return [asc(products.createdAt)];
      case "title_asc":
        return [asc(products.title)];
      case "title_desc":
        return [desc(products.title)];
      case "price_asc":
      case "price_desc":
        // Cheapest/most-expensive first. Rank by min variant price.
        return [
          sort === "price_asc"
            ? asc(sql`(SELECT MIN(${variants.price}::numeric) FROM ${variants} WHERE ${variants.productId} = ${products.id} AND ${variants.deletedAt} IS NULL)`)
            : desc(sql`(SELECT MAX(${variants.price}::numeric) FROM ${variants} WHERE ${variants.productId} = ${products.id} AND ${variants.deletedAt} IS NULL)`),
        ];
      case "created_at_desc":
      default:
        return [desc(products.createdAt)];
    }
  })();

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(products).where(where),
  ]);

  if (rows.length === 0) {
    return { data: [], total: Number(countResult[0]?.count ?? 0), page, limit };
  }

  // Enrich each product with the fields storefront + admin clients expect:
  // featuredImage, lowestPrice / compareAtPrice, currencyCode, vendor,
  // defaultVariantId. Doing this as a bulk join + in-memory attach keeps
  // list pages to 4 queries regardless of page size.
  const productIds = rows.map((p) => p.id);
  const vendorIds = [...new Set(rows.map((p) => p.vendorId))];

  const [imageRows, variantRows, vendorRows, inventoryRows] = await Promise.all([
    db
      .select({
        productId: productImages.productId,
        id: productImages.id,
        url: productImages.url,
        altText: productImages.altText,
        isFeatured: productImages.isFeatured,
        position: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds)),
    db
      .select({
        productId: variants.productId,
        id: variants.id,
        price: variants.price,
        compareAtPrice: variants.compareAtPrice,
        position: variants.position,
      })
      .from(variants)
      .where(
        and(inArray(variants.productId, productIds), isNull(variants.deletedAt))
      ),
    db
      .select({
        id: vendors.id,
        name: vendors.name,
        slug: vendors.slug,
        currencyCode: vendors.currencyCode,
      })
      .from(vendors)
      .where(inArray(vendors.id, vendorIds)),
    // Total available inventory across all variants per product (for admin).
    db
      .select({
        productId: variants.productId,
        available: sql<number>`COALESCE(SUM(${inventoryItems.availableQuantity}), 0)`,
      })
      .from(variants)
      .leftJoin(inventoryItems, eq(inventoryItems.variantId, variants.id))
      .where(inArray(variants.productId, productIds))
      .groupBy(variants.productId),
  ]);

  const imagesByProduct = new Map<string, typeof imageRows>();
  for (const img of imageRows) {
    const list = imagesByProduct.get(img.productId) ?? [];
    list.push(img);
    imagesByProduct.set(img.productId, list);
  }

  const variantsByProduct = new Map<string, typeof variantRows>();
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }

  const vendorById = new Map(vendorRows.map((v) => [v.id, v]));
  const inventoryByProduct = new Map<string, number>();
  for (const row of inventoryRows) {
    inventoryByProduct.set(row.productId, Number(row.available) || 0);
  }

  const enriched = rows.map((p) => {
    const imgs = (imagesByProduct.get(p.id) ?? []).sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (a.position ?? 0) - (b.position ?? 0);
    });
    const featured = imgs[0] ?? null;
    const secondary = imgs[1] ?? null;

    const vs = (variantsByProduct.get(p.id) ?? []).sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );
    const prices = vs
      .map((v) => parseFloat(v.price))
      .filter((n) => Number.isFinite(n));
    const compareAts = vs
      .map((v) => (v.compareAtPrice != null ? parseFloat(v.compareAtPrice) : null))
      .filter((n): n is number => n != null && Number.isFinite(n));

    const lowestPrice = prices.length ? Math.min(...prices) : null;
    const highestPrice = prices.length ? Math.max(...prices) : null;
    const compareAt = compareAts.length ? Math.max(...compareAts) : null;
    const vendor = vendorById.get(p.vendorId) ?? null;
    const totalInventory = inventoryByProduct.get(p.id) ?? 0;

    return {
      ...p,
      // Storefront shape
      featuredImage: featured
        ? { url: featured.url, altText: featured.altText }
        : null,
      secondaryImage: secondary
        ? { url: secondary.url, altText: secondary.altText }
        : null,
      lowestPrice,
      highestPrice,
      compareAtPrice: compareAt,
      currencyCode: vendor?.currencyCode ?? "USD",
      vendor: vendor ? { id: vendor.id, name: vendor.name, slug: vendor.slug } : null,
      defaultVariantId: vs[0]?.id ?? null,
      variantCount: vs.length,
      inStock: totalInventory > 0,
      // Admin-list shape aliases — the admin table expects these older names.
      featuredImageUrl: featured?.url ?? null,
      priceMin: lowestPrice != null ? Math.round(lowestPrice * 100) : null,
      priceMax: highestPrice != null ? Math.round(highestPrice * 100) : null,
      totalInventory,
    };
  });

  // Overlay campaign auto-discount sale prices in a single bulk lookup. Uses
  // a Redis-cached "active discounts" list, so this adds negligible latency
  // even at high RPS.
  const { getEffectivePrices } = await import("../discounts/auto-discount.js");
  const eligibleForSale = enriched
    .filter((p) => p.lowestPrice != null)
    .map((p) => ({
      id: p.id,
      vendorId: p.vendorId,
      basePrice: p.lowestPrice as number,
    }));
  const saleMap = await getEffectivePrices(eligibleForSale);
  const enrichedWithSale = enriched.map((p) => {
    const sale = saleMap.get(p.id);
    if (!sale) return { ...p, sale: null };
    return {
      ...p,
      sale: {
        salePrice: sale.salePrice,
        savings: sale.savings,
        percentOff: sale.percentOff,
        campaignId: sale.campaignId,
        discountTitle: sale.discountTitle,
      },
    };
  });

  return {
    data: enrichedWithSale,
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  };
}

/**
 * Min/max variant price across all active, non-deleted products. Used to seed
 * the storefront price-range slider so the filter always matches the actual
 * catalog — a fresh rug seed will surface ~$70 → ~$5000, a fashion demo might
 * return ~$10 → ~$300.
 */
export async function getPublicPriceRange(): Promise<{ min: number; max: number }> {
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

export async function findProductById(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  return product ?? null;
}

export async function findProductByHandle(handle: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.handle, handle), eq(products.status, "active"), isNull(products.deletedAt)));
  return product ?? null;
}

/** Check handle uniqueness scoped to a vendor — handles are unique per-vendor, not globally. */
export async function findProductByHandleForVendor(handle: string, vendorId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.handle, handle), eq(products.vendorId, vendorId), isNull(products.deletedAt)));
  return product ?? null;
}

export async function createProduct(vendorId: string, data: CreateProductDto) {
  const [product] = await db
    .insert(products)
    .values({ id: generateId(), vendorId, ...data })
    .returning();
  return product!;
}

export async function updateProduct(id: string, data: UpdateProductDto) {
  const [product] = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return product ?? null;
}

async function aggregateProductDetails(product: typeof products.$inferSelect) {
  const [variantRows, options, images, tags, productCollections, vendorRow] = await Promise.all([
    db
      .select()
      .from(variants)
      .where(and(eq(variants.productId, product.id), isNull(variants.deletedAt))),
    findOptionsByProduct(product.id),
    findImagesByProduct(product.id),
    db.select().from(productTags).where(eq(productTags.productId, product.id)),
    db
      .select({
        id: collections.id,
        title: collections.title,
        handle: collections.handle,
      })
      .from(collectionProducts)
      .innerJoin(collections, eq(collectionProducts.collectionId, collections.id))
      .where(eq(collectionProducts.productId, product.id)),
    db
      .select({ id: vendors.id, name: vendors.name, slug: vendors.slug, currencyCode: vendors.currencyCode })
      .from(vendors)
      .where(eq(vendors.id, product.vendorId))
      .limit(1),
  ]);

  const variantIds = variantRows.map((v) => v.id);

  const [allSelectedOptions, allInventoryItems] = variantIds.length > 0
    ? await Promise.all([
        db
          .select()
          .from(variantSelectedOptions)
          .where(inArray(variantSelectedOptions.variantId, variantIds)),
        db
          .select()
          .from(inventoryItems)
          .where(inArray(inventoryItems.variantId, variantIds)),
      ])
    : [[], []];

  const selectedOptionsByVariant = new Map<string, typeof allSelectedOptions>();
  for (const so of allSelectedOptions) {
    const existing = selectedOptionsByVariant.get(so.variantId) ?? [];
    existing.push(so);
    selectedOptionsByVariant.set(so.variantId, existing);
  }

  const inventoryByVariant = new Map<string, (typeof allInventoryItems)[0]>();
  for (const item of allInventoryItems) {
    inventoryByVariant.set(item.variantId, item);
  }

  const variantsWithOptions = variantRows.map((v) => ({
    ...v,
    selectedOptions: selectedOptionsByVariant.get(v.id) ?? [],
    inventoryItem: inventoryByVariant.get(v.id) ?? null,
  }));

  // Sale price for the PDP — picks the best active automatic discount that
  // targets this product (taking the lowest variant price as the base, which
  // is what the storefront uses as the headline price).
  const prices = variantRows
    .map((v) => parseFloat(v.price))
    .filter((n) => Number.isFinite(n));
  const lowestPrice = prices.length ? Math.min(...prices) : null;
  let sale: ReturnType<Map<string, never>["get"]> | null = null;
  if (lowestPrice != null) {
    const { getEffectivePrices } = await import("../discounts/auto-discount.js");
    const m = await getEffectivePrices([
      { id: product.id, vendorId: product.vendorId, basePrice: lowestPrice },
    ]);
    const info = m.get(product.id);
    if (info) {
      sale = {
        salePrice: info.salePrice,
        savings: info.savings,
        percentOff: info.percentOff,
        campaignId: info.campaignId,
        discountTitle: info.discountTitle,
      } as never;
    }
  }

  const vendor = vendorRow[0] ?? null;

  return {
    ...product,
    variants: variantsWithOptions,
    options,
    images,
    tags: tags.map((t) => t.tag),
    collections: productCollections,
    vendor: vendor ? { id: vendor.id, name: vendor.name, slug: vendor.slug } : null,
    currencyCode: vendor?.currencyCode ?? "USD",
    sale,
  };
}

export async function findProductByHandleWithDetails(handle: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.handle, handle),
        eq(products.status, "active"),
        isNull(products.deletedAt)
      )
    );
  if (!product) return null;
  return aggregateProductDetails(product);
}

export async function findProductByIdWithDetails(id: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt)));
  if (!product) return null;
  return aggregateProductDetails(product);
}

export async function findCollectionsByProduct(productId: string) {
  return db
    .select({
      id: collections.id,
      title: collections.title,
      handle: collections.handle,
    })
    .from(collectionProducts)
    .innerJoin(collections, eq(collectionProducts.collectionId, collections.id))
    .where(eq(collectionProducts.productId, productId));
}

export async function findTagsByProduct(productId: string) {
  const rows = await db
    .select()
    .from(productTags)
    .where(eq(productTags.productId, productId));
  return rows.map((r) => r.tag);
}

export async function addTags(productId: string, tags: string[]) {
  if (tags.length === 0) return [];
  const rows = await db
    .insert(productTags)
    .values(tags.map((tag) => ({ productId, tag })))
    .onConflictDoNothing()
    .returning();
  return rows;
}

export async function removeTag(productId: string, tag: string) {
  const [deleted] = await db
    .delete(productTags)
    .where(and(eq(productTags.productId, productId), eq(productTags.tag, tag)))
    .returning();
  return deleted ?? null;
}

export async function findOptionsByProduct(productId: string) {
  const options = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, productId));

  if (options.length === 0) return [];

  const optionIds = options.map((o) => o.id);
  const allValues = await db
    .select()
    .from(productOptionValues)
    .where(inArray(productOptionValues.optionId, optionIds));

  const valuesByOption = new Map<string, typeof allValues>();
  for (const v of allValues) {
    const existing = valuesByOption.get(v.optionId) ?? [];
    existing.push(v);
    valuesByOption.set(v.optionId, existing);
  }

  return options.map((opt) => ({
    ...opt,
    values: valuesByOption.get(opt.id) ?? [],
  }));
}

export async function createOption(productId: string, data: CreateOptionDto) {
  const optionId = generateId();
  const [option] = await db
    .insert(productOptions)
    .values({ id: optionId, productId, name: data.name, position: data.position ?? 0 })
    .returning();

  const values = await db
    .insert(productOptionValues)
    .values(
      data.values.map((v, i) => ({
        id: generateId(),
        optionId: optionId,
        value: v.value,
        position: v.position ?? i,
      }))
    )
    .returning();

  return { ...option!, values };
}

export async function findVariantsByProduct(productId: string) {
  const variantRows = await db
    .select()
    .from(variants)
    .where(and(eq(variants.productId, productId), isNull(variants.deletedAt)));

  if (variantRows.length === 0) return [];

  const variantIds = variantRows.map((v) => v.id);
  const allSelectedOptions = await db
    .select()
    .from(variantSelectedOptions)
    .where(inArray(variantSelectedOptions.variantId, variantIds));

  const optionsByVariant = new Map<string, typeof allSelectedOptions>();
  for (const so of allSelectedOptions) {
    const existing = optionsByVariant.get(so.variantId) ?? [];
    existing.push(so);
    optionsByVariant.set(so.variantId, existing);
  }

  return variantRows.map((v) => ({
    ...v,
    selectedOptions: optionsByVariant.get(v.id) ?? [],
  }));
}

export async function countVariantsByProduct(productId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(variants)
    .where(and(eq(variants.productId, productId), isNull(variants.deletedAt)));
  return Number(result?.count ?? 0);
}

export async function findVariantById(id: string) {
  const [variant] = await db.select().from(variants).where(eq(variants.id, id));
  return variant ?? null;
}

export async function findVariantSelectedOptions(variantId: string) {
  return db.select().from(variantSelectedOptions).where(eq(variantSelectedOptions.variantId, variantId));
}

export async function findInventoryItemByVariant(variantId: string) {
  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.variantId, variantId));
  return item ?? null;
}

export async function createVariant(productId: string, data: CreateVariantDto, vendorId?: string) {
  const variantId = generateId();
  // Look up vendor from product if not provided
  let resolvedVendorId = vendorId;
  if (!resolvedVendorId) {
    const product = await findProductById(productId);
    if (!product) {
      throw Object.assign(new Error("Product not found"), { statusCode: 404 });
    }
    resolvedVendorId = product.vendorId;
  }
  const [variant] = await db
    .insert(variants)
    .values({
      id: variantId,
      productId,
      vendorId: resolvedVendorId,
      title: data.title ?? null,
      sku: data.sku ?? null,
      barcode: data.barcode ?? null,
      price: String(data.price),
      compareAtPrice: data.compareAtPrice != null ? String(data.compareAtPrice) : null,
      costPerItem: data.costPerItem != null ? String(data.costPerItem) : null,
      status: data.status ?? "active",
      taxable: data.taxable,
      inventoryTracked: data.inventoryTracked,
      inventoryPolicy: data.inventoryPolicy,
      requiresShipping: data.requiresShipping,
      weightValue: data.weightValue != null ? String(data.weightValue) : null,
      weightUnit: data.weightUnit,
      countryOfOrigin: data.countryOfOrigin ?? null,
      harmonizedSystemCode: data.harmonizedSystemCode ?? null,
    })
    .returning();

  if (data.selectedOptions.length > 0) {
    await db.insert(variantSelectedOptions).values(
      data.selectedOptions.map((o) => ({
        variantId,
        optionId: o.optionId,
        optionValueId: o.optionValueId,
      }))
    );
  }

  await db.insert(inventoryItems).values({
    id: generateId(),
    vendorId: resolvedVendorId,
    variantId,
    tracked: data.inventoryTracked ?? true,
    availableQuantity: data.inventoryQuantity ?? 0,
    reservedQuantity: 0,
    incomingQuantity: 0,
  }).onConflictDoNothing();

  const selectedOptions = await db
    .select()
    .from(variantSelectedOptions)
    .where(eq(variantSelectedOptions.variantId, variantId));

  return { ...variant!, selectedOptions };
}

export async function updateVariant(id: string, data: UpdateVariantDto) {
  const setData: Record<string, unknown> = { updatedAt: new Date() };

  // String fields — pass through directly
  if (data.title !== undefined) setData.title = data.title;
  if (data.sku !== undefined) setData.sku = data.sku;
  if (data.barcode !== undefined) setData.barcode = data.barcode;
  if (data.status !== undefined) setData.status = data.status;
  if (data.countryOfOrigin !== undefined) setData.countryOfOrigin = data.countryOfOrigin;
  if (data.harmonizedSystemCode !== undefined) setData.harmonizedSystemCode = data.harmonizedSystemCode;

  // Boolean fields
  if (data.taxable !== undefined) setData.taxable = data.taxable;
  if (data.inventoryTracked !== undefined) setData.inventoryTracked = data.inventoryTracked;
  if (data.requiresShipping !== undefined) setData.requiresShipping = data.requiresShipping;

  // Enum fields
  if (data.inventoryPolicy !== undefined) setData.inventoryPolicy = data.inventoryPolicy;
  if (data.weightUnit !== undefined) setData.weightUnit = data.weightUnit;

  // Featured image (stored as featuredFileId — accepts product image ID)
  if (data.featuredImageId !== undefined) {
    setData.featuredFileId = data.featuredImageId;
  }

  // Numeric fields stored as numeric/decimal in DB — convert to string
  if (data.price !== undefined) setData.price = String(data.price);
  if (data.compareAtPrice !== undefined) {
    setData.compareAtPrice = data.compareAtPrice === null ? null : String(data.compareAtPrice);
  }
  if (data.costPerItem !== undefined) {
    setData.costPerItem = data.costPerItem === null ? null : String(data.costPerItem);
  }
  if (data.weightValue !== undefined) {
    setData.weightValue = data.weightValue === null ? null : String(data.weightValue);
  }

  const [variant] = await db
    .update(variants)
    .set(setData)
    .where(eq(variants.id, id))
    .returning();

  if (!variant) return null;

  // Inventory side-effects: when the caller passes `availableQuantity` or
  // toggles `inventoryTracked` we mirror that onto the `inventory_items`
  // row. Most variants only ever have one inventory row (the default
  // location), so this is a single UPDATE — multi-location stores will need
  // a dedicated endpoint per location.
  const updatesInventory =
    data.availableQuantity !== undefined || data.inventoryTracked !== undefined;
  if (updatesInventory) {
    const invPatch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.availableQuantity !== undefined) {
      invPatch.availableQuantity = data.availableQuantity;
    }
    if (data.inventoryTracked !== undefined) {
      invPatch.tracked = data.inventoryTracked;
    }
    const updated = await db
      .update(inventoryItems)
      .set(invPatch)
      .where(eq(inventoryItems.variantId, id))
      .returning();

    // Auto-create the inventory row if none existed (older variants seeded
    // before inventory tracking was wired up). Keeps the variant page Save
    // button idempotent.
    if (updated.length === 0) {
      await db
        .insert(inventoryItems)
        .values({
          id: generateId(),
          vendorId: variant.vendorId,
          variantId: id,
          tracked: data.inventoryTracked ?? true,
          availableQuantity: data.availableQuantity ?? 0,
          reservedQuantity: 0,
          incomingQuantity: 0,
        })
        .onConflictDoNothing();
    }
  }

  return variant;
}

export async function archiveVariant(id: string) {
  const [variant] = await db
    .update(variants)
    .set({ status: "archived", deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(variants.id, id))
    .returning();
  return variant ?? null;
}

export async function updateOption(
  optionId: string,
  data: { name?: string; position?: number }
) {
  const setData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) setData.name = data.name;
  if (data.position !== undefined) setData.position = data.position;

  const [option] = await db
    .update(productOptions)
    .set(setData)
    .where(eq(productOptions.id, optionId))
    .returning();
  return option ?? null;
}

export async function findOptionById(optionId: string) {
  const [option] = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.id, optionId));
  return option ?? null;
}

export async function deleteOption(optionId: string) {
  const [option] = await db
    .delete(productOptions)
    .where(eq(productOptions.id, optionId))
    .returning();
  return option ?? null;
}

export async function findImagesByProduct(productId: string) {
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId));
}

export async function findImageById(id: string) {
  const [image] = await db.select().from(productImages).where(eq(productImages.id, id));
  return image ?? null;
}

export async function createImage(
  productId: string,
  data: { url: string; altText?: string; position?: number; isFeatured?: boolean }
) {
  const [image] = await db
    .insert(productImages)
    .values({ id: generateId(), productId, ...data })
    .returning();
  return image!;
}

export async function updateImage(
  id: string,
  data: { url?: string; altText?: string; position?: number; isFeatured?: boolean }
) {
  const [image] = await db
    .update(productImages)
    .set(data)
    .where(eq(productImages.id, id))
    .returning();
  return image ?? null;
}

export async function deleteImage(id: string) {
  const [image] = await db.delete(productImages).where(eq(productImages.id, id)).returning();
  return image ?? null;
}

export async function findImagesByVariant(variantId: string) {
  return db
    .select()
    .from(variantImages)
    .where(eq(variantImages.variantId, variantId));
}

export async function findVariantImageById(id: string) {
  const [image] = await db.select().from(variantImages).where(eq(variantImages.id, id));
  return image ?? null;
}

export async function createVariantImage(
  variantId: string,
  data: { url: string; altText?: string; position?: number; isFeatured?: boolean }
) {
  const [image] = await db
    .insert(variantImages)
    .values({ id: generateId(), variantId, ...data })
    .returning();
  return image!;
}

export async function updateVariantImage(
  id: string,
  data: { url?: string; altText?: string | null; position?: number; isFeatured?: boolean }
) {
  const [image] = await db
    .update(variantImages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(variantImages.id, id))
    .returning();
  return image ?? null;
}

export async function deleteVariantImage(id: string) {
  const [image] = await db.delete(variantImages).where(eq(variantImages.id, id)).returning();
  return image ?? null;
}
