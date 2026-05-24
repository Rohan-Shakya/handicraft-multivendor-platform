import {
  pgTable,
  text,
  timestamp,
  integer,
  smallint,
  numeric,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
  jsonb,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers";
import { vendors } from "./vendors";
import { variants, products } from "./products";

export const cartStatusEnum = pgEnum("cart_status", ["active", "completed", "abandoned"]);

export const carts = pgTable(
  "carts",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    sessionId: text("session_id"),
    token: text("token"),
    email: text("email"),
    currencyCode: text("currency_code").notNull().default("USD"),
    attributes: jsonb("attributes"),
    itemCount: integer("item_count").notNull().default(0),
    itemsSubtotalPrice: numeric("items_subtotal_price", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalDiscount: numeric("total_discount", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalPrice: numeric("total_price", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalWeightGrams: integer("total_weight_grams").notNull().default(0),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    status: cartStatusEnum("status").notNull().default("active"),
    /**
     * Tracks abandoned-cart recovery email progress. Stages:
     *   0 = no recovery email yet
     *   1 = sent after 1h of inactivity
     *   2 = sent after 24h of inactivity
     *   3 = sent after 72h of inactivity (final reminder)
     * The scheduled job filters on (status='active' AND recoveryStageSent < target tier).
     */
    recoveryStageSent: smallint("recovery_stage_sent").notNull().default(0),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("carts_customer_id_idx").on(t.customerId),
    index("carts_session_id_idx").on(t.sessionId),
    index("carts_status_idx").on(t.status),
    index("carts_updated_at_idx").on(t.updatedAt),
    uniqueIndex("carts_token_unique")
      .on(t.token)
      .where(sql`${t.token} IS NOT NULL`),
    check("carts_email_lowercase_chk", sql`${t.email} IS NULL OR ${t.email} = lower(${t.email})`),
    check("carts_item_count_nonnegative_chk", sql`${t.itemCount} >= 0`),
    check("carts_items_subtotal_nonnegative_chk", sql`${t.itemsSubtotalPrice} >= 0`),
    check("carts_total_discount_nonnegative_chk", sql`${t.totalDiscount} >= 0`),
    check("carts_total_price_nonnegative_chk", sql`${t.totalPrice} >= 0`),
    check("carts_total_weight_nonnegative_chk", sql`${t.totalWeightGrams} >= 0`),
  ]
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").notNull(),
    title: text("title").notNull(),
    variantTitle: text("variant_title"),
    sku: text("sku"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    lineSubtotal: numeric("line_subtotal", {
      precision: 14,
      scale: 2,
    }).notNull(),
    lineDiscountTotal: numeric("line_discount_total", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    lineTotal: numeric("line_total", {
      precision: 14,
      scale: 2,
    }).notNull(),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    weightGrams: integer("weight_grams").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.productId, t.vendorId],
      foreignColumns: [products.id, products.vendorId],
      name: "cart_items_product_vendor_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.variantId, t.vendorId],
      foreignColumns: [variants.id, variants.vendorId],
      name: "cart_items_variant_vendor_fk",
    }).onDelete("cascade"),
    index("cart_items_cart_id_idx").on(t.cartId),
    index("cart_items_vendor_id_idx").on(t.vendorId),
    index("cart_items_variant_id_idx").on(t.variantId),
    uniqueIndex("cart_items_cart_variant_unique").on(t.cartId, t.variantId),
    check("cart_items_unit_price_nonnegative_chk", sql`${t.unitPrice} >= 0`),
    check("cart_items_quantity_positive_chk", sql`${t.quantity} > 0`),
    check("cart_items_line_subtotal_nonnegative_chk", sql`${t.lineSubtotal} >= 0`),
    check("cart_items_line_discount_nonnegative_chk", sql`${t.lineDiscountTotal} >= 0`),
    check("cart_items_line_total_nonnegative_chk", sql`${t.lineTotal} >= 0`),
    check("cart_items_weight_nonnegative_chk", sql`${t.weightGrams} >= 0`),
  ]
);

export const cartItemDiscountAllocations = pgTable(
  "cart_item_discount_allocations",
  {
    id: text("id").primaryKey(),
    cartItemId: text("cart_item_id")
      .notNull()
      .references(() => cartItems.id, { onDelete: "cascade" }),
    discountCode: text("discount_code").notNull(),
    discountTitle: text("discount_title").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cart_item_discount_allocations_cart_item_id_idx").on(t.cartItemId),
    check("cart_item_discount_allocations_amount_nonnegative_chk", sql`${t.amount} >= 0`),
  ]
);
