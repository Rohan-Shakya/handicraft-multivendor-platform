import { describe, it, expect } from "vitest";
import {
  addMoney,
  subtractMoney,
  multiplyMoney,
  sumMoney,
  toCents,
  fromCents,
  allocateProportionally,
} from "../../lib/money.js";

describe("Money arithmetic helpers", () => {
  describe("toCents", () => {
    it("converts string to cents", () => {
      expect(toCents("10.50")).toBe(1050);
    });

    it("converts number to cents", () => {
      expect(toCents(10.5)).toBe(1050);
    });

    it("handles whole numbers", () => {
      expect(toCents("100")).toBe(10000);
    });

    it("handles zero", () => {
      expect(toCents("0")).toBe(0);
      expect(toCents(0)).toBe(0);
    });
  });

  describe("fromCents", () => {
    it("converts cents to string", () => {
      expect(fromCents(1050)).toBe("10.50");
    });

    it("handles zero", () => {
      expect(fromCents(0)).toBe("0.00");
    });

    it("handles large values", () => {
      expect(fromCents(10000000)).toBe("100000.00");
    });
  });

  describe("addMoney", () => {
    it("adds two string amounts", () => {
      expect(addMoney("10.50", "5.25")).toBe("15.75");
    });

    it("handles zero", () => {
      expect(addMoney("100.00", "0.00")).toBe("100.00");
    });

    it("handles large numbers", () => {
      expect(addMoney("99999.99", "0.01")).toBe("100000.00");
    });
  });

  describe("subtractMoney", () => {
    it("subtracts correctly", () => {
      expect(subtractMoney("10.00", "3.50")).toBe("6.50");
    });

    it("handles resulting in zero", () => {
      expect(subtractMoney("10.00", "10.00")).toBe("0.00");
    });
  });

  describe("multiplyMoney", () => {
    it("multiplies amount by quantity", () => {
      expect(multiplyMoney("25.50", 3)).toBe("76.50");
    });

    it("multiplies by zero", () => {
      expect(multiplyMoney("100.00", 0)).toBe("0.00");
    });

    it("multiplies by one", () => {
      expect(multiplyMoney("42.00", 1)).toBe("42.00");
    });
  });

  describe("sumMoney", () => {
    it("sums array of amounts", () => {
      expect(sumMoney(["10.50", "20.00", "5.25"])).toBe("35.75");
    });

    it("handles empty array", () => {
      expect(sumMoney([])).toBe("0.00");
    });

    it("handles single item", () => {
      expect(sumMoney(["42.00"])).toBe("42.00");
    });
  });

  describe("allocateProportionally", () => {
    it("allocates total across proportional amounts", () => {
      const result = allocateProportionally("100.00", ["60.00", "40.00"]);
      expect(result).toHaveLength(2);
      const sum = addMoney(result[0]!, result[1]!);
      expect(sum).toBe("100.00");
    });

    it("handles single allocation", () => {
      const result = allocateProportionally("50.00", ["50.00"]);
      expect(result).toEqual(["50.00"]);
    });

    it("handles rounding in 3-way split", () => {
      const result = allocateProportionally("100.00", ["33.33", "33.33", "33.34"]);
      expect(result).toHaveLength(3);
      const total = sumMoney(result);
      expect(total).toBe("100.00");
    });
  });
});
