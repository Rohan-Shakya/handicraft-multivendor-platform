import { eq, and, sql, desc, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  orders,
  vendorOrders,
  orderItems,
  orderAddresses,
  vendorOrderAddresses,
  orderAppliedDiscounts,
  vendorOrderAppliedDiscounts,
  carts,
  cartItems,
  cartAppliedDiscounts,
  customers,
  inventoryItems,
  inventoryAdjustments,
  inventoryReservations,
  variants as variantsTable,
  products as productsTable,
  discounts,
  discountCodes,
  discountRedemptions,
  vendors,
  auditLogs,
} from "../../db/schema/index.js";
import { NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { enqueueOutboxEvent } from "../../lib/webhooks.js";
import { generateId, generateOrderNumber, generateVendorOrderNumber } from "../../lib/id.js";
import {
  toCents,
  fromCents,
  sumMoney,
  multiplyMoney,
  allocateProportionally,
} from "../../lib/money.js";
import type {
  OrderFilters,
  VendorOrderFilters,
  PlaceOrderInput,
  CreateDraftOrderInput,
  UpdateDraftOrderInput,
  DraftOrderLineItemInput,
} from "./types.js";

export async function findOrders(filters: OrderFilters) {
  const { page = 1, limit = 20, customerId, status, paymentStatus } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    customerId ? eq(orders.customerId, customerId) : undefined,
    status ? eq(orders.status, status as any) : undefined,
    paymentStatus ? eq(orders.paymentStatus, paymentStatus as any) : undefined,
  ].filter(Boolean);

  const where = conditions.length > 0 ? and(...(conditions as any)) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.placedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function findOrderById(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  return order ?? null;
}

export async function findOrderWithItems(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;

  const [items, addresses, appliedDiscounts, vendorOrderList] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(orderAddresses).where(eq(orderAddresses.orderId, id)),
    db.select().from(orderAppliedDiscounts).where(eq(orderAppliedDiscounts.orderId, id)),
    db.select().from(vendorOrders).where(eq(vendorOrders.orderId, id)),
  ]);

  return { ...order, items, addresses, appliedDiscounts, vendorOrders: vendorOrderList };
}

