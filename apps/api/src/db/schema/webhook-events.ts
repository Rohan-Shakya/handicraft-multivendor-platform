import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  index,
  uniqueIndex,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const webhookEndpointStatusEnum = pgEnum("webhook_endpoint_status", ["active", "disabled"]);

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "processing",
  "delivered",
  "failed",
  "retrying",
  "dead",
]);

export const webhookEventStatusEnum = pgEnum("webhook_event_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: text("id").primaryKey(),
    targetUrl: text("target_url").notNull(),
    secret: text("secret").notNull(),
    status: webhookEndpointStatusEnum("status").notNull().default("active"),
    description: text("description"),
    subscribedEvents: text("subscribed_events")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("webhook_endpoints_status_idx").on(t.status),
    index("webhook_endpoints_deleted_at_idx").on(t.deletedAt),
  ]
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").notNull(),
    status: webhookEventStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("webhook_events_event_type_idx").on(t.eventType),
    index("webhook_events_entity_idx").on(t.entityType, t.entityId),
    index("webhook_events_status_idx").on(t.status),
    index("webhook_events_created_at_idx").on(t.createdAt),
  ]
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => webhookEvents.id, { onDelete: "cascade" }),
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    status: webhookDeliveryStatusEnum("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    requestHeaders: jsonb("request_headers"),
    requestBody: jsonb("request_body"),
    responseStatusCode: integer("response_status_code"),
    responseHeaders: jsonb("response_headers"),
    responseBody: text("response_body"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("webhook_deliveries_event_endpoint_unique").on(t.eventId, t.endpointId),
    index("webhook_deliveries_endpoint_id_idx").on(t.endpointId),
    index("webhook_deliveries_status_idx").on(t.status),
    index("webhook_deliveries_next_retry_at_idx").on(t.nextRetryAt),
    check("webhook_deliveries_attempt_count_nonnegative_chk", sql`${t.attemptCount} >= 0`),
    check(
      "webhook_deliveries_response_status_code_valid_chk",
      sql`${t.responseStatusCode} IS NULL OR (${t.responseStatusCode} >= 100 AND ${t.responseStatusCode} <= 599)`
    ),
  ]
);
