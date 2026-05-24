/**
 * Interval-based scheduler with Redis leader-election per tick.
 *
 * Each tick acquires a Redis lock keyed on the job name with a TTL slightly
 * shorter than the interval. Only the replica that gets the lock runs the
 * job — duplicates in larger deploys are no longer a problem. If Redis is
 * unavailable, falls back to single-process mode (warns once).
 *
 * For best results in production, run the scheduler in the dedicated `worker`
 * process (see `apps/api/src/worker.ts`) so it never blocks HTTP request
 * handlers.
 */
import { logger } from "./logger.js";
import { acquireLock, releaseLock, isRedisConnected } from "./redis.js";

interface ScheduledJob {
  name: string;
  intervalMs: number;
  fn: () => Promise<void> | void;
  running?: boolean;
  timer?: ReturnType<typeof setInterval>;
}

const jobs: ScheduledJob[] = [];
let warnedNoRedis = false;

/**
 * Register a scheduled job. Jobs are registered at import time; call
 * `startScheduler()` once from `start()` to kick them off.
 */
export function scheduleJob(
  name: string,
  intervalMs: number,
  fn: ScheduledJob["fn"]
) {
  jobs.push({ name, intervalMs, fn });
}

export function startScheduler() {
  for (const job of jobs) {
    // Kick once at boot (fire-and-forget) so first-run latency is low.
    void safeInvoke(job);
    job.timer = setInterval(() => {
      void safeInvoke(job);
    }, job.intervalMs);
    // Don't keep the event loop alive solely because of the interval.
    job.timer.unref?.();
    logger.info({ job: job.name, intervalMs: job.intervalMs }, "scheduler.job.registered");
  }
}

export function stopScheduler() {
  for (const job of jobs) {
    if (job.timer) clearInterval(job.timer);
    job.timer = undefined;
  }
}

async function safeInvoke(job: ScheduledJob) {
  if (job.running) {
    logger.debug({ job: job.name }, "scheduler.tick.skipped (still running)");
    return;
  }

  // Cluster-safe: try to win the lock for this tick. TTL is interval - 5s
  // (clamped to a sane minimum) so a crashed holder can't block the next run.
  const lockTtl = Math.max(5_000, job.intervalMs - 5_000);
  let token: string | null = null;
  if (isRedisConnected()) {
    token = await acquireLock(`scheduler:${job.name}`, lockTtl);
    if (!token) {
      logger.debug({ job: job.name }, "scheduler.tick.skipped (lock held by peer)");
      return;
    }
  } else if (!warnedNoRedis) {
    logger.warn("Scheduler running without Redis lock — DO NOT run multiple replicas");
    warnedNoRedis = true;
  }

  job.running = true;
  const startedAt = Date.now();
  try {
    await job.fn();
    logger.info(
      { job: job.name, durationMs: Date.now() - startedAt },
      "scheduler.tick.completed"
    );
  } catch (err) {
    logger.error({ err, job: job.name }, "scheduler.tick.failed");
  } finally {
    job.running = false;
    if (token) await releaseLock(`scheduler:${job.name}`, token);
  }
}
