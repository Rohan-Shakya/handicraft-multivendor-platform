import { pgTable, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const taxBehaviorEnum = pgEnum("tax_behavior", [
  "exclusive",  // tax added on top of price
  "inclusive",   // tax included in price
]);

export const taxZones = pgTable("tax_zones", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),      // e.g. "United States", "European Union"
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  provinceCode: varchar("province_code", { length: 10 }),  // for state/province-level tax
  behavior: taxBehaviorEnum("behavior").notNull().default("exclusive"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const taxRates = pgTable("tax_rates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  zoneId: varchar("zone_id", { length: 36 }).notNull().references(() => taxZones.id),
  name: varchar("name", { length: 255 }).notNull(),      // e.g. "State Sales Tax", "VAT"
  rateBps: integer("rate_bps").notNull().default(0),      // basis points (e.g., 1000 = 10%)
  isCompound: boolean("is_compound").notNull().default(false),
  isShippingTaxed: boolean("is_shipping_taxed").notNull().default(false),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
