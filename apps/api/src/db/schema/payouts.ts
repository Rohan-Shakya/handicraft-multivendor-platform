import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  numeric,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendorOrders } from "./orders";
import { vendors } from "./vendors";

export const vendorPayoutStatusEnum = pgEnum("vendor_payout_status", [
  "pending",
  "scheduled",
  "paid",
  "failed",
  "cancelled",
]);

export const vendorOrderFinancials = pgTable(
  "vendor_order_financials",
  {
    id: text("id").primaryKey(),
    vendorOrderId: text("vendor_order_id")
      .notNull()
      .references(() => vendorOrders.id, { onDelete: "cascade" }),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    grossSales: numeric("gross_sales", { precision: 14, scale: 2 }).notNull(),
    discountTotal: numeric("discount_total", { precision: 14, scale: 2 }).notNull().default("0"),
    shippingAmount: numeric("shipping_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    refundedAmount: numeric("refunded_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    commissionBpsSnapshot: numeric("commission_bps_snapshot", { precision: 5, scale: 0 }).notNull(),
    commissionAmount: numeric("commission_amount", { precision: 14, scale: 2 }).notNull(),
    netPayable: numeric("net_payable", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vendor_order_financials_vendor_order_unique").on(t.vendorOrderId),
    index("vendor_order_financials_vendor_id_idx").on(t.vendorId),
    check("vendor_order_financials_gross_sales_nonnegative_chk", sql`${t.grossSales} >= 0`),
    check("vendor_order_financials_discount_nonnegative_chk", sql`${t.discountTotal} >= 0`),
    check("vendor_order_financials_shipping_nonnegative_chk", sql`${t.shippingAmount} >= 0`),
    check("vendor_order_financials_tax_nonnegative_chk", sql`${t.taxAmount} >= 0`),
    check("vendor_order_financials_refunded_nonnegative_chk", sql`${t.refundedAmount} >= 0`),
    check(
      "vendor_order_financials_commission_bps_range_chk",
      sql`${t.commissionBpsSnapshot} >= 0 AND ${t.commissionBpsSnapshot} <= 10000`
    ),
  ]
);

export const vendorPayouts = pgTable(
  "vendor_payouts",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    status: vendorPayoutStatusEnum("status").notNull().default("pending"),
    currencyCode: text("currency_code").notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    reference: text("reference"),
    note: text("note"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vendor_payouts_vendor_id_idx").on(t.vendorId),
    index("vendor_payouts_status_idx").on(t.status),
    check("vendor_payouts_total_amount_nonnegative_chk", sql`${t.totalAmount} >= 0`),
  ]
);

export const vendorPayoutItems = pgTable(
  "vendor_payout_items",
  {
    id: text("id").primaryKey(),
    payoutId: text("payout_id")
      .notNull()
      .references(() => vendorPayouts.id, { onDelete: "cascade" }),
    vendorOrderId: text("vendor_order_id")
      .notNull()
      .references(() => vendorOrders.id, { onDelete: "restrict" }),
    // Direct link to the financial record for full traceability
    vendorOrderFinancialId: text("vendor_order_financial_id").references(
      () => vendorOrderFinancials.id,
      { onDelete: "restrict" }
    ),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vendor_payout_items_payout_id_idx").on(t.payoutId),
    uniqueIndex("vendor_payout_items_vendor_order_unique").on(t.vendorOrderId),
    index("vendor_payout_items_financial_id_idx").on(t.vendorOrderFinancialId),
    check("vendor_payout_items_amount_nonnegative_chk", sql`${t.amount} >= 0`),
  ]
);
