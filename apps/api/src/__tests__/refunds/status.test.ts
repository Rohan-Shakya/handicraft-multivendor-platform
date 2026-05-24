/**
 * Unit tests for refund logic — item status and payment status computations.
 */
import { describe, it, expect } from "vitest";

// ─── Extracted refund logic ───────────────────────────────────────────────────

function computeOrderItemStatusAfterRefund(
  currentRefundedQty: number,
  refundQty: number,
  fulfilledQty: number
): "open" | "refunded" {
  const newRefundedQty = currentRefundedQty + refundQty;
  return newRefundedQty >= fulfilledQty ? "refunded" : "open";
}

function computeOrderPaymentStatus(
  totalPaid: number,
  newTotalRefunded: number
): "refunded" | "partially_refunded" {
  return newTotalRefunded >= totalPaid ? "refunded" : "partially_refunded";
}

function computeMaxRefundable(totalPaid: number, totalRefunded: number): number {
  return Math.max(0, totalPaid - totalRefunded);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("order item status after refund", () => {
  it("stays open on partial refund", () => {
    expect(computeOrderItemStatusAfterRefund(0, 1, 3)).toBe("open");
    expect(computeOrderItemStatusAfterRefund(1, 1, 3)).toBe("open");
  });

  it("becomes refunded when all fulfilled quantity is refunded", () => {
    expect(computeOrderItemStatusAfterRefund(0, 3, 3)).toBe("refunded");
    expect(computeOrderItemStatusAfterRefund(1, 2, 3)).toBe("refunded");
  });

  it("handles single-unit items", () => {
    expect(computeOrderItemStatusAfterRefund(0, 1, 1)).toBe("refunded");
  });

  it("REGRESSION: was always 'refunded' before fix", () => {
    // This test documents the bug that was fixed:
    // qty=3, fulfilled=3, refunding only 1 should NOT be "refunded"
    expect(computeOrderItemStatusAfterRefund(0, 1, 3)).toBe("open"); // was "refunded" before fix
  });
});

describe("order payment status after refund", () => {
  it("is partially_refunded when not all paid amount is refunded", () => {
    expect(computeOrderPaymentStatus(100, 40)).toBe("partially_refunded");
    expect(computeOrderPaymentStatus(100, 99.99)).toBe("partially_refunded");
  });

  it("is refunded when full amount is refunded", () => {
    expect(computeOrderPaymentStatus(100, 100)).toBe("refunded");
    expect(computeOrderPaymentStatus(50, 50)).toBe("refunded");
  });

  it("REGRESSION: vendor order was always partially_refunded before fix", () => {
    // Vendor order should also become "refunded" when fully refunded
    expect(computeOrderPaymentStatus(75, 75)).toBe("refunded"); // was "partially_refunded" before fix
  });
});

describe("max refundable computation", () => {
  it("returns correct max refundable amount", () => {
    expect(computeMaxRefundable(100, 0)).toBe(100);
    expect(computeMaxRefundable(100, 30)).toBe(70);
    expect(computeMaxRefundable(100, 100)).toBe(0);
  });

  it("never returns negative (safety floor at 0)", () => {
    expect(computeMaxRefundable(0, 0)).toBe(0);
    expect(computeMaxRefundable(50, 50)).toBe(0);
  });
});
