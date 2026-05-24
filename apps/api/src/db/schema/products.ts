import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  numeric,
  boolean,
  index,
  uniqueIndex,
  check,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendors } from "./vendors";
import { users } from "./users";
import { files } from "./files";

export const productStatusEnum = pgEnum("product_status", ["draft", "active", "archived"]);
export const variantStatusEnum = pgEnum("variant_status", ["active", "inactive", "archived"]);
export const inventoryPolicyEnum = pgEnum("inventory_policy", ["deny", "continue"]);
export const weightUnitEnum = pgEnum("weight_unit", ["g", "kg", "lb", "oz"]);
export const optionDisplayTypeEnum = pgEnum("option_display_type", ["text", "color", "image"]);
export const inventoryAdjustmentReasonEnum = pgEnum("inventory_adjustment_reason", [
  "manual",
  "sale",
  "refund",
  "restock",
  "correction",
  "import",
  "reservation",
  "release",
]);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    handle: text("handle").notNull(),
    description: text("description"),
    excerpt: text("excerpt"),
    status: productStatusEnum("status").notNull().default("draft"),
    productType: text("product_type"),
    brand: text("brand"),
    featuredFileId: text("featured_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoCanonicalUrl: text("seo_canonical_url"),
    /**
     * When true, the storefront PDP shows a configurator (size / material /
     * colour pickers from `product_config_options`) and "Add to cart" becomes
     * "Request quote" — submission creates a draft order the vendor can price.
     */
    isConfigurable: boolean("is_configurable").notNull().default(false),
    /** Estimated lead time (production + shipping) shown next to the configurator. */
    configuratorLeadTimeDays: integer("configurator_lead_time_days"),
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
    uniqueIndex("products_vendor_handle_unique")
      .on(t.vendorId, t.handle)
      .where(sql`${t.deletedAt} IS NULL`),
    uniqueIndex("products_id_vendor_unique").on(t.id, t.vendorId),
    index("products_vendor_status_idx").on(t.vendorId, t.status),
    index("products_vendor_product_type_idx").on(t.vendorId, t.productType),
    index("products_vendor_brand_idx").on(t.vendorId, t.brand),
    index("products_vendor_published_at_idx").on(t.vendorId, t.publishedAt),
    index("products_featured_file_id_idx").on(t.featuredFileId),
    index("products_deleted_at_idx").on(t.deletedAt),
    check("products_handle_lowercase_chk", sql`${t.handle} = lower(${t.handle})`),
  ]
);

export const productTags = pgTable(
  "product_tags",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.tag], name: "product_tags_pk" }),
    index("product_tags_product_id_idx").on(t.productId),
    index("product_tags_tag_idx").on(t.tag),
  ]
);

