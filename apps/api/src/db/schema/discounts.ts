import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  numeric,
  integer,
  boolean,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendors } from "./vendors";
import { users } from "./users";
import { customers } from "./customers";
import { carts } from "./carts";
import { orders, vendorOrders } from "./orders";

export const discountStatusEnum = pgEnum("discount_status", [
  "draft",
  "active",
  "expired",
  "archived",
]);

export const discountScopeEnum = pgEnum("discount_scope", [
  "platform",
  "vendor",
  "targeted_vendors",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed_amount",
  "free_shipping",
]);

export const discountTargetTypeEnum = pgEnum("discount_target_type", ["order", "shipping"]);

export const discountCodeStatusEnum = pgEnum("discount_code_status", [
  "active",
  "disabled",
  "expired",
]);

export const discountRedemptionStatusEnum = pgEnum("discount_redemption_status", [
  "applied_to_cart",
  "applied_to_order",
  "completed",
  "removed",
  "voided",
]);

/**
 * `automatic` — applies to every eligible cart with no code entry (used for
 * sale campaigns). `code` — customer must paste a code in the cart drawer.
 */
export const discountMethodEnum = pgEnum("discount_method", ["code", "automatic"]);

export const discounts = pgTable(
  "discounts",
  {
    id: text("id").primaryKey(),
    scope: discountScopeEnum("scope").notNull().default("platform"),
    vendorId: text("vendor_id").references(() => vendors.id, {
      onDelete: "restrict",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: discountStatusEnum("status").notNull().default("draft"),
    type: discountTypeEnum("type").notNull(),
    /**
     * How customers activate the discount — `code` requires entry, `automatic`
     * applies during cart recalc to every cart matching scope/targets/window.
     * Automatic discounts power sale campaigns where the price drops without
     * the customer doing anything.
     */
    method: discountMethodEnum("method").notNull().default("code"),
    /**
     * Links this discount to a marketing campaign (banner/landing/analytics).
     * One discount belongs to at most one campaign; one campaign can have many
     * discounts. Optional — discounts can exist without a campaign (e.g. an
     * evergreen "WELCOME10" code).
     */
    campaignId: text("campaign_id"),
    targetType: discountTargetTypeEnum("target_type").notNull().default("order"),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
    minimumSubtotal: numeric("minimum_subtotal", {
      precision: 14,
      scale: 2,
    }),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    oncePerCustomer: boolean("once_per_customer").notNull().default(false),
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("discounts_scope_status_idx").on(t.scope, t.status),
    index("discounts_vendor_id_idx").on(t.vendorId),
    index("discounts_starts_at_idx").on(t.startsAt),
    index("discounts_ends_at_idx").on(t.endsAt),
    // Hot path: the cart recalc looks up "all automatic discounts active right
    // now" on every recalc — without this covering index it would do a status
    // scan + sort.
    index("discounts_active_auto_idx").on(t.method, t.status, t.startsAt, t.endsAt),
    index("discounts_campaign_id_idx").on(t.campaignId),
    check("discounts_value_nonnegative_chk", sql`${t.value} >= 0`),
    check(
      "discounts_usage_limit_nonnegative_chk",
      sql`${t.usageLimit} IS NULL OR ${t.usageLimit} >= 0`
    ),
    check("discounts_usage_count_nonnegative_chk", sql`${t.usageCount} >= 0`),
    check(
      "discounts_date_range_chk",
      sql`${t.startsAt} IS NULL OR ${t.endsAt} IS NULL OR ${t.startsAt} <= ${t.endsAt}`
    ),
    check(
      "discounts_scope_vendor_consistency_chk",
      sql`
        (${t.scope} = 'platform' AND ${t.vendorId} IS NULL) OR
        (${t.scope} = 'vendor' AND ${t.vendorId} IS NOT NULL) OR
        (${t.scope} = 'targeted_vendors' AND ${t.vendorId} IS NULL)
      `
    ),
    check(
      "discounts_percentage_value_range_chk",
      sql`${t.type} != 'percentage' OR (${t.value} > 0 AND ${t.value} <= 100)`
    ),
  ]
);

export const discountVendorTargets = pgTable(
  "discount_vendor_targets",
  {
    discountId: text("discount_id")
      .notNull()
      .references(() => discounts.id, { onDelete: "cascade" }),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.discountId, t.vendorId], name: "discount_vendor_targets_pk" }),
    index("discount_vendor_targets_vendor_id_idx").on(t.vendorId),
  ]
);

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: text("id").primaryKey(),
    discountId: text("discount_id")
      .notNull()
      .references(() => discounts.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    status: discountCodeStatusEnum("status").notNull().default("active"),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("discount_codes_discount_id_idx").on(t.discountId),
    index("discount_codes_status_idx").on(t.status),
    uniqueIndex("discount_codes_code_unique")
      .on(t.code)
      .where(sql`${t.deletedAt} IS NULL`),
    check("discount_codes_code_uppercase_chk", sql`${t.code} = upper(${t.code})`),
  ]
);

