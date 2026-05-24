/**
 * Per-account login lockout.
 *
 * IP-based rate limiting (10/min) protects the login endpoint as a whole but
 * doesn't stop a distributed brute-force across many IPs targeting one account.
 * This adds a second layer keyed on (actorType + emailLower):
 *
 *   - Each failed login increments a Redis counter with a sliding 15-minute TTL.
 *   - After MAX_ATTEMPTS, every login attempt for that account is rejected
 *     for the remainder of the window — regardless of which IP it came from.
 *   - A successful login clears the counter.
 *
 * If Redis is unavailable the lockout silently degrades to "no lockout"
 * (the IP rate limit still applies). This matches the pattern in
 * lib/rate-limit and `cacheGet` — degraded service beats hard failure.
 */
import { getRedis, isRedisConnected } from "./redis.js";

export type LockoutActor = "admin" | "vendor" | "customer";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

function key(actor: LockoutActor, email: string): string {
  return `auth:lockout:${actor}:${email.toLowerCase()}`;
}

/**
 * Check if the account is currently locked out. Call this BEFORE verifying
 * credentials so a locked account can't even trigger a hash comparison
 * (also defends against timing-based username enumeration).
 */
export async function isLockedOut(
  actor: LockoutActor,
  email: string
): Promise<boolean> {
  const redis = getRedis();
  if (!redis || !isRedisConnected()) return false;
  try {
    const count = await redis.get(key(actor, email));
    return count !== null && Number(count) >= MAX_ATTEMPTS;
  } catch {
    return false;
  }
}

/**
 * Record a failed login. Returns the new attempt count (1-based) and
 * whether the account is now locked.
 */
export async function recordFailedAttempt(
  actor: LockoutActor,
  email: string
): Promise<{ attempts: number; lockedOut: boolean }> {
  const redis = getRedis();
  if (!redis || !isRedisConnected()) {
    return { attempts: 0, lockedOut: false };
  }
  try {
    const k = key(actor, email);
    const attempts = await redis.incr(k);
    // Refresh TTL on every failure — a slow drip of failures still extends
    // the window, which is the safer default.
    await redis.expire(k, WINDOW_SECONDS);
    return { attempts, lockedOut: attempts >= MAX_ATTEMPTS };
  } catch {
    return { attempts: 0, lockedOut: false };
  }
}

/**
 * Clear the failure counter for an account. Call on successful login.
 */
export async function clearFailedAttempts(
  actor: LockoutActor,
  email: string
): Promise<void> {
  const redis = getRedis();
  if (!redis || !isRedisConnected()) return;
  try {
    await redis.del(key(actor, email));
  } catch {
    // ignore — best effort
  }
}

export const LOCKOUT_LIMITS = {
  MAX_ATTEMPTS,
  WINDOW_SECONDS,
} as const;
