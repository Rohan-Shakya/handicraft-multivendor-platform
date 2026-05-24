import { pgTable, text, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";

export const actorTypeEnum = pgEnum("actor_type", ["admin", "vendor", "customer"]);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    actorType: actorTypeEnum("actor_type").notNull(),
    /** For admin/vendor actors */
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    /** For customer actors */
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    /** Vendor ID (only for vendor actor type) */
    vendorId: text("vendor_id"),
    /** Vendor role (only for vendor actor type) */
    vendorRole: text("vendor_role"),
    /** Admin role (only for admin actor type) */
    adminRole: text("admin_role"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("refresh_tokens_user_id_idx").on(t.userId),
    index("refresh_tokens_customer_id_idx").on(t.customerId),
    index("refresh_tokens_token_hash_idx").on(t.tokenHash),
    index("refresh_tokens_expires_at_idx").on(t.expiresAt),
  ]
);
