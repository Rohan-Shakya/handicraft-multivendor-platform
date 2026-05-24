import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  numeric,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { vendors } from "./vendors";
import { variants } from "./products";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "paused",
  "cancelled",
  "past_due",
  "trialing",
]);

export const subscriptionIntervalEnum = pgEnum("subscription_interval", [
  "day",
  "week",
  "month",
  "year",
]);

/**
 * Recurring-order subscriptions ("subscribe and save" for consumables).
 *
 * Each subscription expands into a regular order on `nextBillingAt`. A
 * scheduled worker walks the table hourly, creates orders for anything due,
 * and advances `nextBillingAt` by one interval. Payment is charged via the
 * saved payment method on the customer.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    currencyCode: text("currency_code").notNull().default("USD"),
    /** Per-delivery unit price captured at subscription creation. */
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    intervalCount: integer("interval_count").notNull().default(1),
    interval: subscriptionIntervalEnum("interval").notNull().default("month"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    /** When the next order will be generated. */
    nextBillingAt: timestamp("next_billing_at", { withTimezone: true }).notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    resumedAt: timestamp("resumed_at", { withTimezone: true }),
    /** Payment method id (Stripe PM / eSewa token / etc.) */
    paymentMethodToken: text("payment_method_token"),
    /** Shipping address snapshot so address changes don't retroactively apply. */
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("subscriptions_customer_id_idx").on(t.customerId),
    index("subscriptions_vendor_id_idx").on(t.vendorId),
    index("subscriptions_status_idx").on(t.status),
    index("subscriptions_next_billing_at_idx").on(t.nextBillingAt),
  ]
);
