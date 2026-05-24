import { eq, and, sql } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { payments, paymentTransactions, orders, vendorOrders } from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { ForbiddenError, NotFoundError, BadRequestError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { fireWebhook } from "../../lib/webhooks.js";
import { sendEmail } from "../../lib/email.js";
import { paymentReceiptEmail } from "../../lib/email-templates.js";
import { toCents, fromCents } from "../../lib/money.js";

export interface CreatePaymentDto {
  orderId: string;
  provider: "stripe" | "paypal" | "esewa" | "khalti" | "fonepay" | "cod" | "manual";
  providerPaymentId?: string;
  currencyCode: string;
  amountAuthorized: number;
  isTest?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RecordTransactionDto {
  paymentId: string;
  type: "authorization" | "capture" | "refund" | "void" | "failure" | "adjustment";
  status: "pending" | "succeeded" | "failed";
  providerTransactionId?: string;
  amount: number;
  currencyCode: string;
  rawResponse?: Record<string, unknown>;
}

// ─── Admin operations ─────────────────────────────────────────────────────────

export interface ListAllPaymentsFilters {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
}

export async function listAllPayments(actor: AuthActor, filters: ListAllPaymentsFilters) {
  assertPermission(actor, "payment:read:any");
  const { page = 1, limit = 20, status, provider } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    status ? eq(payments.status, status as typeof payments.status.enumValues[number]) : undefined,
    provider ? eq(payments.provider, provider as typeof payments.provider.enumValues[number]) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(payments).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(payments).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function listPaymentsForOrder(actor: AuthActor, orderId: string) {
  assertPermission(actor, "payment:read:any");
  return db.select().from(payments).where(eq(payments.orderId, orderId));
}

export async function getPaymentById(actor: AuthActor, paymentId: string) {
  assertPermission(actor, "payment:read:any");
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!payment) throw new NotFoundError("Payment not found");
  const txns = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.paymentId, paymentId));
  return { ...payment, transactions: txns };
}

/**
 * Create a payment record when a customer initiates payment.
 * Called by the payment provider webhook or after checkout.
 */
export async function createPayment(actor: AuthActor, data: CreatePaymentDto) {
  assertPermission(actor, "payment:manage:any");

  const [order] = await db.select().from(orders).where(eq(orders.id, data.orderId));
  if (!order) throw new NotFoundError("Order not found");

  const [payment] = await db
    .insert(payments)
    .values({
      id: generateId(),
      orderId: data.orderId,
      customerId: order.customerId ?? null,
      provider: data.provider,
      providerPaymentId: data.providerPaymentId ?? null,
      currencyCode: data.currencyCode,
      status: "pending",
      amountAuthorized: String(data.amountAuthorized.toFixed(2)),
      amountCaptured: "0",
      amountRefunded: "0",
      isTest: data.isTest ?? false,
      metadata: data.metadata ?? null,
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "payment",
    entityId: payment!.id,
    action: "payment.created",
    afterJson: payment,
  });

  fireWebhook({
    topic: "payment.created",
    entityType: "payment",
    entityId: payment!.id,
    data: payment as unknown as Record<string, unknown>,
  }).catch(() => {});

  return payment!;
}

/**
 * Record a transaction event (authorize, capture, void, refund, failure).
 * Updates the payment aggregate fields accordingly.
 */
