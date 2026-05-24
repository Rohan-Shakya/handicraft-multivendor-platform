import { pgTable, varchar, text, integer, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const shippingRateTypeEnum = pgEnum("shipping_rate_type", [
  "flat_rate",
  "weight_based",
  "price_based",
  "free",
]);

export const shippingZones = pgTable("shipping_zones", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  countries: jsonb("countries").$type<string[]>().notNull().default([]),  // ISO country codes
  isRestOfWorld: boolean("is_rest_of_world").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const shippingRates = pgTable("shipping_rates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  zoneId: varchar("zone_id", { length: 36 }).notNull().references(() => shippingZones.id),
  name: varchar("name", { length: 255 }).notNull(),           // e.g. "Standard Shipping"
  type: shippingRateTypeEnum("type").notNull().default("flat_rate"),
  price: integer("price").notNull().default(0),                 // cents for flat_rate
  minWeight: integer("min_weight"),                              // grams for weight_based
  maxWeight: integer("max_weight"),
  minOrderAmount: integer("min_order_amount"),                   // cents for price_based
  maxOrderAmount: integer("max_order_amount"),
  freeAboveAmount: integer("free_above_amount"),                 // cents - free shipping above this
  estimatedDaysMin: integer("estimated_days_min"),
  estimatedDaysMax: integer("estimated_days_max"),
  isActive: boolean("is_active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
