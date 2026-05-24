import { pgTable, text, timestamp, boolean, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendors } from "./vendors";

export const vendorAddressTypeEnum = pgEnum("vendor_address_type", [
  "business",
  "billing",
  "warehouse",
  "return",
  "origin",
]);

export const vendorAddresses = pgTable(
  "vendor_addresses",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    type: vendorAddressTypeEnum("type").notNull(),
    label: text("label"),
    contactName: text("contact_name"),
    company: text("company"),
    phone: text("phone"),
    email: text("email"),
    address1: text("address1").notNull(),
    address2: text("address2"),
    city: text("city").notNull(),
    province: text("province"),
    provinceCode: text("province_code"),
    country: text("country").notNull(),
    countryCode: text("country_code").notNull(),
    zip: text("zip").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("vendor_addresses_vendor_id_idx").on(t.vendorId),
    index("vendor_addresses_vendor_type_idx").on(t.vendorId, t.type),
    index("vendor_addresses_country_code_idx").on(t.countryCode),
    index("vendor_addresses_deleted_at_idx").on(t.deletedAt),
    uniqueIndex("vendor_addresses_default_per_type_unique")
      .on(t.vendorId, t.type)
      .where(sql`${t.isDefault} = true AND ${t.deletedAt} IS NULL`),
  ]
);