export async function recordTransaction(actor: AuthActor, data: RecordTransactionDto) {
  assertPermission(actor, "payment:manage:any");

  return db.transaction(async (tx) => {
    // Lock the payment row for the duration of the transaction to prevent
    // concurrent capture/refund races from over-incrementing aggregates.
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, data.paymentId))
      .for("update");
    if (!payment) throw new NotFoundError("Payment not found");

    // Idempotency: if a transaction with this providerTransactionId+type has
    // already succeeded for this payment, return it instead of re-applying.
    if (data.providerTransactionId && data.status === "succeeded") {
      const [existing] = await tx
        .select()
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.paymentId, data.paymentId),
            eq(paymentTransactions.providerTransactionId, data.providerTransactionId),
            eq(paymentTransactions.type, data.type),
            eq(paymentTransactions.status, "succeeded")
          )
        )
        .limit(1);
      if (existing) return existing;
    }

    const [txn] = await tx
      .insert(paymentTransactions)
      .values({
        id: generateId(),
        paymentId: data.paymentId,
        type: data.type,
        status: data.status,
        providerTransactionId: data.providerTransactionId ?? null,
        amount: String(data.amount.toFixed(2)),
        currencyCode: data.currencyCode,
        rawResponse: data.rawResponse ?? null,
        processedAt: data.status === "succeeded" ? new Date() : null,
      })
      .returning();

    const amountStr = String(data.amount.toFixed(2));

    if (data.status === "succeeded") {
      if (data.type === "authorization") {
        await tx
          .update(payments)
          .set({
            status: "authorized",
            amountAuthorized: amountStr,
            authorizedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payments.id, data.paymentId));

        await tx
          .update(orders)
          .set({ paymentStatus: "authorized", updatedAt: new Date() })
          .where(eq(orders.id, payment.orderId));
      } else if (data.type === "capture") {
        // Integer-cent arithmetic — `parseFloat(a) + parseFloat(b)` accumulates
        // FP drift across many partial captures and silently corrupts totals.
        const newCapturedCents =
          toCents(payment.amountCaptured) + toCents(data.amount);
        const newCaptured = fromCents(newCapturedCents);

        await tx
          .update(payments)
          .set({
            status: "captured",
            amountCaptured: newCaptured,
            capturedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payments.id, data.paymentId));

        const [capturedOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, payment.orderId));

        await tx
          .update(orders)
          .set({
            paymentStatus: "paid",
            totalPaid: newCaptured,
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, payment.orderId));

        // Send payment receipt email to customer
        if (capturedOrder?.customerEmail) {
          const emailData = paymentReceiptEmail({
            orderNumber: capturedOrder.orderNumber,
            customerName: capturedOrder.customerFirstName ?? "Customer",
            amount: `${newCaptured} ${payment.currencyCode}`,
            paymentMethod: payment.provider,
          });
          sendEmail({
            to: capturedOrder.customerEmail,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            category: "order_updates",
            recipient: capturedOrder.customerId
              ? { customerId: capturedOrder.customerId }
              : undefined,
          }).catch(() => {});
        }

        // Sync all vendor orders for this order to "paid".
        // Each vendor order's totalPaid = its own totalPrice (the customer paid
        // the platform in full; payout to vendors happens separately via payouts module).
        const voRows = await tx
          .select({ id: vendorOrders.id, totalPrice: vendorOrders.totalPrice })
          .from(vendorOrders)
          .where(eq(vendorOrders.orderId, payment.orderId));

        for (const vo of voRows) {
          await tx
            .update(vendorOrders)
            .set({
              paymentStatus: "paid",
              totalPaid: vo.totalPrice,
              paidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(vendorOrders.id, vo.id));
        }
      } else if (data.type === "void") {
        await tx
          .update(payments)
          .set({ status: "voided", updatedAt: new Date() })
          .where(eq(payments.id, data.paymentId));

        await tx
          .update(orders)
          .set({ paymentStatus: "voided", updatedAt: new Date() })
          .where(eq(orders.id, payment.orderId));
      }
    } else if (data.status === "failed" && data.type === "capture") {
      await tx
        .update(payments)
        .set({ status: "failed", failedAt: new Date(), updatedAt: new Date() })
        .where(eq(payments.id, data.paymentId));

      await tx
        .update(orders)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(orders.id, payment.orderId));
    }

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "payment",
      entityId: data.paymentId,
      action: `payment.transaction.${data.type}`,
      afterJson: txn,
    });

    return txn!;
  });
}
