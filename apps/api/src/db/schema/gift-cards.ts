import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers";
import { users } from "./users";
import { orders } from "./orders";

export const giftCardStatusEnum = pgEnum("gift_card_status", [
  "active",
  "disabled",
  "depleted",
]);

export const giftCards = pgTable(
  "gift_cards",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    initialBalance: integer("initial_balance").notNull(),
    currentBalance: integer("current_balance").notNull(),
    currencyCode: text("currency_code").notNull().default("USD"),
    status: giftCardStatusEnum("status").notNull().default("active"),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    issuedByUserId: text("issued_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("gift_cards_code_unique").on(t.code),
    index("gift_cards_status_idx").on(t.status),
    index("gift_cards_customer_id_idx").on(t.customerId),
    index("gift_cards_issued_by_user_id_idx").on(t.issuedByUserId),
    check("gift_cards_initial_balance_positive_chk", sql`${t.initialBalance} > 0`),
    check("gift_cards_current_balance_nonnegative_chk", sql`${t.currentBalance} >= 0`),
    check(
      "gift_cards_current_balance_lte_initial_chk",
      sql`${t.currentBalance} <= ${t.initialBalance}`
    ),
  ]
);

export const giftCardTransactions = pgTable(
  "gift_card_transactions",
  {
    id: text("id").primaryKey(),
    giftCardId: text("gift_card_id")
      .notNull()
      .references(() => giftCards.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "credit" | "debit" | "refund"
    amount: integer("amount").notNull(), // cents (positive for credit, negative for debit)
    balanceAfter: integer("balance_after").notNull(),
    orderId: text("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("gift_card_transactions_gift_card_id_idx").on(t.giftCardId),
    index("gift_card_transactions_order_id_idx").on(t.orderId),
    index("gift_card_transactions_type_idx").on(t.type),
    check("gift_card_transactions_balance_after_nonnegative_chk", sql`${t.balanceAfter} >= 0`),
  ]
);
