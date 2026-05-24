import { eq, and, sql, inArray } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db, type DB } from "../../db/index.js";
import {
  orderFulfillments,
  orderFulfillmentItems,
  orderItems,
  vendorOrders,
  orders,
} from "../../db/schema/index.js";
import { assertPermission, assertVendorOwnership } from "../../lib/permissions.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "../../lib/errors.js";
import { generateId, generateFulfillmentNumber } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { fireWebhook } from "../../lib/webhooks.js";
import { sendEmail } from "../../lib/email.js";
import { orderShippedEmail } from "../../lib/email-templates.js";

/** A db instance or a transaction — both support the query builder methods we need. */
type DbOrTx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export interface CreateFulfillmentDto {
  vendorOrderId: string;
  carrier?: string;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  items: Array<{ orderItemId: string; quantity: number }>;
}

export interface UpdateTrackingDto {
  carrier?: string;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

type DeliveryStatus = typeof vendorOrders.$inferSelect.deliveryStatus;
type FulfillmentStatus = typeof vendorOrders.$inferSelect.fulfillmentStatus;

/**
 * Re-compute the vendor-order fulfillment status from its order items.
 * Must run inside a transaction after item quantities have been updated.
 */
async function recomputeVendorOrderFulfillmentStatus(
  tx: DbOrTx,
  vendorOrderId: string
): Promise<FulfillmentStatus> {
  const allItems = await tx
    .select()
    .from(orderItems)
    .where(eq(orderItems.vendorOrderId, vendorOrderId));

  const allFulfilled = allItems.every(
    (i) => i.fulfilledQuantity + i.refundedQuantity >= i.quantity
  );
  const anyFulfilled = allItems.some((i) => i.fulfilledQuantity > 0);

  return allFulfilled ? "fulfilled" : anyFulfilled ? "partially_fulfilled" : "unfulfilled";
}

/**
 * Aggregate the parent order's fulfillment status from all its vendor orders.
 * Must run inside a transaction after vendor order statuses have been updated.
 */
async function recomputeParentOrderFulfillmentStatus(
  tx: DbOrTx,
  orderId: string
): Promise<FulfillmentStatus> {
  const allVendorOrders = await tx
    .select({ fulfillmentStatus: vendorOrders.fulfillmentStatus })
    .from(vendorOrders)
    .where(eq(vendorOrders.orderId, orderId));

  const allFulfilled = allVendorOrders.every((vo) => vo.fulfillmentStatus === "fulfilled");
  const anyFulfilled = allVendorOrders.some(
    (vo) =>
      vo.fulfillmentStatus === "fulfilled" || vo.fulfillmentStatus === "partially_fulfilled"
  );

  return allFulfilled ? "fulfilled" : anyFulfilled ? "partially_fulfilled" : "unfulfilled";
}

/**
 * Aggregate the parent order's delivery status from all its vendor orders.
 */
async function recomputeParentOrderDeliveryStatus(
  tx: DbOrTx,
  orderId: string
): Promise<DeliveryStatus> {
  const allVendorOrders = await tx
    .select({ deliveryStatus: vendorOrders.deliveryStatus })
    .from(vendorOrders)
    .where(eq(vendorOrders.orderId, orderId));

  const statuses = allVendorOrders.map((vo) => vo.deliveryStatus);

  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.some((s) => s === "returned") && statuses.every((s) => s === "returned"))
    return "returned";
  if (statuses.some((s) => s === "out_for_delivery")) return "out_for_delivery";
  if (statuses.some((s) => s === "in_transit" || s === "out_for_delivery" || s === "delivered"))
    return "in_transit";
  if (statuses.some((s) => s === "failed")) return "failed";
  return "not_shipped";
}

