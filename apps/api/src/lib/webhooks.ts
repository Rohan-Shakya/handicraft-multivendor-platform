import crypto from "crypto";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { logger } from "./logger.js";
import { db, type DbOrTx } from "../db/index.js";
import {
  webhookEndpoints,
  webhookEvents,
  webhookDeliveries,
} from "../db/schema/index.js";
import { generateId } from "./id.js";

export interface WebhookPayload {
  topic: string; // e.g. "order.created", "order.paid", "fulfillment.created"
  entityType: string; // "order", "customer", "product", etc.
  entityId: string;
  data: Record<string, unknown>;
}

/**
 * Transactional outbox: insert a `webhook_events` row inside the caller's
 * existing transaction. The row stays `status=pending` until the outbox
 * drainer (scheduled job) picks it up, finds matching subscribed endpoints,
 * and enqueues per-endpoint delivery jobs to BullMQ.
 *
 * This guarantees "if the business write commits, the event will be delivered
 * (eventually)" — the classic Stripe/Shopify outbox pattern. Crashes between
 * commit and BullMQ enqueue can no longer drop events.
 *
 * Use this anywhere you'd previously call `fireWebhook(...)` *inside* a
 * `db.transaction(async (tx) => ...)` block. After the tx commits, the
 * drainer takes over.
 */
export async function enqueueOutboxEvent(
  tx: DbOrTx,
  payload: WebhookPayload
): Promise<string> {
  const eventId = generateId();
  await tx.insert(webhookEvents).values({
    id: eventId,
    eventType: payload.topic,
    entityType: payload.entityType,
    entityId: payload.entityId,
    payload: payload.data,
    status: "pending",
  });
  return eventId;
}

/**
 * Drain pending events from the outbox: find subscribed endpoints, enqueue
 * BullMQ delivery jobs, mark events as `processing`. Idempotent — only
 * claims rows still in `pending` state via an UPDATE…RETURNING gate.
 *
 * Called by the scheduler every few seconds. Bounded batch size keeps tail
 * latency low and protects Redis/Postgres if a backlog accumulates.
 */
export async function drainOutbox(batchSize = 100): Promise<number> {
  // Atomic claim: flip `pending` → `processing` and return the rows we won.
  // If the drainer runs in two replicas (it shouldn't, but defense in depth),
  // each row goes to exactly one of them.
  const claimed = await db
    .update(webhookEvents)
    .set({ status: "processing" })
    .where(
      inArray(
        webhookEvents.id,
        db
          .select({ id: webhookEvents.id })
          .from(webhookEvents)
          .where(eq(webhookEvents.status, "pending"))
          .limit(batchSize)
      )
    )
    .returning();

  if (claimed.length === 0) return 0;

  // Active endpoint set (cached per drain — endpoints rarely change vs. event volume).
  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(eq(webhookEndpoints.status, "active"), isNull(webhookEndpoints.deletedAt))
    );

  let queue: import("bullmq").Queue | null = null;
  try {
    const { getWebhookQueue } = await import("./queue.js");
    queue = getWebhookQueue();
  } catch {
    // queue unavailable
  }

  let dispatched = 0;
  for (const event of claimed) {
    const matched = endpoints.filter((ep) => {
      const subscribed = ep.subscribedEvents as string[];
      return subscribed.includes(event.eventType) || subscribed.includes("*");
    });

    if (matched.length === 0) {
      // No subscribers — finalize as "completed" so we don't keep re-scanning.
      await db
        .update(webhookEvents)
        .set({ status: "completed", processedAt: new Date() })
        .where(eq(webhookEvents.id, event.id))
        .catch(() => {});
      continue;
    }

    if (!queue) {
      // BullMQ not initialized — release the row back to `pending` so the
      // next drainer tick can re-claim once the queue is up. Marking it
      // `failed` here would silently lose the event with no recovery path.
      await db
        .update(webhookEvents)
        .set({ status: "pending" })
        .where(eq(webhookEvents.id, event.id))
        .catch(() => {});
      continue;
    }

    for (const ep of matched) {
      await queue.add("deliver-webhook", {
        eventId: event.id,
        endpointId: ep.id,
        targetUrl: ep.targetUrl,
        secret: ep.secret,
        payload: {
          id: event.id,
          topic: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          data: event.payload as Record<string, unknown>,
          timestamp: (event.createdAt ?? new Date()).toISOString(),
        },
      });
    }
    dispatched++;
  }

  return dispatched;
}

/**
 * Fire a webhook event. This is fire-and-forget — errors are logged, not thrown.
 * Call this after any significant domain event.
 */
