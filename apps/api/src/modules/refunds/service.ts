import { eq, and, sql, desc } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import {
  refunds,
  refundItems,
  orderItems,
  orders,
  vendorOrders,
  payments,
  inventoryItems,
  inventoryAdjustments,
} from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { BadRequestError, ForbiddenError, NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { toCents, fromCents, addMoney } from "../../lib/money.js";
import { sendEmail } from "../../lib/email.js";
import { refundConfirmationEmail } from "../../lib/email-templates.js";
import { logger } from "../../lib/logger.js";
import { getPaymentProvider } from "../../lib/payments/index.js";

export interface CreateRefundDto {
  orderId: string;
  vendorOrderId?: string;
  paymentId?: string;
  reason?: "customer_request" | "out_of_stock" | "damaged" | "fraud" | "shipping_failure" | "other";
  note?: string;
  items?: Array<{ orderItemId: string; quantity: number; amount: number }>;
  shippingAmount?: number;
  taxAmount?: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listAllRefunds(
  actor: AuthActor,
  filters: { page?: number; limit?: number; status?: string }
) {
  assertPermission(actor, "refund:read:any");
  const { page = 1, limit = 20, status } = filters;
  const offset = (page - 1) * limit;
  const conditions = [
    status ? eq(refunds.status, status as any) : undefined,
  ].filter(Boolean);
  const where = conditions.length > 0 ? and(...(conditions as any)) : undefined;
  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: refunds.id,
        orderId: refunds.orderId,
        orderNumber: orders.orderNumber,
        vendorOrderId: refunds.vendorOrderId,
        paymentId: refunds.paymentId,
        status: refunds.status,
        reason: refunds.reason,
        note: refunds.note,
        totalAmount: refunds.totalAmount,
        itemsAmount: refunds.itemsAmount,
        shippingAmount: refunds.shippingAmount,
        taxAmount: refunds.taxAmount,
        currency: orders.currencyCode,
        createdBy: refunds.createdBy,
        processedAt: refunds.processedAt,
        createdAt: refunds.createdAt,
        updatedAt: refunds.updatedAt,
      })
      .from(refunds)
      .leftJoin(orders, eq(refunds.orderId, orders.id))
      .where(where)
      .orderBy(desc(refunds.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(refunds).where(where),
  ]);
  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function listRefundsForOrder(actor: AuthActor, orderId: string) {
  assertPermission(actor, "refund:read:any");
  return db.select().from(refunds).where(eq(refunds.orderId, orderId));
}

export async function getRefundById(actor: AuthActor, refundId: string) {
  assertPermission(actor, "refund:read:any");
  const [refund] = await db.select().from(refunds).where(eq(refunds.id, refundId));
  if (!refund) throw new NotFoundError("Refund not found");

  // Vendor actors can only view refunds for their own vendor orders
  if (actor.type === "vendor") {
    if (!refund.vendorOrderId) throw new ForbiddenError("Access denied");
    const [vo] = await db.select().from(vendorOrders).where(eq(vendorOrders.id, refund.vendorOrderId));
    if (!vo || vo.vendorId !== actor.vendorId) throw new ForbiddenError("Access denied");
  }

  const items = await db.select().from(refundItems).where(eq(refundItems.refundId, refundId));
  return { ...refund, items };
}

// ─── Create refund (transactional) ───────────────────────────────────────────

export async function createRefund(actor: AuthActor, data: CreateRefundDto) {
  assertPermission(actor, "refund:create:any");

  const [order] = await db.select().from(orders).where(eq(orders.id, data.orderId));
  if (!order) throw new NotFoundError("Order not found");

  // Vendor actors can only create refunds for their own vendor orders.
  // The vendorOrderId MUST be provided and belong to their vendor.
  if (actor.type === "vendor") {
    if (!data.vendorOrderId) {
      throw new ForbiddenError("Vendor refunds require a vendorOrderId");
    }
    const [vo] = await db
      .select()
      .from(vendorOrders)
      .where(eq(vendorOrders.id, data.vendorOrderId));
    if (!vo || vo.vendorId !== actor.vendorId || vo.orderId !== data.orderId) {
      throw new ForbiddenError("Access denied to this vendor order");
    }
  } else if (data.vendorOrderId) {
    // Admin refunds with vendorOrderId — verify it belongs to this order.
    const [vo] = await db
      .select()
      .from(vendorOrders)
      .where(eq(vendorOrders.id, data.vendorOrderId));
    if (!vo || vo.orderId !== data.orderId) {
      throw new BadRequestError("vendorOrderId does not belong to this order");
    }
  }

  // Compute total refund amount using integer-cent arithmetic
  const refundItemsList = data.items ?? [];
  const itemsAmountCents = refundItemsList.reduce((s, i) => s + toCents(i.amount), 0);
  const shippingAmountCents = toCents(data.shippingAmount ?? 0);
  const taxAmountCents = toCents(data.taxAmount ?? 0);
  const totalAmountCents = itemsAmountCents + shippingAmountCents + taxAmountCents;

  if (totalAmountCents <= 0) throw new BadRequestError("Refund amount must be greater than 0");

  // Validate: refund amount must not exceed (totalPaid - totalRefunded)
  const maxRefundableCents = toCents(order.totalPaid) - toCents(order.totalRefunded);
  if (totalAmountCents > maxRefundableCents) {
    throw new UnprocessableError(
      `Refund amount ${fromCents(totalAmountCents)} exceeds refundable amount ${fromCents(maxRefundableCents)}`
    );
  }

  // Pre-validate each refund item's quantity before entering the transaction
  // to provide clear errors without rolling back
  const orderItemRows = await Promise.all(
    refundItemsList.map(async (ri) => {
      const [orderItem] = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, ri.orderItemId));
      if (!orderItem) throw new NotFoundError(`Order item ${ri.orderItemId} not found`);

      const maxRefundableQty = orderItem.quantity - orderItem.refundedQuantity;
      if (ri.quantity > maxRefundableQty) {
        throw new UnprocessableError(
          `Cannot refund ${ri.quantity} of item ${ri.orderItemId}: only ${maxRefundableQty} eligible`
        );
      }
      return orderItem;
    })
  );

  const itemsAmount = fromCents(itemsAmountCents);
  const shippingAmount = fromCents(shippingAmountCents);
  const taxAmount = fromCents(taxAmountCents);
  const totalAmount = fromCents(totalAmountCents);

  return db.transaction(async (tx) => {
    const refundId = generateId();

    // (a) Create the refund record
    const [refund] = await tx
      .insert(refunds)
      .values({
        id: refundId,
        orderId: data.orderId,
        vendorOrderId: data.vendorOrderId ?? null,
        paymentId: data.paymentId ?? null,
        status: "pending",
        reason: data.reason ?? null,
        note: data.note ?? null,
        itemsAmount,
        shippingAmount,
        taxAmount,
        totalAmount,
        createdBy: actor.id,
      })
      .returning();

    // (b, c, h) Create refund items, update order item quantities, restore inventory
    for (let idx = 0; idx < refundItemsList.length; idx++) {
      const ri = refundItemsList[idx]!;
      const orderItem = orderItemRows[idx]!;

      // (b) Create refund_items record
      await tx.insert(refundItems).values({
        id: generateId(),
        refundId,
        orderItemId: ri.orderItemId,
        quantity: ri.quantity,
        amount: fromCents(toCents(ri.amount)),
      });

      // (c) Update order_items.refundedQuantity
      const newRefundedQty = orderItem.refundedQuantity + ri.quantity;
      const itemStatus =
        newRefundedQty >= orderItem.quantity ? "refunded" : "open";

      await tx
        .update(orderItems)
        .set({
          refundedQuantity: sql`${orderItems.refundedQuantity} + ${ri.quantity}`,
          status: itemStatus,
          updatedAt: new Date(),
        })
        .where(eq(orderItems.id, ri.orderItemId));

      // (h) Restore inventory if the order item has a variant
      if (orderItem.variantId) {
        const [invItem] = await tx
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.variantId, orderItem.variantId));

        if (invItem) {
          // Increment availableQuantity
          await tx
            .update(inventoryItems)
            .set({
              availableQuantity: sql`${inventoryItems.availableQuantity} + ${ri.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, invItem.id));

          // Create an inventory adjustment record with reason "refund"
          await tx.insert(inventoryAdjustments).values({
            id: generateId(),
            inventoryItemId: invItem.id,
            reason: "refund",
            delta: ri.quantity,
            note: `Refund ${refundId}: restored ${ri.quantity} unit(s)`,
            referenceType: "refund",
            referenceId: refundId,
            createdBy: actor.id,
          });
        }
      }
    }

    // (d) Update order.totalRefunded
    const newOrderTotalRefunded = addMoney(order.totalRefunded, totalAmount);

    // (g) Determine new payment status
    const newPaymentStatus =
      toCents(newOrderTotalRefunded) >= toCents(order.totalPaid)
        ? "refunded"
        : "partially_refunded";

    await tx
      .update(orders)
      .set({
        totalRefunded: newOrderTotalRefunded,
        paymentStatus: newPaymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, data.orderId));

    // (e) Update vendor_order.totalRefunded if vendorOrderId provided
    if (data.vendorOrderId) {
      const [vo] = await tx
        .select()
        .from(vendorOrders)
        .where(eq(vendorOrders.id, data.vendorOrderId));
      if (vo) {
        const newVoRefunded = addMoney(vo.totalRefunded, totalAmount);
        const voPaymentStatus =
          toCents(newVoRefunded) >= toCents(vo.totalPaid) ? "refunded" : "partially_refunded";
        await tx
          .update(vendorOrders)
          .set({
            totalRefunded: newVoRefunded,
            paymentStatus: voPaymentStatus,
            updatedAt: new Date(),
          })
          .where(eq(vendorOrders.id, data.vendorOrderId));
      }
    }

    // (f) Update payment.amountRefunded if paymentId provided
    if (data.paymentId) {
      const [payment] = await tx.select().from(payments).where(eq(payments.id, data.paymentId));
      if (payment) {
        const newAmountRefunded = addMoney(payment.amountRefunded, totalAmount);
        await tx
          .update(payments)
          .set({
            amountRefunded: newAmountRefunded,
            status:
              toCents(newAmountRefunded) >= toCents(payment.amountCaptured)
                ? "refunded"
                : "partially_refunded",
            updatedAt: new Date(),
          })
          .where(eq(payments.id, data.paymentId));
      }
    }

    // (i) Log audit entry
    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "refund",
      entityId: refundId,
      action: "refund.created",
      afterJson: refund,
    });

    // (j) Send refund confirmation email
    if (order.customerEmail) {
      const emailData = refundConfirmationEmail({
        orderNumber: order.orderNumber,
        customerName: order.customerFirstName ?? "Customer",
        refundAmount: totalAmount,
      });
      sendEmail({
        to: order.customerEmail,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        category: "order_updates",
        recipient: order.customerId ? { customerId: order.customerId } : undefined,
      }).catch((err) => {
        logger.error({ err, refundId, orderId: data.orderId }, "Failed to send refund confirmation email");
      });
    }

    return refund!;
  });
}

/**
 * Process a pending refund through the payment provider. Mark `processed`
 * on success, `failed` (and store the provider error) on failure — the
 * refund stays around for an admin to retry.
 *
 * Provider mapping:
 *  - `stripe` → `stripe.refunds.create` against the payment intent.
 *  - `esewa` / `khalti` / `fonepay` → see each provider's `refundPayment`
 *    impl (Nepali rails currently respond "not yet implemented"; this
 *    surfaces the error to the admin rather than silently flipping
 *    `processed` like the old code did).
 *  - `cod` → no provider call needed; admin already settled cash. Marked
 *    processed and emitted as such.
 *  - `manual` / `gift_card` → platform-side only; no provider call.
 *  - Refunds with no `paymentId` (legacy / store-credit-only) → processed
 *    without a provider call.
 */
export async function processRefund(actor: AuthActor, refundId: string) {
  assertPermission(actor, "refund:create:any");

  const [refund] = await db.select().from(refunds).where(eq(refunds.id, refundId));
  if (!refund) throw new NotFoundError("Refund not found");
  if (refund.status !== "pending") {
    throw new UnprocessableError("Refund is not in pending state");
  }

  // Resolve the payment row (if any) to know which provider to call.
  const [payment] = refund.paymentId
    ? await db.select().from(payments).where(eq(payments.id, refund.paymentId))
    : [];

  const PROVIDER_LESS = new Set(["manual", "gift_card", "cod"]);
  const skipProvider =
    !payment || !payment.providerPaymentId || PROVIDER_LESS.has(payment.provider);

  let providerRefundId: string | null = null;
  let providerError: string | null = null;

  if (!skipProvider && payment) {
    try {
      const provider = getPaymentProvider(payment.provider);
      const result = await provider.refundPayment({
        providerPaymentId: payment.providerPaymentId!,
        amount: refund.totalAmount,
        currencyCode: payment.currencyCode,
        reason: refund.reason ?? "customer_request",
      });
      if (result.success) {
        providerRefundId = result.providerRefundId ?? null;
      } else {
        providerError =
          (result.raw && typeof (result.raw as any).error === "string"
            ? (result.raw as any).error
            : JSON.stringify(result.raw ?? { message: "Refund failed" })) ||
          "Refund failed";
      }
    } catch (err: any) {
      providerError = err?.message ?? "Provider threw an unexpected error";
      logger.error({ err, refundId, provider: payment.provider }, "Provider refund call threw");
    }
  }

  // Persist the outcome. Failed refunds keep status=failed with the error
  // visible; an admin can re-create or retry from there.
  const status: "processed" | "failed" = providerError ? "failed" : "processed";
  const [updated] = await db
    .update(refunds)
    .set({
      status,
      processedAt: providerError ? null : new Date(),
      providerRefundId,
      providerError,
      updatedAt: new Date(),
    })
    .where(eq(refunds.id, refundId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "refund",
    entityId: refundId,
    action: providerError ? "refund.failed" : "refund.processed",
    afterJson: updated,
    metadata: {
      provider: payment?.provider ?? null,
      providerRefundId,
      providerError,
    },
  });

  if (providerError) {
    throw new UnprocessableError(`Refund failed at provider: ${providerError}`);
  }

  return updated!;
}
