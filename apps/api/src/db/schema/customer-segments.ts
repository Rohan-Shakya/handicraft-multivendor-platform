import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
  index,
  uniqueIndex,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers";

export const customerSegmentTypeEnum = pgEnum("customer_segment_type", [
  "dynamic",
  "manual",
  "system",
]);

export const customerSegmentStatusEnum = pgEnum("customer_segment_status", ["active", "archived"]);

export const customerSegments = pgTable(
  "customer_segments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: customerSegmentTypeEnum("type").notNull().default("dynamic"),
    status: customerSegmentStatusEnum("status").notNull().default("active"),
    description: text("description"),
    ruleJson: jsonb("rule_json"),
    isSystem: boolean("is_system").notNull().default(false),
    customerCount: integer("customer_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("customer_segments_slug_unique").on(t.slug).where(sql`${t.deletedAt} IS NULL`),
    index("customer_segments_status_idx").on(t.status),
    index("customer_segments_type_idx").on(t.type),
    index("customer_segments_deleted_at_idx").on(t.deletedAt),
  ]
);

export const customerSegmentMembers = pgTable(
  "customer_segment_members",
  {
    segmentId: text("segment_id")
      .notNull()
      .references(() => customerSegments.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.segmentId, t.customerId], name: "customer_segment_members_pk" }),
    index("customer_segment_members_segment_idx").on(t.segmentId),
    index("customer_segment_members_customer_idx").on(t.customerId),
  ]
);