export async function fireWebhook(payload: WebhookPayload): Promise<void> {
  try {
    const endpoints = await db
      .select()
      .from(webhookEndpoints)
      .where(
        and(eq(webhookEndpoints.status, "active"), isNull(webhookEndpoints.deletedAt))
      );

    const matched = endpoints.filter((ep) => {
      const subscribed = ep.subscribedEvents as string[];
      return subscribed.includes(payload.topic) || subscribed.includes("*");
    });

    if (matched.length === 0) return;

    const eventId = generateId();
    await db.insert(webhookEvents).values({
      id: eventId,
      eventType: payload.topic,
      entityType: payload.entityType,
      entityId: payload.entityId,
      payload: payload.data,
      status: "pending",
    });

    let queue: import("bullmq").Queue | null = null;
    try {
      const { getWebhookQueue } = await import("./queue.js");
      queue = getWebhookQueue();
    } catch {
      // Queue not available — fall back to direct delivery
    }

    for (const ep of matched) {
      if (queue) {
        await queue.add("deliver-webhook", {
          eventId,
          endpointId: ep.id,
          targetUrl: ep.targetUrl,
          secret: ep.secret,
          payload: {
            id: eventId,
            topic: payload.topic,
            entityType: payload.entityType,
            entityId: payload.entityId,
            data: payload.data,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        // Fallback: direct delivery without retry
        deliverToEndpoint(eventId, ep, payload).catch(() => {});
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to fire webhook");
  }
}

async function deliverToEndpoint(
  eventId: string,
  endpoint: typeof webhookEndpoints.$inferSelect,
  payload: WebhookPayload
) {
  const deliveryId = generateId();
  const timestamp = Math.floor(Date.now() / 1000);
  const bodyObj = {
    id: eventId,
    topic: payload.topic,
    entityType: payload.entityType,
    entityId: payload.entityId,
    data: payload.data,
    timestamp: new Date(timestamp * 1000).toISOString(),
  };
  const body = JSON.stringify(bodyObj);

  // HMAC-SHA256 signature — include the unix timestamp in the signed payload
  // so receivers can reject old/replayed deliveries (Stripe-style).
  const signingString = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac("sha256", endpoint.secret)
    .update(signingString)
    .digest("hex");

  const requestHeaders = {
    "Content-Type": "application/json",
    "X-Webhook-Signature": `t=${timestamp},v1=${signature}`,
    "X-Webhook-Id": eventId,
    "X-Webhook-Topic": payload.topic,
    "X-Webhook-Timestamp": String(timestamp),
  };

  let status: "delivered" | "failed" = "delivered";
  let responseStatusCode: number | null = null;
  let responseBody = "";
  let responseHeaders: Record<string, string> = {};

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(endpoint.targetUrl, {
      method: "POST",
      headers: requestHeaders,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatusCode = res.status;
    responseBody = await res.text().catch(() => "");
    responseHeaders = Object.fromEntries(res.headers.entries());

    if (!res.ok) status = "failed";
  } catch (err: any) {
    status = "failed";
    responseBody = err.message ?? "Connection failed";
  }

  await db
    .insert(webhookDeliveries)
    .values({
      id: deliveryId,
      eventId,
      endpointId: endpoint.id,
      status,
      attemptCount: 1,
      requestHeaders,
      requestBody: bodyObj,
      responseStatusCode,
      responseHeaders: Object.keys(responseHeaders).length > 0 ? responseHeaders : null,
      responseBody: responseBody.slice(0, 5000),
      lastAttemptAt: new Date(),
      deliveredAt: status === "delivered" ? new Date() : null,
    })
    .catch((err) => {
      logger.error({ err }, "Failed to record webhook delivery");
    });

  const eventStatus = status === "delivered" ? "completed" : "failed";
  await db
    .update(webhookEvents)
    .set({ status: eventStatus, processedAt: new Date() })
    .where(eq(webhookEvents.id, eventId))
    .catch(() => {});
}

/**
 * Verify an inbound webhook signature. Useful for consumers of our own
 * webhooks (including tests) — exported so SDK authors can import it.
 *
 * Accepts the Stripe-style `t=…,v1=…` signature format. Rejects signatures
 * older than `toleranceSeconds` (default 5 min) to block replay attacks.
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  secret: string;
  toleranceSeconds?: number;
}): { valid: boolean; reason?: string } {
  const { rawBody, signatureHeader, secret, toleranceSeconds = 300 } = params;
  if (!signatureHeader) return { valid: false, reason: "missing_signature" };

  const parts = signatureHeader.split(",").reduce<Record<string, string>>(
    (acc, kv) => {
      const [k, v] = kv.trim().split("=");
      if (k && v) acc[k] = v;
      return acc;
    },
    {}
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return { valid: false, reason: "malformed_signature" };

  const ts = parseInt(t, 10);
  if (!Number.isFinite(ts)) return { valid: false, reason: "malformed_timestamp" };
  const ageSeconds = Math.floor(Date.now() / 1000) - ts;
  if (ageSeconds > toleranceSeconds) {
    return { valid: false, reason: "timestamp_out_of_tolerance" };
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");

  if (
    expected.length !== v1.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  ) {
    return { valid: false, reason: "signature_mismatch" };
  }
  return { valid: true };
}
