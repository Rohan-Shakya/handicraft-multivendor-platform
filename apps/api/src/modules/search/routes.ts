import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, or, eq, gte, lte, isNull, ilike, sql, inArray, desc, asc } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../db/index.js";
import {
  products,
  productImages,
  productTags,
  variants,
  vendors,
  inventoryItems,
} from "../../db/schema/index.js";
import { cacheGet } from "../../lib/redis.js";

const SEARCH_CACHE_TTL = 60; // 1 minute — short enough that admin edits show up promptly.

const storefrontSearchSchema = z.object({
  q: z.string().min(1).max(200),
  vendor: z.string().optional(),
  brand: z.string().optional(),
  productType: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z.enum(["true", "false"]).optional(),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "newest", "title_asc"])
    .default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type SearchParams = z.infer<typeof storefrontSearchSchema>;

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function cacheKeyFor(params: SearchParams): string {
  const hash = crypto.createHash("sha1").update(JSON.stringify(params)).digest("hex");
  return `search:${hash}`;
}

export async function searchRoutes(app: FastifyInstance) {
  app.get(
    "/storefront/search",
    {
      // Search is expensive — multi-column ILIKE + facet aggregations — so cap
      // unauthenticated bursts. The global limiter would also catch this but a
      // tighter route-level cap protects against query-bomb DoS specifically.
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (req: any, reply: any) => {
      const params = storefrontSearchSchema.parse(req.query);
      const result = await cacheGet(cacheKeyFor(params), SEARCH_CACHE_TTL, () => runSearch(params));
      return reply.send(result);
    }
  );
}

interface SearchHit {
  id: string;
  title: string;
  handle: string;
  description: string;
  excerpt: string;
  productType: string;
  brand: string;
  tags: string[];
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  minPrice: number;
  maxPrice: number;
  featuredImage: string | null;
  images: { url: string; alt: string | null }[];
  hasVariants: boolean;
  inStock: boolean;
  createdAt: string;
  publishedAt: string | null;
}

interface SearchResponse {
  hits: SearchHit[];
  totalHits: number;
  facets: Record<string, Record<string, number>>;
  page: number;
  limit: number;
}

async function runSearch(params: SearchParams): Promise<SearchResponse> {
  const searchPattern = `%${escapeLike(params.q)}%`;
  const offset = (params.page - 1) * params.limit;

  // Match condition: any of title / description / excerpt / brand / productType /
  // tags / vendor name contain the query (case-insensitive). With small catalogues
  // this is plenty; for larger ones we'd swap in a tsvector GIN index.
  const matchCondition = or(
    ilike(products.title, searchPattern),
    ilike(products.description, searchPattern),
    ilike(products.excerpt, searchPattern),
    ilike(products.brand, searchPattern),
    ilike(products.productType, searchPattern),
    inArray(
      products.id,
      db
        .select({ pid: productTags.productId })
        .from(productTags)
        .where(ilike(productTags.tag, searchPattern))
    ),
    inArray(
      products.vendorId,
      db.select({ vid: vendors.id }).from(vendors).where(ilike(vendors.name, searchPattern))
    )
  );

  const filterConditions = [
    isNull(products.deletedAt),
    eq(products.status, "active"),
    matchCondition,
  ];

  if (params.vendor) {
    filterConditions.push(
      inArray(
        products.vendorId,
        db.select({ id: vendors.id }).from(vendors).where(eq(vendors.slug, params.vendor))
      )
    );
  }
  if (params.brand) filterConditions.push(eq(products.brand, params.brand));
  if (params.productType) filterConditions.push(eq(products.productType, params.productType));

  if (params.minPrice != null || params.maxPrice != null) {
    const priceConds = [
      params.minPrice != null
        ? gte(sql`${variants.price}::numeric`, String(params.minPrice))
        : undefined,
      params.maxPrice != null
        ? lte(sql`${variants.price}::numeric`, String(params.maxPrice))
        : undefined,
      isNull(variants.deletedAt),
    ].filter(Boolean) as ReturnType<typeof eq>[];

    filterConditions.push(
      inArray(
        products.id,
        db.select({ pid: variants.productId }).from(variants).where(and(...priceConds))
      )
    );
  }

  if (params.inStock === "true") {
    filterConditions.push(
      inArray(
        products.id,
        db
          .select({ pid: variants.productId })
          .from(variants)
          .innerJoin(inventoryItems, eq(inventoryItems.variantId, variants.id))
          .where(and(isNull(variants.deletedAt), gte(inventoryItems.availableQuantity, 1)))
      )
    );
  }

  const where = and(...filterConditions);

  // Relevance: rank title matches highest, then brand/productType, then description.
  // A weighted ILIKE-based score is good enough at this scale.
  const relevanceExpr = sql<number>`
    (CASE WHEN ${products.title} ILIKE ${searchPattern} THEN 100 ELSE 0 END) +
    (CASE WHEN ${products.brand} ILIKE ${searchPattern} THEN 30 ELSE 0 END) +
    (CASE WHEN ${products.productType} ILIKE ${searchPattern} THEN 20 ELSE 0 END) +
    (CASE WHEN ${products.excerpt} ILIKE ${searchPattern} THEN 10 ELSE 0 END) +
    (CASE WHEN ${products.description} ILIKE ${searchPattern} THEN 5 ELSE 0 END)
  `;

  const orderBy = (() => {
    switch (params.sort) {
      case "price_asc":
        return [
          asc(sql`(SELECT MIN(${variants.price}::numeric) FROM ${variants} WHERE ${variants.productId} = ${products.id} AND ${variants.deletedAt} IS NULL)`),
        ];
      case "price_desc":
        return [
          desc(sql`(SELECT MAX(${variants.price}::numeric) FROM ${variants} WHERE ${variants.productId} = ${products.id} AND ${variants.deletedAt} IS NULL)`),
        ];
      case "newest":
        return [desc(products.publishedAt), desc(products.createdAt)];
      case "title_asc":
        return [asc(products.title)];
      case "relevance":
      default:
        return [desc(relevanceExpr), desc(products.createdAt)];
    }
  })();

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(...orderBy)
      .limit(params.limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(products).where(where),
  ]);

  const totalHits = Number(countResult[0]?.count ?? 0);

  if (rows.length === 0) {
    return {
      hits: [],
      totalHits,
      facets: await computeFacets(where),
      page: params.page,
      limit: params.limit,
    };
  }

  // Bulk-load variants, images, tags, vendors for the page.
  const productIds = rows.map((p) => p.id);
  const vendorIds = [...new Set(rows.map((p) => p.vendorId))];

  const [variantRows, imageRows, tagRows, vendorRows, inventoryRows] = await Promise.all([
    db
      .select({
        productId: variants.productId,
        id: variants.id,
        price: variants.price,
        inventoryTracked: variants.inventoryTracked,
      })
      .from(variants)
      .where(and(inArray(variants.productId, productIds), isNull(variants.deletedAt), eq(variants.status, "active"))),
    db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        altText: productImages.altText,
        isFeatured: productImages.isFeatured,
        position: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds)),
    db
      .select({ productId: productTags.productId, tag: productTags.tag })
      .from(productTags)
      .where(inArray(productTags.productId, productIds)),
    db
      .select({ id: vendors.id, name: vendors.name, slug: vendors.slug })
      .from(vendors)
      .where(inArray(vendors.id, vendorIds)),
    db
      .select({
        variantId: inventoryItems.variantId,
        available: inventoryItems.availableQuantity,
      })
      .from(inventoryItems)
      .where(
        inArray(
          inventoryItems.variantId,
          db
            .select({ id: variants.id })
            .from(variants)
            .where(inArray(variants.productId, productIds))
        )
      ),
  ]);

  const variantsByProduct = new Map<string, typeof variantRows>();
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }
  const imagesByProduct = new Map<string, typeof imageRows>();
  for (const img of imageRows) {
    const list = imagesByProduct.get(img.productId) ?? [];
    list.push(img);
    imagesByProduct.set(img.productId, list);
  }
  const tagsByProduct = new Map<string, string[]>();
  for (const t of tagRows) {
    const list = tagsByProduct.get(t.productId) ?? [];
    list.push(t.tag);
    tagsByProduct.set(t.productId, list);
  }
  const vendorById = new Map(vendorRows.map((v) => [v.id, v]));
  const inventoryByVariant = new Map<string, number>();
  for (const inv of inventoryRows) {
    inventoryByVariant.set(inv.variantId, Number(inv.available) || 0);
  }

  const hits: SearchHit[] = rows.map((p) => {
    const vs = variantsByProduct.get(p.id) ?? [];
    const prices = vs.map((v) => parseFloat(v.price)).filter((n) => !isNaN(n));
    const imgs = (imagesByProduct.get(p.id) ?? []).sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (a.position ?? 0) - (b.position ?? 0);
    });
    const vendor = vendorById.get(p.vendorId);
    const inStock = vs.some((v) => {
      if (!v.inventoryTracked) return true;
      return (inventoryByVariant.get(v.id) ?? 0) > 0;
    });

    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      description: p.description ?? "",
      excerpt: p.excerpt ?? "",
      productType: p.productType ?? "",
      brand: p.brand ?? "",
      tags: tagsByProduct.get(p.id) ?? [],
      vendorId: p.vendorId,
      vendorName: vendor?.name ?? "",
      vendorSlug: vendor?.slug ?? "",
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      featuredImage: imgs[0]?.url ?? null,
      images: imgs.map((i) => ({ url: i.url, alt: i.altText })),
      hasVariants: vs.length > 1,
      inStock,
      createdAt: p.createdAt.toISOString(),
      publishedAt: p.publishedAt?.toISOString() ?? null,
    };
  });

  return {
    hits,
    totalHits,
    facets: await computeFacets(where),
    page: params.page,
    limit: params.limit,
  };
}

