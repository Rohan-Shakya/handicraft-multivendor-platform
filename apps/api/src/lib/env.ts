/**
 * Environment configuration — validates all env vars at startup using Zod.
 * Import `env` instead of using `process.env` directly.
 */
import { z } from "zod";

const envSchema = z.object({
  // ── Core ──────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  /**
   * Process role: `web` runs HTTP only, `worker` runs queues + scheduler only,
   * `all` (default) runs everything in one process. In production, run web and
   * worker as separate replicas so they scale independently and the scheduler
   * runs in exactly one place.
   */
  PROCESS_MODE: z.enum(["web", "worker", "all"]).default("all"),

  // ── Database ──────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),

  // ── Auth ───────────────────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  /** HMAC secret for double-submit CSRF tokens. Falls back to JWT_SECRET. */
  CSRF_SECRET: z.string().min(16).optional(),
  /** Global HMAC secret for signing outbound webhooks. */
  WEBHOOK_SIGNING_SECRET: z.string().optional(),

  // ── Observability ─────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
  /** Sentry DSN — when set, unhandled errors are captured. */
  SENTRY_DSN: z.string().optional(),
  /** Environment tag passed to Sentry (prod / staging / preview). */
  SENTRY_ENVIRONMENT: z.string().optional(),
  /** 0..1 sample rate for Sentry performance spans. */
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  /** Shared bearer token for /metrics scrape endpoint. Optional. */
  METRICS_AUTH_TOKEN: z.string().optional(),

  // ── Redis ──────────────────────────────────────────────────────────────────
  REDIS_URL: z.string().default("redis://localhost:6380"),

  // ── Cloudflare R2 ──────────────────────────────────────────────────────────
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // ── SMTP ───────────────────────────────────────────────────────────────────
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Store <noreply@example.com>"),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // ── CORS / URLs ────────────────────────────────────────────────────────────
  STOREFRONT_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_STOREFRONT_URL: z.string().default("http://localhost:3000"),
  VITE_ADMIN_URL: z.string().default("http://localhost:5173"),

  // ── Payment Providers ──────────────────────────────────────────────────────
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // eSewa
  ESEWA_MERCHANT_CODE: z.string().optional(),
  ESEWA_SECRET_KEY: z.string().optional(),
  ESEWA_GATEWAY_URL: z.string().default("https://rc-epay.esewa.com.np"),

  // Khalti
  KHALTI_SECRET_KEY: z.string().optional(),
  KHALTI_GATEWAY_URL: z.string().default("https://a.khalti.com"),

  // Fonepay
  FONEPAY_MERCHANT_CODE: z.string().optional(),
  FONEPAY_SECRET_KEY: z.string().optional(),
  FONEPAY_GATEWAY_URL: z.string().default("https://clientapi.fonepay.com"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Parse and validate environment variables. Call once at startup.
 * Throws a clear error if required variables are missing.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  _env = result.data;
  return _env;
}

/**
 * Get the validated environment. Throws if `validateEnv()` hasn't been called.
 */
export function getEnv(): Env {
  if (!_env) {
    throw new Error("Environment not validated. Call validateEnv() at startup.");
  }
  return _env;
}