export async function createFulfillment(actor: AuthActor, data: CreateFulfillmentDto) {
  assertPermission(actor, "vendor-order:fulfill:own");

  if (data.items.length === 0) {
    throw new BadRequestError("At least one item is required");
  }

  const itemIds = data.items.map((i) => i.orderItemId);
  if (new Set(itemIds).size !== itemIds.length) {
    throw new BadRequestError("Duplicate order item IDs in request");
  }

  // Validate vendor owns the vendor_order (outside tx for fast-fail)
  const [vendorOrder] = await db
    .select()
    .from(vendorOrders)
    .where(eq(vendorOrders.id, data.vendorOrderId));
  if (!vendorOrder) throw new NotFoundError("Vendor order not found");
  assertVendorOwnership(actor, vendorOrder.vendorId);

  if (vendorOrder.status === "cancelled") {
    throw new UnprocessableError("Cannot fulfill a cancelled order");
  }

  return db.transaction(async (tx) => {
    // Re-validate items inside the transaction (prevents race conditions)
    const orderItemRows = await tx
      .select()
      .from(orderItems)
      .where(
        and(
          eq(orderItems.vendorOrderId, data.vendorOrderId),
          inArray(
            orderItems.id,
            data.items.map((i) => i.orderItemId)
          )
        )
      );

    const orderItemMap = new Map(orderItemRows.map((row) => [row.id, row]));

    for (const fulfillItem of data.items) {
      const orderItem = orderItemMap.get(fulfillItem.orderItemId);
      if (!orderItem) {
        throw new NotFoundError(
          `Order item ${fulfillItem.orderItemId} not found in vendor order ${data.vendorOrderId}`
        );
      }

      if (orderItem.status === "cancelled" || orderItem.status === "returned") {
        throw new UnprocessableError(
          `Order item ${fulfillItem.orderItemId} has status "${orderItem.status}" and cannot be fulfilled`
        );
      }

      const remainingToFulfill = orderItem.quantity - orderItem.fulfilledQuantity;
      if (fulfillItem.quantity > remainingToFulfill) {
        throw new UnprocessableError(
          `Cannot fulfill ${fulfillItem.quantity} of item ${fulfillItem.orderItemId}: only ${remainingToFulfill} remaining`
        );
      }
    }

    const fulfillmentId = generateId();
    const fulfillmentNumber = generateFulfillmentNumber();

    const [fulfillment] = await tx
      .insert(orderFulfillments)
      .values({
        id: fulfillmentId,
        vendorOrderId: data.vendorOrderId,
        vendorId: vendorOrder.vendorId,
        fulfillmentNumber,
        status: "fulfilled",
        carrier: data.carrier ?? null,
        service: data.service ?? null,
        trackingNumber: data.trackingNumber ?? null,
        trackingUrl: data.trackingUrl ?? null,
        fulfilledAt: new Date(),
      })
      .returning();

    for (const fulfillItem of data.items) {
      await tx.insert(orderFulfillmentItems).values({
        fulfillmentId,
        vendorOrderId: data.vendorOrderId,
        orderItemId: fulfillItem.orderItemId,
        quantity: fulfillItem.quantity,
      });

      const orderItem = orderItemMap.get(fulfillItem.orderItemId)!;
      const newFulfilledQty = orderItem.fulfilledQuantity + fulfillItem.quantity;
      const isFullyFulfilled = newFulfilledQty >= orderItem.quantity;

      await tx
        .update(orderItems)
        .set({
          fulfilledQuantity: sql`${orderItems.fulfilledQuantity} + ${fulfillItem.quantity}`,
          ...(isFullyFulfilled ? { status: "fulfilled" as const } : {}),
          updatedAt: new Date(),
        })
        .where(eq(orderItems.id, fulfillItem.orderItemId));
    }

    const vendorFulfillmentStatus = await recomputeVendorOrderFulfillmentStatus(
      tx,
      data.vendorOrderId
    );

    await tx
      .update(vendorOrders)
      .set({
        fulfillmentStatus: vendorFulfillmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(vendorOrders.id, data.vendorOrderId));

    const parentFulfillmentStatus = await recomputeParentOrderFulfillmentStatus(
      tx,
      vendorOrder.orderId
    );

    await tx
      .update(orders)
      .set({
        fulfillmentStatus: parentFulfillmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, vendorOrder.orderId));

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "fulfillment",
      entityId: fulfillmentId,
      action: "fulfillment.created",
      afterJson: {
        ...fulfillment,
        items: data.items,
        vendorFulfillmentStatus,
        parentFulfillmentStatus,
      },
      tx: tx as unknown as typeof db,
    });

    // Fire webhook outside the transaction (fire-and-forget)
    fireWebhook({
      topic: "fulfillment.created",
      entityType: "fulfillment",
      entityId: fulfillmentId,
      data: {
        ...fulfillment,
        items: data.items,
        vendorOrderId: data.vendorOrderId,
        vendorFulfillmentStatus,
        parentFulfillmentStatus,
      } as unknown as Record<string, unknown>,
    }).catch(() => {});

    const [parentOrder] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, vendorOrder.orderId));
    if (parentOrder?.customerEmail) {
      const emailData = orderShippedEmail({
        orderNumber: parentOrder.orderNumber,
        customerName: parentOrder.customerFirstName ?? "Customer",
        trackingNumber: data.trackingNumber,
        trackingUrl: data.trackingUrl,
        carrier: data.carrier,
      });
      sendEmail({
        to: parentOrder.customerEmail,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        category: "order_updates",
        recipient: parentOrder.customerId ? { customerId: parentOrder.customerId } : undefined,
      }).catch(() => {});
    }

    return fulfillment!;
  });
}

