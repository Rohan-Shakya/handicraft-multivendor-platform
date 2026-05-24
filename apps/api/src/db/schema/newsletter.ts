import { pgTable, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { customerSegments } from "./customer-segments";
import { users } from "./users";

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

/**
 * One row per marketing email blast. Admin composes subject + HTML body and
 * optionally targets a customer segment; on send the API fans out to all
 * matching subscriber emails. `sentAt` is null while drafting; `recipientCount`
 * is filled in when the send completes.
 */
export const newsletterCampaigns = pgTable(
  "newsletter_campaigns",
  {
    id: text("id").primaryKey(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text"),
    segmentId: text("segment_id").references(() => customerSegments.id, {
      onDelete: "set null",
    }),
    recipientCount: integer("recipient_count").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentByUserId: text("sent_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("newsletter_campaigns_sent_at_idx").on(t.sentAt)]
);
