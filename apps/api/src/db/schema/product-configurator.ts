import {
  pgTable,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { products } from "./products";

/**
 * Product configurator — for made-to-order items like custom rugs. The vendor
 * marks a product as `isConfigurable` and declares the inputs a buyer fills
 * (size, material, colour, etc). The buyer submits a "Request quote" which
 * becomes a draft order; the vendor can adjust pricing + lead time and send
 * an invoice. Used for handicrafts and bespoke goods where price depends on
 * the specs.
 */
export const productConfigOptions = pgTable(
  "product_config_options",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Label shown to the customer ("Size", "Material", "Colour"). */
    name: text("name").notNull(),
    /** select = dropdown of pre-defined values; text = freeform; number = numeric input. */
    type: text("type").notNull(),
    required: boolean("required").notNull().default(true),
    helpText: text("help_text"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_config_options_product_idx").on(t.productId, t.position),
    check(
      "product_config_options_type_chk",
      sql`${t.type} IN ('select', 'text', 'number')`
    ),
  ]
);

export const productConfigOptionValues = pgTable(
  "product_config_option_values",
  {
    id: text("id").primaryKey(),
    optionId: text("option_id")
      .notNull()
      .references(() => productConfigOptions.id, { onDelete: "cascade" }),
    /** Customer-facing label ("6x9 ft", "Wool", "Burgundy"). */
    value: text("value").notNull(),
    /**
     * Optional price modifier added to the base product price when this value
     * is selected. Surfaced in the configurator UI so the customer sees
     * "+ Rs 50,000" for an oversized rug.
     */
    priceModifier: numeric("price_modifier", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_config_option_values_option_idx").on(t.optionId, t.position),
  ]
);
