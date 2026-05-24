import { eq } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import {
  assertPermission,
  assertVendorOwnership,
  assertCustomerOwnership,
} from "../../lib/permissions.js";
import { ForbiddenError, NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { fireWebhook } from "../../lib/webhooks.js";
import { sendEmail } from "../../lib/email.js";
import { orderCancelledEmail, draftOrderInvoiceEmail } from "../../lib/email-templates.js";
import { getEnv } from "../../lib/env.js";
import { generateId } from "../../lib/id.js";
import { db } from "../../db/index.js";
import {
  customers,
  variants,
  products as productsTable,
  messageThreads,
  messages as messagesTable,
} from "../../db/schema/index.js";
import * as repo from "./repository.js";
import type {
  OrderFilters,
  VendorOrderFilters,
  PlaceOrderInput,
  CreateDraftOrderInput,
  UpdateDraftOrderInput,
} from "./types.js";

// ─── Customer-facing order operations ────────────────────────────────────────

/**
 * Place a new order from a cart.
 * The full transactional logic is in the repository.
 * Checkout module calls this after validating the cart.
 */
export async function placeOrder(actor: AuthActor, input: PlaceOrderInput) {
  if (actor.type !== "customer") {
    throw new ForbiddenError("Only customers can place orders");
  }

  const order = await repo.placeOrder({
    ...input,
    customerId: actor.id,
  });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "order",
    entityId: order.id,
    action: "order.created",
    afterJson: order,
  });

  // `order.created` webhook is enqueued atomically inside the placeOrder
  // transaction (transactional outbox). Drainer picks it up from there.

  // Fire-and-forget campaign conversion attribution. Lazy-loaded to avoid a
  // module-init cycle between orders ↔ campaigns. Eventually consistent — if
  // it fails, analytics under-reports but the order is still placed.
  void (async () => {
    try {
      const { recordConversionForOrder } = await import("../campaigns/service.js");
      await recordConversionForOrder(order.id);
    } catch {
      // best-effort
    }
    try {
      const { awardPointsForOrder } = await import("../loyalty/service.js");
      await awardPointsForOrder(order.id);
    } catch {
      // best-effort
    }
  })();

  return order;
}

export async function listMyOrders(actor: AuthActor, filters: OrderFilters) {
  if (actor.type !== "customer") throw new ForbiddenError();
  return repo.findOrders({ ...filters, customerId: actor.id });
}

export async function getMyOrder(actor: AuthActor, orderId: string) {
  if (actor.type !== "customer") throw new ForbiddenError();
  const order = await repo.findOrderWithItems(orderId);
  if (!order) throw new NotFoundError("Order not found");
  assertCustomerOwnership(actor, order.customerId ?? "");
  return order;
}

// ─── Admin operations ─────────────────────────────────────────────────────────

export async function listOrders(actor: AuthActor, filters: OrderFilters) {
  assertPermission(actor, "order:read:any");
  return repo.findOrders(filters);
}

export async function getOrderById(actor: AuthActor, id: string) {
  assertPermission(actor, "order:read:any");
  const order = await repo.findOrderWithItems(id);
  if (!order) throw new NotFoundError("Order not found");
  return order;
}

export async function updateOrderStatus(actor: AuthActor, id: string, status: string) {
  assertPermission(actor, "order:update:any");
  const before = await repo.findOrderById(id);
  const order = await repo.updateOrderStatus(id, status);
  if (!order) throw new NotFoundError("Order not found");

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "order",
    entityId: id,
    action: "order.status_updated",
    beforeJson: before,
    afterJson: order,
    metadata: { status },
  });

  fireWebhook({
    topic: "order.updated",
    entityType: "order",
    entityId: id,
    data: { status, order: order as unknown as Record<string, unknown> },
  }).catch(() => {});

  return order;
}

// ─── Vendor operations ────────────────────────────────────────────────────────

export async function listMyVendorOrders(actor: AuthActor, filters: VendorOrderFilters) {
  assertPermission(actor, "vendor-order:read:own");
  if (!actor.vendorId) throw new ForbiddenError("Vendor context required");
  return repo.findVendorOrders({ ...filters, vendorId: actor.vendorId });
}

