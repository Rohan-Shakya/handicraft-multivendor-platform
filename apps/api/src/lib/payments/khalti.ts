/**
 * Khalti v2 payment provider — Nepal digital wallet & payment gateway.
 * Flow: Initiate via API → Redirect to Khalti → Callback with pidx → Lookup to verify.
 * Docs: https://docs.khalti.com/khalti-epayment/
 */
import { getEnv } from "../env.js";
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

export class KhaltiProvider implements PaymentProvider {
  readonly name = "khalti";

  private get secretKey(): string {
    const env = getEnv();
    if (!env.KHALTI_SECRET_KEY) throw new Error("KHALTI_SECRET_KEY not configured");
    return env.KHALTI_SECRET_KEY;
  }

  private get gatewayUrl(): string {
    return getEnv().KHALTI_GATEWAY_URL;
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    // Khalti requires amount in paisa (1 NPR = 100 paisa)
    const amountInPaisa = Math.round(parseFloat(params.amount) * 100);

    const res = await fetch(`${this.gatewayUrl}/api/v2/epayment/initiate/`, {
      method: "POST",
      headers: {
        Authorization: `Key ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: params.successUrl,
        website_url: getEnv().STOREFRONT_URL,
        amount: amountInPaisa,
        purchase_order_id: params.orderId,
        purchase_order_name: `Order ${params.orderNumber}`,
        customer_info: {
          name: params.customerName ?? "Customer",
          email: params.customerEmail ?? "",
        },
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(`Khalti initiate failed: ${JSON.stringify(error)}`);
    }

    const data = await res.json();

    return {
      redirectUrl: data.payment_url,
      providerPaymentId: data.pidx,
      raw: data,
    };
  }

  async verifyPayment(params: VerifyWebhookParams): Promise<VerifyWebhookResult> {
    // Khalti redirects back with pidx in query params
    const pidx = params.query?.pidx;
    if (!pidx) {
      return { verified: false, eventType: "unknown", providerPaymentId: "" };
    }

    try {
      // Verify by calling the lookup API
      const res = await fetch(`${this.gatewayUrl}/api/v2/epayment/lookup/`, {
        method: "POST",
        headers: {
          Authorization: `Key ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pidx }),
      });

      if (!res.ok) {
        return { verified: false, eventType: "payment_failed", providerPaymentId: pidx };
      }

      const data = await res.json();
      const isCompleted = data.status === "Completed";
      // Amount from Khalti is in paisa, convert to NPR
      const amountNpr = data.total_amount ? (data.total_amount / 100).toFixed(2) : undefined;

      return {
        verified: isCompleted,
        eventType: isCompleted ? "payment_completed" : "payment_failed",
        providerPaymentId: pidx,
        amount: amountNpr,
        raw: data,
      };
    } catch {
      return { verified: false, eventType: "unknown", providerPaymentId: pidx };
    }
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    // Khalti exposes a refund API on its merchant-tier accounts (verified
    // merchants get programmatic refunds; the free tier does not). Behaviour:
    //   - If `KHALTI_REFUND_ENABLED=1` is set we attempt the API call.
    //   - Otherwise we report `manualRequired: true` so the admin UI prompts
    //     the operator to refund via the Khalti merchant dashboard.
    if (process.env.KHALTI_REFUND_ENABLED !== "1") {
      return {
        success: false,
        raw: {
          manualRequired: true,
          provider: "khalti",
          providerPaymentId: params.providerPaymentId,
          amount: params.amount,
          currency: params.currencyCode ?? "NPR",
          message:
            "Khalti programmatic refunds are disabled (set KHALTI_REFUND_ENABLED=1 to opt in). Issue the refund manually via the Khalti merchant dashboard, then mark the refund processed in the admin UI.",
        },
      };
    }

    // Khalti expects amounts in paisa.
    const amountInPaisa = Math.round(parseFloat(params.amount) * 100);
    try {
      const res = await fetch(`${this.gatewayUrl}/api/merchant-transaction/refund/`, {
        method: "POST",
        headers: {
          Authorization: `Key ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pidx: params.providerPaymentId,
          amount: amountInPaisa,
          mobile: undefined,
          remarks: params.reason ?? "customer_request",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.status === "Failed" || data?.detail) {
        return {
          success: false,
          raw: {
            httpStatus: res.status,
            detail: data?.detail ?? data?.message ?? "Khalti refund rejected",
            ...data,
          },
        };
      }
      return {
        success: true,
        providerRefundId: data?.refund_id ?? data?.idx ?? undefined,
        raw: data,
      };
    } catch (err: any) {
      return { success: false, raw: { error: err?.message ?? "Khalti refund request failed" } };
    }
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    try {
      const res = await fetch(`${this.gatewayUrl}/api/v2/epayment/lookup/`, {
        method: "POST",
        headers: {
          Authorization: `Key ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pidx: providerPaymentId }),
      });

      if (!res.ok) {
        return { status: "failed", providerPaymentId };
      }

      const data = await res.json();
      let status: PaymentStatusResult["status"] = "pending";
      if (data.status === "Completed") status = "completed";
      else if (data.status === "Pending" || data.status === "Initiated") status = "pending";
      else if (data.status === "Refunded") status = "refunded";
      else status = "failed";

      return {
        status,
        providerPaymentId,
        amount: data.total_amount ? (data.total_amount / 100).toFixed(2) : undefined,
        raw: data,
      };
    } catch {
      return { status: "failed", providerPaymentId };
    }
  }
}
