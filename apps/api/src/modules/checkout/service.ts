/**
 * Checkout Service
 *
 * Orchestrates the checkout flow:
 * 1. Validate cart ownership and contents
 * 2. Validate all variant inventory is sufficient
 * 3. Delegate to orders repository for the transactional order creation
 *
 * This module intentionally does NOT manage the payment — payments are recorded
 * separately after checkout via the payments module.
 */
import { eq, and } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import {
  carts,
  cartItems,
  giftCards,
  inventoryItems,
  orders,
  payments,
  variants as variantsTable,
  customerAddresses,
  customers,
  vendors,
} from "../../db/schema/index.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "../../lib/errors.js";
import { sumMoney, toCents, fromCents, addMoney } from "../../lib/money.js";
import { generateId } from "../../lib/id.js";
import { calculateShipping } from "../shipping/service.js";
import { calculateTax } from "../tax/service.js";
import { placeOrder as repoPlaceOrder } from "../orders/repository.js";
import type { AddressSnapshot } from "../orders/types.js";
import { redeemGiftCardForOrder } from "../gift-cards/service.js";
import { sendEmail } from "../../lib/email.js";
import { orderConfirmationEmail, vendorNewOrderEmail } from "../../lib/email-templates.js";
import { logger } from "../../lib/logger.js";

export interface CheckoutInput {
  cartId: string;
  shippingAddressId?: string;  // use saved customer address
  shippingAddress?: AddressSnapshot; // or provide inline
  billingAddressId?: string;
  billingAddress?: AddressSnapshot;
  sameAsBilling?: boolean;
  note?: string;
  /** Optional gift card code to redeem against the order total at checkout. */
  giftCardCode?: string;
}

export interface CheckoutPreviewItem {
  variantId: string;
  productId: string;
  vendorId: string;
  title: string;
  variantTitle: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  requiresShipping: boolean;
}

export interface VendorGroup {
  vendorId: string;
  items: CheckoutPreviewItem[];
  subtotal: string;
}

export interface CheckoutPreview {
  cartId: string;
  itemCount: number;
  subtotalPrice: string;
  totalDiscount: string;
  shippingPrice: string;
  taxTotal: string;
  totalPrice: string;
  vendorGroups: VendorGroup[];
  requiresShipping: boolean;
}

/**
 * Returns a preview of what the order will look like.
 * No side effects. Use before the final checkout.
 */
export async function previewCheckout(
  actor: AuthActor | undefined,
  cartId: string,
  sessionId?: string
): Promise<CheckoutPreview> {
  const cart = await db.select().from(carts).where(eq(carts.id, cartId)).then(r => r[0] ?? null);
  if (!cart) throw new NotFoundError("Cart not found");
  if (cart.status !== "active") throw new BadRequestError("Cart is no longer active");

  // Ownership check
  if (actor?.type === "customer") {
    if (cart.customerId !== actor.id) throw new ForbiddenError("Not your cart");
  } else {
    if (!sessionId || cart.sessionId !== sessionId) throw new ForbiddenError("Not your cart");
  }

  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  if (items.length === 0) throw new BadRequestError("Cart is empty");

  const vendorGroupMap = new Map<string, CheckoutPreviewItem[]>();
  for (const item of items) {
    const group = vendorGroupMap.get(item.vendorId) ?? [];
    group.push({
      variantId: item.variantId,
      productId: item.productId,
      vendorId: item.vendorId,
      title: item.title,
      variantTitle: item.variantTitle ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      requiresShipping: item.requiresShipping,
    });
    vendorGroupMap.set(item.vendorId, group);
  }

  const vendorGroups: VendorGroup[] = [];
  for (const [vendorId, vendorItems] of vendorGroupMap) {
    const subtotal = sumMoney(vendorItems.map((i) => i.lineTotal));
    vendorGroups.push({ vendorId, items: vendorItems, subtotal });
  }

  // Calculate shipping and tax estimates
  // Tax should be calculated on the discounted subtotal (subtotal - discount)
  const subtotalCents = toCents(cart.itemsSubtotalPrice);
  const discountCents = toCents(cart.totalDiscount);
  const taxableSubtotal = Math.max(0, subtotalCents - discountCents);

  // For preview, we don't know the shipping country yet — show $0 shipping/tax
  // The real values are calculated at checkout when the address is provided
  const shippingCents = 0;
  const taxCents = 0;

  const shippingPrice = fromCents(shippingCents);
  const taxTotal = fromCents(taxCents);
  const totalPrice = addMoney(addMoney(cart.totalPrice, shippingPrice), taxTotal);

  return {
    cartId,
    itemCount: cart.itemCount,
    subtotalPrice: cart.itemsSubtotalPrice,
    totalDiscount: cart.totalDiscount,
    shippingPrice,
    taxTotal,
    totalPrice,
    vendorGroups,
    requiresShipping: cart.requiresShipping,
  };
}

