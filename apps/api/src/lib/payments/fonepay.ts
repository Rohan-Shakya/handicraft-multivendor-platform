/**
 * Fonepay QR payment provider — Nepal bank payment gateway.
 * Flow: Redirect with HMAC-signed URL → Fonepay payment → Redirect back with verification params.
 * Docs: https://docs.fonepay.com/
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

export class FonepayProvider implements PaymentProvider {
  readonly name = "fonepay";

  private get merchantCode(): string {
    const env = getEnv();
    if (!env.FONEPAY_MERCHANT_CODE) throw new Error("FONEPAY_MERCHANT_CODE not configured");
    return env.FONEPAY_MERCHANT_CODE;
  }

  private get secretKey(): string {
    const env = getEnv();
    if (!env.FONEPAY_SECRET_KEY) throw new Error("FONEPAY_SECRET_KEY not configured");
    return env.FONEPAY_SECRET_KEY;
  }

  private get gatewayUrl(): string {
    return getEnv().FONEPAY_GATEWAY_URL;
  }

  private generateHmac(message: string): string {
    return crypto
      .createHmac("sha512", this.secretKey)
      .update(message)
      .digest("hex");
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const prn = `FP-${params.orderId}-${Date.now()}`;
    const amount = params.amount;
    const remarks = `Payment for Order ${params.orderNumber}`;
    const date = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }); // MM/DD/YYYY format

    // Fonepay signature: merchantCode,prn,amount,currencyCode,date,returnUrl,remarks
    const signatureMessage = [
      this.merchantCode,
      prn,
      amount,
      params.currency || "NPR",
      date,
      params.successUrl,
      remarks,
    ].join(",");

    const dv = this.generateHmac(signatureMessage);

    const queryParams = new URLSearchParams({
      PID: this.merchantCode,
      PRN: prn,
      AMT: amount,
      CRN: params.currency || "NPR",
      DT: date,
      R1: remarks,
      R2: params.orderId,
      RU: params.successUrl,
      DV: dv,
    });

    const redirectUrl = `${this.gatewayUrl}/api/merchantRequest?${queryParams.toString()}`;

    return {
      redirectUrl,
      providerPaymentId: prn,
      raw: { prn, merchantCode: this.merchantCode, date },
    };
  }

  async verifyPayment(params: VerifyWebhookParams): Promise<VerifyWebhookResult> {
    const query = params.query ?? {};
    const { PRN, BID, UID, DV: returnDv, R1, R2, RC } = query;

    if (!PRN || !BID || !returnDv) {
      return { verified: false, eventType: "unknown", providerPaymentId: PRN ?? "" };
    }

    // RC = response code: "successful" means payment completed
    if (RC !== "successful") {
      return {
        verified: false,
        eventType: "payment_failed",
        providerPaymentId: PRN,
        raw: query,
      };
    }

    // Verify the return signature
    try {
      const verifyMessage = [
        this.merchantCode,
        PRN,
        BID,
        UID || "",
        R1 || "",
        R2 || "",
      ].join(",");

      const expectedDv = this.generateHmac(verifyMessage);
      const signatureValid = returnDv === expectedDv;

      // Also call Fonepay verification API
      const verificationDv = this.generateHmac(`${this.merchantCode},${PRN},${BID}`);
      const verifyUrl = new URL(`${this.gatewayUrl}/api/merchantRequest/verify`);
      verifyUrl.searchParams.set("PID", this.merchantCode);
      verifyUrl.searchParams.set("PRN", PRN);
      verifyUrl.searchParams.set("BID", BID);
      verifyUrl.searchParams.set("DV", verificationDv);

      const res = await fetch(verifyUrl.toString());
      const apiVerified = res.ok;

      return {
        verified: signatureValid && apiVerified,
        eventType: signatureValid && apiVerified ? "payment_completed" : "payment_failed",
        providerPaymentId: PRN,
        raw: { ...query, signatureValid, apiVerified },
      };
    } catch {
      return { verified: false, eventType: "unknown", providerPaymentId: PRN };
    }
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    // Fonepay's public merchant integration does not expose a refund API.
    // Refunds are settled via the Fonepay merchant portal. Same pattern as
    // eSewa — surface a `manualRequired` flag so the admin UI prompts the
    // operator to process the refund offline.
    return {
      success: false,
      raw: {
        manualRequired: true,
        provider: "fonepay",
        providerPaymentId: params.providerPaymentId,
        amount: params.amount,
        currency: params.currencyCode ?? "NPR",
        message:
          "Fonepay has no programmatic refund API. Issue this refund manually via the Fonepay merchant dashboard, then mark the refund processed in the admin UI.",
      },
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    // Fonepay doesn't have a standard status check endpoint
    // Verification happens during the redirect callback
    return {
      status: "pending",
      providerPaymentId,
      raw: { message: "Use verifyPayment with redirect callback params instead" },
    };
  }
}
