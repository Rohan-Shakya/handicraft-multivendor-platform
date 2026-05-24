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
import { customers } from "./customers";
import { orders } from "./orders";

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "active",
  "ended",
  "archived",
]);

export const campaignEventTypeEnum = pgEnum("campaign_event_type", [
  "impression", // banner / landing rendered
  "click",      // banner / landing CTA clicked
  "conversion", // order placed that included a campaign discount
]);

/**
 * A marketing campaign — e.g. "11.11 Sale", "Year-end Clearance". Wraps one or
 * more discounts under a single banner + landing page + scheduled window so the
 * storefront can present it as a unified promotion (hero, sale badges, /sale/...
 * page).
 *
 * The discount math lives on `discounts.campaignId`. Effective sale prices on
 * product responses are derived from active campaign discounts.
 */
export const campaigns = pgTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    /** URL slug — used for /sale/[handle] landing page. */
    handle: text("handle").notNull(),
    title: text("title").notNull(),
    /** Short marketing line shown on the homepage banner, e.g. "Up to 50% off". */
    headline: text("headline"),
    /** Longer pitch shown on the landing page. */
    description: text("description"),
    /** Optional banner image (file id from `files` table). */
    heroImageUrl: text("hero_image_url"),
    /** Call-to-action text on the banner, e.g. "Shop the sale". */
    ctaText: text("cta_text"),
    /**
     * Target URL for the banner CTA. Defaults to /sale/{handle} when null, but
     * admins can override to point at a collection or specific product page.
     */
    ctaUrl: text("cta_url"),
    /**
     * Display priority — when multiple campaigns are active simultaneously the
     * highest-priority one wins the homepage hero slot. Lower numbers first.
     */
    priority: integer("priority").notNull().default(100),
    status: campaignStatusEnum("status").notNull().default("draft"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /**
     * Optional accent colours for storefront UI (badge / banner). Stored as
     * hex strings — validated UI-side. Falls back to brand theme when null.
     */
    accentColor: text("accent_color"),
    backgroundColor: text("background_color"),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("campaigns_handle_unique")
      .on(t.handle)
      .where(sql`${t.deletedAt} IS NULL`),
    index("campaigns_status_idx").on(t.status),
    // Hot path: storefront asks "any active campaign right now?" — a composite
    // index over the active window keeps that query O(1) lookups instead of a
    // table scan as the campaign history grows.
    index("campaigns_active_window_idx").on(t.status, t.startsAt, t.endsAt),
    index("campaigns_priority_idx").on(t.priority),
    check(
      "campaigns_date_range_chk",
      sql`${t.startsAt} <= ${t.endsAt}`
    ),
    check(
      "campaigns_handle_format_chk",
      sql`${t.handle} ~ '^[a-z0-9][a-z0-9-]*$'`
    ),
  ]
);

/**
 * Tracks every storefront interaction with a campaign so we can compute
 * impressions / click-through rate / conversion rate over time without joining
 * external analytics. Append-only — never updated.
 *
 * A separate row per (event_type, sessionId-or-customerId) — we de-dupe by
 * day on read for impressions so a customer scrolling past the banner 20
 * times in one session counts once.
 */
export const campaignEvents = pgTable(
  "campaign_events",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    type: campaignEventTypeEnum("type").notNull(),
    /** Storefront session id (cookie-set). Lets us count unique impressions. */
    sessionId: text("session_id"),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    /** For type=conversion. References the order that used a campaign discount. */
    orderId: text("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    /**
     * For type=conversion — the revenue attributed to this campaign (the
     * portion of the order touched by the campaign discount). Stored in major
     * currency units to match the rest of the schema.
     */
    revenue: text("revenue"),
    /** Free-form context (e.g. surface = "homepage" | "landing"). */
    surface: text("surface"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("campaign_events_campaign_id_idx").on(t.campaignId),
    index("campaign_events_type_idx").on(t.type),
    index("campaign_events_campaign_type_created_idx").on(t.campaignId, t.type, t.createdAt),
    index("campaign_events_order_id_idx").on(t.orderId),
  ]
);
