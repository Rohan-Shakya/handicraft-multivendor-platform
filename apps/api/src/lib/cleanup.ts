/**
 * Periodic cleanup tasks — expired refresh tokens, stale sessions, etc.
 * Runs on a configurable interval inside the main process.
 */
import { lt, or, and, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { refreshTokens } from "../db/schema/index.js";
import { logger } from "./logger.js";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Delete refresh tokens that are expired or revoked more than 7 days ago.
 */
async function cleanupRefreshTokens(): Promise<number> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(refreshTokens)
    .where(
      or(
        lt(refreshTokens.expiresAt, now),
        and(
          isNotNull(refreshTokens.revokedAt),
          lt(refreshTokens.revokedAt, sevenDaysAgo)
        )
      )
    )
    .returning({ id: refreshTokens.id });

  return result.length;
}

async function runCleanup(): Promise<void> {
  try {
    const deleted = await cleanupRefreshTokens();
    if (deleted > 0) {
      logger.info({ deleted }, "Cleaned up expired/revoked refresh tokens");
    }
  } catch (err) {
    logger.error({ err }, "Refresh token cleanup failed");
  }
}

/**
 * Start the periodic cleanup scheduler. Call once at server startup.
 */
export function startCleanupScheduler(): void {
  // Run once immediately (delayed 30s to let server finish booting)
  setTimeout(runCleanup, 30_000);
  timer = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  logger.info("Cleanup scheduler started (interval: 1h)");
}

/**
 * Stop the cleanup scheduler gracefully.
 */
export function stopCleanupScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