/**
 * Compute facet counts over the filtered result set. Each facet is a small
 * GROUP BY against the same `where` clause used by the main query.
 */
async function computeFacets(
  where: ReturnType<typeof and>
): Promise<Record<string, Record<string, number>>> {
  const [vendorAgg, brandAgg, productTypeAgg, tagAgg] = await Promise.all([
    db
      .select({
        value: vendors.name,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .innerJoin(vendors, eq(vendors.id, products.vendorId))
      .where(where)
      .groupBy(vendors.name),
    db
      .select({
        value: products.brand,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(and(where, sql`${products.brand} IS NOT NULL AND ${products.brand} <> ''`))
      .groupBy(products.brand),
    db
      .select({
        value: products.productType,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(and(where, sql`${products.productType} IS NOT NULL AND ${products.productType} <> ''`))
      .groupBy(products.productType),
    db
      .select({
        value: productTags.tag,
        count: sql<number>`count(distinct ${products.id})`,
      })
      .from(products)
      .innerJoin(productTags, eq(productTags.productId, products.id))
      .where(where)
      .groupBy(productTags.tag),
  ]);

  const toMap = (
    rows: { value: string | null; count: number }[]
  ): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const r of rows) {
      if (!r.value) continue;
      out[r.value] = Number(r.count);
    }
    return out;
  };

  return {
    vendorName: toMap(vendorAgg),
    brand: toMap(brandAgg),
    productType: toMap(productTypeAgg),
    tags: toMap(tagAgg),
  };
}
