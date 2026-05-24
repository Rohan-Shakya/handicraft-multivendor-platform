import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { variants } from "./products";
import { customers } from "./customers";

/**
 * Back-in-stock notification subscriptions. Customers (logged-in or not) sign
 * up via "Notify me when back in stock" on out-of-stock PDPs. A scheduled job
 * watches inventory and fires emails when a subscribed variant restocks, then
 * marks notifiedAt so we don't re-fire.
 */
export const stockNotifySubscriptions = pgTable(
  "stock_notify_subscriptions",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("stock_notify_variant_email_unique").on(t.variantId, t.email),
    index("stock_notify_variant_pending_idx")
      .on(t.variantId)
      .where(sql`${t.notifiedAt} IS NULL`),
    check("stock_notify_email_lowercase_chk", sql`${t.email} = lower(${t.email})`),
  ]
);
