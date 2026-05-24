/**
 * eSewa payment provider — Nepal's leading digital wallet.
 * Flow: Redirect → eSewa payment page → Redirect back with signed response.
 * Docs: https://developer.esewa.com.np/pages/Epay
 */
import crypto from "crypto";
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

export class EsewaProvider implements PaymentProvider {
  readonly name = "esewa";

  private get merchantCode(): string {
    const env = getEnv();
    if (!env.ESEWA_MERCHANT_CODE) throw new Error("ESEWA_MERCHANT_CODE not configured");
    return env.ESEWA_MERCHANT_CODE;
  }

  private get secretKey(): string {
    const env = getEnv();
    if (!env.ESEWA_SECRET_KEY) throw new Error("ESEWA_SECRET_KEY not configured");
    return env.ESEWA_SECRET_KEY;
  }

  private get gatewayUrl(): string {
    return getEnv().ESEWA_GATEWAY_URL;
  }

  private generateSignature(message: string): string {
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(message)
      .digest("base64");
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const transactionUuid = `${params.orderId}-${Date.now()}`;

    // eSewa requires HMAC-SHA256 signature of specific fields
    const signatureMessage = `total_amount=${params.amount},transaction_uuid=${transactionUuid},product_code=${this.merchantCode}`;
    const signature = this.generateSignature(signatureMessage);

    // Build the redirect URL with form data
    const formData = new URLSearchParams({
      amount: params.amount,
      tax_amount: "0",
      total_amount: params.amount,
      transaction_uuid: transactionUuid,
      product_code: this.merchantCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: params.successUrl,
      failure_url: params.failureUrl,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    });

    const redirectUrl = `${this.gatewayUrl}/api/epay/main/v2/form?${formData.toString()}`;

    return {
      redirectUrl,
      providerPaymentId: transactionUuid,
      raw: { transactionUuid, merchantCode: this.merchantCode },
    };
  }

  async verifyPayment(params: VerifyWebhookParams): Promise<VerifyWebhookResult> {
    // eSewa redirects back with base64-encoded response data in query param
    const encodedData = params.query?.data;
    if (!encodedData) {
      return {
        verified: false,
        eventType: "unknown",
        providerPaymentId: "",
      };
    }

    try {
      const decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf-8"));
      const { transaction_uuid, total_amount, transaction_code, status, signed_field_names, signature } = decoded;

      // Verify signature
      if (signed_field_names && signature) {
        const fields = signed_field_names.split(",");
        const message = fields.map((f: string) => `${f}=${decoded[f]}`).join(",");
        const expectedSignature = this.generateSignature(message);

        if (signature !== expectedSignature) {
          return { verified: false, eventType: "unknown", providerPaymentId: transaction_uuid ?? "" };
        }
      }

      // Additionally verify via eSewa's status check API
      const statusResult = await this.getPaymentStatus(transaction_uuid);

      return {
        verified: statusResult.status === "completed",
        eventType: status === "COMPLETE" ? "payment_completed" : "payment_failed",
        providerPaymentId: transaction_uuid,
        amount: total_amount,
        raw: decoded,
      };
    } catch {
      return { verified: false, eventType: "unknown", providerPaymentId: "" };
    }
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    // eSewa does not expose a programmatic refund API in its standard
    // merchant integration. Refunds are processed via the eSewa merchant
    // portal (https://esewa.com.np/#/merchant). Returning a structured
    // failure with `manualRequired: true` so the refund service can mark
    // the row `failed` with a friendly note and the admin UI can prompt
    // the operator to settle it offline.
    return {
      success: false,
      raw: {
        manualRequired: true,
        provider: "esewa",
        providerPaymentId: params.providerPaymentId,
        amount: params.amount,
        currency: params.currencyCode ?? "NPR",
        message:
          "eSewa has no programmatic refund API. Issue this refund manually via the eSewa merchant dashboard, then mark the refund processed in the admin UI.",
      },
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    try {
      const url = new URL(`${this.gatewayUrl}/api/epay/transaction/status/`);
      url.searchParams.set("product_code", this.merchantCode);
      url.searchParams.set("total_amount", "0"); // not used for lookup but required
      url.searchParams.set("transaction_uuid", providerPaymentId);

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        return { status: "failed", providerPaymentId };
      }

      const data = await res.json();

      let status: PaymentStatusResult["status"] = "pending";
      if (data.status === "COMPLETE") status = "completed";
      else if (data.status === "PENDING") status = "pending";
      else status = "failed";

      return {
        status,
        providerPaymentId,
        amount: data.total_amount,
        raw: data,
      };
    } catch {
      return { status: "failed", providerPaymentId };
    }
  }
}