export async function cancelFulfillment(actor: AuthActor, fulfillmentId: string) {
  assertPermission(actor, "vendor-order:fulfill:own");

  const [fulfillment] = await db
    .select()
    .from(orderFulfillments)
    .where(eq(orderFulfillments.id, fulfillmentId));
  if (!fulfillment) throw new NotFoundError("Fulfillment not found");
  assertVendorOwnership(actor, fulfillment.vendorId);

  if (fulfillment.status === "cancelled") {
    throw new UnprocessableError("Fulfillment is already cancelled");
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(orderFulfillments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orderFulfillments.id, fulfillmentId))
      .returning();

    const fulfillmentItems = await tx
      .select()
      .from(orderFulfillmentItems)
      .where(eq(orderFulfillmentItems.fulfillmentId, fulfillmentId));

    for (const fi of fulfillmentItems) {
      await tx
        .update(orderItems)
        .set({
          fulfilledQuantity: sql`GREATEST(${orderItems.fulfilledQuantity} - ${fi.quantity}, 0)`,
          status: "open",
          updatedAt: new Date(),
        })
        .where(eq(orderItems.id, fi.orderItemId));
    }

    const vendorFulfillmentStatus = await recomputeVendorOrderFulfillmentStatus(
      tx,
      fulfillment.vendorOrderId
    );

    await tx
      .update(vendorOrders)
      .set({
        fulfillmentStatus: vendorFulfillmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(vendorOrders.id, fulfillment.vendorOrderId));

    const [vendorOrder] = await tx
      .select({ orderId: vendorOrders.orderId })
      .from(vendorOrders)
      .where(eq(vendorOrders.id, fulfillment.vendorOrderId));

    if (vendorOrder) {
      const parentFulfillmentStatus = await recomputeParentOrderFulfillmentStatus(
        tx,
        vendorOrder.orderId
      );

      await tx
        .update(orders)
        .set({
          fulfillmentStatus: parentFulfillmentStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, vendorOrder.orderId));
    }

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "fulfillment",
      entityId: fulfillmentId,
      action: "fulfillment.cancelled",
      beforeJson: fulfillment,
      afterJson: updated,
      tx: tx as unknown as typeof db,
    });

    return updated!;
  });
}

export async function updateFulfillmentTracking(
  actor: AuthActor,
  fulfillmentId: string,
  data: UpdateTrackingDto
) {
  assertPermission(actor, "vendor-order:fulfill:own");

  const [fulfillment] = await db
    .select()
    .from(orderFulfillments)
    .where(eq(orderFulfillments.id, fulfillmentId));
  if (!fulfillment) throw new NotFoundError("Fulfillment not found");
  assertVendorOwnership(actor, fulfillment.vendorId);

  if (fulfillment.status === "cancelled") {
    throw new UnprocessableError("Cannot update tracking on a cancelled fulfillment");
  }

  const [updated] = await db
    .update(orderFulfillments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(orderFulfillments.id, fulfillmentId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "fulfillment",
    entityId: fulfillmentId,
    action: "fulfillment.tracking_updated",
    beforeJson: {
      carrier: fulfillment.carrier,
      service: fulfillment.service,
      trackingNumber: fulfillment.trackingNumber,
      trackingUrl: fulfillment.trackingUrl,
    },
    afterJson: {
      carrier: updated!.carrier,
      service: updated!.service,
      trackingNumber: updated!.trackingNumber,
      trackingUrl: updated!.trackingUrl,
    },
  });

  return updated!;
}

const VALID_DELIVERY_TRANSITIONS: Record<string, DeliveryStatus[]> = {
  not_shipped: ["in_transit"],
  in_transit: ["out_for_delivery", "delivered", "returned", "failed"],
  out_for_delivery: ["delivered", "returned", "failed"],
  delivered: ["returned"],
  returned: [],
  failed: ["in_transit"],
};

