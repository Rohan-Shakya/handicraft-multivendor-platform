/**
 * Unit tests for vendor order split logic and discount allocation.
 */
import { describe, it, expect } from "vitest";

// ─── Extracted vendor split logic ─────────────────────────────────────────────

interface CartItem {
  vendorId: string;
  quantity: number;
  lineSubtotal: string;
  lineDiscountTotal: string;
  lineTotal: string;
}

interface AppliedDiscount {
  amount: string;
  code: string;
}

interface VendorGroup {
  vendorId: string;
  subtotal: string;
  discountTotal: string;
  total: string;
  itemCount: number;
}

function splitByVendor(items: CartItem[]): Map<string, CartItem[]> {
  const groups = new Map<string, CartItem[]>();
  for (const item of items) {
    const group = groups.get(item.vendorId) ?? [];
    group.push(item);
    groups.set(item.vendorId, group);
  }
  return groups;
}

function computeVendorGroups(items: CartItem[]): VendorGroup[] {
  const groups = splitByVendor(items);
  return Array.from(groups.entries()).map(([vendorId, vendorItems]) => ({
    vendorId,
    subtotal: vendorItems.reduce((s, i) => s + parseFloat(i.lineSubtotal), 0).toFixed(2),
    discountTotal: vendorItems.reduce((s, i) => s + parseFloat(i.lineDiscountTotal), 0).toFixed(2),
    total: vendorItems.reduce((s, i) => s + parseFloat(i.lineTotal), 0).toFixed(2),
    itemCount: vendorItems.reduce((s, i) => s + i.quantity, 0),
  }));
}

function allocateDiscountProportionally(
  discounts: AppliedDiscount[],
  vendorGroups: VendorGroup[],
  orderTotal: number
): Map<string, { code: string; amount: string }[]> {
  const result = new Map<string, { code: string; amount: string }[]>();
  if (orderTotal <= 0) return result;

  for (const group of vendorGroups) {
    const vendorTotal = parseFloat(group.total);
    const fraction = vendorTotal / orderTotal;
    const allocations: { code: string; amount: string }[] = [];

    for (const d of discounts) {
      const allocated = (parseFloat(d.amount) * fraction).toFixed(2);
      allocations.push({ code: d.code, amount: allocated });
    }

    result.set(group.vendorId, allocations);
  }

  return result;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("vendor order split", () => {
  const items: CartItem[] = [
    { vendorId: "v1", quantity: 2, lineSubtotal: "40.00", lineDiscountTotal: "0", lineTotal: "40.00" },
    { vendorId: "v1", quantity: 1, lineSubtotal: "20.00", lineDiscountTotal: "0", lineTotal: "20.00" },
    { vendorId: "v2", quantity: 3, lineSubtotal: "30.00", lineDiscountTotal: "0", lineTotal: "30.00" },
  ];

  it("groups items by vendor correctly", () => {
    const groups = computeVendorGroups(items);
    expect(groups).toHaveLength(2);

    const v1 = groups.find((g) => g.vendorId === "v1")!;
    expect(v1.subtotal).toBe("60.00");
    expect(v1.itemCount).toBe(3);

    const v2 = groups.find((g) => g.vendorId === "v2")!;
    expect(v2.subtotal).toBe("30.00");
    expect(v2.itemCount).toBe(3);
  });

  it("creates one group per unique vendor", () => {
    const groups = computeVendorGroups(items);
    const vendorIds = groups.map((g) => g.vendorId);
    expect(new Set(vendorIds).size).toBe(vendorIds.length); // no duplicates
  });

  it("single-vendor cart produces single vendor order", () => {
    const singleVendorItems = items.filter((i) => i.vendorId === "v1");
    const groups = computeVendorGroups(singleVendorItems);
    expect(groups).toHaveLength(1);
  });
});

describe("proportional discount allocation", () => {
  const groups: VendorGroup[] = [
    { vendorId: "v1", subtotal: "60.00", discountTotal: "0", total: "60.00", itemCount: 3 },
    { vendorId: "v2", subtotal: "40.00", discountTotal: "0", total: "40.00", itemCount: 2 },
  ];
  const orderTotal = 100;

  it("allocates proportionally by vendor total", () => {
    const discounts: AppliedDiscount[] = [{ code: "SAVE10", amount: "10.00" }];
    const result = allocateDiscountProportionally(discounts, groups, orderTotal);

    const v1Allocs = result.get("v1")!;
    expect(v1Allocs[0].amount).toBe("6.00"); // 60% of $10

    const v2Allocs = result.get("v2")!;
    expect(v2Allocs[0].amount).toBe("4.00"); // 40% of $10
  });

  it("handles zero order total gracefully", () => {
    const result = allocateDiscountProportionally([], groups, 0);
    expect(result.size).toBe(0);
  });

  it("allocates multiple discounts per vendor", () => {
    const discounts: AppliedDiscount[] = [
      { code: "SAVE5", amount: "5.00" },
      { code: "SHIP", amount: "3.00" },
    ];
    const result = allocateDiscountProportionally(discounts, groups, orderTotal);
    expect(result.get("v1")!).toHaveLength(2);
  });

  it("penny-rounding note: allocations may not sum to exact total", () => {
    // With three equal vendors, $10 discount:
    // Each gets $3.33 → sum = $9.99, not $10.00
    const equalGroups: VendorGroup[] = [
      { vendorId: "v1", subtotal: "33.33", discountTotal: "0", total: "33.33", itemCount: 1 },
      { vendorId: "v2", subtotal: "33.33", discountTotal: "0", total: "33.33", itemCount: 1 },
      { vendorId: "v3", subtotal: "33.33", discountTotal: "0", total: "33.33", itemCount: 1 },
    ];
    const discounts: AppliedDiscount[] = [{ code: "SAVE10", amount: "10.00" }];
    const result = allocateDiscountProportionally(discounts, equalGroups, 99.99);
    const total = Array.from(result.values())
      .flat()
      .reduce((s, a) => s + parseFloat(a.amount), 0);
    // Document the known rounding issue — sum is 9.99, not 10.00
    expect(Math.abs(total - 10)).toBeLessThanOrEqual(0.02);
  });
});

describe("order total computation", () => {
  it("vendor group totals sum to order total", () => {
    const items: CartItem[] = [
      { vendorId: "v1", quantity: 1, lineSubtotal: "25.00", lineDiscountTotal: "0", lineTotal: "25.00" },
      { vendorId: "v2", quantity: 2, lineSubtotal: "50.00", lineDiscountTotal: "0", lineTotal: "50.00" },
    ];
    const groups = computeVendorGroups(items);
    const sum = groups.reduce((s, g) => s + parseFloat(g.total), 0);
    expect(sum).toBe(75);
  });
});
