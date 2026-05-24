/**
 * Stripe payment provider — international card payments.
 * Flow: Create Checkout Session → Redirect → Webhook callback.
 * Docs: https://docs.stripe.com/payments/checkout
 */
import Stripe from "stripe";
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

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const env = getEnv();
    if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const stripe = getStripe();
    const amountCents = Math.round(parseFloat(params.amount) * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: `Order ${params.orderNumber}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.failureUrl,
      client_reference_id: params.orderId,
      customer_email: params.customerEmail,
      metadata: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        ...params.metadata,
      },
    });

    return {
      redirectUrl: session.url,
      providerPaymentId: session.id,
      raw: { sessionId: session.id, paymentIntentId: session.payment_intent },
    };
  }

  async verifyPayment(params: VerifyWebhookParams): Promise<VerifyWebhookResult> {
    const env = getEnv();
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    const stripe = getStripe();
    const signature = params.headers["stripe-signature"] ?? "";

    try {
      const event = stripe.webhooks.constructEvent(
        params.body,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          verified: true,
          eventType: "payment_completed",
          providerPaymentId: session.id,
          amount: session.amount_total
            ? (session.amount_total / 100).toFixed(2)
            : undefined,
          raw: session as unknown as Record<string, unknown>,
        };
      }

      if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        return {
          verified: true,
          eventType: "refund_completed",
          providerPaymentId: charge.payment_intent as string,
          amount: charge.amount_refunded
            ? (charge.amount_refunded / 100).toFixed(2)
            : undefined,
          raw: charge as unknown as Record<string, unknown>,
        };
      }

      return {
        verified: true,
        eventType: "unknown",
        providerPaymentId: "",
        raw: event as unknown as Record<string, unknown>,
      };
    } catch (err: any) {
      return {
        verified: false,
        eventType: "unknown",
        providerPaymentId: "",
        raw: { error: err.message },
      };
    }
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    const stripe = getStripe();
    const amountCents = Math.round(parseFloat(params.amount) * 100);

    try {
      // First, retrieve the session to get the payment intent
      const session = await stripe.checkout.sessions.retrieve(params.providerPaymentId);
      const paymentIntentId = session.payment_intent as string;

      if (!paymentIntentId) {
        return { success: false, raw: { message: "No payment intent found for session" } };
      }

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amountCents,
        reason: "requested_by_customer",
      });

      return {
        success: refund.status === "succeeded" || refund.status === "pending",
        providerRefundId: refund.id,
        raw: refund as unknown as Record<string, unknown>,
      };
    } catch (err: any) {
      return { success: false, raw: { error: err.message } };
    }
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const stripe = getStripe();

    try {
      const session = await stripe.checkout.sessions.retrieve(providerPaymentId);

      let status: PaymentStatusResult["status"] = "pending";
      if (session.payment_status === "paid") status = "completed";
      else if (session.payment_status === "unpaid") status = "pending";
      else status = "failed";

      return {
        status,
        providerPaymentId,
        amount: session.amount_total
          ? (session.amount_total / 100).toFixed(2)
          : undefined,
        raw: session as unknown as Record<string, unknown>,
      };
    } catch {
      return { status: "failed", providerPaymentId };
    }
  }
}
