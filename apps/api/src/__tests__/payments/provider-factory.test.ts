import { describe, it, expect } from "vitest";
import { getPaymentProvider, getSupportedProviders } from "../../lib/payments/index.js";

describe("Payment provider factory", () => {
  it("returns all supported providers", () => {
    const providers = getSupportedProviders();
    expect(providers).toContain("esewa");
    expect(providers).toContain("khalti");
    expect(providers).toContain("fonepay");
    expect(providers).toContain("stripe");
    expect(providers).toContain("cod");
    expect(providers).toHaveLength(5);
  });

  it("returns provider by name", () => {
    expect(getPaymentProvider("esewa").name).toBe("esewa");
    expect(getPaymentProvider("khalti").name).toBe("khalti");
    expect(getPaymentProvider("fonepay").name).toBe("fonepay");
    expect(getPaymentProvider("stripe").name).toBe("stripe");
    expect(getPaymentProvider("cod").name).toBe("cod");
  });

  it("throws for unknown provider", () => {
    expect(() => getPaymentProvider("unknown")).toThrow("Unknown payment provider: unknown");
  });

  describe("COD provider", () => {
    it("initiates payment without redirect", async () => {
      const cod = getPaymentProvider("cod");
      const result = await cod.initiatePayment({
        orderId: "order-123",
        orderNumber: "ORD-001",
        amount: "1500.00",
        currency: "NPR",
        successUrl: "http://localhost/success",
        failureUrl: "http://localhost/failure",
      });

      expect(result.redirectUrl).toBeNull();
      expect(result.providerPaymentId).toContain("cod-order-123");
    });

    it("refund returns success with manual message", async () => {
      const cod = getPaymentProvider("cod");
      const result = await cod.refundPayment({
        providerPaymentId: "cod-order-123",
        amount: "500.00",
      });

      expect(result.success).toBe(true);
      expect(result.providerRefundId).toBeTruthy();
    });

    it("payment status is always pending", async () => {
      const cod = getPaymentProvider("cod");
      const result = await cod.getPaymentStatus("cod-order-123");

      expect(result.status).toBe("pending");
    });
  });
});
