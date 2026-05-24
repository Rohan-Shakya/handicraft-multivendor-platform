import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
  integer,
  primaryKey,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendors } from "./vendors";
import { products } from "./products";
import { users } from "./users";
import { files } from "./files";

export const collectionStatusEnum = pgEnum("collection_status", ["draft", "active", "archived"]);

export const collectionTypeEnum = pgEnum("collection_type", ["manual", "smart"]);

export const collectionSortOrderEnum = pgEnum("collection_sort_order", [
  "manual",
  "best_selling",
  "created_desc",
  "created_asc",
  "updated_desc",
  "updated_asc",
  "title_asc",
  "title_desc",
  "price_asc",
  "price_desc",
]);

export const collectionRuleColumnEnum = pgEnum("collection_rule_column", [
  "title",
  "product_type",
  "tag",
  "price",
  "compare_at_price",
  "sku",
  "barcode",
  "inventory_quantity",
  "status",
]);

export const collectionRuleRelationEnum = pgEnum("collection_rule_relation", [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "is_set",
  "is_not_set",
]);

export const collectionRuleApplyModeEnum = pgEnum("collection_rule_apply_mode", ["all", "any"]);

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    handle: text("handle").notNull(),
    type: collectionTypeEnum("type").notNull().default("manual"),
    status: collectionStatusEnum("status").notNull().default("draft"),
    description: text("description"),
    imageFileId: text("image_file_id").references(() => files.id, { onDelete: "set null" }),
    imageAlt: text("image_alt"),
    sortOrder: collectionSortOrderEnum("sort_order").notNull().default("manual"),
    ruleApplyMode: collectionRuleApplyModeEnum("rule_apply_mode"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoCanonicalUrl: text("seo_canonical_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("collections_vendor_handle_unique")
      .on(t.vendorId, t.handle)
      .where(sql`${t.deletedAt} IS NULL`),
    index("collections_vendor_status_idx").on(t.vendorId, t.status),
    index("collections_vendor_type_idx").on(t.vendorId, t.type),
    index("collections_vendor_published_at_idx").on(t.vendorId, t.publishedAt),
    index("collections_image_file_id_idx").on(t.imageFileId),
    index("collections_deleted_at_idx").on(t.deletedAt),
    check("collections_handle_lowercase_chk", sql`${t.handle} = lower(${t.handle})`),
    check(
      "collections_rule_apply_mode_required_for_smart_chk",
      sql`(${t.type} = 'smart' AND ${t.ruleApplyMode} IS NOT NULL) OR (${t.type} = 'manual')`
    ),
  ]
);

export const collectionRules = pgTable(
  "collection_rules",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    column: collectionRuleColumnEnum("column").notNull(),
    relation: collectionRuleRelationEnum("relation").notNull(),
    condition: text("condition"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("collection_rules_collection_id_idx").on(t.collectionId),
    index("collection_rules_collection_position_idx").on(t.collectionId, t.position),
    uniqueIndex("collection_rules_collection_position_unique").on(t.collectionId, t.position),
    check("collection_rules_position_nonnegative_chk", sql`${t.position} >= 0`),
    check(
      "collection_rules_condition_required_chk",
      sql`(${t.relation} IN ('is_set', 'is_not_set') AND ${t.condition} IS NULL) OR (${t.relation} NOT IN ('is_set', 'is_not_set') AND ${t.condition} IS NOT NULL)`
    ),
  ]
);

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.productId], name: "collection_products_pk" }),
    index("collection_products_collection_id_idx").on(t.collectionId),
    index("collection_products_product_id_idx").on(t.productId),
    index("collection_products_collection_position_idx").on(t.collectionId, t.position),
    uniqueIndex("collection_products_collection_position_unique").on(t.collectionId, t.position),
    check("collection_products_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);
