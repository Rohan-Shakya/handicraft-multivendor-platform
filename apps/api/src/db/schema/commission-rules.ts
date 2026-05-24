import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  numeric,
  boolean,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendors } from "./vendors";

export const commissionRuleStatusEnum = pgEnum("commission_rule_status", [
  "draft",
  "active",
  "archived",
]);

export const commissionRuleScopeEnum = pgEnum("commission_rule_scope", ["default", "vendor"]);

export const commissionRuleTypeEnum = pgEnum("commission_rule_type", ["bps", "flat_fee"]);

export const commissionRules = pgTable(
  "commission_rules",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().default(""),
    scope: commissionRuleScopeEnum("scope").notNull().default("default"),
    vendorId: text("vendor_id").references(() => vendors.id, {
      onDelete: "cascade",
    }),
    status: commissionRuleStatusEnum("status").notNull().default("draft"),
    type: commissionRuleTypeEnum("type").notNull().default("bps"),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
    currencyCode: text("currency_code"),
    appliesToShipping: boolean("applies_to_shipping").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("commission_rules_scope_idx").on(t.scope),
    index("commission_rules_vendor_id_idx").on(t.vendorId),
    index("commission_rules_status_idx").on(t.status),
    index("commission_rules_starts_at_idx").on(t.startsAt),
    index("commission_rules_ends_at_idx").on(t.endsAt),
    check(
      "commission_rules_scope_vendor_consistency_chk",
      sql`
        (${t.scope} = 'default' AND ${t.vendorId} IS NULL) OR
        (${t.scope} = 'vendor' AND ${t.vendorId} IS NOT NULL)
      `
    ),
    check(
      "commission_rules_date_range_chk",
      sql`${t.startsAt} IS NULL OR ${t.endsAt} IS NULL OR ${t.startsAt} <= ${t.endsAt}`
    ),
    check("commission_rules_value_nonnegative_chk", sql`${t.value} >= 0`),
    check(
      "commission_rules_bps_value_range_chk",
      sql`${t.type} != 'bps' OR (${t.value} >= 0 AND ${t.value} <= 10000)`
    ),
    check(
      "commission_rules_flat_fee_currency_required_chk",
      sql`${t.type} != 'flat_fee' OR ${t.currencyCode} IS NOT NULL`
    ),
  ]
);
