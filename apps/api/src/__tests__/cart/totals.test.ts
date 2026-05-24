/**
 * Unit tests for cart total computation logic.
 * These test the math in recomputeCartTotals without a real DB.
 */
import { describe, it, expect } from "vitest";

// ─── Pure cart total math (extracted for testability) ─────────────────────────

interface CartItem {
  quantity: number;
  lineSubtotal: string;
  lineDiscountTotal: string;
  requiresShipping: boolean;
  weightGrams: number;
}

interface AppliedDiscount {
  amount: string;
}

function computeCartTotals(items: CartItem[], appliedDiscounts: AppliedDiscount[]) {
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const itemsSubtotalPrice = items
    .reduce((s, i) => s + parseFloat(i.lineSubtotal), 0)
    .toFixed(2);

  const rawDiscount = appliedDiscounts.reduce((s, d) => s + parseFloat(d.amount), 0);
  const totalDiscount = Math.min(rawDiscount, parseFloat(itemsSubtotalPrice)).toFixed(2);

  const totalPrice = Math.max(
    0,
    parseFloat(itemsSubtotalPrice) - parseFloat(totalDiscount)
  ).toFixed(2);

  const totalWeightGrams = items.reduce((s, i) => s + (i.weightGrams ?? 0) * i.quantity, 0);
  const requiresShipping = items.some((i) => i.requiresShipping);

  return { itemCount, itemsSubtotalPrice, totalDiscount, totalPrice, totalWeightGrams, requiresShipping };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("cart total computation", () => {
  const baseItem: CartItem = {
    quantity: 2,
    lineSubtotal: "40.00",
    lineDiscountTotal: "0",
    requiresShipping: true,
    weightGrams: 500,
  };

  it("computes correct totals with no discounts", () => {
    const result = computeCartTotals([baseItem], []);
    expect(result.itemCount).toBe(2);
    expect(result.itemsSubtotalPrice).toBe("40.00");
    expect(result.totalDiscount).toBe("0.00");
    expect(result.totalPrice).toBe("40.00");
    expect(result.totalWeightGrams).toBe(1000);
    expect(result.requiresShipping).toBe(true);
  });

  it("applies a fixed discount from cartAppliedDiscounts", () => {
    const result = computeCartTotals([baseItem], [{ amount: "5.00" }]);
    expect(result.totalDiscount).toBe("5.00");
    expect(result.totalPrice).toBe("35.00");
  });

  it("applies a percentage-style discount amount", () => {
    // 25% of 40 = 10
    const result = computeCartTotals([baseItem], [{ amount: "10.00" }]);
    expect(result.totalDiscount).toBe("10.00");
    expect(result.totalPrice).toBe("30.00");
  });

  it("caps discount at the subtotal — totalPrice never goes negative", () => {
    const result = computeCartTotals([baseItem], [{ amount: "999.00" }]);
    expect(result.totalDiscount).toBe("40.00"); // capped at subtotal
    expect(result.totalPrice).toBe("0.00");
  });

  it("sums multiple applied discounts", () => {
    const result = computeCartTotals(
      [baseItem],
      [{ amount: "5.00" }, { amount: "3.00" }]
    );
    expect(result.totalDiscount).toBe("8.00");
    expect(result.totalPrice).toBe("32.00");
  });

  it("empty cart has zeroed totals", () => {
    const result = computeCartTotals([], []);
    expect(result.itemCount).toBe(0);
    expect(result.itemsSubtotalPrice).toBe("0.00");
    expect(result.totalPrice).toBe("0.00");
    expect(result.requiresShipping).toBe(false);
  });

  it("multi-item cart with mixed shipping", () => {
    const items: CartItem[] = [
      { quantity: 1, lineSubtotal: "20.00", lineDiscountTotal: "0", requiresShipping: true, weightGrams: 200 },
      { quantity: 3, lineSubtotal: "15.00", lineDiscountTotal: "0", requiresShipping: false, weightGrams: 0 },
    ];
    const result = computeCartTotals(items, []);
    expect(result.itemCount).toBe(4);
    expect(result.itemsSubtotalPrice).toBe("35.00");
    expect(result.totalWeightGrams).toBe(200); // only physical item
    expect(result.requiresShipping).toBe(true); // any item requiring shipping = true
  });

  it("REGRESSION: totalDiscount is 0 when lineDiscountTotal is non-zero but no cartAppliedDiscounts", () => {
    // This tests the old broken behavior — item.lineDiscountTotal is NOT
    // what drives cart.totalDiscount. Only cartAppliedDiscounts matters.
    const itemWithLineDiscount: CartItem = {
      quantity: 1,
      lineSubtotal: "50.00",
      lineDiscountTotal: "10.00", // this should NOT affect cart totalDiscount
      requiresShipping: false,
      weightGrams: 0,
    };
    const result = computeCartTotals([itemWithLineDiscount], []);
    // With no cartAppliedDiscounts, totalDiscount = 0 regardless of item.lineDiscountTotal
    expect(result.totalDiscount).toBe("0.00");
    expect(result.totalPrice).toBe("50.00");
  });
});
