/**
 * BullMQ job queues — email, webhook.
 * All queues share the same Redis connection.
 */
import { Queue, type ConnectionOptions } from "bullmq";
import { getEnv } from "./env.js";

let emailQueue: Queue | null = null;
let webhookQueue: Queue | null = null;

function getConnection(): ConnectionOptions {
  const env = getEnv();
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
}

export function initQueues(): void {
  const connection = getConnection();

  emailQueue = new Queue("email", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 }, // 1m, 2m, 4m
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  webhookQueue = new Queue("webhook", {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 30_000 }, // 30s, 1m, 2m, 4m, 8m
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
}

export function getEmailQueue(): Queue | null {
  return emailQueue;
}

export function getWebhookQueue(): Queue | null {
  return webhookQueue;
}

/**
 * Strict variant — throws if the queue isn't initialized. Prefer this in
 * producer code where you can't proceed without a queue.
 */
export function requireEmailQueue(): Queue {
  if (!emailQueue) throw new Error("Email queue not initialized. Call initQueues() first.");
  return emailQueue;
}
export function requireWebhookQueue(): Queue {
  if (!webhookQueue) throw new Error("Webhook queue not initialized. Call initQueues() first.");
  return webhookQueue;
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    emailQueue?.close().catch(() => {}),
    webhookQueue?.close().catch(() => {}),
  ]);
  emailQueue = null;
  webhookQueue = null;
}
