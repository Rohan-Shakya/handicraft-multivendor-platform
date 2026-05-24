/**
 * Automatic discount application.
 *
 * A "campaign" discount (`discounts.method = 'automatic'`) applies to every
 * eligible cart with zero customer interaction — it's the engine behind sales
 * like 11.11. Customer-entered code discounts are unaffected; both stack.
 *
 * Synthetic codes use the prefix `AUTO:` so existing checkout/order pipelines
 * (which already snapshot `cart_applied_discounts` → `order_applied_discounts`)
 * carry them through unchanged. The `AUTO:` prefix doubles as a marker for
 * "remove + re-apply on every recalc" so totals stay correct as the cart
 * changes.
 */
import { eq, and, inArray, sql, gte, lte, isNull, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  discounts,
  discountProducts,
  discountCollections,
  discountVendorTargets,
  cartAppliedDiscounts,
  cartItems,
  collectionProducts,
  campaigns,
} from "../../db/schema/index.js";
import { generateId } from "../../lib/id.js";
import { toCents, fromCents } from "../../lib/money.js";
import { cacheGet } from "../../lib/redis.js";

const ACTIVE_AUTO_DISCOUNTS_CACHE_TTL = 30; // seconds — short, sales are time-sensitive
const ACTIVE_AUTO_DISCOUNTS_CACHE_KEY = "discounts:active-auto";

const AUTO_CODE_PREFIX = "AUTO:";

export function isAutoCode(code: string): boolean {
  return code.startsWith(AUTO_CODE_PREFIX);
}

interface ActiveAutoDiscount {
  id: string;
  campaignId: string | null;
  title: string;
  scope: "platform" | "vendor" | "targeted_vendors";
  vendorId: string | null;
  type: "percentage" | "fixed_amount" | "free_shipping";
  targetType: "order" | "shipping";
  value: string;
  minimumSubtotal: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  /** vendor ids the discount applies to (only populated for targeted_vendors). */
  vendorTargets: string[];
  /** product ids the discount narrows to — empty = all matching scope. */
  productTargets: string[];
  /** collection ids the discount narrows to — empty = no collection filter. */
  collectionTargets: string[];
}

/**
 * Load every active automatic discount (with its targets). Cached in Redis
 * because every cart recalc hits this — without the cache a 100 RPS storefront
 * would hammer the discount tables.
 */
async function loadActiveAutoDiscounts(): Promise<ActiveAutoDiscount[]> {
  return cacheGet<ActiveAutoDiscount[]>(
    ACTIVE_AUTO_DISCOUNTS_CACHE_KEY,
    ACTIVE_AUTO_DISCOUNTS_CACHE_TTL,
    async () => {
      const now = new Date();
      const rows = await db
        .select({
          id: discounts.id,
          campaignId: discounts.campaignId,
          title: discounts.title,
          scope: discounts.scope,
          vendorId: discounts.vendorId,
          type: discounts.type,
          targetType: discounts.targetType,
          value: discounts.value,
          minimumSubtotal: discounts.minimumSubtotal,
          startsAt: discounts.startsAt,
          endsAt: discounts.endsAt,
        })
        .from(discounts)
        .where(
          and(
            eq(discounts.method, "automatic"),
            eq(discounts.status, "active"),
            isNull(discounts.deletedAt),
            or(isNull(discounts.startsAt), lte(discounts.startsAt, now)),
            or(isNull(discounts.endsAt), gte(discounts.endsAt, now))
          )
        );

      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      const [vendorTargets, productTargets, collectionTargets] = await Promise.all([
        db
          .select({ discountId: discountVendorTargets.discountId, vendorId: discountVendorTargets.vendorId })
          .from(discountVendorTargets)
          .where(inArray(discountVendorTargets.discountId, ids)),
        db
          .select({ discountId: discountProducts.discountId, productId: discountProducts.productId })
          .from(discountProducts)
          .where(inArray(discountProducts.discountId, ids)),
        db
          .select({ discountId: discountCollections.discountId, collectionId: discountCollections.collectionId })
          .from(discountCollections)
          .where(inArray(discountCollections.discountId, ids)),
      ]);

      const byVendor = new Map<string, string[]>();
      for (const v of vendorTargets) {
        const list = byVendor.get(v.discountId) ?? [];
        list.push(v.vendorId);
        byVendor.set(v.discountId, list);
      }
      const byProduct = new Map<string, string[]>();
      for (const p of productTargets) {
        const list = byProduct.get(p.discountId) ?? [];
        list.push(p.productId);
        byProduct.set(p.discountId, list);
      }
      const byCollection = new Map<string, string[]>();
      for (const c of collectionTargets) {
        const list = byCollection.get(c.discountId) ?? [];
        list.push(c.collectionId);
        byCollection.set(c.discountId, list);
      }

      return rows.map((r) => ({
        ...r,
        vendorTargets: byVendor.get(r.id) ?? [],
        productTargets: byProduct.get(r.id) ?? [],
        collectionTargets: byCollection.get(r.id) ?? [],
      }));
    }
  );
}