export async function findVendorOrders(filters: VendorOrderFilters) {
  const { page = 1, limit = 20, vendorId, status, orderId } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    vendorId ? eq(vendorOrders.vendorId, vendorId) : undefined,
    status ? eq(vendorOrders.status, status as any) : undefined,
    orderId ? eq(vendorOrders.orderId, orderId) : undefined,
  ].filter(Boolean);

  const where = conditions.length > 0 ? and(...(conditions as any)) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(vendorOrders).where(where).orderBy(desc(vendorOrders.placedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(vendorOrders).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function findVendorOrderById(id: string) {
  const [row] = await db.select().from(vendorOrders).where(eq(vendorOrders.id, id));
  return row ?? null;
}

export async function findVendorOrderWithItems(vendorOrderId: string, vendorId: string) {
  const [row] = await db
    .select()
    .from(vendorOrders)
    .where(and(eq(vendorOrders.id, vendorOrderId), eq(vendorOrders.vendorId, vendorId)));
  if (!row) return null;

  const [items, addresses] = await Promise.all([
    db
      .select()
      .from(orderItems)
      .where(eq(orderItems.vendorOrderId, vendorOrderId)),
    db
      .select()
      .from(vendorOrderAddresses)
      .where(eq(vendorOrderAddresses.vendorOrderId, vendorOrderId)),
  ]);

  return { ...row, items, addresses };
}

export async function updateOrderStatus(id: string, status: string) {
  const now = new Date();
  const patch: Record<string, unknown> = { status, updatedAt: now };

  if (status === "cancelled") patch.cancelledAt = now;
  if (status === "completed") patch.completedAt = now;
  if (status === "archived") patch.archivedAt = now;

  const [order] = await db
    .update(orders)
    .set(patch as never)
    .where(eq(orders.id, id))
    .returning();
  return order ?? null;
}

export async function updateVendorOrderStatus(id: string, status: string) {
  const now = new Date();
  const patch: Record<string, unknown> = { status, updatedAt: now };
  if (status === "cancelled") patch.cancelledAt = now;
  if (status === "completed") patch.completedAt = now;

  const [row] = await db
    .update(vendorOrders)
    .set(patch as never)
    .where(eq(vendorOrders.id, id))
    .returning();
  return row ?? null;
}

export async function placeOrder(data: PlaceOrderInput) {
  return db.transaction(async (tx) => {
    const [cart] = await tx.select().from(carts).where(eq(carts.id, data.cartId));
    if (!cart) throw Object.assign(new Error("Cart not found"), { statusCode: 400 });
    if (cart.status !== "active") {
      throw Object.assign(new Error("Cart is not active"), { statusCode: 400 });
    }

    const items = await tx.select().from(cartItems).where(eq(cartItems.cartId, data.cartId));
    if (items.length === 0) {
      throw Object.assign(new Error("Cart is empty"), { statusCode: 400 });
    }

    const cartDiscounts = await tx
      .select()
      .from(cartAppliedDiscounts)
      .where(eq(cartAppliedDiscounts.cartId, data.cartId));

    const subtotalPrice = cart.itemsSubtotalPrice;
    const discountTotal = cart.totalDiscount;
    const shippingPrice = data.shippingPrice ?? "0";
    const taxTotal = data.taxTotal ?? "0";
    // Recalculate total to include shipping and tax. For inclusive-tax zones
    // (EU/UK/Nepal VAT), the tax is already embedded in cart.totalPrice — we
    // record taxTotal for the invoice line but don't add it on top.
    const totalPrice = fromCents(
      toCents(cart.totalPrice) +
        toCents(shippingPrice) +
        (data.taxInclusive ? 0 : toCents(taxTotal))
    );

    const orderId = generateId();
    const orderNumber = generateOrderNumber();

    const [order] = await tx
      .insert(orders)
      .values({
        id: orderId,
        cartId: data.cartId,
        customerId: data.customerId ?? null,
        orderNumber,
        status: "open",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        deliveryStatus: "not_shipped",
        currencyCode: cart.currencyCode,
        customerEmail: data.customerEmail ?? null,
        customerFirstName: data.customerFirstName ?? null,
        customerLastName: data.customerLastName ?? null,
        customerPhone: data.customerPhone ?? null,
        itemCount: cart.itemCount,
        subtotalPrice,
        discountTotal,
        shippingPrice,
        taxTotal,
        totalPrice,
        note: data.note ?? null,
        placedAt: new Date(),
      })
      .returning();

    if (data.shippingAddress) {
      await tx.insert(orderAddresses).values({
        id: generateId(),
        orderId,
        type: "shipping",
        ...data.shippingAddress,
      });
    }
    if (data.billingAddress) {
      await tx.insert(orderAddresses).values({
        id: generateId(),
        orderId,
        type: "billing",
        ...data.billingAddress,
      });
    }

    for (const d of cartDiscounts) {
      await tx.insert(orderAppliedDiscounts).values({
        id: generateId(),
        orderId,
        discountId: d.discountId ?? null,
        discountCodeId: d.discountCodeId ?? null,
        code: d.code,
        title: d.title,
        type: d.type,
        targetType: d.targetType,
        amount: d.amount,
      });
    }

    const vendorGroups = new Map<string, typeof items>();
    for (const item of items) {
      const group = vendorGroups.get(item.vendorId) ?? [];
      group.push(item);
      vendorGroups.set(item.vendorId, group);
    }

    const vendorIds = [...vendorGroups.keys()];
    const vendorRows = await tx
      .select({ id: vendors.id, slug: vendors.slug })
      .from(vendors)
      .where(inArray(vendors.id, vendorIds));
    const vendorSlugMap = new Map(vendorRows.map((v) => [v.id, v.slug]));

    for (const [vendorId, vendorItems] of vendorGroups) {
      // Compute vendor-level totals using integer cents to avoid floating-point drift
      const vendorSubtotal = sumMoney(vendorItems.map((i) => i.lineSubtotal));
      const vendorDiscount = sumMoney(vendorItems.map((i) => i.lineDiscountTotal));
      const vendorTotal = sumMoney(vendorItems.map((i) => i.lineTotal));
      const vendorItemCount = vendorItems.reduce((s, i) => s + i.quantity, 0);

      const vendorOrderId = generateId();
      const vendorOrderNumber = generateVendorOrderNumber(
        vendorSlugMap.get(vendorId) ?? vendorId
      );

      await tx.insert(vendorOrders).values({
        id: vendorOrderId,
        orderId,
        vendorId,
        vendorOrderNumber,
        status: "open",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        deliveryStatus: "not_shipped",
        currencyCode: cart.currencyCode,
        itemCount: vendorItemCount,
        subtotalPrice: vendorSubtotal,
        discountTotal: vendorDiscount,
        shippingPrice: "0",
        taxTotal: "0",
        totalPrice: vendorTotal,
        placedAt: new Date(),
      });

      // Address snapshots per vendor order
      if (data.shippingAddress) {
        await tx.insert(vendorOrderAddresses).values({
          id: generateId(),
          vendorOrderId,
          type: "shipping",
          ...data.shippingAddress,
        });
      }

      // Snapshot vendor-order discounts proportionally using integer math
      if (cartDiscounts.length > 0 && toCents(vendorTotal) > 0) {
        for (const d of cartDiscounts) {
          // Use allocateProportionally to avoid rounding drift
          const totalCentsVal = toCents(totalPrice);
          const vendorCentsVal = toCents(vendorTotal);
          const discountCents = toCents(d.amount);
          const allocatedCents =
            totalCentsVal > 0
              ? Math.round((discountCents * vendorCentsVal) / totalCentsVal)
              : 0;
          await tx.insert(vendorOrderAppliedDiscounts).values({
            id: generateId(),
            vendorOrderId,
            discountId: d.discountId ?? null,
            discountCodeId: d.discountCodeId ?? null,
            code: d.code,
            title: d.title,
            type: d.type,
            targetType: d.targetType,
            amount: fromCents(allocatedCents),
          });
        }
      }

      for (const cartItem of vendorItems) {
        await tx.insert(orderItems).values({
          id: generateId(),
          orderId,
          vendorOrderId,
          vendorId,
          productId: cartItem.productId ?? null,
          variantId: cartItem.variantId ?? null,
          title: cartItem.title,
          variantTitle: cartItem.variantTitle ?? null,
          sku: cartItem.sku ?? null,
          quantity: cartItem.quantity,
          fulfilledQuantity: 0,
          refundedQuantity: 0,
          unitPrice: cartItem.unitPrice,
          lineSubtotal: cartItem.lineSubtotal,
          discountTotal: cartItem.lineDiscountTotal,
          taxTotal: "0",
          totalPrice: cartItem.lineTotal,
          requiresShipping: cartItem.requiresShipping,
          status: "open",
        });
      }
    }

    // 10. Consume inventory reservations or adjust available quantities.
    // Inventory enforcement happens INSIDE the transaction for atomicity —
    // this eliminates the TOCTOU gap from any pre-transaction validation.
    //
    // Perf: previously each iteration issued 2 SELECTs + 1-2 UPDATEs serially.
    // For a 20-item cart that's ~80 round-trips holding the tx open. Reads
    // are now batched (one `inArray` for variants, one join for reservations)
    // and the loop drives from in-memory maps.
    const variantIds = [...new Set(items.map((i) => i.variantId))];

    const variantRows = variantIds.length
      ? await tx
          .select({
            id: variantsTable.id,
            inventoryTracked: variantsTable.inventoryTracked,
            inventoryPolicy: variantsTable.inventoryPolicy,
          })
          .from(variantsTable)
          .where(inArray(variantsTable.id, variantIds))
      : [];
    const variantById = new Map(variantRows.map((v) => [v.id, v]));

    const reservationRows = variantIds.length
      ? await tx
          .select({
            reservationId: inventoryReservations.id,
            inventoryItemId: inventoryReservations.inventoryItemId,
            variantId: inventoryItems.variantId,
          })
          .from(inventoryReservations)
          .innerJoin(
            inventoryItems,
            eq(inventoryReservations.inventoryItemId, inventoryItems.id)
          )
          .where(
            and(
              eq(inventoryReservations.cartId, data.cartId),
              inArray(inventoryItems.variantId, variantIds),
              eq(inventoryReservations.status, "active")
            )
          )
      : [];
    // Pop-from-pool semantics: when the same variant appears in multiple cart
    // lines, each line consumes a distinct reservation row (if available).
    const reservationsByVariant = new Map<string, typeof reservationRows>();
    for (const r of reservationRows) {
      const list = reservationsByVariant.get(r.variantId) ?? [];
      list.push(r);
      reservationsByVariant.set(r.variantId, list);
    }

    for (const item of items) {
      const variantRow = variantById.get(item.variantId);
      const reservation = reservationsByVariant.get(item.variantId)?.shift();

      if (reservation) {
        // Mark reservation as consumed
        await tx
          .update(inventoryReservations)
          .set({ status: "consumed", updatedAt: new Date() })
          .where(eq(inventoryReservations.id, reservation.reservationId));

        // Decrement reservedQuantity only (item was already removed from available when reserved)
        await tx
          .update(inventoryItems)
          .set({
            reservedQuantity: sql`${inventoryItems.reservedQuantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, reservation.inventoryItemId));
      } else {
        // No reservation — decrement available quantity directly.
        // If inventory is tracked with deny policy, use atomic conditional update:
        // only succeeds when available >= requested quantity.
        const shouldEnforce =
          variantRow?.inventoryTracked && variantRow?.inventoryPolicy === "deny";

        if (shouldEnforce) {
          const updated = await tx
            .update(inventoryItems)
            .set({
              availableQuantity: sql`${inventoryItems.availableQuantity} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventoryItems.variantId, item.variantId),
                sql`${inventoryItems.availableQuantity} >= ${item.quantity}`
              )
            )
            .returning({ id: inventoryItems.id });

          if (updated.length === 0) {
            throw new UnprocessableError(
              `Insufficient stock for "${item.title}": not enough inventory available`
            );
          }
        } else {
          // Non-tracked or continue-selling policy — just clip at 0
          await tx
            .update(inventoryItems)
            .set({
              availableQuantity: sql`GREATEST(0, ${inventoryItems.availableQuantity} - ${item.quantity})`,
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.variantId, item.variantId));
        }
      }
    }

    for (const d of cartDiscounts) {
      if (d.discountId) {
        await tx
          .update(discounts)
          .set({ usageCount: sql`${discounts.usageCount} + 1` })
          .where(eq(discounts.id, d.discountId));
      }
      if (d.discountCodeId) {
        await tx
          .update(discountCodes)
          .set({ usageCount: sql`${discountCodes.usageCount} + 1` })
          .where(eq(discountCodes.id, d.discountCodeId));
      }
      await tx
        .update(discountRedemptions)
        .set({ status: "applied_to_order", orderId })
        .where(
          and(
            eq(discountRedemptions.cartId, data.cartId),
            eq(discountRedemptions.code, d.code),
            eq(discountRedemptions.status, "applied_to_cart")
          )
        );
    }

    if (data.customerId) {
      await tx
        .update(customers)
        .set({
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${totalPrice}`,
          lastOrderAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, data.customerId));
    }

    await tx
      .update(carts)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(carts.id, data.cartId));

    // 14. Transactional outbox: enqueue order.created INSIDE the same tx so
    // the event is committed atomically with the order. The drainer scheduled
    // job picks it up and dispatches via BullMQ. This eliminates the
    // "committed but never delivered" gap that the old fire-and-forget had.
    await enqueueOutboxEvent(tx, {
      topic: "order.created",
      entityType: "order",
      entityId: order!.id,
      data: order as unknown as Record<string, unknown>,
    });

    return order!;
  });
}

export async function cancelOrder(orderId: string, actorUserId?: string) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [order] = await tx
      .update(orders)
      .set({ status: "cancelled", cancelledAt: now, updatedAt: now } as never)
      .where(eq(orders.id, orderId))
      .returning();

    if (!order) return null;

    await tx
      .update(vendorOrders)
      .set({ status: "cancelled", cancelledAt: now, updatedAt: now } as never)
      .where(eq(vendorOrders.orderId, orderId));

    await tx
      .update(orderItems)
      .set({ status: "cancelled", updatedAt: now } as never)
      .where(eq(orderItems.orderId, orderId));

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      if (!item.variantId) continue;

      const [invItem] = await tx
        .update(inventoryItems)
        .set({
          availableQuantity: sql`${inventoryItems.availableQuantity} + ${item.quantity}`,
          updatedAt: now,
        })
        .where(eq(inventoryItems.variantId, item.variantId))
        .returning();

      if (invItem) {
        await tx.insert(inventoryAdjustments).values({
          id: generateId(),
          inventoryItemId: invItem.id,
          reason: "release",
          delta: item.quantity,
          note: `Order ${order.orderNumber} cancelled — inventory restored`,
          referenceType: "order",
          referenceId: orderId,
          createdBy: actorUserId ?? null,
        });
      }
    }

    await tx
      .update(inventoryReservations)
      .set({ status: "released", updatedAt: now })
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, "active")
        )
      );

    // Also release reservations tied to the cart if present
    if (order.cartId) {
      await tx
        .update(inventoryReservations)
        .set({ status: "released", updatedAt: now })
        .where(
          and(
            eq(inventoryReservations.cartId, order.cartId),
            eq(inventoryReservations.status, "active")
          )
        );
    }

    await tx.insert(auditLogs).values({
      id: generateId(),
      actorUserId: actorUserId ?? null,
      entityType: "order",
      entityId: orderId,
      action: "order.cancelled",
      metadata: {
        orderNumber: order.orderNumber,
        itemCount: items.length,
      },
    });

    return order;
  });
}

// Drizzle's transaction callback receives a narrower `Tx` than the root `db`.
// Reuse the inferred type so helper functions accept either.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface ResolvedLineItem {
  vendorId: string;
  productId: string | null;
  variantId: string | null;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  lineSubtotal: string;
  discountTotal: string;
  taxTotal: string;
  totalPrice: string;
  requiresShipping: boolean;
}

/**
 * Resolve each input line item into a snapshot ready for `orderItems` insertion.
 * - When `variantId` is provided, looks up variant + product + vendor; admin
 *   inputs (unitPrice, title) can still override the catalog values so we
 *   support negotiated pricing on draft orders.
 * - When `variantId` is omitted, treats the row as a custom one-off line and
 *   requires `vendorId`, `title`, and `unitPrice` from the caller.
 */
async function resolveDraftLineItems(
  tx: Tx,
  items: DraftOrderLineItemInput[]
): Promise<ResolvedLineItem[]> {
  if (items.length === 0) {
    throw new UnprocessableError("Draft order must have at least one line item");
  }
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new UnprocessableError("Line item quantity must be a positive integer");
    }
  }

  const variantIds = [
    ...new Set(items.map((i) => i.variantId).filter((v): v is string => !!v)),
  ];

  const variantRows = variantIds.length
    ? await tx
        .select({
          id: variantsTable.id,
          productId: variantsTable.productId,
          vendorId: variantsTable.vendorId,
          title: variantsTable.title,
          sku: variantsTable.sku,
          price: variantsTable.price,
          requiresShipping: variantsTable.requiresShipping,
        })
        .from(variantsTable)
        .where(and(inArray(variantsTable.id, variantIds), isNull(variantsTable.deletedAt)))
    : [];
  const variantById = new Map(variantRows.map((v) => [v.id, v]));

  const productIds = [...new Set(variantRows.map((v) => v.productId))];
  const productRows = productIds.length
    ? await tx
        .select({ id: productsTable.id, title: productsTable.title })
        .from(productsTable)
        .where(inArray(productsTable.id, productIds))
    : [];
  const productById = new Map(productRows.map((p) => [p.id, p]));

  // Validate every custom-line vendorId exists — otherwise the FK on
  // vendor_orders would fail with a generic 500 deep inside the transaction.
  const customVendorIds = [
    ...new Set(
      items
        .filter((i) => !i.variantId && i.vendorId)
        .map((i) => i.vendorId as string)
    ),
  ];
  if (customVendorIds.length > 0) {
    const existing = await tx
      .select({ id: vendors.id })
      .from(vendors)
      .where(inArray(vendors.id, customVendorIds));
    const found = new Set(existing.map((v) => v.id));
    const missing = customVendorIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new UnprocessableError(
        `Vendor not found: ${missing.join(", ")}`
      );
    }
  }

  return items.map((input) => {
    if (input.variantId) {
      const variant = variantById.get(input.variantId);
      if (!variant) {
        throw new UnprocessableError(`Variant ${input.variantId} not found`);
      }
      const product = productById.get(variant.productId);
      const baseTitle = product?.title ?? variant.title ?? "Item";

      const unitPrice = input.unitPrice ?? variant.price;
      const lineSubtotal = multiplyMoney(unitPrice, input.quantity);
      const discountTotal = input.discountTotal ?? "0";
      const taxTotal = input.taxTotal ?? "0";
      const totalPrice = fromCents(
        Math.max(
          0,
          toCents(lineSubtotal) - toCents(discountTotal) + toCents(taxTotal)
        )
      );

      return {
        vendorId: variant.vendorId,
        productId: variant.productId,
        variantId: variant.id,
        title: input.title ?? baseTitle,
        variantTitle: input.variantTitle ?? variant.title ?? null,
        sku: input.sku ?? variant.sku ?? null,
        quantity: input.quantity,
        unitPrice,
        lineSubtotal,
        discountTotal,
        taxTotal,
        totalPrice,
        requiresShipping: input.requiresShipping ?? variant.requiresShipping,
      };
    }

    // Custom line item
    if (!input.vendorId) {
      throw new UnprocessableError("Custom line item requires vendorId");
    }
    if (!input.title) {
      throw new UnprocessableError("Custom line item requires title");
    }
    if (!input.unitPrice) {
      throw new UnprocessableError("Custom line item requires unitPrice");
    }

    const unitPrice = input.unitPrice;
    const lineSubtotal = multiplyMoney(unitPrice, input.quantity);
    const discountTotal = input.discountTotal ?? "0";
    const taxTotal = input.taxTotal ?? "0";
    const totalPrice = fromCents(
      Math.max(
        0,
        toCents(lineSubtotal) - toCents(discountTotal) + toCents(taxTotal)
      )
    );

    return {
      vendorId: input.vendorId,
      productId: input.productId ?? null,
      variantId: null,
      title: input.title,
      variantTitle: input.variantTitle ?? null,
      sku: input.sku ?? null,
      quantity: input.quantity,
      unitPrice,
      lineSubtotal,
      discountTotal,
      taxTotal,
      totalPrice,
      requiresShipping: input.requiresShipping ?? true,
    };
  });
}

/**
 * Insert vendorOrders + orderItems + per-vendor address snapshots for a draft.
 * Shared by createDraftOrder and updateDraftOrder (the latter re-inserts after
 * wiping the existing rows). Returns the aggregate parent-order totals.
 */
async function insertDraftVendorOrdersAndItems(
  tx: Tx,
  orderId: string,
  currencyCode: string,
  resolved: ResolvedLineItem[],
  shippingAddress: CreateDraftOrderInput["shippingAddress"]
): Promise<{ subtotal: string; itemCount: number }> {
  // Group line items by vendor so each vendor gets its own vendorOrder.
  const byVendor = new Map<string, ResolvedLineItem[]>();
  for (const item of resolved) {
    const list = byVendor.get(item.vendorId) ?? [];
    list.push(item);
    byVendor.set(item.vendorId, list);
  }

  const vendorIds = [...byVendor.keys()];
  const vendorRows = await tx
    .select({ id: vendors.id, slug: vendors.slug })
    .from(vendors)
    .where(inArray(vendors.id, vendorIds));
  const vendorSlugMap = new Map(vendorRows.map((v) => [v.id, v.slug]));

  let aggregateSubtotalCents = 0;
  let aggregateItemCount = 0;

  for (const [vendorId, vendorItems] of byVendor) {
    const vendorSubtotal = sumMoney(vendorItems.map((i) => i.lineSubtotal));
    const vendorDiscount = sumMoney(vendorItems.map((i) => i.discountTotal));
    const vendorTax = sumMoney(vendorItems.map((i) => i.taxTotal));
    const vendorTotal = sumMoney(vendorItems.map((i) => i.totalPrice));
    const vendorItemCount = vendorItems.reduce((s, i) => s + i.quantity, 0);

    aggregateSubtotalCents += toCents(vendorSubtotal);
    aggregateItemCount += vendorItemCount;

    const vendorOrderId = generateId();
    const vendorOrderNumber = generateVendorOrderNumber(
      vendorSlugMap.get(vendorId) ?? vendorId
    );

    await tx.insert(vendorOrders).values({
      id: vendorOrderId,
      orderId,
      vendorId,
      vendorOrderNumber,
      status: "draft",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      deliveryStatus: "not_shipped",
      currencyCode,
      itemCount: vendorItemCount,
      subtotalPrice: vendorSubtotal,
      discountTotal: vendorDiscount,
      shippingPrice: "0",
      taxTotal: vendorTax,
      totalPrice: vendorTotal,
    });

    if (shippingAddress) {
      await tx.insert(vendorOrderAddresses).values({
        id: generateId(),
        vendorOrderId,
        type: "shipping",
        ...shippingAddress,
      });
    }

    for (const item of vendorItems) {
      await tx.insert(orderItems).values({
        id: generateId(),
        orderId,
        vendorOrderId,
        vendorId,
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        variantTitle: item.variantTitle,
        sku: item.sku,
        quantity: item.quantity,
        fulfilledQuantity: 0,
        refundedQuantity: 0,
        unitPrice: item.unitPrice,
        lineSubtotal: item.lineSubtotal,
        discountTotal: item.discountTotal,
        taxTotal: item.taxTotal,
        totalPrice: item.totalPrice,
        requiresShipping: item.requiresShipping,
        status: "open",
      });
    }
  }

  return {
    subtotal: fromCents(aggregateSubtotalCents),
    itemCount: aggregateItemCount,
  };
}

export async function createDraftOrder(data: CreateDraftOrderInput) {
  return db.transaction(async (tx) => {
    if (data.customerId) {
      const [customer] = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, data.customerId));
      if (!customer) {
        throw new UnprocessableError(`Customer ${data.customerId} not found`);
      }
    }

    const resolved = await resolveDraftLineItems(tx, data.items);

    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    const currencyCode = data.currencyCode ?? "USD";

    const shippingPrice = data.shippingPrice ?? "0";
    const taxTotal = data.taxTotal ?? sumMoney(resolved.map((i) => i.taxTotal));
    const discountTotal =
      data.discountTotal ?? sumMoney(resolved.map((i) => i.discountTotal));
    const itemsSubtotal = sumMoney(resolved.map((i) => i.lineSubtotal));
    const totalPrice = fromCents(
      Math.max(
        0,
        toCents(itemsSubtotal) -
          toCents(discountTotal) +
          toCents(shippingPrice) +
          toCents(taxTotal)
      )
    );

    const [order] = await tx
      .insert(orders)
      .values({
        id: orderId,
        cartId: null,
        customerId: data.customerId ?? null,
        orderNumber,
        status: "draft",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        deliveryStatus: "not_shipped",
        currencyCode,
        customerEmail: data.customerEmail?.toLowerCase() ?? null,
        customerFirstName: data.customerFirstName ?? null,
        customerLastName: data.customerLastName ?? null,
        customerPhone: data.customerPhone ?? null,
        channel: "draft",
        itemCount: 0, // filled below
        subtotalPrice: itemsSubtotal,
        discountTotal,
        shippingPrice,
        taxTotal,
        totalPrice,
        note: data.note ?? null,
        placedAt: new Date(), // draft creation timestamp; updated on convert
      })
      .returning();

    if (!order) throw new Error("Failed to create draft order");

    if (data.shippingAddress) {
      await tx.insert(orderAddresses).values({
        id: generateId(),
        orderId,
        type: "shipping",
        ...data.shippingAddress,
      });
    }
    if (data.billingAddress) {
      await tx.insert(orderAddresses).values({
        id: generateId(),
        orderId,
        type: "billing",
        ...data.billingAddress,
      });
    }

    const { itemCount } = await insertDraftVendorOrdersAndItems(
      tx,
      orderId,
      currencyCode,
      resolved,
      data.shippingAddress
    );

    await tx
      .update(orders)
      .set({ itemCount, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    return { ...order, itemCount };
  });
}

export async function updateDraftOrder(orderId: string, data: UpdateDraftOrderInput) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!existing) throw new NotFoundError("Order not found");
    if (existing.status !== "draft") {
      throw new UnprocessableError(
        `Only draft orders can be edited (current status: ${existing.status})`
      );
    }

    if (data.customerId !== undefined && data.customerId !== null) {
      const [customer] = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, data.customerId));
      if (!customer) {
        throw new UnprocessableError(`Customer ${data.customerId} not found`);
      }
    }

    const currencyCode = data.currencyCode ?? existing.currencyCode;

    // Replace line items if provided. Replacing also rebuilds vendorOrders
    // since vendor groupings can change with the item list.
    let itemsSubtotal: string | null = null;
    let itemCount: number | null = null;
    let resolvedTaxTotal: string | null = null;
    let resolvedDiscountTotal: string | null = null;

    if (data.items) {
      // Wipe existing items + vendor sub-orders. The cascade from
      // order_items.vendor_order_id will remove any orphan vendor-order
      // rows on its own — but we delete explicitly so vendor_order_addresses
      // (linked to vendor_orders) are released too.
      await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
      await tx.delete(vendorOrders).where(eq(vendorOrders.orderId, orderId));

      const resolved = await resolveDraftLineItems(tx, data.items);
      resolvedTaxTotal = sumMoney(resolved.map((i) => i.taxTotal));
      resolvedDiscountTotal = sumMoney(resolved.map((i) => i.discountTotal));

      const shippingAddr = data.shippingAddress ?? undefined;
      const { subtotal, itemCount: count } = await insertDraftVendorOrdersAndItems(
        tx,
        orderId,
        currencyCode,
        resolved,
        shippingAddr
      );
      itemsSubtotal = subtotal;
      itemCount = count;
    }

    // Replace addresses if explicitly provided (null clears them).
    if (data.shippingAddress !== undefined) {
      await tx
        .delete(orderAddresses)
        .where(and(eq(orderAddresses.orderId, orderId), eq(orderAddresses.type, "shipping")));
      if (data.shippingAddress) {
        await tx.insert(orderAddresses).values({
          id: generateId(),
          orderId,
          type: "shipping",
          ...data.shippingAddress,
        });
      }
    }
    if (data.billingAddress !== undefined) {
      await tx
        .delete(orderAddresses)
        .where(and(eq(orderAddresses.orderId, orderId), eq(orderAddresses.type, "billing")));
      if (data.billingAddress) {
        await tx.insert(orderAddresses).values({
          id: generateId(),
          orderId,
          type: "billing",
          ...data.billingAddress,
        });
      }
    }

    const subtotalForTotal = itemsSubtotal ?? existing.subtotalPrice;
    const discountForTotal = data.discountTotal ?? resolvedDiscountTotal ?? existing.discountTotal;
    const shippingForTotal = data.shippingPrice ?? existing.shippingPrice;
    const taxForTotal = data.taxTotal ?? resolvedTaxTotal ?? existing.taxTotal;
    const totalPrice = fromCents(
      Math.max(
        0,
        toCents(subtotalForTotal) -
          toCents(discountForTotal) +
          toCents(shippingForTotal) +
          toCents(taxForTotal)
      )
    );

    const patch: Record<string, unknown> = {
      currencyCode,
      subtotalPrice: subtotalForTotal,
      discountTotal: discountForTotal,
      shippingPrice: shippingForTotal,
      taxTotal: taxForTotal,
      totalPrice,
      updatedAt: new Date(),
    };
    if (itemCount !== null) patch.itemCount = itemCount;
    if (data.customerId !== undefined) patch.customerId = data.customerId;
    if (data.customerEmail !== undefined) {
      patch.customerEmail = data.customerEmail?.toLowerCase() ?? null;
    }
    if (data.customerFirstName !== undefined) patch.customerFirstName = data.customerFirstName;
    if (data.customerLastName !== undefined) patch.customerLastName = data.customerLastName;
    if (data.customerPhone !== undefined) patch.customerPhone = data.customerPhone;
    if (data.note !== undefined) patch.note = data.note;

    const [updated] = await tx
      .update(orders)
      .set(patch as never)
      .where(eq(orders.id, orderId))
      .returning();

    return updated ?? existing;
  });
}

/**
 * Transition a draft order to "open". Reserves inventory atomically for
 * catalog line items (custom items are skipped — they don't track stock).
 * Updates customer aggregates and emits the order.created webhook.
 */
export async function convertDraftToOpen(orderId: string, actorUserId?: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!existing) throw new NotFoundError("Order not found");
    if (existing.status !== "draft") {
      throw new UnprocessableError(
        `Only draft orders can be converted (current status: ${existing.status})`
      );
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    if (items.length === 0) {
      throw new UnprocessableError("Cannot convert a draft order with no line items");
    }

    // Decrement inventory for tracked variants. Custom items (no variantId) skip.
    const catalogItems = items.filter((i): i is typeof i & { variantId: string } => !!i.variantId);
    const variantIds = [...new Set(catalogItems.map((i) => i.variantId))];

    const variantRows = variantIds.length
      ? await tx
          .select({
            id: variantsTable.id,
            inventoryTracked: variantsTable.inventoryTracked,
            inventoryPolicy: variantsTable.inventoryPolicy,
          })
          .from(variantsTable)
          .where(inArray(variantsTable.id, variantIds))
      : [];
    const variantById = new Map(variantRows.map((v) => [v.id, v]));

    for (const item of catalogItems) {
      const variant = variantById.get(item.variantId);
      const shouldEnforce =
        variant?.inventoryTracked && variant?.inventoryPolicy === "deny";

      if (shouldEnforce) {
        const updated = await tx
          .update(inventoryItems)
          .set({
            availableQuantity: sql`${inventoryItems.availableQuantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryItems.variantId, item.variantId),
              sql`${inventoryItems.availableQuantity} >= ${item.quantity}`
            )
          )
          .returning({ id: inventoryItems.id });

        if (updated.length === 0) {
          throw new UnprocessableError(
            `Insufficient stock for "${item.title}": not enough inventory available`
          );
        }
      } else if (variant?.inventoryTracked) {
        // Tracked but continue-selling policy — clip at 0.
        await tx
          .update(inventoryItems)
          .set({
            availableQuantity: sql`GREATEST(0, ${inventoryItems.availableQuantity} - ${item.quantity})`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.variantId, item.variantId));
      }
    }

    const now = new Date();
    const [updated] = await tx
      .update(orders)
      .set({
        status: "open",
        placedAt: now,
        updatedAt: now,
      } as never)
      .where(eq(orders.id, orderId))
      .returning();

    await tx
      .update(vendorOrders)
      .set({ status: "open", placedAt: now, updatedAt: now } as never)
      .where(eq(vendorOrders.orderId, orderId));

    // Customer aggregates — only if a customer is attached.
    if (existing.customerId) {
      await tx
        .update(customers)
        .set({
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${existing.totalPrice}`,
          lastOrderAt: now,
          updatedAt: now,
        })
        .where(eq(customers.id, existing.customerId));
    }

    await tx.insert(auditLogs).values({
      id: generateId(),
      actorUserId: actorUserId ?? null,
      entityType: "order",
      entityId: orderId,
      action: "order.draft_converted",
      metadata: { orderNumber: existing.orderNumber },
    });

    await enqueueOutboxEvent(tx, {
      topic: "order.created",
      entityType: "order",
      entityId: orderId,
      data: updated as unknown as Record<string, unknown>,
    });

    return updated ?? existing;
  });
}
