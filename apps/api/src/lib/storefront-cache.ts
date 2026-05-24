/**
 * Storefront cache invalidation.
 *
 * After an admin mutation we POST to the storefront's `/api/revalidate`
 * endpoint so its Next.js Data Cache drops the affected tags. The call is
 * fire-and-forget: a slow or down storefront must not block the API
 * response. If we can't reach the storefront the cached entry will still
 * expire on its TTL, so missing the revalidate is degraded but safe.
 */

import { logger } from "./logger.js";

const STOREFRONT_URL =
  process.env.STOREFRONT_URL ?? "http://localhost:3000";
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? "";

interface RevalidatePayload {
  tags?: string[];
  paths?: string[];
}

export function revalidateStorefront(payload: RevalidatePayload): void {
  // No secret configured → skip silently. Local dev without a configured
  // storefront shouldn't spam error logs every time a vendor edits a
  // product.
  if (!REVALIDATE_SECRET) return;
  if (!payload.tags?.length && !payload.paths?.length) return;

  // Don't `await` — invalidation is fire-and-forget. We swallow failures so
  // the calling mutation can return on its happy path immediately.
  void fetch(`${STOREFRONT_URL}/api/revalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-revalidate-secret": REVALIDATE_SECRET,
    },
    body: JSON.stringify(payload),
    // Short timeout — if the storefront is wedged, drop and move on.
    signal: AbortSignal.timeout(2000),
  }).catch((err) => {
    logger.warn(
      { err: (err as Error).message, payload },
      "storefront revalidate failed"
    );
  });
}
