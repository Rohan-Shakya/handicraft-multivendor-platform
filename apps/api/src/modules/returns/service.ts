import { eq, and, desc, sql, inArray } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { returns, returnItems, orderItems, orders, customers } from "../../db/schema/index.js";
import {
  assertPermission,
  assertCustomerOwnership,
} from "../../lib/permissions.js";
import { ForbiddenError, NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { sendEmail } from "../../lib/email.js";
import { returnApprovedEmail, returnRejectedEmail } from "../../lib/email-templates.js";
import { createRefund } from "../refunds/service.js";
import { toCents, fromCents } from "../../lib/money.js";

export interface CreateReturnDto {
  orderId: string;
  vendorOrderId?: string;
  reason?: "damaged" | "wrong_item" | "not_as_described" | "no_longer_needed" | "size_issue" | "other";
  note?: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
    reason?: "damaged" | "wrong_item" | "not_as_described" | "no_longer_needed" | "size_issue" | "other";
    note?: string;
  }>;
}

// ─── Customer: request return ─────────────────────────────────────────────────

export async function requestReturn(actor: AuthActor, data: CreateReturnDto) {
  if (actor.type !== "customer") throw new ForbiddenError("Only customers can request returns");

  const [order] = await db.select().from(orders).where(eq(orders.id, data.orderId));
  if (!order) throw new NotFoundError("Order not found");
  assertCustomerOwnership(actor, order.customerId ?? "");

  if (order.fulfillmentStatus === "unfulfilled") {
    throw new UnprocessableError("Cannot return an unfulfilled order — request cancellation instead");
  }

  return db.transaction(async (tx) => {
    const returnId = generateId();
    const [ret] = await tx
      .insert(returns)
      .values({
        id: returnId,
        orderId: data.orderId,
        vendorOrderId: data.vendorOrderId ?? null,
        customerId: actor.id,
        status: "requested",
        reason: data.reason ?? null,
        note: data.note ?? null,
        requestedAt: new Date(),
      })
      .returning();

    // Batch-fetch all order items to avoid N+1 queries
    const orderItemIds = data.items.map((ri) => ri.orderItemId);
    const fetchedOrderItems = await tx
      .select()
      .from(orderItems)
      .where(
        and(
          inArray(orderItems.id, orderItemIds),
          eq(orderItems.orderId, data.orderId)
        )
      );
    const orderItemMap = new Map(fetchedOrderItems.map((oi) => [oi.id, oi]));

    for (const ri of data.items) {
      const orderItem = orderItemMap.get(ri.orderItemId);
      if (!orderItem) throw new NotFoundError(`Order item ${ri.orderItemId} not found`);
      if (orderItem.fulfilledQuantity < ri.quantity) {
        throw new UnprocessableError(
          `Cannot return ${ri.quantity} of item ${ri.orderItemId}: only ${orderItem.fulfilledQuantity} fulfilled`
        );
      }

      await tx.insert(returnItems).values({
        id: generateId(),
        returnId,
        orderItemId: ri.orderItemId,
        quantity: ri.quantity,
        reason: ri.reason ?? null,
        note: ri.note ?? null,
      });
    }

    return ret!;
  });
}

export async function listMyReturns(actor: AuthActor) {
  if (actor.type !== "customer") throw new ForbiddenError();
  return db.select().from(returns).where(eq(returns.customerId, actor.id));
}

// ─── Admin/Vendor: manage returns ────────────────────────────────────────────

