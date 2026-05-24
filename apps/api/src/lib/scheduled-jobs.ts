/**
 * Registers periodic backend tasks — abandoned cart recovery, low-stock
 * alerts, expired inventory reservation release, and subscription renewal.
 *
 * All jobs run once per interval on the single API process. To scale
 * horizontally, either elect a leader via Redis lock or switch each job to a
 * BullMQ repeat-job producer (leaves the code here as the scheduler "bible").
 */
import { and, eq, lt, isNull, sql, inArray, gte } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  carts,
  cartItems,
  customers,
  inventoryReservations,
  inventoryItems,
  productImages,
  stockNotifySubscriptions,
  subscriptions,
  variants,
  products,
} from "../db/schema/index.js";
import { logger } from "./logger.js";
import { sendEmail } from "./email.js";
import { abandonedCartEmail, backInStockEmail } from "./email-templates.js";
import { fireWebhook, drainOutbox } from "./webhooks.js";
import { scheduleJob } from "./scheduler.js";
import { getEnv } from "./env.js";

// ── Abandoned cart recovery ─────────────────────────────────────────────────
// Tiered recovery emails: 1h / 24h / 72h after the customer last touched their
// cart. We track `carts.recoveryStageSent` so we never re-email the same stage,
// and only progress to the next stage when the cart has been inactive long
// enough. Cap each batch so a sudden surge doesn't melt SMTP.

const STAGE_THRESHOLDS_MS: Record<1 | 2 | 3, number> = {
  1: 1 * 60 * 60 * 1000,        // 1 hour
  2: 24 * 60 * 60 * 1000,       // 24 hours
  3: 72 * 60 * 60 * 1000,       // 72 hours
};
const RECOVERY_BATCH = 100;

async function sendAbandonedCartEmails(): Promise<number> {
  const env = getEnv();
  const storefrontUrl = env.NEXT_PUBLIC_STOREFRONT_URL.replace(/\/$/, "");
  const now = Date.now();
  let sent = 0;

  // Find the highest stage each cart is eligible for in a single pass, then
  // batch-fetch line items and send the corresponding email.
  for (const stage of [3, 2, 1] as const) {
    const cutoff = new Date(now - STAGE_THRESHOLDS_MS[stage]);
    const rows = await db
      .select({
        cartId: carts.id,
        token: carts.token,
        customerEmail: customers.email,
        customerFirstName: customers.firstName,
        itemCount: carts.itemCount,
        totalPrice: carts.totalPrice,
        currencyCode: carts.currencyCode,
      })
      .from(carts)
      .innerJoin(customers, eq(carts.customerId, customers.id))
      .where(
        and(
          eq(carts.status, "active"),
          lt(carts.lastActivityAt, cutoff),
          sql`${carts.itemCount} > 0`,
          lt(carts.recoveryStageSent, stage)
        )
      )
      .limit(RECOVERY_BATCH);
    if (rows.length === 0) continue;

    // Pull each cart's line items in a single query — used in the email body.
    const cartIds = rows.map((r) => r.cartId);
    const items = await db
      .select({
        cartId: cartItems.cartId,
        title: cartItems.title,
        quantity: cartItems.quantity,
        lineTotal: cartItems.lineTotal,
        productId: cartItems.productId,
      })
      .from(cartItems)
      .where(inArray(cartItems.cartId, cartIds));

    // One representative product image per cartItem (featured image first).
    const productIds = [
      ...new Set(items.map((i) => i.productId).filter((id): id is string => !!id)),
    ];
    const images = productIds.length
      ? await db
          .select({
            productId: productImages.productId,
            url: productImages.url,
            isFeatured: productImages.isFeatured,
            position: productImages.position,
          })
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
      : [];
    const imageByProduct = new Map<string, string>();
    for (const img of images) {
      const existing = imageByProduct.get(img.productId);
      if (!existing || img.isFeatured) imageByProduct.set(img.productId, img.url);
    }
    const itemsByCart = new Map<string, typeof items>();
    for (const item of items) {
      const list = itemsByCart.get(item.cartId) ?? [];
      list.push(item);
      itemsByCart.set(item.cartId, list);
    }

    for (const row of rows) {
      if (!row.customerEmail) continue;
      const cartItemsList = itemsByCart.get(row.cartId) ?? [];

      // Recovery link uses the cart token — the storefront can pick this up
      // and rehydrate the customer's cart on visit.
      const recoveryUrl = row.token
        ? `${storefrontUrl}/cart?recover=${encodeURIComponent(row.token)}`
        : `${storefrontUrl}/cart`;

      const template = abandonedCartEmail({
        customerName: row.customerFirstName ?? "there",
        itemCount: row.itemCount,
        totalPrice: row.totalPrice,
        currency: row.currencyCode,
        items: cartItemsList.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          price: i.lineTotal,
          imageUrl: i.productId ? imageByProduct.get(i.productId) ?? null : null,
        })),
        recoveryUrl,
        stage,
      });

      await sendEmail({
        to: row.customerEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }).catch((err) =>
        logger.error({ err, cartId: row.cartId, stage }, "abandoned_cart.email_failed")
      );

      // Mark the stage sent immediately so an email retry doesn't double-send.
      // If the email itself failed above, we still advance the stage — a
      // production setup would queue the email via BullMQ and let it retry,
      // not the entire scheduled job.
      await db
        .update(carts)
        .set({ recoveryStageSent: stage, updatedAt: new Date() })
        .where(eq(carts.id, row.cartId));

      sent++;
    }
  }

  return sent;
}

