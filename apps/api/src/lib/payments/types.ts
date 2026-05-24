/**
 * Payment provider abstraction.
 * Each provider (eSewa, Khalti, Fonepay, Stripe, COD) implements this interface.
 */

export interface InitiatePaymentParams {
  orderId: string;
  orderNumber: string;
  amount: string; // decimal string e.g. "1500.00"
  currency: string; // e.g. "NPR", "USD"
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
  failureUrl: string;
  metadata?: Record<string, string>;
}

export interface InitiatePaymentResult {
  /** URL to redirect the customer to for payment (null for COD) */
  redirectUrl: string | null;
  /** Provider's payment ID for tracking */
  providerPaymentId: string;
  /** Raw response from provider */
  raw?: Record<string, unknown>;
}

export interface VerifyWebhookParams {
  headers: Record<string, string>;
  body: string; // raw body string
  query?: Record<string, string>; // for redirect-based verification (eSewa, Fonepay)
}

export interface VerifyWebhookResult {
  verified: boolean;
  eventType: "payment_completed" | "payment_failed" | "refund_completed" | "unknown";
  providerPaymentId: string;
  amount?: string;
  raw?: Record<string, unknown>;
}

export interface RefundPaymentParams {
  providerPaymentId: string;
  /** Decimal amount as a string (matches `numeric` columns) — e.g. "12.50". */
  amount: string;
  /** ISO 4217 currency code from the original payment. Some Nepali rails
   *  expect amounts in paisa (NPR × 100) — providers use this to convert. */
  currencyCode?: string;
  reason?: string;
}

export interface RefundPaymentResult {
  success: boolean;
  providerRefundId?: string;
  raw?: Record<string, unknown>;
}

export interface PaymentStatusResult {
  status: "pending" | "completed" | "failed" | "refunded";
  providerPaymentId: string;
  amount?: string;
  raw?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;

  /** Initiate a payment (redirect customer to payment page) */
  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;

  /** Verify a webhook/callback from the payment provider */
  verifyPayment(params: VerifyWebhookParams): Promise<VerifyWebhookResult>;

  /** Refund a payment (full or partial) */
  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;

  /** Check the current status of a payment */
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
}