/**
 * For a discount with collection targets, expand to the set of product ids it
 * covers. Used both by cart matching and the effective-price helper.
 */
export async function expandCollectionProductIds(
  collectionIds: string[]
): Promise<Set<string>> {
  if (collectionIds.length === 0) return new Set();
  const rows = await db
    .select({ productId: collectionProducts.productId })
    .from(collectionProducts)
    .where(inArray(collectionProducts.collectionId, collectionIds));
  return new Set(rows.map((r) => r.productId));
}

interface CartItemForMatching {
  id: string;
  productId: string | null;
  variantId: string;
  vendorId: string;
  quantity: number;
  lineSubtotal: string;
  unitPrice: string;
}

/**
 * Decide whether a single discount applies to a given cart line.
 */
function discountMatchesLine(
  d: ActiveAutoDiscount,
  line: CartItemForMatching,
  productInCollections: Set<string>
): boolean {
  // Scope check first.
  if (d.scope === "vendor" && d.vendorId !== line.vendorId) return false;
  if (d.scope === "targeted_vendors" && !d.vendorTargets.includes(line.vendorId)) return false;
  // "platform" scope matches all lines.

  // Narrow targets: if BOTH product and collection targets are empty, the
  // discount applies to every line in scope. Otherwise the line must match at
  // least one product target or be in one of the targeted collections.
  const hasProductFilter = d.productTargets.length > 0;
  const hasCollectionFilter = d.collectionTargets.length > 0;
  if (!hasProductFilter && !hasCollectionFilter) return true;

  if (hasProductFilter && line.productId && d.productTargets.includes(line.productId)) {
    return true;
  }
  if (hasCollectionFilter && line.productId && productInCollections.has(line.productId)) {
    return true;
  }
  return false;
}

/**
 * Compute the savings (in cents) a discount would yield on a single line.
 * Higher = better. Used to pick the best discount when several match.
 *
 * Free-shipping discounts return 0 here — they're handled at the order level
 * (shipping calculation), not line-by-line.
 */
function lineSavingsCents(d: ActiveAutoDiscount, line: CartItemForMatching): number {
  const lineSubtotalCents = toCents(line.lineSubtotal);
  if (lineSubtotalCents <= 0) return 0;
  if (d.type === "percentage") {
    const pct = parseFloat(d.value);
    return Math.floor((lineSubtotalCents * pct) / 100);
  }
  if (d.type === "fixed_amount") {
    // Spread a fixed-amount discount across the cart later — for matching we
    // approximate the per-line value as proportional. The actual allocation
    // happens after we know which lines matched.
    return toCents(d.value);
  }
  return 0;
}

/**
 * Apply / re-apply automatic discounts for a cart. Removes stale AUTO: entries,
 * recomputes from current items, inserts fresh AUTO: rows in
 * cart_applied_discounts. Call BEFORE recomputeCartTotals().
 *
 * Returns the list of discount ids that were applied (caller can use for
 * analytics / debugging).
 */
