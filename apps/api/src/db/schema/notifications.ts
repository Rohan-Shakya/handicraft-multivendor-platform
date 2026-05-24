import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  index,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { customers } from "./customers";
import { vendors } from "./vendors";

export const notificationRecipientTypeEnum = pgEnum("notification_recipient_type", [
  "user",
  "customer",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "sms",
  "push",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
  "read",
  "dismissed",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientType: notificationRecipientTypeEnum("recipient_type").notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "cascade",
    }),
    vendorId: text("vendor_id").references(() => vendors.id, {
      onDelete: "set null",
    }),
    channel: notificationChannelEnum("channel").notNull().default("in_app"),
    status: notificationStatusEnum("status").notNull().default("pending"),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    payload: jsonb("payload"),
    isRead: boolean("is_read").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_customer_id_idx").on(t.customerId),
    index("notifications_vendor_id_idx").on(t.vendorId),
    index("notifications_status_idx").on(t.status),
    index("notifications_channel_idx").on(t.channel),
    index("notifications_type_idx").on(t.type),
    index("notifications_created_at_idx").on(t.createdAt),
    check(
      "notifications_recipient_consistency_chk",
      sql`
        (${t.recipientType} = 'user' AND ${t.userId} IS NOT NULL AND ${t.customerId} IS NULL) OR
        (${t.recipientType} = 'customer' AND ${t.customerId} IS NOT NULL AND ${t.userId} IS NULL)
      `
    ),
  ]
);
