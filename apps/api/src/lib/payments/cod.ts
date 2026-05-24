/**
 * Cash on Delivery payment provider.
 * No redirect needed — payment is recorded when delivery is confirmed.
 */
import type {
  PaymentProvider,
  InitiatePaymentParams,
  InitiatePaymentResult,
  VerifyWebhookParams,
  VerifyWebhookResult,
  RefundPaymentParams,
  RefundPaymentResult,
  PaymentStatusResult,
} from "./types.js";

export class CodProvider implements PaymentProvider {
  readonly name = "cod";

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    // COD doesn't redirect — order is placed immediately with pending payment
    return {
      redirectUrl: null,
      providerPaymentId: `cod-${params.orderId}`,
      raw: { method: "cash_on_delivery", orderId: params.orderId },
    };
  }

  async verifyPayment(_params: VerifyWebhookParams): Promise<VerifyWebhookResult> {
    // COD payments are verified manually by admin when cash is collected
    return {
      verified: false,
      eventType: "unknown",
      providerPaymentId: "",
      raw: { message: "COD payments are confirmed manually by admin" },
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    // COD refunds are processed manually (cash return)
    return {
      success: true,
      providerRefundId: `cod-refund-${Date.now()}`,
      raw: {
        method: "manual_cash_refund",
        amount: params.amount,
        message: "COD refund recorded — process cash return manually",
      },
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    return {
      status: "pending",
      providerPaymentId,
      raw: { message: "COD payment pending until delivery confirmation" },
    };
  }
}