export async function applyAutoDiscounts(cartId: string): Promise<string[]> {
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  // Wipe any stale auto entries unconditionally — cart contents may have
  // changed since last apply.
  await db
    .delete(cartAppliedDiscounts)
    .where(
      and(
        eq(cartAppliedDiscounts.cartId, cartId),
        sql`${cartAppliedDiscounts.code} LIKE ${AUTO_CODE_PREFIX + "%"}`
      )
    );

  if (items.length === 0) return [];

  const activeDiscounts = await loadActiveAutoDiscounts();
  if (activeDiscounts.length === 0) return [];

  // Expand collection targets once (per recalc, not per item).
  const allCollectionIds = [
    ...new Set(activeDiscounts.flatMap((d) => d.collectionTargets)),
  ];
  const productInTargetedCollections =
    await expandCollectionProductIds(allCollectionIds);

  const cartSubtotalCents = items.reduce(
    (s, i) => s + toCents(i.lineSubtotal),
    0
  );

  // For each line, pick the single discount that yields the best savings on
  // that line. We do NOT stack multiple automatic discounts on the same line
  // — matches industry conventions and keeps the math sane.
  const perDiscountSavingsCents = new Map<string, number>();

  for (const line of items) {
    let bestId: string | null = null;
    let bestCents = 0;
    for (const d of activeDiscounts) {
      // Min-subtotal gate (cart-level threshold).
      if (d.minimumSubtotal && cartSubtotalCents < toCents(d.minimumSubtotal)) {
        continue;
      }
      if (!discountMatchesLine(d, line, productInTargetedCollections)) continue;
      const savings = lineSavingsCents(d, line);
      if (savings > bestCents) {
        bestCents = savings;
        bestId = d.id;
      }
    }
    if (bestId && bestCents > 0) {
      perDiscountSavingsCents.set(
        bestId,
        (perDiscountSavingsCents.get(bestId) ?? 0) + bestCents
      );
    }
  }

  // Insert one cart_applied_discounts row per discount that produced savings.
  const applied: string[] = [];
  for (const [discountId, cents] of perDiscountSavingsCents) {
    const d = activeDiscounts.find((x) => x.id === discountId)!;
    // Cap a fixed-amount discount at its declared value (we allocated it per
    // line above; the per-line sum could exceed the original cap if many
    // lines matched).
    const capCents =
      d.type === "fixed_amount" ? Math.min(cents, toCents(d.value)) : cents;
    if (capCents <= 0) continue;

    await db.insert(cartAppliedDiscounts).values({
      id: generateId(),
      cartId,
      discountId: d.id,
      discountCodeId: null,
      code: `${AUTO_CODE_PREFIX}${d.id}`,
      title: d.title,
      type: d.type,
      targetType: d.targetType,
      amount: fromCents(capCents),
    });
    applied.push(d.id);
  }
  return applied;
}

/**
 * Used by product list / PDP responses to compute the customer-facing
 * "effective price" given any active automatic discounts. Returns the best
 * discount that targets the product (by vendor scope + product/collection
 * filter), or null when no automatic discount applies.
 *
 * The returned object is what the storefront renders as the strikethrough +
 * sale price + percentage badge.
 */
export interface EffectivePriceInfo {
  /** Original list price (variant.price). */
  basePrice: number;
  /** Discounted price after applying the best auto discount. */
  salePrice: number;
  /** Absolute savings (basePrice - salePrice). */
  savings: number;
  /** Percentage saved (rounded). */
  percentOff: number;
  discountId: string;
  campaignId: string | null;
  discountTitle: string;
}

/**
 * Compute the best effective price for each product in `products`. Looks up
 * which collections each product belongs to so collection-targeted discounts
 * apply correctly.
 *
 * Returns a `Map<productId, EffectivePriceInfo>` covering only products that
 * had a matching automatic discount. Products without a match are absent from
 * the map — callers should treat absence as "no sale".
 */