export async function getMyVendorOrder(actor: AuthActor, vendorOrderId: string) {
  assertPermission(actor, "vendor-order:read:own");
  if (!actor.vendorId) throw new ForbiddenError("Vendor context required");

  const vendorOrder = await repo.findVendorOrderWithItems(vendorOrderId, actor.vendorId);
  if (!vendorOrder) throw new NotFoundError("Vendor order not found");
  return vendorOrder;
}

export async function updateVendorOrderStatus(
  actor: AuthActor,
  vendorOrderId: string,
  status: string
) {
  assertPermission(actor, "vendor-order:fulfill:own");
  if (!actor.vendorId) throw new ForbiddenError("Vendor context required");

  const row = await repo.findVendorOrderById(vendorOrderId);
  if (!row) throw new NotFoundError("Vendor order not found");
  assertVendorOwnership(actor, row.vendorId);

  const updated = await repo.updateVendorOrderStatus(vendorOrderId, status);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "vendor_order",
    entityId: vendorOrderId,
    action: "vendor_order.status_updated",
    beforeJson: row,
    afterJson: updated,
    metadata: { status },
  });

  return updated!;
}

// ─── Admin: vendor order access ───────────────────────────────────────────────

export async function listVendorOrdersAdmin(actor: AuthActor, filters: VendorOrderFilters) {
  assertPermission(actor, "order:read:any");
  return repo.findVendorOrders(filters);
}

// ─── Order cancellation ──────────────────────────────────────────────────────

/** Admin cancels any order. */
export async function cancelOrderAdmin(actor: AuthActor, orderId: string) {
  assertPermission(actor, "order:update:any");

  const order = await repo.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order not found");
  if (order.status !== "open") {
    throw new UnprocessableError(
      `Cannot cancel order with status "${order.status}" — only "open" orders can be cancelled`
    );
  }

  const cancelled = await repo.cancelOrder(orderId, actor.id);
  if (!cancelled) throw new NotFoundError("Order not found");

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "order",
    entityId: orderId,
    action: "order.cancelled",
    beforeJson: order,
    afterJson: cancelled,
  });

  fireWebhook({
    topic: "order.cancelled",
    entityType: "order",
    entityId: orderId,
    data: cancelled as unknown as Record<string, unknown>,
  }).catch(() => {});

  // Notify the customer their order was cancelled.
  if (order.customerEmail) {
    const t = orderCancelledEmail({
      orderNumber: order.orderNumber,
      customerName: order.customerFirstName ?? "Customer",
    });
    sendEmail({
      to: order.customerEmail,
      subject: t.subject,
      html: t.html,
      text: t.text,
      category: "order_updates",
      recipient: order.customerId ? { customerId: order.customerId } : undefined,
    }).catch(() => {});
  }

  return cancelled;
}

/** Customer cancels their own order. */
export async function cancelOrderCustomer(actor: AuthActor, orderId: string) {
  if (actor.type !== "customer") throw new ForbiddenError();

  const order = await repo.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order not found");
  assertCustomerOwnership(actor, order.customerId ?? "");

  if (order.status !== "open") {
    throw new UnprocessableError(
      `Cannot cancel order with status "${order.status}" — only "open" orders can be cancelled`
    );
  }

  const cancelled = await repo.cancelOrder(orderId, actor.id);
  if (!cancelled) throw new NotFoundError("Order not found");

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "order",
    entityId: orderId,
    action: "order.cancelled",
    beforeJson: order,
    afterJson: cancelled,
  });

  fireWebhook({
    topic: "order.cancelled",
    entityType: "order",
    entityId: orderId,
    data: cancelled as unknown as Record<string, unknown>,
  }).catch(() => {});

  if (order.customerEmail) {
    const t = orderCancelledEmail({
      orderNumber: order.orderNumber,
      customerName: order.customerFirstName ?? "Customer",
    });
    sendEmail({
      to: order.customerEmail,
      subject: t.subject,
      html: t.html,
      text: t.text,
      category: "order_updates",
      recipient: order.customerId ? { customerId: order.customerId } : undefined,
    }).catch(() => {});
  }

  return cancelled;
}

