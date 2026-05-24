import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
  numeric,
  varchar,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// PERFORMANCE NOTE: For ILIKE substring search at scale (>100K rows), enable pg_trgm extension
// and create GIN indexes:
//   CREATE EXTENSION IF NOT EXISTS pg_trgm;
//   CREATE INDEX customers_first_name_trgm ON customers USING gin (first_name gin_trgm_ops);
//   CREATE INDEX customers_last_name_trgm ON customers USING gin (last_name gin_trgm_ops);
//   CREATE INDEX customers_email_trgm ON customers USING gin (email gin_trgm_ops);

export const customerStateEnum = pgEnum("customer_state", ["enabled", "disabled", "invited"]);

export const customerTaxStatusEnum = pgEnum("customer_tax_status", [
  "collect",
  "exempt",
  "reverse_charge",
]);

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    companyName: text("company_name"),
    phone: text("phone"),
    language: text("language").notNull().default("en"),
    state: customerStateEnum("state").notNull().default("enabled"),
    isGuest: boolean("is_guest").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    totalSpent: numeric("total_spent", { precision: 14, scale: 2 }).notNull().default("0"),
    totalOrders: integer("total_orders").notNull().default(0),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    notes: text("notes"),
    storeCreditBalance: numeric("store_credit_balance", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    taxStatus: customerTaxStatusEnum("tax_status").notNull().default("collect"),
    vatNumber: text("vat_number"),
    emailMarketingSubscribed: boolean("email_marketing_subscribed").notNull().default(false),
    smsMarketingSubscribed: boolean("sms_marketing_subscribed").notNull().default(false),
    emailMarketingUpdatedAt: timestamp("email_marketing_updated_at", { withTimezone: true }),
    smsMarketingUpdatedAt: timestamp("sms_marketing_updated_at", { withTimezone: true }),
    rfmSegmentKey: text("rfm_segment_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    passwordResetToken: varchar("password_reset_token", { length: 255 }),
    passwordResetExpiresAt: timestamp("password_reset_expires_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("customers_email_unique").on(t.email),
    index("customers_state_idx").on(t.state),
    index("customers_last_order_at_idx").on(t.lastOrderAt),
    index("customers_rfm_segment_key_idx").on(t.rfmSegmentKey),
    index("customers_is_guest_idx").on(t.isGuest),
    index("customers_deleted_at_idx").on(t.deletedAt),
    // Btree indexes on name columns for prefix search (term%) optimization
    index("customers_first_name_idx").on(t.firstName),
    index("customers_last_name_idx").on(t.lastName),
    check("customers_email_lowercase_chk", sql`${t.email} = lower(${t.email})`),
    check("customers_total_spent_nonnegative_chk", sql`${t.totalSpent} >= 0`),
    check("customers_total_orders_nonnegative_chk", sql`${t.totalOrders} >= 0`),
    check("customers_store_credit_balance_nonnegative_chk", sql`${t.storeCreditBalance} >= 0`),
  ]
);

export const customerTags = pgTable(
  "customer_tags",
  {
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.customerId, t.tag], name: "customer_tags_pk" }),
    index("customer_tags_customer_id_idx").on(t.customerId),
    index("customer_tags_tag_idx").on(t.tag),
  ]
);