export async function listReturns(
  actor: AuthActor,
  filters: { orderId?: string; status?: string; page?: number; limit?: number }
) {
  assertPermission(actor, "return:manage:any");

  const { page = 1, limit = 20, orderId, status } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    orderId ? eq(returns.orderId, orderId) : undefined,
    status ? eq(returns.status, status as any) : undefined,
  ].filter(Boolean);
  const where = conditions.length > 0 ? and(...(conditions as any)) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: returns.id,
        orderId: returns.orderId,
        orderNumber: orders.orderNumber,
        customerId: returns.customerId,
        customerName: sql<string>`COALESCE(${customers.firstName} || ' ' || ${customers.lastName}, '')`,
        status: returns.status,
        reason: returns.reason,
        note: returns.note,
        requestedAt: returns.requestedAt,
        createdAt: returns.createdAt,
        updatedAt: returns.updatedAt,
      })
      .from(returns)
      .leftJoin(orders, eq(returns.orderId, orders.id))
      .leftJoin(customers, eq(returns.customerId, customers.id))
      .where(where)
      .orderBy(desc(returns.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(returns).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function approveReturn(actor: AuthActor, returnId: string) {
  assertPermission(actor, "return:manage:any");
  const [ret] = await db.select().from(returns).where(eq(returns.id, returnId));
  if (!ret) throw new NotFoundError("Return not found");
  if (ret.status !== "requested") {
    throw new UnprocessableError("Return is not in requested state");
  }

  const [updated] = await db
    .update(returns)
    .set({
      status: "approved",
      approvedAt: new Date(),
      processedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(returns.id, returnId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "return",
    entityId: returnId,
    action: "return.approved",
    beforeJson: ret,
    afterJson: updated,
  });

  // Send return approved email to customer
  const [order] = await db.select().from(orders).where(eq(orders.id, ret.orderId));
  if (order?.customerEmail) {
    const emailData = returnApprovedEmail({
      orderNumber: order.orderNumber,
      customerName: order.customerFirstName ?? "Customer",
      returnId,
    });
    sendEmail({
      to: order.customerEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      category: "order_updates",
      recipient: order.customerId ? { customerId: order.customerId } : undefined,
    }).catch(() => {});
  }

  return updated!;
}

export async function rejectReturn(actor: AuthActor, returnId: string, note?: string) {
  assertPermission(actor, "return:manage:any");
  const [ret] = await db.select().from(returns).where(eq(returns.id, returnId));
  if (!ret) throw new NotFoundError("Return not found");
  if (ret.status !== "requested") {
    throw new UnprocessableError("Return is not in requested state");
  }

  const [updated] = await db
    .update(returns)
    .set({
      status: "rejected",
      rejectedAt: new Date(),
      note: note ?? ret.note,
      processedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(returns.id, returnId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "return",
    entityId: returnId,
    action: "return.rejected",
    beforeJson: ret,
    afterJson: updated,
  });

  // Send return rejected email to customer
  const [orderForReject] = await db.select().from(orders).where(eq(orders.id, ret.orderId));
  if (orderForReject?.customerEmail) {
    const emailData = returnRejectedEmail({
      orderNumber: orderForReject.orderNumber,
      customerName: orderForReject.customerFirstName ?? "Customer",
      reason: note,
    });
    sendEmail({
      to: orderForReject.customerEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      category: "order_updates",
      recipient: orderForReject.customerId
        ? { customerId: orderForReject.customerId }
        : undefined,
    }).catch(() => {});
  }

  return updated!;
}

/**
 * Mark an approved return as received and (by default) auto-create a pending
 * refund for the returned items. Side effects:
 *
 *   1. `returns.status` → "received"
 *   2. A `refunds` row is created with one `refund_items` per `return_items`,
 *      with `amount = orderItem.unitPrice × returnItem.quantity` per line.
 *   3. Inventory is restocked for each returned variant (handled inside
 *      `createRefund` — same flow used by direct admin refunds).
 *   4. `orders.totalRefunded` + `paymentStatus` are advanced inside the
 *      refund transaction.
 *
 * The refund is created in `pending` status — an admin still needs to call
 * `processRefund` to settle it with the payment provider (Stripe etc.). This
 * separation lets ops review the amount before money moves.
 *
 * Set `skipRefund=true` to mark received without creating a refund (e.g. for
 * exchanges, where credit is applied differently).
 */
export async function markReturnReceived(
  actor: AuthActor,
  returnId: string,
  opts?: { skipRefund?: boolean }
) {
  assertPermission(actor, "return:manage:any");
  const [ret] = await db.select().from(returns).where(eq(returns.id, returnId));
  if (!ret) throw new NotFoundError("Return not found");
  if (ret.status !== "approved") {
    throw new UnprocessableError("Return must be approved before marking received");
  }

  const [updated] = await db
    .update(returns)
    .set({
      status: "received",
      receivedAt: new Date(),
      processedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(returns.id, returnId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "return",
    entityId: returnId,
    action: "return.received",
    afterJson: updated,
  });

  // ── Auto-create the matching refund ──────────────────────────────────────
  // We let createRefund() do the heavy lifting (refund row + refund_items +
  // inventory restock + order.totalRefunded update + payment_status flip).
  // The refund stays in `pending` until an admin processes it.
  if (!opts?.skipRefund) {
    const retItems = await db
      .select()
      .from(returnItems)
      .where(eq(returnItems.returnId, returnId));

    if (retItems.length > 0) {
      const orderItemIds = retItems.map((r) => r.orderItemId);
      const orderItemRows = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.id, orderItemIds));
      const byId = new Map(orderItemRows.map((oi) => [oi.id, oi]));

      const refundLineItems = retItems
        .map((ri) => {
          const oi = byId.get(ri.orderItemId);
          if (!oi) return null;
          // Refund amount = remaining-refundable per unit × quantity returned,
          // capped at unrefunded quantity in case of partial prior refunds.
          const refundable = Math.max(0, oi.quantity - oi.refundedQuantity);
          const qty = Math.min(ri.quantity, refundable);
          if (qty <= 0) return null;
          const unitCents = Math.round(toCents(oi.unitPrice));
          const amount = parseFloat(fromCents(unitCents * qty));
          return { orderItemId: ri.orderItemId, quantity: qty, amount };
        })
        .filter((x): x is { orderItemId: string; quantity: number; amount: number } => !!x);

      if (refundLineItems.length > 0) {
        try {
          await createRefund(actor, {
            orderId: ret.orderId,
            vendorOrderId: ret.vendorOrderId ?? undefined,
            reason: "customer_request",
            note: `Auto-created from return ${returnId}`,
            items: refundLineItems,
          });
        } catch (err: any) {
          // Don't roll back the return — the goods are physically back and
          // the receipt is recorded. Surface the refund failure as an audit
          // entry so ops can retry manually.
          await logAudit({
            actorUserId: auditActorId(actor),
            entityType: "return",
            entityId: returnId,
            action: "return.refund_auto_create_failed",
            metadata: { error: err?.message ?? "unknown" },
          });
        }
      }
    }
  }

  return updated!;
}
