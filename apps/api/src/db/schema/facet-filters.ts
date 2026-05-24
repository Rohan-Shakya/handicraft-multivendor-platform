/**
 * Admin-managed storefront filter definitions.
 *
 * The marketplace admin (and, later, individual vendors if vendorId is set)
 * configures which filters appear on `/products`, what they render as
 * (checkbox / radio / slider), and how their options are sourced (variant
 * option, metafield, collection, tag, etc.). The storefront reads the enabled
 * set at request time and materialises the actual option list from the
 * catalog.
 *
 * Scope:
 *   vendorId = NULL → platform-wide filter (super_admin controls).
 *   vendorId = xxx  → filter only applies on that vendor's storefront pages.
 *
 * Ordering is controlled by `position` (ascending). Enabled state is a soft
 * switch so admins can hide a filter without losing its config.
 */
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  index,
  uniqueIndex,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendors } from "./vendors";
import { users } from "./users";

/**
 * Where the filter's options come from.
 *
 *  - variant_price      — numeric range over variant.price (always one of
 *                         these; rendered as a slider).
 *  - variant_option     — a product option (e.g. "Color", "Size"). `sourceRef`
 *                         stores the option name.
 *  - variant_metafield  — a metafield on a variant. `sourceRef` is
 *                         `namespace.key`.
 *  - product_metafield  — same but on the product.
 *  - collection         — checkbox list of collections; options auto-populated.
 *  - tag                — checkbox list of product tags.
 *  - vendor             — checkbox list of vendors (platform only).
 *  - rating             — ⭐ threshold selector.
 *  - availability       — in-stock / on-sale toggles.
 */
export const facetFilterSourceTypeEnum = pgEnum("facet_filter_source_type", [
  "variant_price",
  "variant_option",
  "variant_metafield",
  "product_metafield",
  "collection",
  "tag",
  "vendor",
  "rating",
  "availability",
]);

/** How the filter is rendered in the storefront. */
export const facetFilterDisplayTypeEnum = pgEnum("facet_filter_display_type", [
  "checkbox",
  "radio",
  "slider",
  "swatch",
  "toggle",
]);

export const facetFilters = pgTable(
  "facet_filters",
  {
    id: text("id").primaryKey(),
    /**
     * NULL = platform-wide filter managed by super_admin.
     * Non-null = per-vendor override (future).
     */
    vendorId: text("vendor_id").references(() => vendors.id, {
      onDelete: "cascade",
    }),
    /**
     * Machine-readable key echoed into the URL query string (e.g.
     * `?material=wool`). Must be a lowercase slug.
     */
    key: text("key").notNull(),
    /** Human-readable label shown above the filter group. */
    label: text("label").notNull(),
    sourceType: facetFilterSourceTypeEnum("source_type").notNull(),
    /**
     * Optional pointer to the source field — e.g. the option name, the
     * metafield `namespace.key`, or NULL for built-ins like `collection` that
     * don't need a ref.
     */
    sourceRef: text("source_ref"),
    displayType: facetFilterDisplayTypeEnum("display_type").notNull(),
    /**
     * Free-form configuration bag: `{ min?, max?, step? }` for sliders,
     * `{ swatches: { value: hex } }` for swatches, `{ maxVisible }` etc.
     */
    config: jsonb("config").$type<Record<string, unknown>>(),
    /** 0-based sort order. Lower = earlier in the list. */
    position: integer("position").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    // Unique key per scope (null vendorId treats platform-wide as its own scope).
    uniqueIndex("facet_filters_scope_key_unique")
      .on(t.vendorId, t.key)
      .where(sql`${t.deletedAt} IS NULL`),
    index("facet_filters_vendor_position_idx").on(t.vendorId, t.position),
    index("facet_filters_enabled_idx").on(t.enabled),
    index("facet_filters_deleted_at_idx").on(t.deletedAt),
    check(
      "facet_filters_key_lowercase_chk",
      sql`${t.key} = lower(${t.key})`
    ),
    check("facet_filters_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);
