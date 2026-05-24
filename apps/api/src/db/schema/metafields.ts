import {
  pgTable,
  text,
  pgEnum,
  index,
  uniqueIndex,
  timestamp,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendors } from "./vendors";
import { products, variants } from "./products";
import { customers } from "./customers";
import { collections } from "./collections";
import { pages } from "./content";

export const metafieldTypeEnum = pgEnum("metafield_type", [
  "string",
  "integer",
  "float",
  "boolean",
  "json",
  "date",
]);

export const productMetafields = pgTable(
  "product_metafields",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    type: metafieldTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_metafields_vendor_id_idx").on(t.vendorId),
    index("product_metafields_product_id_idx").on(t.productId),
    uniqueIndex("product_metafields_product_namespace_key_unique").on(
      t.productId,
      t.namespace,
      t.key
    ),
    check("product_metafields_namespace_nonempty_chk", sql`length(${t.namespace}) > 0`),
    check("product_metafields_key_nonempty_chk", sql`length(${t.key}) > 0`),
  ]
);

export const variantMetafields = pgTable(
  "variant_metafields",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    type: metafieldTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("variant_metafields_vendor_id_idx").on(t.vendorId),
    index("variant_metafields_variant_id_idx").on(t.variantId),
    uniqueIndex("variant_metafields_variant_namespace_key_unique").on(
      t.variantId,
      t.namespace,
      t.key
    ),
    check("variant_metafields_namespace_nonempty_chk", sql`length(${t.namespace}) > 0`),
    check("variant_metafields_key_nonempty_chk", sql`length(${t.key}) > 0`),
  ]
);

export const customerMetafields = pgTable(
  "customer_metafields",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    type: metafieldTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("customer_metafields_customer_id_idx").on(t.customerId),
    uniqueIndex("customer_metafields_customer_namespace_key_unique").on(
      t.customerId,
      t.namespace,
      t.key
    ),
    check("customer_metafields_namespace_nonempty_chk", sql`length(${t.namespace}) > 0`),
    check("customer_metafields_key_nonempty_chk", sql`length(${t.key}) > 0`),
  ]
);

export const collectionMetafields = pgTable(
  "collection_metafields",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    type: metafieldTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("collection_metafields_vendor_id_idx").on(t.vendorId),
    index("collection_metafields_collection_id_idx").on(t.collectionId),
    uniqueIndex("collection_metafields_collection_namespace_key_unique").on(
      t.collectionId,
      t.namespace,
      t.key
    ),
    check("collection_metafields_namespace_nonempty_chk", sql`length(${t.namespace}) > 0`),
    check("collection_metafields_key_nonempty_chk", sql`length(${t.key}) > 0`),
  ]
);

export const pageMetafields = pgTable(
  "page_metafields",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    type: metafieldTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("page_metafields_page_id_idx").on(t.pageId),
    uniqueIndex("page_metafields_page_namespace_key_unique").on(t.pageId, t.namespace, t.key),
    check("page_metafields_namespace_nonempty_chk", sql`length(${t.namespace}) > 0`),
    check("page_metafields_key_nonempty_chk", sql`length(${t.key}) > 0`),
  ]
);
