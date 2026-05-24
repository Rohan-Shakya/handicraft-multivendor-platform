/**
 * Webhook delivery worker — delivers webhooks with retry and records delivery status.
 */
import { Worker, UnrecoverableError, type Job } from "bullmq";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { webhookEvents, webhookDeliveries } from "../db/schema/index.js";
import { BadRequestError } from "../lib/errors.js";
import { generateId } from "../lib/id.js";
import { logger } from "../lib/logger.js";
import { incCounter, observeHistogram } from "../lib/metrics.js";
import { assertSafeOutboundUrl } from "../lib/url-safety.js";

// Truncate captured response body so a malicious endpoint can't fill the DB
// with megabytes of attacker-chosen content per delivery attempt.
const RESPONSE_BODY_LIMIT = 2_000;
const MAX_REDIRECTS = 1;

export interface WebhookJobData {
  eventId: string;
  endpointId: string;
  targetUrl: string;
  secret: string;
  payload: {
    id: string;
    topic: string;
    entityType: string;
    entityId: string;
    data: Record<string, unknown>;
    timestamp: string;
  };
}

async function processWebhookJob(job: Job<WebhookJobData>): Promise<void> {
  const startedAt = Date.now();
  const { eventId, endpointId, targetUrl, secret, payload } = job.data;

  const body = JSON.stringify(payload);
  // Stripe-style signature: `t=<unix>,v1=<hmac>` lets receivers reject replays.
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  const requestHeaders = {
    "Content-Type": "application/json",
    "X-Webhook-Signature": `t=${timestamp},v1=${signature}`,
    "X-Webhook-Id": eventId,
    "X-Webhook-Topic": payload.topic,
    "X-Webhook-Timestamp": String(timestamp),
  };

  const deliveryId = generateId();
  let status: "delivered" | "failed" = "delivered";
  let responseStatusCode: number | null = null;
  let responseBody = "";
  let responseHeaders: Record<string, string> = {};

  try {
    // Defense in depth — DNS could have flipped between create and deliver
    // (DNS rebinding). Re-resolve and reject if it now points anywhere private.
    // Then deliver, manually following at most one redirect and re-validating
    // the redirect target.
    let url = targetUrl;
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertSafeOutboundUrl(url);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const r = await fetch(url, {
        method: "POST",
        headers: requestHeaders,
        body,
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timeout);
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
        if (hop === MAX_REDIRECTS) {
          res = r;
          break;
        }
        url = new URL(r.headers.get("location")!, url).toString();
        continue;
      }
      res = r;
      break;
    }
    if (!res) throw new Error("No response from target");

    responseStatusCode = res.status;
    const fullBody = await res.text().catch(() => "");
    responseBody = fullBody.slice(0, RESPONSE_BODY_LIMIT);
    responseHeaders = Object.fromEntries(res.headers.entries());

    if (!res.ok) {
      status = "failed";
      throw new Error(`Webhook delivery failed with status ${res.status}`);
    }
  } catch (err: any) {
    status = "failed";
    if (!responseBody) responseBody = err.message ?? "Connection failed";
    await recordDelivery(
      deliveryId,
      eventId,
      endpointId,
      status,
      job.attemptsMade + 1,
      requestHeaders,
      payload,
      responseStatusCode,
      responseHeaders,
      responseBody
    );
    // SSRF / private-IP rejections are permanent — no DNS retry will fix
    // "target is 127.0.0.1". Throw `UnrecoverableError` so BullMQ skips
    // the remaining backoff attempts.
    if (err instanceof BadRequestError) {
      throw new UnrecoverableError(`Blocked outbound URL: ${err.message}`);
    }
    throw err;
  }

  await recordDelivery(
    deliveryId,
    eventId,
    endpointId,
    status,
    job.attemptsMade + 1,
    requestHeaders,
    payload,
    responseStatusCode,
    responseHeaders,
    responseBody
  );

  await db
    .update(webhookEvents)
    .set({ status: "completed", processedAt: new Date() })
    .where(eq(webhookEvents.id, eventId))
    .catch(() => {});

  incCounter("worker_jobs_processed_total", 1, {
    queue: "webhook",
    status: "delivered",
  });
  observeHistogram("worker_job_duration_ms", Date.now() - startedAt, {
    queue: "webhook",
  });
}

async function recordDelivery(
  deliveryId: string,
  eventId: string,
  endpointId: string,
  status: "delivered" | "failed",
  attemptCount: number,
  requestHeaders: Record<string, string>,
  requestBody: Record<string, unknown>,
  responseStatusCode: number | null,
  responseHeaders: Record<string, string>,
  responseBody: string
): Promise<void> {
  await db
    .insert(webhookDeliveries)
    .values({
      id: deliveryId,
      eventId,
      endpointId,
      status,
      attemptCount,
      requestHeaders,
      requestBody,
      responseStatusCode,
      responseHeaders: Object.keys(responseHeaders).length > 0 ? responseHeaders : null,
      responseBody: responseBody.slice(0, RESPONSE_BODY_LIMIT),
      lastAttemptAt: new Date(),
      deliveredAt: status === "delivered" ? new Date() : null,
    })
    .catch((err) => {
      logger.error({ err }, "Webhook worker failed to record delivery");
    });
}

let worker: Worker | null = null;

export function startWebhookWorker(redisUrl: string): Worker {
  const url = new URL(redisUrl);
  const connection = {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };

  worker = new Worker("webhook", processWebhookJob, {
    connection,
    concurrency: 10,
  });

  worker.on("completed", (job) => {
    logger.info({ targetUrl: job.data.targetUrl }, "Webhook delivered");
  });

  worker.on("failed", (job, err) => {
    logger.error({ targetUrl: job?.data?.targetUrl, attempt: job?.attemptsMade, err }, "Webhook delivery failed");
    incCounter("worker_jobs_processed_total", 1, { queue: "webhook", status: "failed" });
  });

  return worker;
}

export async function stopWebhookWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
