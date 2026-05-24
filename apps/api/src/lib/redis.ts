/**
 * Redis client — singleton connection with caching helpers.
 * Falls back to no-op if Redis is unavailable (degraded mode).
 */
import { Redis } from "ioredis";
import { logger } from "./logger.js";

let redis: Redis | null = null;
let isConnected = false;

export function getRedis(): Redis | null {
  return redis;
}

export function isRedisConnected(): boolean {
  return isConnected;
}

/**
 * Initialize Redis connection. Call once at startup.
 */
export async function initRedis(url: string): Promise<boolean> {
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      // Reconnect forever with capped backoff. Returning null here ends the
      // client permanently (status -> "end"), which makes every subsequent
      // command throw "Connection is closed" — fatal for a long-lived process
      // that should self-heal across transient Redis blips.
      retryStrategy(times) {
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      if (isConnected) {
        logger.error({ err }, "Redis connection error");
        isConnected = false;
      }
    });

    redis.on("connect", () => {
      isConnected = true;
    });

    redis.on("ready", () => {
      isConnected = true;
    });

    redis.on("close", () => {
      isConnected = false;
    });

    await redis.connect();
    await redis.ping();
    isConnected = true;
    return true;
  } catch (err: any) {
    logger.warn({ err }, "Redis not available — running in degraded mode");
    redis = null;
    isConnected = false;
    return false;
  }
}

/**
 * Gracefully close Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => {});
    redis = null;
    isConnected = false;
  }
}

// ── Cache helpers ──────────────────────────────────────────────────────────────

/**
 * Get a value from cache, or fetch it and store with TTL.
 */
export async function cacheGet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!redis || !isConnected) {
    return fetcher();
  }

  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Cache read failed — fall through to fetcher
  }

  const value = await fetcher();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache write failed — non-blocking
  }

  return value;
}

/**
 * Delete a specific cache key.
 */
export async function cacheDel(key: string): Promise<void> {
  if (!redis || !isConnected) return;
  try {
    await redis.del(key);
  } catch {
    // Non-blocking
  }
}

// ── Idempotency helpers ──────────────────────────────────────────────────────
// For "at most once" semantics on mutation endpoints (e.g. checkout).
// Callers supply a client-generated idempotency key; on retry the original
// response is returned instead of re-executing the operation.

const IDEMPOTENCY_PREFIX = "idem:";
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24h

/**
 * Look up a cached response for an idempotency key. Returns null if Redis is
 * down or the key is not present.
 */
export async function idempotencyGet<T>(scope: string, key: string): Promise<T | null> {
  if (!redis || !isConnected) return null;
  try {
    const cached = await redis.get(`${IDEMPOTENCY_PREFIX}${scope}:${key}`);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch {
    return null;
  }
}

/**
 * Store a response under an idempotency key. TTL defaults to 24 hours.
 * Best-effort — does not throw if Redis is unavailable.
 */
export async function idempotencySet(
  scope: string,
  key: string,
  value: unknown,
  ttlSeconds = IDEMPOTENCY_TTL_SECONDS
): Promise<void> {
  if (!redis || !isConnected) return;
  try {
    await redis.set(
      `${IDEMPOTENCY_PREFIX}${scope}:${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds
    );
  } catch {
    // best-effort
  }
}

// ── Distributed lock (for leader-elected scheduler ticks) ───────────────────
// Single-instance, single-node lock — adequate for our use case (cron-style
// dedup across web replicas). For multi-node Redis HA, swap to Redlock.

/**
 * Acquire a short-lived lock keyed on `name`. Returns the unique token if the
 * lock was acquired (caller must pass it back to `releaseLock`), or null if
 * another holder already has it. The lock auto-expires after `ttlMs` so a
 * crashed holder cannot wedge the system.
 */
export async function acquireLock(
  name: string,
  ttlMs: number
): Promise<string | null> {
  if (!redis || !isConnected) return null;
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    // SET key value NX PX ttl  →  atomic compare-and-set with TTL
    const result = await redis.set(`lock:${name}`, token, "PX", ttlMs, "NX");
    return result === "OK" ? token : null;
  } catch {
    return null;
  }
}

/**
 * Release a lock previously acquired with `acquireLock`. Uses a Lua script so
 * a stale holder (whose lock has expired and been re-acquired by someone else)
 * cannot accidentally release the new holder's lock.
 */
export async function releaseLock(name: string, token: string): Promise<void> {
  if (!redis || !isConnected) return;
  try {
    await redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
      1,
      `lock:${name}`,
      token
    );
  } catch {
    // best-effort
  }
}

/**
 * Delete all keys matching a pattern (e.g., "product:*").
 * Uses SCAN to avoid blocking Redis.
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis || !isConnected) return;
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const pipeline = redis.pipeline();
    let count = 0;

    for await (const keys of stream) {
      for (const key of keys as string[]) {
        pipeline.del(key);
        count++;
      }
    }

    if (count > 0) {
      await pipeline.exec();
    }
  } catch {
    // Non-blocking
  }
}