/**
 * Validate inventory for all cart items before checkout.
 * Throws UnprocessableError if any item is out of stock.
 */
async function validateInventory(cartId: string): Promise<void> {
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));

  for (const item of items) {
    const [variant] = await db
      .select()
      .from(variantsTable)
      .where(eq(variantsTable.id, item.variantId));

    if (!variant) {
      throw new UnprocessableError(`Variant ${item.variantId} no longer exists`);
    }
    if (variant.status !== "active") {
      throw new UnprocessableError(`"${item.title}" is no longer available`);
    }

    if (variant.inventoryTracked) {
      const [inv] = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.variantId, item.variantId));

      if (inv && inv.tracked && variant.inventoryPolicy === "deny") {
        if (inv.availableQuantity < item.quantity) {
          throw new UnprocessableError(
            `Insufficient stock for "${item.title}": only ${inv.availableQuantity} available`
          );
        }
      }
    }
  }
}

/**
 * Resolve an address snapshot from either an inline address or a saved address ID.
 */
async function resolveAddress(
  customerId: string | undefined,
  addressId?: string,
  inlineAddress?: AddressSnapshot
): Promise<AddressSnapshot | undefined> {
  if (inlineAddress) return inlineAddress;
  if (!addressId || !customerId) return undefined;

  const [addr] = await db
    .select()
    .from(customerAddresses)
    .where(
      and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, customerId))
    );

  if (!addr) throw new NotFoundError("Shipping address not found");
  return {
    firstName: addr.firstName ?? undefined,
    lastName: addr.lastName ?? undefined,
    company: addr.company ?? undefined,
    phone: addr.phone ?? undefined,
    address1: addr.address1,
    address2: addr.address2 ?? undefined,
    city: addr.city,
    province: addr.province ?? undefined,
    provinceCode: addr.provinceCode ?? undefined,
    country: addr.country,
    countryCode: addr.countryCode,
    zip: addr.zip,
  };
}

/**
 * Place the order.
 * Validates cart, resolves addresses, validates inventory, then delegates to placeOrder transaction.
 */
