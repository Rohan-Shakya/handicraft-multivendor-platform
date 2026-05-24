import type { AuthActor } from "@repo/types";
import { assertPermission } from "../../lib/permissions.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "../../lib/errors.js";
import * as repo from "./repository.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CartRow = Awaited<ReturnType<typeof repo.findCartById>>;

function assertCartOwnership(cart: NonNullable<CartRow>, actor?: AuthActor, sessionId?: string) {
  if (actor?.type === "customer") {
    if (cart.customerId !== actor.id) {
      throw new ForbiddenError("Not your cart");
    }
  } else {
    if (!sessionId || cart.sessionId !== sessionId) {
      throw new ForbiddenError("Not your cart");
    }
  }
}

function convertWeight(variant: {
  weightValue: string | null;
  weightUnit: string | null;
}): number {
  if (!variant.weightValue) return 0;
  const val = parseFloat(variant.weightValue);
  switch (variant.weightUnit) {
    case "g":
      return Math.round(val);
    case "kg":
      return Math.round(val * 1000);
    case "lb":
      return Math.round(val * 453.592);
    case "oz":
      return Math.round(val * 28.3495);
    default:
      return 0;
  }
}

// ─── Cart service ─────────────────────────────────────────────────────────────

export async function getOrCreateCart(actor?: AuthActor, sessionId?: string) {
  if (actor?.type === "customer") {
    let cart = await repo.findCartByCustomer(actor.id);
    if (!cart) cart = await repo.createCart({ customerId: actor.id });
    return repo.getCartWithItems(cart.id);
  }

  if (!sessionId) {
    throw new BadRequestError("Session ID required for guest cart");
  }
  let cart = await repo.findCartBySession(sessionId);
  if (!cart) cart = await repo.createCart({ sessionId });
  return repo.getCartWithItems(cart.id);
}

export async function addItem(
  actor: AuthActor | undefined,
  data: { variantId: string; quantity: number },
  sessionId?: string
) {
  if (data.quantity < 1) throw new BadRequestError("Quantity must be at least 1");

  // Resolve variant with all cart metadata
  const variantData = await repo.findVariantForCart(data.variantId);
  if (!variantData) throw new NotFoundError("Variant not found");

  const { variant, vendorId, productTitle, inventoryTracked, inventoryPolicy } =
    variantData;

  if (variant.status !== "active") {
    throw new UnprocessableError("Variant is not available for purchase");
  }

  // Get or create cart
  const cartResult = await getOrCreateCart(actor, sessionId);
  if (!cartResult) throw new NotFoundError("Cart not found");

  const existingItem = await repo.findCartItem(cartResult.id, data.variantId);
  const newQty = (existingItem?.quantity ?? 0) + data.quantity;

  // Reserve inventory (atomic): prevents oversell across parallel carts.
  if (inventoryTracked && inventoryPolicy === "deny") {
    const reserved = await repo.reserveInventoryForCart({
      cartId: cartResult.id,
      variantId: variant.id,
      quantity: newQty,
    });
    if (!reserved) {
      throw new UnprocessableError("Insufficient stock available");
    }
  }

  if (existingItem) {
    await repo.updateCartItemQuantity(existingItem.id, newQty);
  } else {
    await repo.addCartItem({
      cartId: cartResult.id,
      vendorId,
      productId: variant.productId,
      variantId: variant.id,
      title: productTitle,
      variantTitle: variant.title ?? null,
      sku: variant.sku ?? null,
      unitPrice: variant.price,
      quantity: data.quantity,
      requiresShipping: variant.requiresShipping,
      weightGrams: convertWeight(variant),
    });
  }

  await repo.recomputeCartTotals(cartResult.id);
  return repo.getCartWithItems(cartResult.id);
}

