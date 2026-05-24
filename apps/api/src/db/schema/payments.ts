import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  numeric,
  index,
  boolean,
  jsonb,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./orders";
import { customers } from "./customers";

export const paymentProviderEnum = pgEnum("payment_provider", [
  "stripe",
  "paypal",
  "esewa",
  "khalti",
  "fonepay",
  "cod",
  "manual",
  "gift_card",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "captured",
  "partially_captured",
  "refunded",
  "partially_refunded",
  "voided",
  "failed",
]);

export const paymentTransactionTypeEnum = pgEnum("payment_transaction_type", [
  "authorization",
  "capture",
  "refund",
  "void",
  "failure",
  "adjustment",
]);

export const paymentTransactionStatusEnum = pgEnum("payment_transaction_status", [
  "pending",
  "succeeded",
  "failed",
]);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    provider: paymentProviderEnum("provider").notNull(),
    providerPaymentId: text("provider_payment_id"),
    currencyCode: text("currency_code").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amountAuthorized: numeric("amount_authorized", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    amountCaptured: numeric("amount_captured", { precision: 14, scale: 2 }).notNull().default("0"),
    amountRefunded: numeric("amount_refunded", { precision: 14, scale: 2 }).notNull().default("0"),
    isTest: boolean("is_test").notNull().default(false),
    metadata: jsonb("metadata"),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payments_order_id_idx").on(t.orderId),
    index("payments_customer_id_idx").on(t.customerId),
    index("payments_provider_idx").on(t.provider),
    index("payments_status_idx").on(t.status),
    uniqueIndex("payments_provider_payment_id_unique")
      .on(t.provider, t.providerPaymentId)
      .where(sql`${t.providerPaymentId} IS NOT NULL`),
    check("payments_amount_authorized_nonnegative_chk", sql`${t.amountAuthorized} >= 0`),
    check("payments_amount_captured_nonnegative_chk", sql`${t.amountCaptured} >= 0`),
    check("payments_amount_refunded_nonnegative_chk", sql`${t.amountRefunded} >= 0`),
    check("payments_refunded_lte_captured_chk", sql`${t.amountRefunded} <= ${t.amountCaptured}`),
  ]
);

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: text("id").primaryKey(),
    paymentId: text("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    type: paymentTransactionTypeEnum("type").notNull(),
    status: paymentTransactionStatusEnum("status").notNull().default("pending"),
    providerTransactionId: text("provider_transaction_id"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currencyCode: text("currency_code").notNull(),
    rawResponse: jsonb("raw_response"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payment_transactions_payment_id_idx").on(t.paymentId),
    index("payment_transactions_type_idx").on(t.type),
    index("payment_transactions_status_idx").on(t.status),
    uniqueIndex("payment_transactions_provider_transaction_unique")
      .on(t.providerTransactionId)
      .where(sql`${t.providerTransactionId} IS NOT NULL`),
    check("payment_transactions_amount_nonnegative_chk", sql`${t.amount} >= 0`),
  ]
);
