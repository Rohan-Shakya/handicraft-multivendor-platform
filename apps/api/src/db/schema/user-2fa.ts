import { pgTable, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const user2fa = pgTable(
  "user_2fa",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Encrypted TOTP secret */
    secret: text("secret").notNull(),
    /** Whether 2FA is verified and active */
    isEnabled: boolean("is_enabled").notNull().default(false),
    /** Hashed backup codes for recovery */
    backupCodes: jsonb("backup_codes").$type<string[]>().notNull().default([]),
    /** Number of backup codes used */
    backupCodesUsed: jsonb("backup_codes_used").$type<string[]>().notNull().default([]),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("user_2fa_user_id_idx").on(t.userId),
  ]
);