// ─── Quote request (customer-initiated draft order) ─────────────────────────

interface CreateQuoteRequestInput {
  variantId: string;
  productId?: string;
  quantity: number;
  shippingAddress?: CreateDraftOrderInput["shippingAddress"];
  message?: string;
}

/**
 * Customer requests a bulk quote from the PDP. We create a draft order with a
 * single line item (qty + variant) and leave unit price unset — `createDraftOrder`
 * snapshots it from the catalog, but the seller can renegotiate in admin
 * before sending the invoice.
 *
 * Side effect: opens a messaging thread to the vendor that owns the variant so
 * the request shows up in their inbox alongside ordinary "Ask the seller"
 * conversations. The thread links back to the order via `messageThreads.orderId`.
 */
export async function createQuoteRequest(
  actor: AuthActor,
  input: CreateQuoteRequestInput
) {
  if (actor.type !== "customer") {
    throw new ForbiddenError("Sign in as a customer to request a quote.");
  }

  // Load minimal customer fields for the draft snapshot.
  const [customer] = await db
    .select({
      id: customers.id,
      email: customers.email,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
    })
    .from(customers)
    .where(eq(customers.id, actor.id));
  if (!customer) throw new ForbiddenError("Customer record missing.");

  // Resolve vendor + product handle from the variant — we need vendor for the
  // messaging thread and the product handle for the success redirect.
  const [variantRow] = await db
    .select({
      vendorId: productsTable.vendorId,
      productId: productsTable.id,
    })
    .from(variants)
    .innerJoin(productsTable, eq(productsTable.id, variants.productId))
    .where(eq(variants.id, input.variantId));
  if (!variantRow) throw new NotFoundError("Product not found");

  const order = await repo.createDraftOrder({
    customerId: customer.id,
    customerEmail: customer.email,
    customerFirstName: customer.firstName ?? undefined,
    customerLastName: customer.lastName ?? undefined,
    customerPhone: customer.phone ?? undefined,
    shippingAddress: input.shippingAddress,
    items: [
      {
        variantId: input.variantId,
        productId: input.productId ?? variantRow.productId,
        quantity: input.quantity,
      },
    ],
    note: input.message
      ? `Bulk quote request — ${input.quantity} units.\n\n${input.message}`
      : `Bulk quote request — ${input.quantity} units.`,
  });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "order",
    entityId: order.id,
    action: "order.quote_requested",
    afterJson: { quantity: input.quantity, variantId: input.variantId },
  });

  // Vendor inbox thread — fire-and-forget; a failed notification shouldn't
  // block the customer's quote request.
  void (async () => {
    try {
      const threadId = generateId();
      const now = new Date();
      await db.transaction(async (tx) => {
        await tx.insert(messageThreads).values({
          id: threadId,
          customerId: customer.id,
          vendorId: variantRow.vendorId,
          subject: `Bulk quote request — ${input.quantity} units`,
          productId: input.productId ?? variantRow.productId,
          orderId: order.id,
          lastMessageAt: now,
          customerUnreadCount: 0,
          vendorUnreadCount: 1,
        });
        await tx.insert(messagesTable).values({
          id: generateId(),
          threadId,
          senderType: "customer",
          senderId: customer.id,
          body: input.message
            ? `Bulk quote request — ${input.quantity} units.\n\n${input.message}`
            : `Bulk quote request — ${input.quantity} units. (Order ${order.orderNumber})`,
        });
      });
    } catch (err) {
      // Swallow — see comment above. Audit log already recorded the request.
      // eslint-disable-next-line no-console
      console.warn("quote request notify failed", err);
    }
  })();

  return order;
}

// ─── Draft orders (admin-created) ────────────────────────────────────────────

export async function createDraftOrder(actor: AuthActor, input: CreateDraftOrderInput) {
  assertPermission(actor, "order:create:any");

  const order = await repo.createDraftOrder(input);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "order",
    entityId: order.id,
    action: "order.draft_created",
    afterJson: order,
  });

  return order;
}

