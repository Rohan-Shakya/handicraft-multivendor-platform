/**
 * Worker process — runs BullMQ workers + the leader-elected scheduler, with
 * NO HTTP listener. Deploy as a separate replica from the web tier so each
 * scales independently and the scheduler runs in exactly one place.
 *
 *   PROCESS_MODE=worker node dist/worker.js
 *
 * For local dev / docker-compose single-process setups, use `index.ts` with
 * the default `PROCESS_MODE=all`, which runs both web and workers in one
 * process.
 */
import { config } from "dotenv";
config();

import { validateEnv } from "./lib/env.js";
const env = validateEnv();

import { logger } from "./lib/logger.js";
import { initRedis, closeRedis } from "./lib/redis.js";
import { initQueues, closeQueues } from "./lib/queue.js";
import { initSentry, captureError, flushSentry } from "./lib/sentry.js";
import { initMetrics } from "./lib/metrics.js";
import { startEmailWorker, stopEmailWorker } from "./workers/email.worker.js";
import { startWebhookWorker, stopWebhookWorker } from "./workers/webhook.worker.js";
import { startCleanupScheduler, stopCleanupScheduler } from "./lib/cleanup.js";
import { registerScheduledJobs } from "./lib/scheduled-jobs.js";
import { startScheduler, stopScheduler } from "./lib/scheduler.js";

async function main() {
  initMetrics();

  await initSentry({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  const redisOk = await initRedis(env.REDIS_URL);
  if (!redisOk) {
    logger.fatal("Worker process requires Redis — exiting");
    process.exit(1);
  }
  initQueues();

  startEmailWorker(env.REDIS_URL);
  startWebhookWorker(env.REDIS_URL);
  startCleanupScheduler();
  registerScheduledJobs();
  startScheduler();

  logger.info({ mode: env.PROCESS_MODE }, "[WORKER] ready");

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "[WORKER] shutting down");

    const killTimer = setTimeout(() => {
      logger.fatal("[WORKER] shutdown deadline exceeded, forcing exit");
      process.exit(1);
    }, 15_000);
    killTimer.unref();

    try {
      stopCleanupScheduler();
      stopScheduler();
      await Promise.all([
        stopEmailWorker(),
        stopWebhookWorker(),
      ]);
      await closeQueues();
      await closeRedis();
      await flushSentry();
      clearTimeout(killTimer);
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "[WORKER] error during shutdown");
      clearTimeout(killTimer);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "[WORKER] unhandled.promise.rejection");
    captureError(reason, { kind: "unhandledRejection", proc: "worker" });
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "[WORKER] uncaught.exception");
    captureError(err, { kind: "uncaughtException", proc: "worker" });
  });
}

main().catch((err) => {
  logger.fatal({ err }, "[WORKER] failed to start");
  process.exit(1);
});
