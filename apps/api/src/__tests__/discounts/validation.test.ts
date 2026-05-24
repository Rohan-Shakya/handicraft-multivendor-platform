/**
 * Unit tests for discount validation logic.
 * Tests the pure validation rules without DB calls.
 */
import { describe, it, expect } from "vitest";

// ─── Extracted validation logic ───────────────────────────────────────────────

interface Discount {
  status: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: string;
  startsAt: Date | null;
  endsAt: Date | null;
  minimumSubtotal: string | null;
  usageLimit: number | null;
  usageCount: number;
  firstOrderOnly: boolean;
  oncePerCustomer: boolean;
}

interface DiscountCode {
  status: string;
  endsAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
}

function computeDiscountAmount(
  discount: Discount,
  cartSubtotal: number
): string {
  const v = parseFloat(discount.value);
  if (discount.type === "percentage") {
    return (cartSubtotal * (v / 100)).toFixed(2);
  }
  if (discount.type === "fixed_amount") {
    return Math.min(v, cartSubtotal).toFixed(2);
  }
  return "0"; // free_shipping
}

function validateDiscount(
  discount: Discount,
  discountCode: DiscountCode,
  cartSubtotal: number,
  customerId: string | null,
  customerOrderCount: number,
  customerRedemptionCount: number
): string | null {
  if (discount.status !== "active") return "Discount is not active";

  const now = new Date();
  if (discount.startsAt && now < discount.startsAt) return "Discount has not started yet";
  if (discount.endsAt && now > discount.endsAt) return "Discount has expired";
  if (discountCode.endsAt && now > discountCode.endsAt) return "Discount code has expired";

  if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
    return "Discount usage limit reached";
  }
  if (discountCode.usageLimit !== null && discountCode.usageCount >= discountCode.usageLimit) {
    return "Discount code usage limit reached";
  }

  if (discount.minimumSubtotal && cartSubtotal < parseFloat(discount.minimumSubtotal)) {
    return `Minimum order of ${discount.minimumSubtotal} required`;
  }

  // Guest checks (must be blocked BEFORE checking customerId)
  if (discount.firstOrderOnly && !customerId) {
    return "This discount is only available to registered customers — please sign in";
  }
  if (discount.oncePerCustomer && !customerId) {
    return "This discount requires a customer account — please sign in";
  }

  if (customerId) {
    if (discount.oncePerCustomer && customerRedemptionCount > 0) {
      return "This discount has already been used";
    }
    if (discount.firstOrderOnly && customerOrderCount > 0) {
      return "This discount is only for first-time orders";
    }
  }

  return null; // valid
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const activeDiscount: Discount = {
  status: "active",
  type: "percentage",
  value: "10",
  startsAt: null,
  endsAt: null,
  minimumSubtotal: null,
  usageLimit: null,
  usageCount: 0,
  firstOrderOnly: false,
  oncePerCustomer: false,
};

const activeCode: DiscountCode = {
  status: "active",
  endsAt: null,
  usageLimit: null,
  usageCount: 0,
};

describe("discount amount computation", () => {
  it("calculates percentage discount", () => {
    expect(computeDiscountAmount({ ...activeDiscount, type: "percentage", value: "10" }, 100)).toBe("10.00");
    expect(computeDiscountAmount({ ...activeDiscount, type: "percentage", value: "15" }, 200)).toBe("30.00");
  });

  it("calculates fixed_amount discount, capped at subtotal", () => {
    expect(computeDiscountAmount({ ...activeDiscount, type: "fixed_amount", value: "20" }, 100)).toBe("20.00");
    expect(computeDiscountAmount({ ...activeDiscount, type: "fixed_amount", value: "150" }, 100)).toBe("100.00");
  });

  it("free_shipping discount always returns 0 at cart stage", () => {
    expect(computeDiscountAmount({ ...activeDiscount, type: "free_shipping", value: "0" }, 100)).toBe("0");
  });
});

describe("discount validation", () => {
  it("accepts a valid discount for a logged-in customer", () => {
    const error = validateDiscount(activeDiscount, activeCode, 100, "cust-1", 5, 0);
    expect(error).toBeNull();
  });

  it("rejects inactive discount", () => {
    const error = validateDiscount({ ...activeDiscount, status: "archived" }, activeCode, 100, "cust-1", 0, 0);
    expect(error).toMatch(/not active/);
  });

  it("rejects discount that hasn't started", () => {
    const future = new Date(Date.now() + 86400000);
    const error = validateDiscount({ ...activeDiscount, startsAt: future }, activeCode, 100, "cust-1", 0, 0);
    expect(error).toMatch(/not started/);
  });

  it("rejects expired discount", () => {
    const past = new Date(Date.now() - 86400000);
    const error = validateDiscount({ ...activeDiscount, endsAt: past }, activeCode, 100, "cust-1", 0, 0);
    expect(error).toMatch(/expired/);
  });

  it("rejects expired discount code", () => {
    const past = new Date(Date.now() - 86400000);
    const error = validateDiscount(activeDiscount, { ...activeCode, endsAt: past }, 100, "cust-1", 0, 0);
    expect(error).toMatch(/code has expired/);
  });

  it("rejects when discount global usage limit is reached", () => {
    const error = validateDiscount(
      { ...activeDiscount, usageLimit: 5, usageCount: 5 },
      activeCode, 100, "cust-1", 0, 0
    );
    expect(error).toMatch(/usage limit reached/);
  });

  it("rejects when code usage limit is reached", () => {
    const error = validateDiscount(
      activeDiscount,
      { ...activeCode, usageLimit: 1, usageCount: 1 },
      100, "cust-1", 0, 0
    );
    expect(error).toMatch(/code usage limit reached/);
  });

  it("rejects when minimum subtotal not met", () => {
    const error = validateDiscount(
      { ...activeDiscount, minimumSubtotal: "50.00" },
      activeCode, 30, "cust-1", 0, 0
    );
    expect(error).toMatch(/Minimum order/);
  });

  it("accepts when minimum subtotal is exactly met", () => {
    const error = validateDiscount(
      { ...activeDiscount, minimumSubtotal: "50.00" },
      activeCode, 50, "cust-1", 0, 0
    );
    expect(error).toBeNull();
  });

  describe("firstOrderOnly", () => {
    const firstOrderDiscount = { ...activeDiscount, firstOrderOnly: true };

    it("accepts for customer with 0 prior orders", () => {
      expect(validateDiscount(firstOrderDiscount, activeCode, 100, "cust-1", 0, 0)).toBeNull();
    });

    it("rejects for customer with prior orders", () => {
      const error = validateDiscount(firstOrderDiscount, activeCode, 100, "cust-1", 3, 0);
      expect(error).toMatch(/first-time/);
    });

    it("rejects for guest (no customerId) — cannot verify first-order status", () => {
      const error = validateDiscount(firstOrderDiscount, activeCode, 100, null, 0, 0);
      expect(error).toMatch(/registered customers/);
    });
  });

  describe("oncePerCustomer", () => {
    const onceDicount = { ...activeDiscount, oncePerCustomer: true };

    it("accepts for customer who hasn't used it before", () => {
      expect(validateDiscount(onceDicount, activeCode, 100, "cust-1", 0, 0)).toBeNull();
    });

    it("rejects for customer who has already used it", () => {
      const error = validateDiscount(onceDicount, activeCode, 100, "cust-1", 0, 1);
      expect(error).toMatch(/already been used/);
    });

    it("rejects for guest — cannot enforce per-customer limit", () => {
      const error = validateDiscount(onceDicount, activeCode, 100, null, 0, 0);
      expect(error).toMatch(/customer account/);
    });
  });
});
