import type { AuthActor } from "@repo/types";
import { assertPermission } from "../../lib/permissions.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from "../../lib/errors.js";
import * as repo from "./repository.js";
import * as cartRepo from "../cart/repository.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import type {
  CreateDiscountDto,
  UpdateDiscountDto,
  CreateDiscountCodeDto,
  ApplyDiscountInput,
  DiscountFilters,
} from "./types.js";

export async function listDiscounts(actor: AuthActor, filters: DiscountFilters) {
  assertPermission(actor, "discount:manage:any");
  return repo.findDiscounts(filters);
}

export async function getDiscountById(actor: AuthActor, id: string) {
  assertPermission(actor, "discount:manage:any");
  const discount = await repo.findDiscountById(id);
  if (!discount) throw new NotFoundError("Discount not found");
  return discount;
}

export async function createDiscount(actor: AuthActor, data: CreateDiscountDto) {
  assertPermission(actor, "discount:manage:any");

  if (data.type === "percentage" && (data.value <= 0 || data.value > 100)) {
    throw new BadRequestError("Percentage discount must be between 0 and 100");
  }

  const discount = await repo.createDiscount(data, actor.id);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "discount",
    entityId: discount.id,
    action: "discount.created",
    afterJson: discount,
  });

  return discount;
}

export async function updateDiscount(
  actor: AuthActor,
  id: string,
  data: UpdateDiscountDto
) {
  assertPermission(actor, "discount:manage:any");
  const discount = await repo.updateDiscount(id, data);
  if (!discount) throw new NotFoundError("Discount not found");

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "discount",
    entityId: id,
    action: "discount.updated",
    afterJson: discount,
  });

  return discount;
}

export async function archiveDiscount(actor: AuthActor, id: string) {
  assertPermission(actor, "discount:manage:any");
  const before = await repo.findDiscountById(id);
  if (!before) throw new NotFoundError("Discount not found");

  const discount = await repo.archiveDiscount(id);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "discount",
    entityId: id,
    action: "discount.archived",
    beforeJson: before,
  });

  return discount;
}

export async function listDiscountCodes(actor: AuthActor, discountId: string) {
  assertPermission(actor, "discount:manage:any");
  const discount = await repo.findDiscountById(discountId);
  if (!discount) throw new NotFoundError("Discount not found");
  return repo.findDiscountCodesByDiscount(discountId);
}

export async function createDiscountCode(actor: AuthActor, data: CreateDiscountCodeDto) {
  assertPermission(actor, "discount:manage:any");
  const discount = await repo.findDiscountById(data.discountId);
  if (!discount) throw new NotFoundError("Discount not found");

  return repo.createDiscountCode(data);
}

/**
 * Validates a discount code and applies it to a cart.
 *
 * Validation rules:
 * 1. Code must exist, be active, and not expired
 * 2. Discount must be active and within date range
 * 3. Usage limit not exceeded (code and discount level)
 * 4. Minimum subtotal met
 * 5. firstOrderOnly: customer must have 0 previous orders
 * 6. oncePerCustomer: customer has not used this discount before
 */