export const productOptions = pgTable(
  "product_options",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayType: optionDisplayTypeEnum("display_type").notNull().default("text"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("product_options_id_product_unique").on(t.id, t.productId),
    index("product_options_product_id_idx").on(t.productId),
    uniqueIndex("product_options_product_name_unique").on(t.productId, t.name),
    uniqueIndex("product_options_product_position_unique").on(t.productId, t.position),
    check("product_options_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);

export const productOptionValues = pgTable(
  "product_option_values",
  {
    id: text("id").primaryKey(),
    optionId: text("option_id")
      .notNull()
      .references(() => productOptions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    swatchColor: text("swatch_color"),
    swatchFileId: text("swatch_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("product_option_values_id_option_unique").on(t.id, t.optionId),
    index("product_option_values_option_id_idx").on(t.optionId),
    uniqueIndex("product_option_values_option_value_unique").on(t.optionId, t.value),
    uniqueIndex("product_option_values_option_position_unique").on(t.optionId, t.position),
    index("product_option_values_swatch_file_id_idx").on(t.swatchFileId),
    check("product_option_values_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);

export const variants = pgTable(
  "variants",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    productId: text("product_id").notNull(),
    title: text("title"),
    sku: text("sku"),
    barcode: text("barcode"),
    status: variantStatusEnum("status").notNull().default("active"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: numeric("compare_at_price", {
      precision: 12,
      scale: 2,
    }),
    costPerItem: numeric("cost_per_item", { precision: 12, scale: 2 }),
    taxable: boolean("taxable").notNull().default(true),
    inventoryTracked: boolean("inventory_tracked").notNull().default(true),
    inventoryPolicy: inventoryPolicyEnum("inventory_policy").notNull().default("deny"),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    weightValue: numeric("weight_value", { precision: 10, scale: 3 }),
    weightUnit: weightUnitEnum("weight_unit").default("kg"),
    countryOfOrigin: text("country_of_origin"),
    harmonizedSystemCode: text("harmonized_system_code"),
    featuredFileId: text("featured_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    foreignKey({
      columns: [t.productId, t.vendorId],
      foreignColumns: [products.id, products.vendorId],
      name: "variants_product_vendor_fk",
    }).onDelete("cascade"),
    uniqueIndex("variants_id_vendor_unique").on(t.id, t.vendorId),
    index("variants_product_id_idx").on(t.productId),
    index("variants_vendor_status_idx").on(t.vendorId, t.status),
    uniqueIndex("variants_vendor_sku_unique")
      .on(t.vendorId, t.sku)
      .where(sql`${t.sku} IS NOT NULL AND ${t.deletedAt} IS NULL`),
    index("variants_vendor_barcode_idx").on(t.vendorId, t.barcode),
    uniqueIndex("variants_product_position_unique")
      .on(t.productId, t.position)
      .where(sql`${t.deletedAt} IS NULL`),
    index("variants_featured_file_id_idx").on(t.featuredFileId),
    index("variants_deleted_at_idx").on(t.deletedAt),
    check("variants_price_nonnegative_chk", sql`${t.price} >= 0`),
    check(
      "variants_compare_at_price_nonnegative_chk",
      sql`${t.compareAtPrice} IS NULL OR ${t.compareAtPrice} >= 0`
    ),
    check(
      "variants_cost_per_item_nonnegative_chk",
      sql`${t.costPerItem} IS NULL OR ${t.costPerItem} >= 0`
    ),
    check(
      "variants_compare_at_price_gte_price_chk",
      sql`${t.compareAtPrice} IS NULL OR ${t.compareAtPrice} >= ${t.price}`
    ),
    check(
      "variants_weight_value_nonnegative_chk",
      sql`${t.weightValue} IS NULL OR ${t.weightValue} >= 0`
    ),
    check("variants_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    variantId: text("variant_id").notNull(),
    tracked: boolean("tracked").notNull().default(true),
    availableQuantity: integer("available_quantity").notNull().default(0),
    reservedQuantity: integer("reserved_quantity").notNull().default(0),
    incomingQuantity: integer("incoming_quantity").notNull().default(0),
    reorderThreshold: integer("reorder_threshold"),
    allowBackorder: boolean("allow_backorder").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.variantId, t.vendorId],
      foreignColumns: [variants.id, variants.vendorId],
      name: "inventory_items_variant_vendor_fk",
    }).onDelete("cascade"),
    uniqueIndex("inventory_items_variant_unique").on(t.variantId),
    index("inventory_items_vendor_id_idx").on(t.vendorId),
    index("inventory_items_available_quantity_idx").on(t.availableQuantity),
    check("inventory_items_available_nonnegative_chk", sql`${t.availableQuantity} >= 0`),
    check("inventory_items_reserved_nonnegative_chk", sql`${t.reservedQuantity} >= 0`),
    check("inventory_items_incoming_nonnegative_chk", sql`${t.incomingQuantity} >= 0`),
    check(
      "inventory_items_reorder_threshold_nonnegative_chk",
      sql`${t.reorderThreshold} IS NULL OR ${t.reorderThreshold} >= 0`
    ),
  ]
);

export const inventoryAdjustments = pgTable(
  "inventory_adjustments",
  {
    id: text("id").primaryKey(),
    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    reason: inventoryAdjustmentReasonEnum("reason").notNull(),
    delta: integer("delta").notNull(),
    note: text("note"),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inventory_adjustments_inventory_item_id_idx").on(t.inventoryItemId),
    index("inventory_adjustments_reason_idx").on(t.reason),
    index("inventory_adjustments_reference_idx").on(t.referenceType, t.referenceId),
    index("inventory_adjustments_created_by_idx").on(t.createdBy),
  ]
);

/**
 * Simple URL-based product images — used by the product CRUD API.
 * For file-managed media with full metadata, use productMedia (junction to files table).
 */
export const productImages = pgTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    position: integer("position").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_images_product_id_idx").on(t.productId),
    uniqueIndex("product_images_product_position_unique").on(t.productId, t.position),
    uniqueIndex("product_images_product_featured_unique")
      .on(t.productId)
      .where(sql`${t.isFeatured} = true`),
    check("product_images_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);

/**
 * File-managed product media — junction to the files table.
 * Provides full media metadata (dimensions, checksums, etc.) via the files table.
 */
export const productMedia = pgTable(
  "product_media",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    altText: text("alt_text"),
    position: integer("position").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.fileId], name: "product_media_pk" }),
    index("product_media_product_id_idx").on(t.productId),
    index("product_media_file_id_idx").on(t.fileId),
    uniqueIndex("product_media_product_position_unique").on(t.productId, t.position),
    uniqueIndex("product_media_product_featured_unique")
      .on(t.productId)
      .where(sql`${t.isFeatured} = true`),
    check("product_media_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);

/**
 * Simple URL-based variant images — used by the variant CRUD API.
 * For file-managed media with full metadata, use variantMedia (junction to files table).
 */
export const variantImages = pgTable(
  "variant_images",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    position: integer("position").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("variant_images_variant_id_idx").on(t.variantId),
    uniqueIndex("variant_images_variant_position_unique").on(t.variantId, t.position),
    uniqueIndex("variant_images_variant_featured_unique")
      .on(t.variantId)
      .where(sql`${t.isFeatured} = true`),
    check("variant_images_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);

export const variantMedia = pgTable(
  "variant_media",
  {
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    altText: text("alt_text"),
    position: integer("position").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.variantId, t.fileId], name: "variant_media_pk" }),
    index("variant_media_variant_id_idx").on(t.variantId),
    index("variant_media_file_id_idx").on(t.fileId),
    uniqueIndex("variant_media_variant_position_unique").on(t.variantId, t.position),
    uniqueIndex("variant_media_variant_featured_unique")
      .on(t.variantId)
      .where(sql`${t.isFeatured} = true`),
    check("variant_media_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);

export const variantSelectedOptions = pgTable(
  "variant_selected_options",
  {
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    optionId: text("option_id").notNull(),
    optionValueId: text("option_value_id").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.optionId],
      foreignColumns: [productOptions.id],
      name: "variant_selected_options_option_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.optionValueId, t.optionId],
      foreignColumns: [productOptionValues.id, productOptionValues.optionId],
      name: "variant_selected_options_option_value_fk",
    }).onDelete("cascade"),
    primaryKey({ columns: [t.variantId, t.optionId], name: "variant_selected_options_pk" }),
    index("variant_selected_options_variant_id_idx").on(t.variantId),
    index("variant_selected_options_option_id_idx").on(t.optionId),
    index("variant_selected_options_option_value_id_idx").on(t.optionValueId),
    uniqueIndex("variant_selected_options_variant_option_value_unique").on(
      t.variantId,
      t.optionValueId
    ),
  ]
);