export async function checkout(
  actor: AuthActor | undefined,
  input: CheckoutInput,
  sessionId?: string
) {
  const cart = await db.select().from(carts).where(eq(carts.id, input.cartId)).then(r => r[0] ?? null);
  if (!cart) throw new NotFoundError("Cart not found");
  if (cart.status !== "active") throw new BadRequestError("Cart is no longer active");

  // Ownership
  const customerId = actor?.type === "customer" ? actor.id : undefined;
  if (actor?.type === "customer") {
    if (cart.customerId !== actor.id) throw new ForbiddenError("Not your cart");
  } else {
    if (!sessionId || cart.sessionId !== sessionId) throw new ForbiddenError("Not your cart");
  }

  await validateInventory(input.cartId);

  // Pre-validate the gift card BEFORE creating the order so the customer sees
  // a clean 422 if the code is invalid / expired / depleted, instead of an
  // orphan order. The actual debit happens after the order row exists.
  const giftCardCode = input.giftCardCode?.trim().toUpperCase();
  if (giftCardCode) {
    const [card] = await db
      .select()
      .from(giftCards)
      .where(eq(giftCards.code, giftCardCode))
      .limit(1);
    if (!card) {
      throw new UnprocessableError("Gift card code is invalid");
    }
    if (card.status !== "active") {
      throw new UnprocessableError("Gift card is not active");
    }
    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new UnprocessableError("Gift card has expired");
    }
    if (card.currentBalance <= 0) {
      throw new UnprocessableError("Gift card has no remaining balance");
    }
  }

  const shippingAddress = await resolveAddress(
    customerId,
    input.shippingAddressId,
    input.shippingAddress
  );
  let billingAddress: AddressSnapshot | undefined;
  if (input.sameAsBilling) {
    billingAddress = shippingAddress;
  } else {
    billingAddress = await resolveAddress(
      customerId,
      input.billingAddressId,
      input.billingAddress
    );
  }

  const shippingCountry = shippingAddress?.countryCode ?? "US";
  const shippingProvince = shippingAddress?.provinceCode ?? undefined;

  const subtotalCents = toCents(cart.itemsSubtotalPrice);
  const discountCents = toCents(cart.totalDiscount);
  const taxableSubtotal = Math.max(0, subtotalCents - discountCents);

  const availableRates = await calculateShipping(shippingCountry, 0, subtotalCents);
  const cheapestRate = availableRates[0];
  const shippingCents = cheapestRate?.price ?? 0;

  // Tax is calculated on the discounted subtotal, not the original subtotal.
  // For inclusive zones, `taxCents` is the portion of the subtotal that is
  // tax (e.g. NPR 13/113 of an inclusive-VAT line); we pass that through to
  // placeOrder along with `taxInclusive` so it's not double-added to the total.
  const { taxTotal: taxCents, taxInclusive } = await calculateTax(
    shippingCountry,
    shippingProvince,
    taxableSubtotal,
    shippingCents
  );

  let customerEmail: string | undefined;
  let customerFirstName: string | undefined;
  let customerLastName: string | undefined;
  let customerPhone: string | undefined;

  if (customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (cust) {
      customerEmail = cust.email;
      customerFirstName = cust.firstName ?? undefined;
      customerLastName = cust.lastName ?? undefined;
      customerPhone = cust.phone ?? undefined;
    }
  } else {
    // Guest checkout — use email stored on cart (normalized to lowercase to
    // match the DB CHECK constraint on orders.customer_email).
    customerEmail = cart.email ? cart.email.toLowerCase() : undefined;
  }

  const order = await repoPlaceOrder({
    cartId: input.cartId,
    customerId,
    customerEmail,
    customerFirstName,
    customerLastName,
    customerPhone,
    shippingAddress,
    billingAddress,
    shippingPrice: fromCents(shippingCents),
    taxTotal: fromCents(taxCents),
    taxInclusive,
    note: input.note,
  });

  // The order is in the DB; debit the card and record a payments row against
  // it. Failures here are loud — the order exists, so we surface the error
  // and let the customer retry payment from the order detail page.
  let giftCardRedemption: { debited: number; balanceAfter: number } | null = null;
  if (giftCardCode) {
    try {
      // Gift card balances and amounts are stored in minor units (cents/paisa).
      // The helper compares the requested amount directly against
      // `currentBalance`, so we must pass cents in.
      const orderTotalCents = toCents(order.totalPrice);
      const redemption = await redeemGiftCardForOrder(
        giftCardCode,
        orderTotalCents,
        order.id
      );
      giftCardRedemption = {
        debited: redemption.debited,
        balanceAfter: redemption.balanceAfter,
      };

      // Insert a payments row for the gift-card-funded portion.
      // `redemption.debited` is already in minor units — no further conversion.
      const debitedCents = redemption.debited;
      await db.insert(payments).values({
        id: generateId(),
        orderId: order.id,
        customerId: customerId ?? null,
        provider: "gift_card",
        // Compose the provider id with the order id so the same card used
        // across multiple orders doesn't collide on the unique
        // (provider, providerPaymentId) index.
        providerPaymentId: `${redemption.giftCardId}:${order.id}`,
        currencyCode: order.currencyCode ?? redemption.currencyCode,
        status: "captured",
        amountAuthorized: fromCents(debitedCents),
        amountCaptured: fromCents(debitedCents),
        capturedAt: new Date(),
      });

      // Update order totals. `paid` only when the gift card covers the whole
      // amount, otherwise `partially_paid` and the customer goes through the
      // normal provider redirect for the remainder.
      const newTotalPaidCents = toCents(order.totalPaid ?? "0") + debitedCents;
      const fullyPaid = newTotalPaidCents >= orderTotalCents;
      await db
        .update(orders)
        .set({
          totalPaid: fromCents(newTotalPaidCents),
          paymentStatus: fullyPaid ? "paid" : "partially_paid",
          paidAt: fullyPaid ? new Date() : (order.paidAt ?? null),
        })
        .where(eq(orders.id, order.id));

      // Reflect on the returned object so the storefront can render the split
      // without a second fetch.
      (order as any).totalPaid = fromCents(newTotalPaidCents);
      (order as any).paymentStatus = fullyPaid ? "paid" : "partially_paid";
      (order as any).giftCardApplied = {
        debited: redemption.debited,
        balanceAfter: redemption.balanceAfter,
        currencyCode: redemption.currencyCode,
      };
    } catch (err) {
      logger.error(
        { err, orderId: order.id, giftCardCode },
        "Gift card redemption failed after order placement"
      );
      // Re-throw so the caller knows the order was placed but the gift card
      // could not be applied. The order remains payable via another method.
      throw err;
    }
  }

  if (customerEmail) {
    const items = await db.select().from(cartItems).where(eq(cartItems.cartId, input.cartId));
    const emailData = orderConfirmationEmail({
      orderNumber: order.orderNumber,
      customerName: customerFirstName ?? "Customer",
      items: items.map((i) => ({
        title: i.title + (i.variantTitle ? ` — ${i.variantTitle}` : ""),
        quantity: i.quantity,
        price: i.lineTotal,
      })),
      subtotal: order.subtotalPrice,
      shipping: order.shippingPrice,
      tax: order.taxTotal,
      total: order.totalPrice,
      shippingAddress: shippingAddress
        ? { address1: shippingAddress.address1, city: shippingAddress.city ?? "", country: shippingAddress.country ?? "", zip: shippingAddress.zip ?? "" }
        : undefined,
    });
    sendEmail({
      to: customerEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      category: "order_updates",
      recipient: order.customerId ? { customerId: order.customerId } : undefined,
    }).catch((err) => {
      logger.error({ err, orderId: order.id, to: customerEmail }, "Failed to send order confirmation email");
    });
  }

  const cartItemRows = await db.select().from(cartItems).where(eq(cartItems.cartId, input.cartId));
  const vendorGroupMap = new Map<string, typeof cartItemRows>();
  for (const item of cartItemRows) {
    const group = vendorGroupMap.get(item.vendorId) ?? [];
    group.push(item);
    vendorGroupMap.set(item.vendorId, group);
  }

  for (const [vendorId, vendorItems] of vendorGroupMap) {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId));
    if (vendor?.primaryEmail) {
      const vendorTotal = sumMoney(vendorItems.map((i) => i.lineTotal));
      const emailData = vendorNewOrderEmail({
        vendorName: vendor.name,
        orderNumber: order.orderNumber,
        itemCount: vendorItems.reduce((s, i) => s + i.quantity, 0),
        total: vendorTotal,
      });
      // Vendor new-order email is operational, not marketing — we want the
      // vendor to know they have an order to fulfil. Still tagged
      // `vendor_updates` so a vendor user can opt out if they prefer
      // dashboard-only notifications.
      sendEmail({
        to: vendor.primaryEmail,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        category: "vendor_updates",
      }).catch((err) => {
        logger.error({ err, orderId: order.id, vendorId }, "Failed to send vendor new-order email");
      });
    }
  }

  return order;
}
