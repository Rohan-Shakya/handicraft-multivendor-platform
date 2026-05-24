import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const vendorStatusEnum = pgEnum("vendor_status", [
  "pending",
  "active",
  "suspended",
  "rejected",
]);

export const vendors = pgTable(
  "vendors",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    slug: text("slug").notNull(),
    status: vendorStatusEnum("status").notNull().default("pending"),
    bio: text("bio"),
    logoUrl: text("logo_url"),
    bannerUrl: text("banner_url"),
    websiteUrl: text("website_url"),
    primaryEmail: text("primary_email"),
    supportEmail: text("support_email"),
    billingEmail: text("billing_email"),
    primaryPhone: text("primary_phone"),
    supportPhone: text("support_phone"),
    countryCode: text("country_code"),
    currencyCode: text("currency_code"),
    timezone: text("timezone"),
    vatNumber: text("vat_number"),
    taxId: text("tax_id"),
    registrationNumber: text("registration_number"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    commissionBps: integer("commission_bps").notNull().default(0),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("vendors_slug_unique").on(t.slug),
    index("vendors_status_idx").on(t.status),
    index("vendors_country_code_idx").on(t.countryCode),
    index("vendors_created_by_idx").on(t.createdBy),
    index("vendors_deleted_at_idx").on(t.deletedAt),
    index("vendors_primary_email_idx").on(t.primaryEmail),
    check("vendors_slug_lowercase_chk", sql`${t.slug} = lower(${t.slug})`),
    check(
      "vendors_primary_email_lowercase_chk",
      sql`${t.primaryEmail} IS NULL OR ${t.primaryEmail} = lower(${t.primaryEmail})`
    ),
    check(
      "vendors_support_email_lowercase_chk",
      sql`${t.supportEmail} IS NULL OR ${t.supportEmail} = lower(${t.supportEmail})`
    ),
    check(
      "vendors_billing_email_lowercase_chk",
      sql`${t.billingEmail} IS NULL OR ${t.billingEmail} = lower(${t.billingEmail})`
    ),
    check(
      "vendors_commission_bps_range_chk",
      sql`${t.commissionBps} >= 0 AND ${t.commissionBps} <= 10000`
    ),
  ]
);