export async function updateDeliveryStatus(
  actor: AuthActor,
  vendorOrderId: string,
  newStatus: DeliveryStatus
) {
  assertPermission(actor, "vendor-order:fulfill:own");

  const [vendorOrder] = await db
    .select()
    .from(vendorOrders)
    .where(eq(vendorOrders.id, vendorOrderId));
  if (!vendorOrder) throw new NotFoundError("Vendor order not found");
  assertVendorOwnership(actor, vendorOrder.vendorId);

  const allowed = VALID_DELIVERY_TRANSITIONS[vendorOrder.deliveryStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new UnprocessableError(
      `Cannot transition delivery status from "${vendorOrder.deliveryStatus}" to "${newStatus}"`
    );
  }

  return db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(vendorOrders)
      .set({
        deliveryStatus: newStatus,
        updatedAt: now,
      })
      .where(eq(vendorOrders.id, vendorOrderId));

    const parentDeliveryStatus = await recomputeParentOrderDeliveryStatus(
      tx,
      vendorOrder.orderId
    );

    await tx
      .update(orders)
      .set({
        deliveryStatus: parentDeliveryStatus,
        updatedAt: now,
      })
      .where(eq(orders.id, vendorOrder.orderId));

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "vendor_order",
      entityId: vendorOrderId,
      action: "vendor_order.delivery_status_updated",
      beforeJson: { deliveryStatus: vendorOrder.deliveryStatus },
      afterJson: { deliveryStatus: newStatus, parentDeliveryStatus },
      tx: tx as unknown as typeof db,
    });

    fireWebhook({
      topic: "delivery.updated",
      entityType: "vendor_order",
      entityId: vendorOrderId,
      data: { deliveryStatus: newStatus, parentDeliveryStatus, orderId: vendorOrder.orderId },
    }).catch(() => {});

    return { deliveryStatus: newStatus, parentDeliveryStatus };
  });
}

export async function markAsShipped(
  actor: AuthActor,
  vendorOrderId: string,
  tracking?: UpdateTrackingDto
) {
  assertPermission(actor, "vendor-order:fulfill:own");

  const [vendorOrder] = await db
    .select()
    .from(vendorOrders)
    .where(eq(vendorOrders.id, vendorOrderId));
  if (!vendorOrder) throw new NotFoundError("Vendor order not found");
  assertVendorOwnership(actor, vendorOrder.vendorId);

  if (vendorOrder.deliveryStatus !== "not_shipped" && vendorOrder.deliveryStatus !== "failed") {
    throw new UnprocessableError(
      `Cannot mark as shipped: current delivery status is "${vendorOrder.deliveryStatus}"`
    );
  }

  return db.transaction(async (tx) => {
    const now = new Date();

    // If tracking info provided, update all active fulfillments for this vendor order
    if (tracking) {
      await tx
        .update(orderFulfillments)
        .set({
          carrier: tracking.carrier ?? undefined,
          service: tracking.service ?? undefined,
          trackingNumber: tracking.trackingNumber ?? undefined,
          trackingUrl: tracking.trackingUrl ?? undefined,
          updatedAt: now,
        })
        .where(
          and(
            eq(orderFulfillments.vendorOrderId, vendorOrderId),
            eq(orderFulfillments.status, "fulfilled")
          )
        );
    }

    await tx
      .update(vendorOrders)
      .set({
        deliveryStatus: "in_transit",
        updatedAt: now,
      })
      .where(eq(vendorOrders.id, vendorOrderId));

    const parentDeliveryStatus = await recomputeParentOrderDeliveryStatus(
      tx,
      vendorOrder.orderId
    );

    await tx
      .update(orders)
      .set({
        deliveryStatus: parentDeliveryStatus,
        updatedAt: now,
      })
      .where(eq(orders.id, vendorOrder.orderId));

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "vendor_order",
      entityId: vendorOrderId,
      action: "vendor_order.marked_shipped",
      beforeJson: { deliveryStatus: vendorOrder.deliveryStatus },
      afterJson: { deliveryStatus: "in_transit", parentDeliveryStatus },
      tx: tx as unknown as typeof db,
    });

    fireWebhook({
      topic: "delivery.updated",
      entityType: "vendor_order",
      entityId: vendorOrderId,
      data: { deliveryStatus: "in_transit", parentDeliveryStatus, orderId: vendorOrder.orderId },
    }).catch(() => {});

    return { deliveryStatus: "in_transit" as const, parentDeliveryStatus };
  });
}

