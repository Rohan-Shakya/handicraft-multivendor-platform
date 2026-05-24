import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers";
import { orders } from "./orders";

/**
 * Loyalty points ledger — append-only. Each row is a credit (earn / adjust+)
 * or debit (redeem / expire) against a customer's points balance. The current
 * balance is `SUM(points) WHERE customer_id = ?`.
 *
 * Earn rows are uniquely keyed on (customer, order, type='earn') so duplicate
 * order placement hooks don't double-credit.
 */
export const loyaltyLedger = pgTable(
  "loyalty_ledger",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    /** earn = order completion; redeem = checkout redemption; adjust = manual; expire = TTL. */
    type: text("type").notNull(),
    /** Positive for earn/adjust+, negative for redeem/expire. */
    points: integer("points").notNull(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("loyalty_ledger_customer_idx").on(t.customerId, t.createdAt),
    index("loyalty_ledger_order_idx").on(t.orderId),
    uniqueIndex("loyalty_ledger_order_earn_unique")
      .on(t.customerId, t.orderId, t.type)
      .where(sql`${t.type} = 'earn' AND ${t.orderId} IS NOT NULL`),
    check(
      "loyalty_ledger_type_chk",
      sql`${t.type} IN ('earn', 'redeem', 'adjust', 'expire')`
    ),
  ]
);
