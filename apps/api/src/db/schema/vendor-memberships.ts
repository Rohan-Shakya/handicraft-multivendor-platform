import { pgTable, text, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { vendors } from "./vendors";

export const vendorMemberRoleEnum = pgEnum("vendor_member_role", [
  "owner",
  "admin",
  "catalog_manager",
  "content_manager",
  "support_agent",
]);

export const vendorMembershipStatusEnum = pgEnum("vendor_membership_status", [
  "invited",
  "active",
  "suspended",
  "revoked",
]);

export const vendorMemberships = pgTable(
  "vendor_memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    role: vendorMemberRoleEnum("role").notNull(),
    status: vendorMembershipStatusEnum("status").notNull().default("invited"),
    invitedBy: text("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    revokedBy: text("revoked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vendor_memberships_user_vendor_unique").on(t.userId, t.vendorId),
    index("vendor_memberships_user_idx").on(t.userId),
    index("vendor_memberships_vendor_idx").on(t.vendorId),
    index("vendor_memberships_vendor_status_idx").on(t.vendorId, t.status),
    index("vendor_memberships_user_status_idx").on(t.userId, t.status),
  ]
);
