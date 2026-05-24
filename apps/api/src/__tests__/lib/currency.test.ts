import { describe, it, expect, vi } from "vitest";

// Mock redis to avoid actual connection
vi.mock("../../lib/redis.js", () => ({
  cacheGet: async (_key: string, _ttl: number, fetcher: () => Promise<any>) => fetcher(),
  cacheDel: async () => {},
}));

// Mock db to return currency data
vi.mock("../../db/index.js", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => [
          { code: "NPR", name: "Nepalese Rupee", symbol: "Rs.", decimalPlaces: 2, exchangeRate: "1.00000000", isBase: true, isActive: true },
          { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2, exchangeRate: "0.00750000", isBase: false, isActive: true },
          { code: "INR", name: "Indian Rupee", symbol: "₹", decimalPlaces: 2, exchangeRate: "0.62500000", isBase: false, isActive: true },
        ],
      }),
    }),
  },
}));

describe("Currency utilities", () => {
  it("converts NPR to USD correctly", async () => {
    const { convertMoney } = await import("../../lib/currency.js");
    const usd = await convertMoney(10000, "NPR", "USD");
    // 10000 NPR / 1.0 rate = 10000 base, * 0.0075 = 75 USD
    expect(usd).toBeCloseTo(75, 0);
  });

  it("converts USD to NPR correctly", async () => {
    const { convertMoney } = await import("../../lib/currency.js");
    const npr = await convertMoney(100, "USD", "NPR");
    // 100 USD / 0.0075 rate = 13333.33 base, * 1.0 = 13333.33 NPR
    expect(npr).toBeCloseTo(13333.33, 0);
  });

  it("returns same amount for same currency", async () => {
    const { convertMoney } = await import("../../lib/currency.js");
    const result = await convertMoney(500, "NPR", "NPR");
    expect(result).toBe(500);
  });

  it("formats NPR correctly", async () => {
    const { formatMoney } = await import("../../lib/currency.js");
    const result = await formatMoney(1500.5, "NPR");
    expect(result).toBe("Rs. 1500.50");
  });

  it("formats USD correctly", async () => {
    const { formatMoney } = await import("../../lib/currency.js");
    const result = await formatMoney(99.99, "USD");
    expect(result).toBe("$ 99.99");
  });

  it("getBaseCurrency returns NPR", async () => {
    const { getBaseCurrency } = await import("../../lib/currency.js");
    const base = await getBaseCurrency();
    expect(base).toBe("NPR");
  });
});
