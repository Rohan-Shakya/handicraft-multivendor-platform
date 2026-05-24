import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  carts,
  cartItems,
  cartAppliedDiscounts,
  wishlistItems,
  variants,
  products,
  productImages,
  productOptions,
  productOptionValues,
  variantSelectedOptions,
  vendors,
  inventoryItems,
  inventoryReservations,
} from "../../db/schema/index.js";
import { inArray, desc, asc } from "drizzle-orm";
import { generateId } from "../../lib/id.js";

/**
 * Reservation lifetime for cart items. Cart items reserved for this long before
 * the reservation expires and is returned to available inventory.
 */
const CART_RESERVATION_TTL_MINUTES = 60;

// ─── Cart ─────────────────────────────────────────────────────────────────────

export async function findCartByCustomer(customerId: string) {
  const [cart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.customerId, customerId), eq(carts.status, "active")));
  return cart ?? null;
}

export async function findCartBySession(sessionId: string) {
  const [cart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.sessionId, sessionId), eq(carts.status, "active")));
  return cart ?? null;
}

export async function findCartById(id: string) {
  const [cart] = await db.select().from(carts).where(eq(carts.id, id));
  return cart ?? null;
}

export async function createCart(data: { customerId?: string; sessionId?: string }) {
  const [cart] = await db
    .insert(carts)
    .values({
      id: generateId(),
      customerId: data.customerId ?? null,
      sessionId: data.sessionId ?? null,
    })
    .returning();
  return cart!;
}

export async function getCartWithItems(cartId: string) {
  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId));
  if (!cart) return null;
  const rawItems = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  const discounts = await db
    .select()
    .from(cartAppliedDiscounts)
    .where(eq(cartAppliedDiscounts.cartId, cartId));

  // Enrich each line with what the storefront needs to render it: product
  // handle (for deep-links) + a featured image URL. Done in two bulk queries
  // to keep the total to 4 regardless of line count.
  if (rawItems.length === 0) {
    return { ...cart, items: [], appliedDiscounts: discounts };
  }
  const productIds = [...new Set(rawItems.map((i) => i.productId))];
  const variantIds = [...new Set(rawItems.map((i) => i.variantId))];
  const vendorIds = [...new Set(rawItems.map((i) => i.vendorId))];
  const [productRows, imageRows, optionRows, vendorRows] = await Promise.all([
    db
      .select({
        id: products.id,
        handle: products.handle,
      })
      .from(products)
      .where(inArray(products.id, productIds)),
    db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        altText: productImages.altText,
        isFeatured: productImages.isFeatured,
        position: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(
        desc(productImages.isFeatured),
        asc(productImages.position)
      ),
    db
      .select({
        variantId: variantSelectedOptions.variantId,
        optionName: productOptions.name,
        optionPosition: productOptions.position,
        displayType: productOptions.displayType,
        value: productOptionValues.value,
        swatchColor: productOptionValues.swatchColor,
      })
      .from(variantSelectedOptions)
      .innerJoin(
        productOptions,
        eq(variantSelectedOptions.optionId, productOptions.id)
      )
      .innerJoin(
        productOptionValues,
        eq(variantSelectedOptions.optionValueId, productOptionValues.id)
      )
      .where(inArray(variantSelectedOptions.variantId, variantIds))
      .orderBy(asc(productOptions.position)),
    db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors)
      .where(inArray(vendors.id, vendorIds)),
  ]);

  const productById = new Map(productRows.map((p) => [p.id, p]));
  const vendorById = new Map(vendorRows.map((v) => [v.id, v]));
  const firstImageByProduct = new Map<
    string,
    { url: string; altText: string | null }
  >();
  for (const img of imageRows) {
    if (!firstImageByProduct.has(img.productId)) {
      firstImageByProduct.set(img.productId, {
        url: img.url,
        altText: img.altText ?? null,
      });
    }
  }
  const optionsByVariant = new Map<
    string,
    Array<{
      name: string;
      value: string;
      displayType: string;
      swatchColor: string | null;
    }>
  >();
  for (const row of optionRows) {
    const list = optionsByVariant.get(row.variantId) ?? [];
    list.push({
      name: row.optionName,
      value: row.value,
      displayType: row.displayType,
      swatchColor: row.swatchColor,
    });
    optionsByVariant.set(row.variantId, list);
  }

  const items = rawItems.map((i) => {
    const p = productById.get(i.productId);
    const img = firstImageByProduct.get(i.productId) ?? null;
    const vendor = vendorById.get(i.vendorId) ?? null;
    const selectedOptions = optionsByVariant.get(i.variantId) ?? [];
    return {
      ...i,
      selectedOptions,
      // Normalized nested shape for clients that were written against the
      // Shopify-style `item.variant.product.*` convention.
      product: p
        ? {
            id: p.id,
            handle: p.handle,
            title: i.title,
            featuredImage: img,
            vendor: vendor ? { id: vendor.id, name: vendor.name } : null,
          }
        : null,
    };
  });

  return { ...cart, items, appliedDiscounts: discounts };
}