export async function markAsDelivered(actor: AuthActor, vendorOrderId: string) {
  assertPermission(actor, "vendor-order:fulfill:own");

  const [vendorOrder] = await db
    .select()
    .from(vendorOrders)
    .where(eq(vendorOrders.id, vendorOrderId));
  if (!vendorOrder) throw new NotFoundError("Vendor order not found");
  assertVendorOwnership(actor, vendorOrder.vendorId);

  const allowedFrom: DeliveryStatus[] = ["in_transit", "out_for_delivery"];
  if (!allowedFrom.includes(vendorOrder.deliveryStatus)) {
    throw new UnprocessableError(
      `Cannot mark as delivered: current delivery status is "${vendorOrder.deliveryStatus}"`
    );
  }

  return db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(vendorOrders)
      .set({
        deliveryStatus: "delivered",
        updatedAt: now,
      })
      .where(eq(vendorOrders.id, vendorOrderId));

    const parentDeliveryStatus = await recomputeParentOrderDeliveryStatus(
      tx,
      vendorOrder.orderId
    );

    await tx
      .update(orders)
      .set({
        deliveryStatus: parentDeliveryStatus,
        updatedAt: now,
      })
      .where(eq(orders.id, vendorOrder.orderId));

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "vendor_order",
      entityId: vendorOrderId,
      action: "vendor_order.marked_delivered",
      beforeJson: { deliveryStatus: vendorOrder.deliveryStatus },
      afterJson: { deliveryStatus: "delivered", parentDeliveryStatus },
      tx: tx as unknown as typeof db,
    });

    fireWebhook({
      topic: "delivery.updated",
      entityType: "vendor_order",
      entityId: vendorOrderId,
      data: { deliveryStatus: "delivered", parentDeliveryStatus, orderId: vendorOrder.orderId },
    }).catch(() => {});

    return { deliveryStatus: "delivered" as const, parentDeliveryStatus };
  });
}

export async function listFulfillmentsForVendorOrder(
  actor: AuthActor,
  vendorOrderId: string
) {
  assertPermission(actor, "vendor-order:read:own");
  if (!actor.vendorId) throw new ForbiddenError("Vendor context required");

  const [vendorOrder] = await db
    .select()
    .from(vendorOrders)
    .where(eq(vendorOrders.id, vendorOrderId));
  if (!vendorOrder) throw new NotFoundError("Vendor order not found");
  assertVendorOwnership(actor, vendorOrder.vendorId);

  return db
    .select()
    .from(orderFulfillments)
    .where(eq(orderFulfillments.vendorOrderId, vendorOrderId));
}

export async function listFulfillmentsAdmin(actor: AuthActor, vendorOrderId: string) {
  assertPermission(actor, "order:read:any");
  return db
    .select()
    .from(orderFulfillments)
    .where(eq(orderFulfillments.vendorOrderId, vendorOrderId));
}

