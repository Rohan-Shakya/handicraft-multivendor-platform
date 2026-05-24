import { eq, and, isNull, desc, sql } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import {
  webhookEndpoints,
  webhookEvents,
  webhookDeliveries,
} from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { assertSafeOutboundUrl } from "../../lib/url-safety.js";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateEndpointDto {
  targetUrl: string;
  secret: string;
  description?: string;
  subscribedEvents?: string[];
}

export interface UpdateEndpointDto {
  targetUrl?: string;
  secret?: string;
  description?: string;
  subscribedEvents?: string[];
  status?: "active" | "disabled";
}

export interface ListEventsFilters {
  eventType?: string;
  entityType?: string;
  entityId?: string;
  status?: "pending" | "processing" | "completed" | "failed";
  limit?: number;
  offset?: number;
}

// ─── Webhook Endpoints ───────────────────────────────────────────────────────

export async function createEndpoint(actor: AuthActor, data: CreateEndpointDto) {
  assertPermission(actor, "webhook:manage:any");

  // SSRF guard: reject loopback/private/link-local/cloud-metadata targets.
  await assertSafeOutboundUrl(data.targetUrl);

  const id = generateId();
  const [endpoint] = await db
    .insert(webhookEndpoints)
    .values({
      id,
      targetUrl: data.targetUrl,
      secret: data.secret,
      description: data.description ?? null,
      subscribedEvents: data.subscribedEvents ?? [],
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "webhook_endpoint",
    entityId: id,
    action: "webhook_endpoint.created",
    afterJson: endpoint,
  });

  return endpoint!;
}

export async function listEndpoints(actor: AuthActor) {
  assertPermission(actor, "webhook:manage:any");

  return db
    .select()
    .from(webhookEndpoints)
    .where(isNull(webhookEndpoints.deletedAt))
    .orderBy(desc(webhookEndpoints.createdAt));
}

export async function getEndpoint(actor: AuthActor, endpointId: string) {
  assertPermission(actor, "webhook:manage:any");

  const [endpoint] = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(eq(webhookEndpoints.id, endpointId), isNull(webhookEndpoints.deletedAt))
    );

  if (!endpoint) throw new NotFoundError("Webhook endpoint not found");
  return endpoint;
}

export async function updateEndpoint(
  actor: AuthActor,
  endpointId: string,
  data: UpdateEndpointDto
) {
  assertPermission(actor, "webhook:manage:any");

  const [existing] = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(eq(webhookEndpoints.id, endpointId), isNull(webhookEndpoints.deletedAt))
    );

  if (!existing) throw new NotFoundError("Webhook endpoint not found");

  // SSRF guard on target URL changes.
  if (data.targetUrl !== undefined) {
    await assertSafeOutboundUrl(data.targetUrl);
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.targetUrl !== undefined) patch.targetUrl = data.targetUrl;
  if (data.secret !== undefined) patch.secret = data.secret;
  if (data.description !== undefined) patch.description = data.description;
  if (data.subscribedEvents !== undefined) patch.subscribedEvents = data.subscribedEvents;
  if (data.status !== undefined) patch.status = data.status;

  const [updated] = await db
    .update(webhookEndpoints)
    .set(patch as never)
    .where(eq(webhookEndpoints.id, endpointId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "webhook_endpoint",
    entityId: endpointId,
    action: "webhook_endpoint.updated",
    beforeJson: existing,
    afterJson: updated,
  });

  return updated!;
}

export async function deleteEndpoint(actor: AuthActor, endpointId: string) {
  assertPermission(actor, "webhook:manage:any");

  const [existing] = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(eq(webhookEndpoints.id, endpointId), isNull(webhookEndpoints.deletedAt))
    );

  if (!existing) throw new NotFoundError("Webhook endpoint not found");

  const [deleted] = await db
    .update(webhookEndpoints)
    .set({ deletedAt: new Date(), updatedAt: new Date() } as never)
    .where(eq(webhookEndpoints.id, endpointId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "webhook_endpoint",
    entityId: endpointId,
    action: "webhook_endpoint.deleted",
    beforeJson: existing,
    afterJson: deleted,
  });

  return deleted!;
}

// ─── Webhook Events ──────────────────────────────────────────────────────────

export async function listEvents(actor: AuthActor, filters: ListEventsFilters) {
  assertPermission(actor, "webhook:manage:any");

  const conditions = [];
  if (filters.eventType) conditions.push(eq(webhookEvents.eventType, filters.eventType));
  if (filters.entityType) conditions.push(eq(webhookEvents.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(webhookEvents.entityId, filters.entityId));
  if (filters.status) conditions.push(eq(webhookEvents.status, filters.status));

  const limit = Math.min(filters.limit ?? 50, 100);
  const offset = filters.offset ?? 0;

  const query = db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

export async function getEventWithDeliveries(actor: AuthActor, eventId: string) {
  assertPermission(actor, "webhook:manage:any");

  const [event] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, eventId));

  if (!event) throw new NotFoundError("Webhook event not found");

  const deliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.eventId, eventId))
    .orderBy(desc(webhookDeliveries.createdAt));

  return { ...event, deliveries };
}

// ─── Redelivery ──────────────────────────────────────────────────────────────

export async function queueRedelivery(actor: AuthActor, eventId: string) {
  assertPermission(actor, "webhook:manage:any");

  const [event] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, eventId));

  if (!event) throw new NotFoundError("Webhook event not found");

  const activeEndpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.status, "active"),
        isNull(webhookEndpoints.deletedAt)
      )
    );

  const subscribedEndpoints = activeEndpoints.filter(
    (ep) =>
      ep.subscribedEvents.length === 0 ||
      ep.subscribedEvents.includes(event.eventType)
  );

  const deliveries = [];
  for (const endpoint of subscribedEndpoints) {
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        id: generateId(),
        eventId,
        endpointId: endpoint.id,
        status: "pending",
        attemptCount: 0,
      })
      .onConflictDoUpdate({
        target: [webhookDeliveries.eventId, webhookDeliveries.endpointId],
        set: {
          status: "pending" as const,
          attemptCount: 0,
          nextRetryAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();

    deliveries.push(delivery!);
  }

  await db
    .update(webhookEvents)
    .set({ status: "pending", processedAt: null } as never)
    .where(eq(webhookEvents.id, eventId));

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "webhook_event",
    entityId: eventId,
    action: "webhook_event.redelivery_queued",
    metadata: { endpointCount: deliveries.length },
  });

  return { eventId, deliveriesQueued: deliveries.length, deliveries };
}
