/**
 * Storefront product recommendations.
 *
 * Strategy (per request):
 *   1. **Frequently bought together** — products that appear in the same orders
 *      as the seed product, ranked by co-occurrence count. Best signal.
 *   2. **Same collection** — fallback when co-purchase data is thin (seed
 *      product has < N orders).
 *   3. **Vendor's other products** — final fallback.
 *
 * Results are cached in Redis per seed product for 10 minutes — recommendations
 * are not particularly time-sensitive and the JOIN is heavy.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, ne, sql, inArray, isNull, desc, exists } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  products,
  orderItems,
  collectionProducts,
} from "../../db/schema/index.js";
import { cacheGet } from "../../lib/redis.js";

const REC_CACHE_TTL = 10 * 60; // 10 minutes
const MIN_COPURCHASES = 2;     // need at least this many co-purchases to count

const querySchema = z.object({
  productId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

interface RecommendedProductRow {
  id: string;
  title: string;
  handle: string;
  vendorId: string;
  /** How this product was sourced ("co_purchase" / "collection" / "vendor"). */
  reason: "co_purchase" | "collection" | "vendor";
  /** For co_purchase, how many distinct orders contained both products. */
  score: number | null;
}

export async function recommendationRoutes(app: FastifyInstance) {
  app.get(
    "/storefront/recommendations",
    {
      // Lighter rate-limit than the global default — the PDP fires this once.
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (req: any, reply: any) => {
      const { productId, limit } = querySchema.parse(req.query);

      const cacheKey = `rec:pdp:${productId}:${limit}`;
      const recs = await cacheGet<RecommendedProductRow[]>(
        cacheKey,
        REC_CACHE_TTL,
        () => computeRecommendations(productId, limit)
      );

      // Hydrate price + image fields so the storefront doesn't need a second
      // round-trip per product. Use the existing product list response shape
      // by querying by id.
      if (recs.length === 0) return reply.send({ data: [] });
      const ids = recs.map((r) => r.id);
      const detailed = await db
        .select()
        .from(products)
        .where(inArray(products.id, ids));
      const byId = new Map(detailed.map((p) => [p.id, p]));
      // Order results in recommendation order (not DB order).
      const ordered = recs
        .map((r) => byId.get(r.id))
        .filter((p): p is NonNullable<typeof p> => !!p);
      return reply.send({
        data: ordered.map((p, idx) => ({ ...p, reason: recs[idx]?.reason })),
      });
    }
  );
}

/**
 * Build a recommendation list using the strategies above. Returns up to
 * `limit` products, never including the seed.
 */
async function computeRecommendations(
  seedProductId: string,
  limit: number
): Promise<RecommendedProductRow[]> {
  const seed = await db
    .select({ id: products.id, vendorId: products.vendorId })
    .from(products)
    .where(eq(products.id, seedProductId))
    .limit(1);
  if (seed.length === 0) return [];
  const seedVendorId = seed[0].vendorId;

  // ── 1. Co-purchase ────────────────────────────────────────────────────────
  // Find order_items.orderId where seed appears, then count other products in
  // those orders. Postgres handles this fine for any reasonable catalogue.
  const coPurchase = await db.execute(sql`
    SELECT oi2.product_id AS id,
           p.title,
           p.handle,
           p.vendor_id AS "vendorId",
           COUNT(DISTINCT oi2.order_id)::int AS score
    FROM order_items oi1
    INNER JOIN order_items oi2 ON oi2.order_id = oi1.order_id
    INNER JOIN products p ON p.id = oi2.product_id
    WHERE oi1.product_id = ${seedProductId}
      AND oi2.product_id <> ${seedProductId}
      AND oi2.product_id IS NOT NULL
      AND p.deleted_at IS NULL
      AND p.status = 'active'
    GROUP BY oi2.product_id, p.title, p.handle, p.vendor_id
    HAVING COUNT(DISTINCT oi2.order_id) >= ${MIN_COPURCHASES}
    ORDER BY score DESC
    LIMIT ${limit}
  `);

  const coPurchaseRows = (coPurchase as unknown as { rows: any[] }).rows ?? coPurchase as any;
  const fromCoPurchase: RecommendedProductRow[] = (Array.isArray(coPurchaseRows) ? coPurchaseRows : []).map(
    (r: any) => ({
      id: r.id,
      title: r.title,
      handle: r.handle,
      vendorId: r.vendorId,
      reason: "co_purchase" as const,
      score: Number(r.score),
    })
  );

  if (fromCoPurchase.length >= limit) return fromCoPurchase.slice(0, limit);

  // ── 2. Same collection fallback ──────────────────────────────────────────
  const alreadyHave = new Set([seedProductId, ...fromCoPurchase.map((r) => r.id)]);
  const remaining = limit - fromCoPurchase.length;

  const seedCollections = await db
    .select({ collectionId: collectionProducts.collectionId })
    .from(collectionProducts)
    .where(eq(collectionProducts.productId, seedProductId));

  let fromCollection: RecommendedProductRow[] = [];
  if (seedCollections.length > 0) {
    const collIds = seedCollections.map((c) => c.collectionId);
    const sameCollectionRows = await db
      .select({
        id: products.id,
        title: products.title,
        handle: products.handle,
        vendorId: products.vendorId,
      })
      .from(products)
      .where(
        and(
          isNull(products.deletedAt),
          eq(products.status, "active"),
          ne(products.id, seedProductId),
          exists(
            db
              .select({ pid: collectionProducts.productId })
              .from(collectionProducts)
              .where(
                and(
                  eq(collectionProducts.productId, products.id),
                  inArray(collectionProducts.collectionId, collIds)
                )
              )
          )
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(remaining * 2); // over-fetch then de-dupe

    fromCollection = sameCollectionRows
      .filter((p) => !alreadyHave.has(p.id))
      .slice(0, remaining)
      .map((p) => ({ ...p, reason: "collection" as const, score: null }));
  }

  const combined = [...fromCoPurchase, ...fromCollection];
  if (combined.length >= limit) return combined.slice(0, limit);

  // ── 3. Vendor's other products fallback ──────────────────────────────────
  const stillNeed = limit - combined.length;
  const alreadyHave2 = new Set([seedProductId, ...combined.map((r) => r.id)]);
  const sameVendor = await db
    .select({
      id: products.id,
      title: products.title,
      handle: products.handle,
      vendorId: products.vendorId,
    })
    .from(products)
    .where(
      and(
        eq(products.vendorId, seedVendorId),
        ne(products.id, seedProductId),
        isNull(products.deletedAt),
        eq(products.status, "active")
      )
    )
    .orderBy(desc(products.createdAt))
    .limit(stillNeed * 2);

  const fromVendor: RecommendedProductRow[] = sameVendor
    .filter((p) => !alreadyHave2.has(p.id))
    .slice(0, stillNeed)
    .map((p) => ({ ...p, reason: "vendor" as const, score: null }));

  return [...combined, ...fromVendor];
}