export async function applyDiscountCode(input: ApplyDiscountInput) {
  const { code, cartId, customerId, cartSubtotal } = input;

  const codeRow = await repo.findDiscountCodeByCode(code.toUpperCase());
  if (!codeRow) {
    throw new UnprocessableError("Invalid or expired discount code");
  }

  const { code: discountCode, discount } = codeRow;

  if (discount.status !== "active") {
    throw new UnprocessableError("Discount is not active");
  }

  const now = new Date();
  if (discount.startsAt && now < discount.startsAt) {
    throw new UnprocessableError("Discount has not started yet");
  }
  if (discount.endsAt && now > discount.endsAt) {
    throw new UnprocessableError("Discount has expired");
  }
  if (discountCode.endsAt && now > discountCode.endsAt) {
    throw new UnprocessableError("Discount code has expired");
  }

  if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
    throw new UnprocessableError("Discount usage limit reached");
  }
  if (
    discountCode.usageLimit !== null &&
    discountCode.usageCount >= discountCode.usageLimit
  ) {
    throw new UnprocessableError("Discount code usage limit reached");
  }

  if (discount.minimumSubtotal && cartSubtotal < parseFloat(discount.minimumSubtotal)) {
    throw new UnprocessableError(
      `Minimum order of ${discount.minimumSubtotal} required for this discount`
    );
  }

  // Scope check — reject discounts whose scope doesn't overlap the cart.
  //   platform          → always eligible
  //   vendor            → cart must contain ONLY items from the vendorId
  //   targeted_vendors  → cart must contain AT LEAST one item from the
  //                       targeted vendors list
  if (discount.scope === "vendor" || discount.scope === "targeted_vendors") {
    const items = await cartRepo.findCartItemsWithVendor(cartId);
    if (items.length === 0) {
      throw new UnprocessableError("Cart is empty");
    }
    const cartVendorIds = new Set(items.map((i) => i.vendorId));

    if (discount.scope === "vendor") {
      // A vendor-scoped discount must target ONE vendor. Reject if the cart
      // contains items from any other vendor.
      if (!discount.vendorId) {
        throw new UnprocessableError("Discount is missing its vendor target");
      }
      if (cartVendorIds.size !== 1 || !cartVendorIds.has(discount.vendorId)) {
        throw new UnprocessableError(
          "This discount is only valid for items from a single specific vendor — remove other items to use it"
        );
      }
    }

    if (discount.scope === "targeted_vendors") {
      const targets = await repo.findDiscountVendorTargets(discount.id);
      const targetIds = new Set(targets.map((t) => t.vendorId));
      const overlap = [...cartVendorIds].some((v) => targetIds.has(v));
      if (!overlap) {
        throw new UnprocessableError(
          "This discount isn't valid for any of the vendors in your cart"
        );
      }
    }
  }

  // Guest customers (no customerId) cannot use customer-restricted discounts —
  // we have no identity to track usage against.
  if (discount.firstOrderOnly && !customerId) {
    throw new UnprocessableError(
      "This discount is only available to registered customers — please sign in"
    );
  }
  if (discount.oncePerCustomer && !customerId) {
    throw new UnprocessableError(
      "This discount requires a customer account — please sign in"
    );
  }

  if (customerId) {
    if (discount.oncePerCustomer) {
      const redemptionCount = await repo.countCustomerRedemptions(discount.id, customerId);
      if (redemptionCount > 0) {
        throw new UnprocessableError("This discount has already been used");
      }
    }
    if (discount.firstOrderOnly) {
      const orderCount = await repo.countCustomerOrders(customerId);
      if (orderCount > 0) {
        throw new UnprocessableError("This discount is only for first-time orders");
      }
    }
  }

  const discountValue = parseFloat(String(discount.value));
  let discountAmount: string;

  if (discount.type === "percentage") {
    discountAmount = (cartSubtotal * (discountValue / 100)).toFixed(2);
  } else if (discount.type === "fixed_amount") {
    discountAmount = Math.min(discountValue, cartSubtotal).toFixed(2);
  } else {
    // free_shipping — amount = 0 for now (shipping not computed at cart stage)
    discountAmount = "0";
  }

  const existing = await cartRepo.findAppliedDiscount(cartId, code.toUpperCase());
  if (existing) {
    throw new ConflictError("Discount code already applied to cart");
  }

  await cartRepo.addAppliedDiscount({
    cartId,
    discountId: discount.id,
    discountCodeId: discountCode.id,
    code: code.toUpperCase(),
    title: discount.title,
    type: discount.type,
    targetType: discount.targetType,
    amount: discountAmount,
  });

  await repo.createRedemptionRecord({
    discountId: discount.id,
    discountCodeId: discountCode.id,
    cartId,
    customerId,
    code: code.toUpperCase(),
    amount: discountAmount,
  });

  await cartRepo.recomputeCartTotals(cartId);
  const cart = await cartRepo.getCartWithItems(cartId);

  return { cart, discountAmount, discountTitle: discount.title };
}