export async function getEffectivePrices(
  products: Array<{ id: string; vendorId: string; basePrice: number }>
): Promise<Map<string, EffectivePriceInfo>> {
  const result = new Map<string, EffectivePriceInfo>();
  if (products.length === 0) return result;

  const activeDiscounts = await loadActiveAutoDiscounts();
  if (activeDiscounts.length === 0) return result;

  // Skip free-shipping and any zero-value entries — they don't affect line
  // pricing, only shipping math.
  const lineDiscounts = activeDiscounts.filter(
    (d) => d.type === "percentage" || d.type === "fixed_amount"
  );
  if (lineDiscounts.length === 0) return result;

  // Build the product-in-collection set for collection-targeted discounts.
  const allCollectionIds = [
    ...new Set(lineDiscounts.flatMap((d) => d.collectionTargets)),
  ];
  // Restrict the join to products we're actually pricing so this stays small.
  const productIds = products.map((p) => p.id);
  const productCollections =
    allCollectionIds.length > 0 && productIds.length > 0
      ? await db
          .select({
            productId: collectionProducts.productId,
            collectionId: collectionProducts.collectionId,
          })
          .from(collectionProducts)
          .where(
            and(
              inArray(collectionProducts.productId, productIds),
              inArray(collectionProducts.collectionId, allCollectionIds)
            )
          )
      : [];
  const productCollectionMap = new Map<string, Set<string>>();
  for (const pc of productCollections) {
    const set = productCollectionMap.get(pc.productId) ?? new Set();
    set.add(pc.collectionId);
    productCollectionMap.set(pc.productId, set);
  }

  for (const product of products) {
    const productCols = productCollectionMap.get(product.id) ?? new Set<string>();
    let bestSavings = 0;
    let bestDiscount: ActiveAutoDiscount | null = null;

    for (const d of lineDiscounts) {
      if (d.scope === "vendor" && d.vendorId !== product.vendorId) continue;
      if (d.scope === "targeted_vendors" && !d.vendorTargets.includes(product.vendorId)) continue;

      const hasFilter = d.productTargets.length > 0 || d.collectionTargets.length > 0;
      if (hasFilter) {
        const productHit = d.productTargets.includes(product.id);
        const collectionHit = d.collectionTargets.some((c) => productCols.has(c));
        if (!productHit && !collectionHit) continue;
      }

      // Don't enforce minimumSubtotal at display time — it's a cart-level
      // gate. Storefront shows the *potential* sale price; the cart actually
      // gates the application.

      const baseCents = Math.round(product.basePrice * 100);
      let savingsCents = 0;
      if (d.type === "percentage") {
        savingsCents = Math.floor((baseCents * parseFloat(d.value)) / 100);
      } else if (d.type === "fixed_amount") {
        savingsCents = Math.min(baseCents, toCents(d.value));
      }
      if (savingsCents > bestSavings) {
        bestSavings = savingsCents;
        bestDiscount = d;
      }
    }

    if (bestDiscount && bestSavings > 0) {
      const baseCents = Math.round(product.basePrice * 100);
      const saleCents = Math.max(0, baseCents - bestSavings);
      result.set(product.id, {
        basePrice: product.basePrice,
        salePrice: saleCents / 100,
        savings: bestSavings / 100,
        percentOff: Math.round((bestSavings / baseCents) * 100),
        discountId: bestDiscount.id,
        campaignId: bestDiscount.campaignId,
        discountTitle: bestDiscount.title,
      });
    }
  }
  return result;
}

/**
 * Look up the currently-active campaign meta (single highest-priority one,
 * for the homepage hero slot). Cached.
 */
export async function getActiveCampaignForHero(): Promise<{
  id: string;
  handle: string;
  title: string;
  headline: string | null;
  description: string | null;
  heroImageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  startsAt: Date;
  endsAt: Date;
} | null> {
  return cacheGet(
    "campaigns:active-hero",
    ACTIVE_AUTO_DISCOUNTS_CACHE_TTL,
    async () => {
      const now = new Date();
      const [row] = await db
        .select({
          id: campaigns.id,
          handle: campaigns.handle,
          title: campaigns.title,
          headline: campaigns.headline,
          description: campaigns.description,
          heroImageUrl: campaigns.heroImageUrl,
          ctaText: campaigns.ctaText,
          ctaUrl: campaigns.ctaUrl,
          accentColor: campaigns.accentColor,
          backgroundColor: campaigns.backgroundColor,
          startsAt: campaigns.startsAt,
          endsAt: campaigns.endsAt,
        })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.status, "active"),
            isNull(campaigns.deletedAt),
            lte(campaigns.startsAt, now),
            gte(campaigns.endsAt, now)
          )
        )
        .orderBy(campaigns.priority)
        .limit(1);
      return row ?? null;
    }
  );
}
