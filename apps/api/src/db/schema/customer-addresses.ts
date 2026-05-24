import { pgTable, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers";

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: text("label"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    phone: text("phone"),
    address1: text("address1").notNull(),
    address2: text("address2"),
    city: text("city").notNull(),
    province: text("province"),
    provinceCode: text("province_code"),
    country: text("country").notNull(),
    countryCode: text("country_code").notNull(),
    zip: text("zip").notNull(),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("customer_addresses_customer_id_idx").on(t.customerId),
    index("customer_addresses_country_code_idx").on(t.countryCode),
    index("customer_addresses_deleted_at_idx").on(t.deletedAt),
    uniqueIndex("customer_addresses_default_shipping_unique")
      .on(t.customerId)
      .where(sql`${t.isDefaultShipping} = true AND ${t.deletedAt} IS NULL`),
    uniqueIndex("customer_addresses_default_billing_unique")
      .on(t.customerId)
      .where(sql`${t.isDefaultBilling} = true AND ${t.deletedAt} IS NULL`),
  ]
);
