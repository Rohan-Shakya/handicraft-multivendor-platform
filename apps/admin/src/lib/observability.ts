/**
 * Client-side observability façade.
 *
 * Wraps:
 *   - Sentry (optional — loads via string-eval dynamic import so bundlers
 *     don't insist on the package being present)
 *   - A `trackEvent` dataLayer pusher (Segment / PostHog / GA compatible)
 *
 * Every error handler in the app should pipe through `captureError` so ops
 * teams get consistent telemetry shape regardless of backend.
 */

interface SentryLike {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
  flush: (timeout?: number) => Promise<boolean>;
}

let sentry: SentryLike | null = null;

export async function initObservability(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  try {
    const dynamicImport = new Function("m", "return import(m)") as (
      m: string
    ) => Promise<SentryLike>;
    const mod = await dynamicImport("@sentry/react");
    mod.init({
      dsn,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
      replaysSessionSampleRate: Number(
        import.meta.env.VITE_SENTRY_REPLAYS_SAMPLE_RATE ?? 0
      ),
    });
    sentry = mod;
  } catch {
    // Optional dep not installed — continue without Sentry.
  }
}

export function captureError(
  err: unknown,
  tags: Record<string, string | number | boolean | undefined> = {}
): void {
  // Always log locally so dev tools show the error.
  // eslint-disable-next-line no-console
  console.error("[admin.error]", err, tags);
  if (!sentry) return;
  try {
    sentry.captureException(err, { tags });
  } catch {
    /* never throw from error handlers */
  }
}

// ── Lightweight analytics ──────────────────────────────────────────────────

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AdminEvent =
  | "page_view"
  | "login"
  | "logout"
  | "search"
  | "bulk_action"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "import"
  | "error_shown";

export function trackEvent(
  event: AdminEvent,
  payload: Record<string, unknown> = {}
) {
  const entry = { event, scope: "admin", ...payload, ts: Date.now() };
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(entry);
    if (typeof window.gtag === "function") {
      window.gtag("event", event, payload);
    }
  }
  if (import.meta.env.DEV && import.meta.env.VITE_ANALYTICS_DEBUG === "1") {
    // eslint-disable-next-line no-console
    console.debug("[admin.track]", event, payload);
  }
}