export async function createFulfillmentAdmin(actor: AuthActor, data: CreateFulfillmentDto) {
  assertPermission(actor, "order:update:any");

  if (data.items.length === 0) {
    throw new BadRequestError("At least one item is required");
  }

  const itemIds = data.items.map((i) => i.orderItemId);
  if (new Set(itemIds).size !== itemIds.length) {
    throw new BadRequestError("Duplicate order item IDs in request");
  }

  const [vendorOrder] = await db
    .select()
    .from(vendorOrders)
    .where(eq(vendorOrders.id, data.vendorOrderId));
  if (!vendorOrder) throw new NotFoundError("Vendor order not found");

  if (vendorOrder.status === "cancelled") {
    throw new UnprocessableError("Cannot fulfill a cancelled order");
  }

  return db.transaction(async (tx) => {
    const orderItemRows = await tx
      .select()
      .from(orderItems)
      .where(
        and(
          eq(orderItems.vendorOrderId, data.vendorOrderId),
          inArray(
            orderItems.id,
            data.items.map((i) => i.orderItemId)
          )
        )
      );

    const orderItemMap = new Map(orderItemRows.map((row) => [row.id, row]));

    for (const fulfillItem of data.items) {
      const orderItem = orderItemMap.get(fulfillItem.orderItemId);
      if (!orderItem) {
        throw new NotFoundError(
          `Order item ${fulfillItem.orderItemId} not found in vendor order ${data.vendorOrderId}`
        );
      }

      if (orderItem.status === "cancelled" || orderItem.status === "returned") {
        throw new UnprocessableError(
          `Order item ${fulfillItem.orderItemId} has status "${orderItem.status}" and cannot be fulfilled`
        );
      }

      const remainingToFulfill = orderItem.quantity - orderItem.fulfilledQuantity;
      if (fulfillItem.quantity > remainingToFulfill) {
        throw new UnprocessableError(
          `Cannot fulfill ${fulfillItem.quantity} of item ${fulfillItem.orderItemId}: only ${remainingToFulfill} remaining`
        );
      }
    }

    const fulfillmentId = generateId();
    const fulfillmentNumber = generateFulfillmentNumber();

    const [fulfillment] = await tx
      .insert(orderFulfillments)
      .values({
        id: fulfillmentId,
        vendorOrderId: data.vendorOrderId,
        vendorId: vendorOrder.vendorId,
        fulfillmentNumber,
        status: "fulfilled",
        carrier: data.carrier ?? null,
        service: data.service ?? null,
        trackingNumber: data.trackingNumber ?? null,
        trackingUrl: data.trackingUrl ?? null,
        fulfilledAt: new Date(),
      })
      .returning();

    for (const fulfillItem of data.items) {
      await tx.insert(orderFulfillmentItems).values({
        fulfillmentId,
        vendorOrderId: data.vendorOrderId,
        orderItemId: fulfillItem.orderItemId,
        quantity: fulfillItem.quantity,
      });

      const orderItem = orderItemMap.get(fulfillItem.orderItemId)!;
      const newFulfilledQty = orderItem.fulfilledQuantity + fulfillItem.quantity;
      const isFullyFulfilled = newFulfilledQty >= orderItem.quantity;

      await tx
        .update(orderItems)
        .set({
          fulfilledQuantity: sql`${orderItems.fulfilledQuantity} + ${fulfillItem.quantity}`,
          ...(isFullyFulfilled ? { status: "fulfilled" as const } : {}),
          updatedAt: new Date(),
        })
        .where(eq(orderItems.id, fulfillItem.orderItemId));
    }

    const vendorFulfillmentStatus = await recomputeVendorOrderFulfillmentStatus(
      tx,
      data.vendorOrderId
    );

    await tx
      .update(vendorOrders)
      .set({
        fulfillmentStatus: vendorFulfillmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(vendorOrders.id, data.vendorOrderId));

    const parentFulfillmentStatus = await recomputeParentOrderFulfillmentStatus(
      tx,
      vendorOrder.orderId
    );

    await tx
      .update(orders)
      .set({
        fulfillmentStatus: parentFulfillmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, vendorOrder.orderId));

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "fulfillment",
      entityId: fulfillmentId,
      action: "fulfillment.created",
      afterJson: {
        ...fulfillment,
        items: data.items,
        vendorFulfillmentStatus,
        parentFulfillmentStatus,
      },
      tx: tx as unknown as typeof db,
    });

    fireWebhook({
      topic: "fulfillment.created",
      entityType: "fulfillment",
      entityId: fulfillmentId,
      data: {
        ...fulfillment,
        items: data.items,
        vendorOrderId: data.vendorOrderId,
        vendorFulfillmentStatus,
        parentFulfillmentStatus,
      } as unknown as Record<string, unknown>,
    }).catch(() => {});

    return fulfillment!;
  });
}

export async function updateFulfillmentTrackingAdmin(
  actor: AuthActor,
  fulfillmentId: string,
  data: UpdateTrackingDto
) {
  assertPermission(actor, "order:update:any");

  const [fulfillment] = await db
    .select()
    .from(orderFulfillments)
    .where(eq(orderFulfillments.id, fulfillmentId));
  if (!fulfillment) throw new NotFoundError("Fulfillment not found");

  if (fulfillment.status === "cancelled") {
    throw new UnprocessableError("Cannot update tracking on a cancelled fulfillment");
  }

  const [updated] = await db
    .update(orderFulfillments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(orderFulfillments.id, fulfillmentId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "fulfillment",
    entityId: fulfillmentId,
    action: "fulfillment.tracking_updated",
    beforeJson: {
      carrier: fulfillment.carrier,
      service: fulfillment.service,
      trackingNumber: fulfillment.trackingNumber,
      trackingUrl: fulfillment.trackingUrl,
    },
    afterJson: {
      carrier: updated!.carrier,
      service: updated!.service,
      trackingNumber: updated!.trackingNumber,
      trackingUrl: updated!.trackingUrl,
    },
  });

  return updated!;
}

