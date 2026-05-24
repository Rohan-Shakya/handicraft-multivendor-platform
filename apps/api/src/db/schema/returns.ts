import { pgTable, text, timestamp, pgEnum, integer, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders, vendorOrders, orderItems } from "./orders";
import { customers } from "./customers";
import { users } from "./users";

export const returnStatusEnum = pgEnum("return_status", [
  "requested",
  "approved",
  "rejected",
  "received",
  "cancelled",
]);

export const returnReasonEnum = pgEnum("return_reason", [
  "damaged",
  "wrong_item",
  "not_as_described",
  "no_longer_needed",
  "size_issue",
  "other",
]);

export const returns = pgTable(
  "returns",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    vendorOrderId: text("vendor_order_id").references(() => vendorOrders.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    status: returnStatusEnum("status").notNull().default("requested"),
    reason: returnReasonEnum("reason"),
    note: text("note"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    processedBy: text("processed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("returns_order_id_idx").on(t.orderId),
    index("returns_vendor_order_id_idx").on(t.vendorOrderId),
    index("returns_customer_id_idx").on(t.customerId),
    index("returns_status_idx").on(t.status),
    index("returns_processed_by_idx").on(t.processedBy),
  ]
);

export const returnItems = pgTable(
  "return_items",
  {
    id: text("id").primaryKey(),
    returnId: text("return_id")
      .notNull()
      .references(() => returns.id, { onDelete: "cascade" }),
    orderItemId: text("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    reason: returnReasonEnum("reason"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("return_items_return_id_idx").on(t.returnId),
    index("return_items_order_item_id_idx").on(t.orderItemId),
    check("return_items_quantity_positive_chk", sql`${t.quantity} > 0`),
  ]
);