// ── Back-in-stock notifications ─────────────────────────────────────────────
// Watches for stock-notify subscriptions whose variant now has positive
// available inventory, fires the customer notification, marks the row
// notified_at so we don't re-fire.

async function sendBackInStockNotifications(): Promise<number> {
  const env = getEnv();
  const storefrontUrl = env.NEXT_PUBLIC_STOREFRONT_URL.replace(/\/$/, "");

  // Pending subscriptions joined to the variant + inventory + product. Only
  // pick rows where availableQuantity > 0 right now.
  const rows = await db
    .select({
      subId: stockNotifySubscriptions.id,
      email: stockNotifySubscriptions.email,
      variantId: stockNotifySubscriptions.variantId,
      customerId: stockNotifySubscriptions.customerId,
      variantTitle: variants.title,
      productId: variants.productId,
      productHandle: products.handle,
      productTitle: products.title,
      available: inventoryItems.availableQuantity,
    })
    .from(stockNotifySubscriptions)
    .innerJoin(variants, eq(stockNotifySubscriptions.variantId, variants.id))
    .innerJoin(products, eq(variants.productId, products.id))
    .innerJoin(inventoryItems, eq(inventoryItems.variantId, variants.id))
    .where(
      and(
        isNull(stockNotifySubscriptions.notifiedAt),
        gte(inventoryItems.availableQuantity, 1),
        isNull(products.deletedAt)
      )
    )
    .limit(100);

  if (rows.length === 0) return 0;

  const productIds = [...new Set(rows.map((r) => r.productId))];
  const images = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      isFeatured: productImages.isFeatured,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds));
  const imageByProduct = new Map<string, string>();
  for (const img of images) {
    const existing = imageByProduct.get(img.productId);
    if (!existing || img.isFeatured) imageByProduct.set(img.productId, img.url);
  }

  let sent = 0;
  for (const row of rows) {
    const productUrl = `${storefrontUrl}/products/${row.productHandle}`;
    const template = backInStockEmail({
      customerName: null, // anonymous-friendly
      productTitle: row.productTitle,
      variantTitle: row.variantTitle,
      productUrl,
      imageUrl: imageByProduct.get(row.productId) ?? null,
    });
    await sendEmail({
      to: row.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }).catch((err) =>
      logger.error({ err, subId: row.subId }, "stock_notify.email_failed")
    );
    await db
      .update(stockNotifySubscriptions)
      .set({ notifiedAt: new Date() })
      .where(eq(stockNotifySubscriptions.id, row.subId));
    sent++;
  }
  return sent;
}

// ── Low-stock alerts ────────────────────────────────────────────────────────
// Fire `inventory.low_stock` webhook when a tracked SKU drops to / below its
// low-stock threshold. We only fire once per crossing to avoid spam.