/**
 * Return cart items with vendor ids — used by the discount scope check so
 * `vendor` / `targeted_vendors` discounts know which vendors are in the cart.
 */
export async function findCartItemsWithVendor(
  cartId: string
): Promise<Array<{ variantId: string; vendorId: string; quantity: number }>> {
  return db
    .select({
      variantId: cartItems.variantId,
      vendorId: cartItems.vendorId,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
}

export async function findCartItem(cartId: string, variantId: string) {
  const [item] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)));
  return item ?? null;
}

export async function findCartItemById(id: string) {
  const [item] = await db.select().from(cartItems).where(eq(cartItems.id, id));
  return item ?? null;
}

/**
 * Lookup the variant with its vendor + inventory data needed for a cart item.
 */
export async function findVariantForCart(variantId: string) {
  const [row] = await db
    .select({
      variant: variants,
      vendorId: products.vendorId,
      productTitle: products.title,
      inventoryTracked: inventoryItems.tracked,
      availableQuantity: inventoryItems.availableQuantity,
      inventoryPolicy: variants.inventoryPolicy,
      inventoryItemId: inventoryItems.id,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .leftJoin(inventoryItems, eq(inventoryItems.variantId, variants.id))
    .where(eq(variants.id, variantId));
  return row ?? null;
}

/**
 * Add a cart item with all required fields snapshotted from the variant.
 */
export async function addCartItem(data: {
  cartId: string;
  vendorId: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  unitPrice: string;
  quantity: number;
  requiresShipping: boolean;
  weightGrams: number;
}) {
  const qty = data.quantity;
  const unit = parseFloat(data.unitPrice);
  const lineSubtotal = (unit * qty).toFixed(2);

  const [item] = await db
    .insert(cartItems)
    .values({
      id: generateId(),
      cartId: data.cartId,
      vendorId: data.vendorId,
      productId: data.productId,
      variantId: data.variantId,
      title: data.title,
      variantTitle: data.variantTitle ?? null,
      sku: data.sku ?? null,
      unitPrice: data.unitPrice,
      quantity: qty,
      lineSubtotal,
      lineDiscountTotal: "0",
      lineTotal: lineSubtotal,
      requiresShipping: data.requiresShipping,
      weightGrams: data.weightGrams,
    })
    .returning();
  return item!;
}

export async function updateCartItemQuantity(id: string, quantity: number) {
  // Recompute line totals
  const [existing] = await db.select().from(cartItems).where(eq(cartItems.id, id));
  if (!existing) return null;

  const unit = parseFloat(existing.unitPrice);
  const discount = parseFloat(existing.lineDiscountTotal);
  const lineSubtotal = (unit * quantity).toFixed(2);
  const lineTotal = Math.max(0, unit * quantity - discount).toFixed(2);

  const [item] = await db
    .update(cartItems)
    .set({
      quantity,
      lineSubtotal,
      lineTotal,
      updatedAt: new Date(),
    })
    .where(eq(cartItems.id, id))
    .returning();
  return item ?? null;
}

export async function deleteCartItem(id: string) {
  await db.delete(cartItems).where(eq(cartItems.id, id));
}

export async function deleteAllCartItems(cartId: string) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}

/**
 * Recompute and persist cart totals from its current items and applied discounts.
 * Must be called after every add/update/remove/discount operation.
 *
 * Discount amounts come from cartAppliedDiscounts (cart-level), NOT from
 * cartItems.lineDiscountTotal (item-level allocations, which are currently
 * not populated by the discount system).
 */
export async function recomputeCartTotals(cartId: string): Promise<void> {
  // Re-apply any campaign auto-discounts BEFORE summing — line subtotals or
  // membership in targeted collections may have changed since the last
  // recalc, so the auto-discount allocation must be recomputed from scratch.
  // Dynamic import keeps this out of any module-init cycle.
  const { applyAutoDiscounts } = await import("../discounts/auto-discount.js");
  await applyAutoDiscounts(cartId);

  const [items, appliedDiscounts] = await Promise.all([
    db.select().from(cartItems).where(eq(cartItems.cartId, cartId)),
    db.select().from(cartAppliedDiscounts).where(eq(cartAppliedDiscounts.cartId, cartId)),
  ]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const itemsSubtotalPrice = items
    .reduce((s, i) => s + parseFloat(i.lineSubtotal), 0)
    .toFixed(2);

  // Sum discount amounts from cartAppliedDiscounts, capped at subtotal
  const rawDiscount = appliedDiscounts.reduce((s, d) => s + parseFloat(d.amount), 0);
  const totalDiscount = Math.min(rawDiscount, parseFloat(itemsSubtotalPrice)).toFixed(2);

  const totalPrice = Math.max(
    0,
    parseFloat(itemsSubtotalPrice) - parseFloat(totalDiscount)
  ).toFixed(2);
  const totalWeightGrams = items.reduce((s, i) => s + (i.weightGrams ?? 0) * i.quantity, 0);
  const requiresShipping = items.some((i) => i.requiresShipping);

  await db.update(carts).set({
    itemCount,
    itemsSubtotalPrice,
    totalDiscount,
    totalPrice,
    totalWeightGrams,
    requiresShipping,
    lastActivityAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(carts.id, cartId));
}

export async function markCartCompleted(cartId: string) {
  await db.update(carts).set({
    status: "completed",
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(carts.id, cartId));
}

// ─── Discount application ─────────────────────────────────────────────────────

export async function findAppliedDiscount(cartId: string, code: string) {
  const [row] = await db
    .select()
    .from(cartAppliedDiscounts)
    .where(and(eq(cartAppliedDiscounts.cartId, cartId), eq(cartAppliedDiscounts.code, code)));
  return row ?? null;
}

export async function addAppliedDiscount(data: {
  cartId: string;
  discountId: string | null;
  discountCodeId: string | null;
  code: string;
  title: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  targetType: "order" | "shipping";
  amount: string;
}) {
  const [row] = await db
    .insert(cartAppliedDiscounts)
    .values({
      id: generateId(),
      cartId: data.cartId,
      discountId: data.discountId ?? null,
      discountCodeId: data.discountCodeId ?? null,
      code: data.code,
      title: data.title,
      type: data.type,
      targetType: data.targetType,
      amount: data.amount,
    })
    .returning();
  return row!;
}

export async function removeAppliedDiscount(cartId: string, code: string) {
  await db
    .delete(cartAppliedDiscounts)
    .where(and(eq(cartAppliedDiscounts.cartId, cartId), eq(cartAppliedDiscounts.code, code)));
}

export async function getCartAppliedDiscounts(cartId: string) {
  return db
    .select()
    .from(cartAppliedDiscounts)
    .where(eq(cartAppliedDiscounts.cartId, cartId));
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function findWishlistByCustomer(customerId: string) {
  return db.select().from(wishlistItems).where(eq(wishlistItems.customerId, customerId));
}

export async function findWishlistItem(customerId: string, productId: string) {
  const [item] = await db
    .select()
    .from(wishlistItems)
    .where(
      and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId))
    );
  return item ?? null;
}

export async function addWishlistItem(customerId: string, productId: string) {
  const [item] = await db
    .insert(wishlistItems)
    .values({ id: generateId(), customerId, productId })
    .returning();
  return item!;
}

export async function removeWishlistItem(customerId: string, productId: string) {
  await db
    .delete(wishlistItems)
    .where(
      and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId))
    );
}

// ─── Inventory reservations ──────────────────────────────────────────────────
// When an item is added to a cart we optimistically move the quantity from
// availableQuantity -> reservedQuantity and create an active reservation row.
// The reservation is consumed on order placement, released on removal, or
// expired by the cleanup scheduler.

/**
 * Reserve inventory for a cart item. Atomic: only succeeds if enough is
 * available. Returns false when stock is insufficient.
 */
export async function reserveInventoryForCart(params: {
  cartId: string;
  variantId: string;
  quantity: number;
}): Promise<boolean> {
  const { cartId, variantId, quantity } = params;

  return db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.variantId, variantId))
      .for("update");
    if (!inv) return true; // no inventory tracking record — skip reservation

    // Only enforce when tracked; if not tracked, skip reservation entirely.
    if (!inv.tracked) return true;

    // Check for existing active reservation for THIS cart+variant — if present,
    // compute the delta instead of creating another reservation.
    const [existing] = await tx
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.cartId, cartId),
          eq(inventoryReservations.inventoryItemId, inv.id),
          eq(inventoryReservations.status, "active")
        )
      )
      .limit(1);

    const currentlyReserved = existing?.quantity ?? 0;
    const delta = quantity - currentlyReserved;
    if (delta === 0) return true;

    if (delta > 0 && inv.availableQuantity < delta) {
      return false;
    }

    // Update inventory item counters atomically
    await tx
      .update(inventoryItems)
      .set({
        availableQuantity: sql`${inventoryItems.availableQuantity} - ${delta}`,
        reservedQuantity: sql`${inventoryItems.reservedQuantity} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, inv.id));

    const expiresAt = new Date(Date.now() + CART_RESERVATION_TTL_MINUTES * 60 * 1000);

    if (existing) {
      await tx
        .update(inventoryReservations)
        .set({
          quantity,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(inventoryReservations.id, existing.id));
    } else {
      await tx.insert(inventoryReservations).values({
        id: generateId(),
        inventoryItemId: inv.id,
        cartId,
        quantity,
        status: "active",
        expiresAt,
      });
    }

    return true;
  });
}

/**
 * Release an active reservation for a specific cart + variant (e.g. when a
 * cart item is removed or quantity is reduced).
 */
export async function releaseReservationForCartVariant(params: {
  cartId: string;
  variantId: string;
}) {
  const { cartId, variantId } = params;

  await db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.variantId, variantId));
    if (!inv) return;

    const [reservation] = await tx
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.cartId, cartId),
          eq(inventoryReservations.inventoryItemId, inv.id),
          eq(inventoryReservations.status, "active")
        )
      )
      .limit(1);
    if (!reservation) return;

    await tx
      .update(inventoryItems)
      .set({
        availableQuantity: sql`${inventoryItems.availableQuantity} + ${reservation.quantity}`,
        reservedQuantity: sql`GREATEST(0, ${inventoryItems.reservedQuantity} - ${reservation.quantity})`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, inv.id));

    await tx
      .update(inventoryReservations)
      .set({ status: "released", updatedAt: new Date() })
      .where(eq(inventoryReservations.id, reservation.id));
  });
}

/**
 * Release all active reservations for a cart (on clear / abandonment).
 */
export async function releaseAllReservationsForCart(cartId: string) {
  await db.transaction(async (tx) => {
    const active = await tx
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.cartId, cartId),
          eq(inventoryReservations.status, "active")
        )
      );

    for (const r of active) {
      await tx
        .update(inventoryItems)
        .set({
          availableQuantity: sql`${inventoryItems.availableQuantity} + ${r.quantity}`,
          reservedQuantity: sql`GREATEST(0, ${inventoryItems.reservedQuantity} - ${r.quantity})`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, r.inventoryItemId));
    }

    if (active.length > 0) {
      await tx
        .update(inventoryReservations)
        .set({ status: "released", updatedAt: new Date() })
        .where(
          and(
            eq(inventoryReservations.cartId, cartId),
            eq(inventoryReservations.status, "active")
          )
        );
    }
  });
}