export async function updateDraftOrder(
  actor: AuthActor,
  orderId: string,
  input: UpdateDraftOrderInput
) {
  assertPermission(actor, "order:create:any");

  const before = await repo.findOrderById(orderId);
  if (!before) throw new NotFoundError("Order not found");

  const updated = await repo.updateDraftOrder(orderId, input);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "order",
    entityId: orderId,
    action: "order.draft_updated",
    beforeJson: before,
    afterJson: updated,
  });

  return updated;
}

export async function convertDraftOrder(actor: AuthActor, orderId: string) {
  assertPermission(actor, "order:create:any");

  const before = await repo.findOrderById(orderId);
  if (!before) throw new NotFoundError("Order not found");

  const converted = await repo.convertDraftToOpen(orderId, actor.id);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "order",
    entityId: orderId,
    action: "order.draft_converted",
    beforeJson: before,
    afterJson: converted,
  });

  void (async () => {
    try {
      const { recordConversionForOrder } = await import("../campaigns/service.js");
      await recordConversionForOrder(orderId);
    } catch {
      // best-effort
    }
    try {
      const { awardPointsForOrder } = await import("../loyalty/service.js");
      await awardPointsForOrder(orderId);
    } catch {
      // best-effort
    }
  })();

  return converted;
}

/**
 * Send the customer an invoice link for a draft. Status is unchanged — this is
 * just an email. Caller decides when (and whether) to convert the draft.
 */
export async function sendDraftInvoice(actor: AuthActor, orderId: string) {
  assertPermission(actor, "order:create:any");

  const order = await repo.findOrderWithItems(orderId);
  if (!order) throw new NotFoundError("Order not found");
  if (!order.customerEmail) {
    throw new UnprocessableError("Order has no customer email to send the invoice to");
  }

  const env = getEnv();
  const invoiceUrl = `${env.NEXT_PUBLIC_STOREFRONT_URL.replace(/\/$/, "")}/customer/orders/${order.id}`;

  const template = draftOrderInvoiceEmail({
    orderNumber: order.orderNumber,
    customerName: order.customerFirstName ?? "there",
    items: (order.items ?? []).map((i: any) => ({
      title: i.title,
      quantity: i.quantity,
      price: i.totalPrice,
    })),
    subtotal: order.subtotalPrice,
    shipping: order.shippingPrice,
    tax: order.taxTotal,
    total: order.totalPrice,
    currency: order.currencyCode,
    invoiceUrl,
    note: order.note,
  });

  await sendEmail({
    to: order.customerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  }).catch((err) => {
    // Don't lose the audit record if email send fails — surface the error.
    throw new UnprocessableError(`Failed to send invoice email: ${err?.message ?? "unknown"}`);
  });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "order",
    entityId: orderId,
    action: "order.draft_invoice_sent",
    metadata: { to: order.customerEmail },
  });

  return { sent: true, to: order.customerEmail };
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

export async function exportOrdersCsv(actor: AuthActor): Promise<string> {
  assertPermission(actor, "order:read:any");

  const { generateCsv } = await import("../../lib/csv.js");
  const result = await repo.findOrders({ page: 1, limit: 10000 });
  const rows = result.data ?? [];

  const columns = [
    { header: "Order Number", accessor: (r: any) => r.orderNumber },
    { header: "Status", accessor: (r: any) => r.status },
    { header: "Payment Status", accessor: (r: any) => r.paymentStatus },
    { header: "Fulfillment Status", accessor: (r: any) => r.fulfillmentStatus },
    { header: "Currency", accessor: (r: any) => r.currencyCode },
    { header: "Subtotal", accessor: (r: any) => r.subtotalPrice },
    { header: "Shipping", accessor: (r: any) => r.totalShipping },
    { header: "Tax", accessor: (r: any) => r.totalTax },
    { header: "Total", accessor: (r: any) => r.totalPrice },
    { header: "Customer ID", accessor: (r: any) => r.customerId ?? "" },
    { header: "Placed At", accessor: (r: any) => r.placedAt ?? "" },
    { header: "Created At", accessor: (r: any) => r.createdAt },
  ];

  return generateCsv(columns, rows);
}
