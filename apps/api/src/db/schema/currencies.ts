import {
  pgTable,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const currencies = pgTable(
  "currencies",
  {
    code: text("code").primaryKey(), // ISO 4217 e.g. "NPR", "USD", "INR"
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    decimalPlaces: integer("decimal_places").notNull().default(2),
    /** Exchange rate relative to the base currency */
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8 })
      .notNull()
      .default("1.00000000"),
    /** Is this the base currency? Only one row should have isBase=true */
    isBase: boolean("is_base").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("currencies_is_active_idx").on(t.isActive),
  ]
);