export async function updateItem(
  actor: AuthActor | undefined,
  itemId: string,
  data: { quantity: number },
  sessionId?: string
) {
  if (data.quantity < 1) throw new BadRequestError("Quantity must be at least 1");

  const item = await repo.findCartItemById(itemId);
  if (!item) throw new NotFoundError("Cart item not found");

  const cart = await repo.findCartById(item.cartId);
  if (!cart) throw new NotFoundError("Cart not found");

  assertCartOwnership(cart, actor, sessionId);

  // Re-reserve inventory atomically at the new total quantity.
  const variantData = await repo.findVariantForCart(item.variantId);
  if (variantData?.inventoryTracked && variantData.inventoryPolicy === "deny") {
    const reserved = await repo.reserveInventoryForCart({
      cartId: cart.id,
      variantId: item.variantId,
      quantity: data.quantity,
    });
    if (!reserved) {
      throw new UnprocessableError("Insufficient stock available");
    }
  }

  await repo.updateCartItemQuantity(itemId, data.quantity);
  await repo.recomputeCartTotals(cart.id);
  return repo.getCartWithItems(cart.id);
}

export async function removeItem(actor: AuthActor | undefined, itemId: string, sessionId?: string) {
  const item = await repo.findCartItemById(itemId);
  if (!item) throw new NotFoundError("Cart item not found");

  const cart = await repo.findCartById(item.cartId);
  if (!cart) throw new NotFoundError("Cart not found");

  assertCartOwnership(cart, actor, sessionId);

  // Release the reservation held for this variant (returns to availableQuantity)
  await repo.releaseReservationForCartVariant({
    cartId: cart.id,
    variantId: item.variantId,
  });

  await repo.deleteCartItem(itemId);
  await repo.recomputeCartTotals(cart.id);
  return { success: true };
}

export async function clearCart(actor?: AuthActor, sessionId?: string) {
  let cart: Awaited<ReturnType<typeof repo.findCartByCustomer>>;

  if (actor?.type === "customer") {
    cart = await repo.findCartByCustomer(actor.id);
  } else {
    if (!sessionId) throw new BadRequestError("Session ID required for guest cart");
    cart = await repo.findCartBySession(sessionId);
  }

  if (!cart) throw new NotFoundError("Cart not found");

  assertCartOwnership(cart, actor, sessionId);

  // Release all reservations first so the stock returns to availability.
  await repo.releaseAllReservationsForCart(cart.id);

  await repo.deleteAllCartItems(cart.id);
  await repo.recomputeCartTotals(cart.id);
  return { success: true };
}

// ─── Discount application ─────────────────────────────────────────────────────
// The actual discount validation logic lives in the discounts module.
// This service just manages the association.

export async function applyDiscountToCart(
  actor: AuthActor | undefined,
  cartId: string,
  discountData: {
    discountId: string | null;
    discountCodeId: string | null;
    code: string;
    title: string;
    type: "percentage" | "fixed_amount" | "free_shipping";
    targetType: "order" | "shipping";
    amount: string;
  },
  sessionId?: string
) {
  const cart = await repo.findCartById(cartId);
  if (!cart) throw new NotFoundError("Cart not found");
  assertCartOwnership(cart, actor, sessionId);

  const existing = await repo.findAppliedDiscount(cartId, discountData.code);
  if (existing) throw new ConflictError("Discount code already applied");

  await repo.addAppliedDiscount({ cartId, ...discountData });
  await repo.recomputeCartTotals(cartId);
  return repo.getCartWithItems(cartId);
}

export async function removeDiscountFromCart(
  actor: AuthActor | undefined,
  cartId: string,
  code: string,
  sessionId?: string
) {
  const cart = await repo.findCartById(cartId);
  if (!cart) throw new NotFoundError("Cart not found");
  assertCartOwnership(cart, actor, sessionId);

  await repo.removeAppliedDiscount(cartId, code);
  await repo.recomputeCartTotals(cartId);
  return repo.getCartWithItems(cartId);
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function getWishlist(actor: AuthActor) {
  if (actor.type !== "customer") throw new ForbiddenError();
  return repo.findWishlistByCustomer(actor.id);
}

export async function addToWishlist(actor: AuthActor, productId: string) {
  assertPermission(actor, "wishlist:manage:self");
  const existing = await repo.findWishlistItem(actor.id, productId);
  if (existing) throw new ConflictError("Product already in wishlist");
  return repo.addWishlistItem(actor.id, productId);
}

export async function removeFromWishlist(actor: AuthActor, productId: string) {
  assertPermission(actor, "wishlist:manage:self");
  await repo.removeWishlistItem(actor.id, productId);
  return { success: true };
}
