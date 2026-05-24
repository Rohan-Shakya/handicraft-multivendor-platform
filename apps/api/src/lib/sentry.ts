/**
 * Lightweight Sentry wrapper.
 *
 * We support Sentry via a tiny facade so:
 *   1. The codebase depends on `@sentry/node` only when the env var is set.
 *   2. Unit tests never touch the network.
 *   3. Errors are always logged locally regardless of Sentry availability.
 *
 * Usage:
 *   await initSentry({ dsn, environment, tracesSampleRate });
 *   captureError(err, { requestId, route });
 */
import { logger } from "./logger.js";

/**
 * Minimal Sentry surface so we can load `@sentry/node` dynamically and keep
 * it as an optional dependency. Apps that want error reporting add
 * `@sentry/node` to their own package.json.
 */
interface SentryModule {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
  flush: (timeout?: number) => Promise<boolean>;
}

let sentry: SentryModule | null = null;

export async function initSentry(opts: {
  dsn?: string;
  environment?: string;
  tracesSampleRate?: number;
  release?: string;
}): Promise<void> {
  if (!opts.dsn) {
    logger.debug("Sentry DSN not set, error reporting disabled");
    return;
  }
  try {
    // Dynamic import behind a string literal so the TypeScript compiler
    // doesn't insist on the module being present at type-check time. Callers
    // only need @sentry/node installed at runtime.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const mod = (await (new Function("m", "return import(m)"))(
      "@sentry/node"
    )) as SentryModule;
    sentry = mod;
    sentry.init({
      dsn: opts.dsn,
      environment: opts.environment ?? process.env.NODE_ENV ?? "production",
      tracesSampleRate: opts.tracesSampleRate ?? 0,
      release: opts.release,
    });
    logger.info(
      { environment: opts.environment },
      "Sentry initialized"
    );
  } catch (err) {
    // If @sentry/node isn't installed, surface a helpful warning and continue.
    logger.warn(
      { err: (err as Error).message },
      "Sentry DSN provided but @sentry/node is not installed — skipping"
    );
  }
}

/**
 * Capture an exception with optional tags. Never throws — failure to report
 * shouldn't surface as a user-visible error.
 */
export function captureError(
  err: unknown,
  tags: Record<string, string | number | boolean | undefined> = {}
): void {
  // Always log locally so we don't lose the error if Sentry is down.
  logger.error({ err, ...tags }, "captured.error");

  if (!sentry) return;
  try {
    sentry.captureException(err, {
      tags: Object.fromEntries(
        Object.entries(tags).map(([k, v]) => [k, String(v ?? "")])
      ),
    });
  } catch {
    // Don't let error-reporting itself fail the request.
  }
}

/**
 * Best-effort flush — called during graceful shutdown so queued events
 * aren't lost before the process exits.
 */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!sentry) return;
  try {
    await sentry.flush(timeoutMs);
  } catch {
    /* noop */
  }
}
