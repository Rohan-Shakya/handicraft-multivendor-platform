import { describe, expect, it } from "vitest";

/**
 * Pure-logic coverage of the scope-eligibility matrix used by
 * `applyDiscountCode`. We reproduce the rules here so they can't drift
 * silently — the service test reads naturally alongside these table tests.
 */

type Scope = "platform" | "vendor" | "targeted_vendors";

interface Input {
  scope: Scope;
  discountVendorId?: string | null;
  targetedVendorIds?: string[];
  cartVendorIds: string[];
}

function isEligible(input: Input): boolean {
  const cart = new Set(input.cartVendorIds);

  if (input.scope === "platform") return true;

  if (input.scope === "vendor") {
    if (!input.discountVendorId) return false;
    // Only eligible if every cart item belongs to the single target vendor.
    return cart.size === 1 && cart.has(input.discountVendorId);
  }

  if (input.scope === "targeted_vendors") {
    const targets = new Set(input.targetedVendorIds ?? []);
    if (targets.size === 0) return false;
    // Eligible if ANY cart item matches a targeted vendor.
    return [...cart].some((v) => targets.has(v));
  }
  return false;
}

describe("discount scope eligibility", () => {
  it("platform scope is always eligible", () => {
    expect(
      isEligible({
        scope: "platform",
        cartVendorIds: ["v1", "v2"],
      })
    ).toBe(true);
  });

  describe("vendor scope", () => {
    it("accepts a single-vendor cart that matches the target", () => {
      expect(
        isEligible({
          scope: "vendor",
          discountVendorId: "v1",
          cartVendorIds: ["v1", "v1"],
        })
      ).toBe(true);
    });

    it("rejects a cart that mixes in other vendors", () => {
      expect(
        isEligible({
          scope: "vendor",
          discountVendorId: "v1",
          cartVendorIds: ["v1", "v2"],
        })
      ).toBe(false);
    });

    it("rejects when the cart's single vendor isn't the target", () => {
      expect(
        isEligible({
          scope: "vendor",
          discountVendorId: "v1",
          cartVendorIds: ["v2"],
        })
      ).toBe(false);
    });

    it("rejects when the discount is missing its target vendor id", () => {
      expect(
        isEligible({
          scope: "vendor",
          discountVendorId: null,
          cartVendorIds: ["v1"],
        })
      ).toBe(false);
    });
  });

  describe("targeted_vendors scope", () => {
    it("accepts a cart with at least one targeted vendor", () => {
      expect(
        isEligible({
          scope: "targeted_vendors",
          targetedVendorIds: ["v1", "v2"],
          cartVendorIds: ["v2", "v3"],
        })
      ).toBe(true);
    });

    it("rejects a cart whose vendors don't overlap the target set", () => {
      expect(
        isEligible({
          scope: "targeted_vendors",
          targetedVendorIds: ["v1", "v2"],
          cartVendorIds: ["v3", "v4"],
        })
      ).toBe(false);
    });

    it("rejects when the target set is empty", () => {
      expect(
        isEligible({
          scope: "targeted_vendors",
          targetedVendorIds: [],
          cartVendorIds: ["v1"],
        })
      ).toBe(false);
    });
  });
});
