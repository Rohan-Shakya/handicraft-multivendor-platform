import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers";
import { vendors } from "./vendors";
import { products } from "./products";
import { orders } from "./orders";

/**
 * Customer ↔ vendor message threads. Each thread is anchored to a (customer,
 * vendor) pair, with optional links to a product (PDP "Ask a question") or an
 * order ("Question about my order"). Each side sees only their own threads.
 *
 * Per-side unread counters are denormalised so the storefront/admin sidebar
 * can show a badge without aggregating messages on every render.
 */
export const messageThreads = pgTable(
  "message_threads",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    status: text("status").notNull().default("open"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    customerUnreadCount: integer("customer_unread_count").notNull().default(0),
    vendorUnreadCount: integer("vendor_unread_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("message_threads_customer_idx").on(t.customerId, t.lastMessageAt),
    index("message_threads_vendor_idx").on(t.vendorId, t.lastMessageAt),
    index("message_threads_product_idx").on(t.productId),
    index("message_threads_order_idx").on(t.orderId),
    check(
      "message_threads_status_chk",
      sql`${t.status} IN ('open', 'resolved', 'closed')`
    ),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),
    /** Who sent this message. Determines whose unreadCount to clear on read. */
    senderType: text("sender_type").notNull(),
    /** customer.id or the vendor's user id. */
    senderId: text("sender_id").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("messages_thread_idx").on(t.threadId, t.createdAt),
    check("messages_sender_type_chk", sql`${t.senderType} IN ('customer', 'vendor')`),
  ]
);