export async function cancelFulfillmentAdmin(actor: AuthActor, fulfillmentId: string) {
  assertPermission(actor, "order:update:any");

  const [fulfillment] = await db
    .select()
    .from(orderFulfillments)
    .where(eq(orderFulfillments.id, fulfillmentId));
  if (!fulfillment) throw new NotFoundError("Fulfillment not found");

  if (fulfillment.status === "cancelled") {
    throw new UnprocessableError("Fulfillment is already cancelled");
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(orderFulfillments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orderFulfillments.id, fulfillmentId))
      .returning();

    const fulfillmentItems = await tx
      .select()
      .from(orderFulfillmentItems)
      .where(eq(orderFulfillmentItems.fulfillmentId, fulfillmentId));

    for (const fi of fulfillmentItems) {
      await tx
        .update(orderItems)
        .set({
          fulfilledQuantity: sql`GREATEST(${orderItems.fulfilledQuantity} - ${fi.quantity}, 0)`,
          status: "open",
          updatedAt: new Date(),
        })
        .where(eq(orderItems.id, fi.orderItemId));
    }

    const vendorFulfillmentStatus = await recomputeVendorOrderFulfillmentStatus(
      tx,
      fulfillment.vendorOrderId
    );

    await tx
      .update(vendorOrders)
      .set({
        fulfillmentStatus: vendorFulfillmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(vendorOrders.id, fulfillment.vendorOrderId));

    const [vendorOrder] = await tx
      .select({ orderId: vendorOrders.orderId })
      .from(vendorOrders)
      .where(eq(vendorOrders.id, fulfillment.vendorOrderId));

    if (vendorOrder) {
      const parentFulfillmentStatus = await recomputeParentOrderFulfillmentStatus(
        tx,
        vendorOrder.orderId
      );

      await tx
        .update(orders)
        .set({
          fulfillmentStatus: parentFulfillmentStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, vendorOrder.orderId));
    }

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "fulfillment",
      entityId: fulfillmentId,
      action: "fulfillment.cancelled",
      beforeJson: fulfillment,
      afterJson: updated,
      tx: tx as unknown as typeof db,
    });

    return updated!;
  });
}

export async function updateDeliveryStatusAdmin(
  actor: AuthActor,
  vendorOrderId: string,
  newStatus: DeliveryStatus
) {
  assertPermission(actor, "order:update:any");

  const [vendorOrder] = await db
    .select()
    .from(vendorOrders)
    .where(eq(vendorOrders.id, vendorOrderId));
  if (!vendorOrder) throw new NotFoundError("Vendor order not found");

  const allowed = VALID_DELIVERY_TRANSITIONS[vendorOrder.deliveryStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new UnprocessableError(
      `Cannot transition delivery status from "${vendorOrder.deliveryStatus}" to "${newStatus}"`
    );
  }

  return db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(vendorOrders)
      .set({
        deliveryStatus: newStatus,
        updatedAt: now,
      })
      .where(eq(vendorOrders.id, vendorOrderId));

    const parentDeliveryStatus = await recomputeParentOrderDeliveryStatus(
      tx,
      vendorOrder.orderId
    );

    await tx
      .update(orders)
      .set({
        deliveryStatus: parentDeliveryStatus,
        updatedAt: now,
      })
      .where(eq(orders.id, vendorOrder.orderId));

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "vendor_order",
      entityId: vendorOrderId,
      action: "vendor_order.delivery_status_updated",
      beforeJson: { deliveryStatus: vendorOrder.deliveryStatus },
      afterJson: { deliveryStatus: newStatus, parentDeliveryStatus },
      tx: tx as unknown as typeof db,
    });

    fireWebhook({
      topic: "delivery.updated",
      entityType: "vendor_order",
      entityId: vendorOrderId,
      data: { deliveryStatus: newStatus, parentDeliveryStatus, orderId: vendorOrder.orderId },
    }).catch(() => {});

    return { deliveryStatus: newStatus, parentDeliveryStatus };
  });
}
