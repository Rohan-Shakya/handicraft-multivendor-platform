import { pgTable, text, timestamp, index, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { vendors } from "./vendors";

export const apiKeyStatusEnum = pgEnum("api_key_status", [
  "active",
  "revoked",
]);

/**
 * Hashed API keys for server-to-server integrations.
 *
 * The plaintext key is shown only once at creation; we store a SHA-256 hash so
 * leaked database dumps can't be replayed against the API. Keys are scoped to
 * a vendor AND a set of permission strings (same RBAC vocabulary as JWT
 * actors). Revocation is a timestamp so we can audit when/why.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    /** SHA-256 hex of the issued plaintext key. */
    keyHash: text("key_hash").notNull().unique(),
    /** First 8 characters of the plaintext key for visual identification. */
    keyPrefix: text("key_prefix").notNull(),
    /** Human label shown in admin. */
    name: text("name").notNull(),
    /** If vendor-scoped, this is the vendor id. Null means platform admin. */
    vendorId: text("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
    /** The admin user that created the key — for audit trail. */
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    /** Array of permission strings ("product:read:any", "order:write:own", …). */
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    status: apiKeyStatusEnum("status").notNull().default("active"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("api_keys_key_hash_idx").on(t.keyHash),
    index("api_keys_vendor_id_idx").on(t.vendorId),
    index("api_keys_status_idx").on(t.status),
  ]
);
