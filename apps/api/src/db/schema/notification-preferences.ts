import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";

/**
 * Notification preferences — per-user or per-customer settings.
 * Each row represents one user's preferences for a specific channel.
 */
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(),
    /** For admin/vendor users */
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    /** For customers */
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),

    // ── Email notifications ───────────────────────────────────────────────
    emailOrderUpdates: boolean("email_order_updates").notNull().default(true),
    emailPromotions: boolean("email_promotions").notNull().default(true),
    emailNewsletter: boolean("email_newsletter").notNull().default(true),
    emailSecurityAlerts: boolean("email_security_alerts").notNull().default(true),
    emailVendorUpdates: boolean("email_vendor_updates").notNull().default(true),
    emailReviewReminders: boolean("email_review_reminders").notNull().default(true),

    // ── In-app notifications ──────────────────────────────────────────────
    inAppOrderUpdates: boolean("in_app_order_updates").notNull().default(true),
    inAppPromotions: boolean("in_app_promotions").notNull().default(false),
    inAppSystemAlerts: boolean("in_app_system_alerts").notNull().default(true),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notification_preferences_user_id_idx").on(t.userId),
    index("notification_preferences_customer_id_idx").on(t.customerId),
  ]
);
