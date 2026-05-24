import { describe, it, expect } from "vitest";
import {
  generateId,
  generateOrderNumber,
  generateVendorOrderNumber,
  generateFulfillmentNumber,
  generatePayoutReference,
} from "../../lib/id.js";

describe("generateId", () => {
  it("returns a valid UUID v4", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, generateId));
    expect(ids.size).toBe(100);
  });
});

describe("generateOrderNumber", () => {
  it("starts with ORD-", () => {
    expect(generateOrderNumber()).toMatch(/^ORD-/);
  });

  it("generates unique numbers", () => {
    const nums = new Set(Array.from({ length: 20 }, generateOrderNumber));
    expect(nums.size).toBe(20);
  });
});

describe("generateVendorOrderNumber", () => {
  it("starts with VO-", () => {
    expect(generateVendorOrderNumber("my-vendor")).toMatch(/^VO-/);
  });

  it("includes slug prefix (alphanum only, dashes stripped)", () => {
    // "my-vendor-123" → first 6 chars: "my-ven" → strip non-alphanum → "MYVEN"
    const num = generateVendorOrderNumber("my-vendor-123");
    expect(num).toContain("MYVEN");
  });

  it("handles short slugs", () => {
    expect(() => generateVendorOrderNumber("ab")).not.toThrow();
  });
});

describe("generateFulfillmentNumber", () => {
  it("starts with FUL-", () => {
    expect(generateFulfillmentNumber()).toMatch(/^FUL-/);
  });
});

describe("generatePayoutReference", () => {
  it("starts with PAY-", () => {
    expect(generatePayoutReference()).toMatch(/^PAY-/);
  });
});