export const cartAppliedDiscounts = pgTable(
  "cart_applied_discounts",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    discountId: text("discount_id").references(() => discounts.id, { onDelete: "restrict" }),
    discountCodeId: text("discount_code_id").references(() => discountCodes.id, {
      onDelete: "restrict",
    }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    type: discountTypeEnum("type").notNull(),
    targetType: discountTargetTypeEnum("target_type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cart_applied_discounts_cart_id_idx").on(t.cartId),
    uniqueIndex("cart_applied_discounts_cart_code_unique").on(t.cartId, t.code),
    check("cart_applied_discounts_amount_nonnegative_chk", sql`${t.amount} >= 0`),
  ]
);

export const orderAppliedDiscounts = pgTable(
  "order_applied_discounts",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    discountId: text("discount_id").references(() => discounts.id, { onDelete: "restrict" }),
    discountCodeId: text("discount_code_id").references(() => discountCodes.id, {
      onDelete: "restrict",
    }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    type: discountTypeEnum("type").notNull(),
    targetType: discountTargetTypeEnum("target_type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("order_applied_discounts_order_id_idx").on(t.orderId),
    uniqueIndex("order_applied_discounts_order_code_unique").on(t.orderId, t.code),
    check("order_applied_discounts_amount_nonnegative_chk", sql`${t.amount} >= 0`),
  ]
);

export const vendorOrderAppliedDiscounts = pgTable(
  "vendor_order_applied_discounts",
  {
    id: text("id").primaryKey(),
    vendorOrderId: text("vendor_order_id")
      .notNull()
      .references(() => vendorOrders.id, { onDelete: "cascade" }),
    discountId: text("discount_id").references(() => discounts.id, { onDelete: "restrict" }),
    discountCodeId: text("discount_code_id").references(() => discountCodes.id, {
      onDelete: "restrict",
    }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    type: discountTypeEnum("type").notNull(),
    targetType: discountTargetTypeEnum("target_type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vendor_order_applied_discounts_vendor_order_id_idx").on(t.vendorOrderId),
    uniqueIndex("vendor_order_applied_discounts_vendor_order_code_unique").on(
      t.vendorOrderId,
      t.code
    ),
    check("vendor_order_applied_discounts_amount_nonnegative_chk", sql`${t.amount} >= 0`),
  ]
);

export const discountProducts = pgTable(
  "discount_products",
  {
    id: text("id").primaryKey(),
    discountId: text("discount_id")
      .notNull()
      .references(() => discounts.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("discount_products_discount_id_idx").on(t.discountId),
    index("discount_products_product_id_idx").on(t.productId),
  ]
);

export const discountCollections = pgTable(
  "discount_collections",
  {
    id: text("id").primaryKey(),
    discountId: text("discount_id")
      .notNull()
      .references(() => discounts.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("discount_collections_discount_id_idx").on(t.discountId),
    index("discount_collections_collection_id_idx").on(t.collectionId),
  ]
);

export const discountRedemptions = pgTable(
  "discount_redemptions",
  {
    id: text("id").primaryKey(),
    discountId: text("discount_id")
      .notNull()
      .references(() => discounts.id, { onDelete: "restrict" }),
    discountCodeId: text("discount_code_id").references(() => discountCodes.id, {
      onDelete: "restrict",
    }),
    cartId: text("cart_id").references(() => carts.id, {
      onDelete: "set null",
    }),
    orderId: text("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    status: discountRedemptionStatusEnum("status").notNull().default("applied_to_cart"),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
  },
  (t) => [
    index("discount_redemptions_discount_id_idx").on(t.discountId),
    index("discount_redemptions_cart_id_idx").on(t.cartId),
    index("discount_redemptions_order_id_idx").on(t.orderId),
    index("discount_redemptions_customer_id_idx").on(t.customerId),
    index("discount_redemptions_status_idx").on(t.status),
    check("discount_redemptions_amount_nonnegative_chk", sql`${t.amount} >= 0`),
  ]
);
