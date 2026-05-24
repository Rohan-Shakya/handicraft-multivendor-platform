import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  numeric,
  integer,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders, vendorOrders, orderItems } from "./orders";
import { payments } from "./payments";
import { users } from "./users";

export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "processed",
  "failed",
  "cancelled",
]);

export const refundReasonEnum = pgEnum("refund_reason", [
  "customer_request",
  "out_of_stock",
  "damaged",
  "fraud",
  "shipping_failure",
  "other",
]);

export const refunds = pgTable(
  "refunds",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    vendorOrderId: text("vendor_order_id").references(() => vendorOrders.id, {
      onDelete: "set null",
    }),
    paymentId: text("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    status: refundStatusEnum("status").notNull().default("pending"),
    reason: refundReasonEnum("reason"),
    note: text("note"),
    itemsAmount: numeric("items_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    shippingAmount: numeric("shipping_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    /** ID returned by the payment provider after a successful refund call
     *  (e.g. Stripe `re_…`, Khalti idx, eSewa refund_ref). Null for refunds
     *  that haven't been processed yet, or for COD/manual refunds. */
    providerRefundId: text("provider_refund_id"),
    /** Last error from the provider when a refund attempt failed. Cleared
     *  on the next successful retry. */
    providerError: text("provider_error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("refunds_order_id_idx").on(t.orderId),
    index("refunds_vendor_order_id_idx").on(t.vendorOrderId),
    index("refunds_payment_id_idx").on(t.paymentId),
    index("refunds_status_idx").on(t.status),
    index("refunds_provider_refund_id_idx").on(t.providerRefundId),
    check("refunds_items_amount_nonnegative_chk", sql`${t.itemsAmount} >= 0`),
    check("refunds_shipping_amount_nonnegative_chk", sql`${t.shippingAmount} >= 0`),
    check("refunds_tax_amount_nonnegative_chk", sql`${t.taxAmount} >= 0`),
    check("refunds_total_amount_nonnegative_chk", sql`${t.totalAmount} >= 0`),
  ]
);

export const refundItems = pgTable(
  "refund_items",
  {
    id: text("id").primaryKey(),
    refundId: text("refund_id")
      .notNull()
      .references(() => refunds.id, { onDelete: "cascade" }),
    orderItemId: text("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("refund_items_refund_id_idx").on(t.refundId),
    index("refund_items_order_item_id_idx").on(t.orderItemId),
    check("refund_items_quantity_positive_chk", sql`${t.quantity} > 0`),
    check("refund_items_amount_nonnegative_chk", sql`${t.amount} >= 0`),
  ]
);