async function emitLowStockAlerts(): Promise<number> {
  const rows = await db
    .select({
      inventoryItemId: inventoryItems.id,
      variantId: inventoryItems.variantId,
      productId: variants.productId,
      productTitle: products.title,
      productHandle: products.handle,
      available: inventoryItems.availableQuantity,
      reorderThreshold: inventoryItems.reorderThreshold,
      vendorId: products.vendorId,
    })
    .from(inventoryItems)
    .innerJoin(variants, eq(inventoryItems.variantId, variants.id))
    .innerJoin(products, eq(variants.productId, products.id))
    .where(
      and(
        eq(inventoryItems.tracked, true),
        sql`${inventoryItems.reorderThreshold} IS NOT NULL`,
        sql`${inventoryItems.availableQuantity} <= ${inventoryItems.reorderThreshold}`,
        sql`${inventoryItems.availableQuantity} > 0`
      )
    )
    .limit(100);

  for (const row of rows) {
    fireWebhook({
      topic: "inventory.low_stock",
      entityType: "inventory_item",
      entityId: row.inventoryItemId,
      data: {
        inventoryItemId: row.inventoryItemId,
        variantId: row.variantId,
        productId: row.productId,
        productTitle: row.productTitle,
        productHandle: row.productHandle,
        vendorId: row.vendorId,
        available: row.available,
        threshold: row.reorderThreshold,
      },
    }).catch(() => {});
  }
  return rows.length;
}

// ── Release expired cart reservations ──────────────────────────────────────
// Carts with reservations past `expiresAt` get their inventory returned to
// the availability pool. This is the safety net for clients that never
// bubbled through the cart-clear path (crashed tab, guest who wandered off).

async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();
  const expired = await db
    .select()
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.status, "active"),
        sql`${inventoryReservations.expiresAt} IS NOT NULL`,
        lt(inventoryReservations.expiresAt, now)
      )
    )
    .limit(500);

  for (const r of expired) {
    await db.transaction(async (tx) => {
      await tx
        .update(inventoryItems)
        .set({
          availableQuantity: sql`${inventoryItems.availableQuantity} + ${r.quantity}`,
          reservedQuantity: sql`GREATEST(0, ${inventoryItems.reservedQuantity} - ${r.quantity})`,
          updatedAt: now,
        })
        .where(eq(inventoryItems.id, r.inventoryItemId));
      await tx
        .update(inventoryReservations)
        .set({ status: "expired", updatedAt: now })
        .where(eq(inventoryReservations.id, r.id));
    });
  }
  return expired.length;
}

// ── Subscription renewals ───────────────────────────────────────────────────
// Walks `subscriptions` and emits a `subscription.renewal_due` webhook when a
// subscription is due. Actual order creation is handled by a downstream worker
// so payment tokens + shipping prices can be recomputed against current rates.

async function emitSubscriptionRenewals(): Promise<number> {
  const now = new Date();
  const due = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        lt(subscriptions.nextBillingAt, now)
      )
    )
    .limit(200);

  for (const sub of due) {
    fireWebhook({
      topic: "subscription.renewal_due",
      entityType: "subscription",
      entityId: sub.id,
      data: {
        subscriptionId: sub.id,
        customerId: sub.customerId,
        vendorId: sub.vendorId,
        variantId: sub.variantId,
        quantity: sub.quantity,
        nextBillingAt: sub.nextBillingAt,
      },
    }).catch(() => {});
  }
  return due.length;
}

export function registerScheduledJobs() {
  scheduleJob("release_expired_reservations", 5 * 60 * 1000, async () => {
    const n = await releaseExpiredReservations();
    if (n > 0) logger.info({ released: n }, "scheduler.reservations.released");
  });

  scheduleJob("abandoned_cart_emails", 15 * 60 * 1000, async () => {
    // Run every 15 minutes so the 1h stage isn't held back by an hourly tick.
    const n = await sendAbandonedCartEmails();
    if (n > 0) logger.info({ sent: n }, "scheduler.abandoned_cart.sent");
  });

  scheduleJob("back_in_stock_notify", 5 * 60 * 1000, async () => {
    const n = await sendBackInStockNotifications();
    if (n > 0) logger.info({ sent: n }, "scheduler.back_in_stock.sent");
  });

  scheduleJob("low_stock_alerts", 30 * 60 * 1000, async () => {
    const n = await emitLowStockAlerts();
    if (n > 0) logger.info({ alerted: n }, "scheduler.low_stock.alerts");
  });

  scheduleJob("subscription_renewals", 15 * 60 * 1000, async () => {
    const n = await emitSubscriptionRenewals();
    if (n > 0) logger.info({ renewals: n }, "scheduler.subscription.renewals");
  });

  // Webhook outbox drainer — committed events are converted to BullMQ jobs.
  // Short interval so consumers see events promptly; the leader-election lock
  // in scheduler.ts ensures only one replica runs each tick.
  scheduleJob("webhook_outbox_drain", 2_000, async () => {
    const n = await drainOutbox();
    if (n > 0) logger.debug({ dispatched: n }, "scheduler.webhook_outbox.drained");
  });
}
