import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  index,
  uniqueIndex,
  numeric,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendors } from "./vendors";
import { users } from "./users";

export const fileKindEnum = pgEnum("file_kind", ["image", "video", "document", "audio", "other"]);

export const fileStatusEnum = pgEnum("file_status", ["active", "archived", "deleted"]);

export const fileScopeEnum = pgEnum("file_scope", ["platform", "vendor"]);

export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey(),
    scope: fileScopeEnum("scope").notNull().default("vendor"),
    vendorId: text("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    kind: fileKindEnum("kind").notNull().default("image"),
    status: fileStatusEnum("status").notNull().default("active"),
    originalName: text("original_name").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type"),
    extension: text("extension"),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    altText: text("alt_text"),
    sizeBytes: integer("size_bytes"),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: numeric("duration_seconds", { precision: 10, scale: 2 }),
    checksum: text("checksum"),
    uploadedBy: text("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("files_storage_key_unique").on(t.storageKey),
    index("files_scope_idx").on(t.scope),
    index("files_vendor_id_idx").on(t.vendorId),
    index("files_kind_idx").on(t.kind),
    index("files_status_idx").on(t.status),
    index("files_uploaded_by_idx").on(t.uploadedBy),
    index("files_deleted_at_idx").on(t.deletedAt),
    check(
      "files_scope_vendor_link_chk",
      sql`(${t.scope} = 'platform' AND ${t.vendorId} IS NULL) OR (${t.scope} = 'vendor' AND ${t.vendorId} IS NOT NULL)`
    ),
    check("files_size_bytes_nonnegative_chk", sql`${t.sizeBytes} IS NULL OR ${t.sizeBytes} >= 0`),
    check("files_width_nonnegative_chk", sql`${t.width} IS NULL OR ${t.width} >= 0`),
    check("files_height_nonnegative_chk", sql`${t.height} IS NULL OR ${t.height} >= 0`),
    check(
      "files_duration_seconds_nonnegative_chk",
      sql`${t.durationSeconds} IS NULL OR ${t.durationSeconds} >= 0`
    ),
  ]
);
