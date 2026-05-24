import { config } from "dotenv";
config();

import { validateEnv } from "./lib/env.js";

// Validate environment variables before anything else
const env = validateEnv();

import Fastify, { type FastifyError } from "fastify";
import { ZodError } from "zod";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import authPlugin from "./plugins/auth.js";
import swaggerPlugin from "./plugins/swagger.js";
import observabilityPlugin from "./plugins/observability.js";
import idempotencyPlugin from "./plugins/idempotency.js";
import csrfPlugin from "./plugins/csrf.js";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";
import { AppError } from "./lib/errors.js";
import { initRedis, closeRedis, isRedisConnected, getRedis } from "./lib/redis.js";
import {
  initQueues,
  closeQueues,
  getEmailQueue,
  getWebhookQueue,
} from "./lib/queue.js";
import { startEmailWorker, stopEmailWorker } from "./workers/email.worker.js";
import { startWebhookWorker, stopWebhookWorker } from "./workers/webhook.worker.js";
import { startCleanupScheduler, stopCleanupScheduler } from "./lib/cleanup.js";
import { initMetrics, collectMetrics, setGauge } from "./lib/metrics.js";
import { initSentry, captureError, flushSentry } from "./lib/sentry.js";
import { registerScheduledJobs } from "./lib/scheduled-jobs.js";
import { startScheduler, stopScheduler } from "./lib/scheduler.js";

import { authRoutes } from "./modules/auth/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { vendorRoutes } from "./modules/vendors/routes.js";
import { vendorKycRoutes } from "./modules/vendor-kyc/routes.js";
import { vendorAddressRoutes } from "./modules/vendor-addresses/routes.js";
import { productRoutes } from "./modules/products/routes.js";
import { collectionRoutes } from "./modules/collections/routes.js";
import { contentRoutes } from "./modules/content/routes.js";
import { customerRoutes } from "./modules/customers/routes.js";
import { cartRoutes } from "./modules/cart/routes.js";
import { checkoutRoutes } from "./modules/checkout/routes.js";
import { orderRoutes } from "./modules/orders/routes.js";
import { discountRoutes } from "./modules/discounts/routes.js";
import { paymentRoutes } from "./modules/payments/routes.js";
import { fulfillmentRoutes } from "./modules/fulfillments/routes.js";
import { refundRoutes } from "./modules/refunds/routes.js";
import { returnRoutes } from "./modules/returns/routes.js";
import { payoutRoutes } from "./modules/payouts/routes.js";
import { reviewRoutes } from "./modules/reviews/routes.js";
import { notificationRoutes } from "./modules/notifications/routes.js";
import { fileRoutes } from "./modules/files/routes.js";
import { webhookRoutes } from "./modules/webhooks/routes.js";
import { auditLogRoutes } from "./modules/audit-logs/routes.js";
import { commissionRuleRoutes } from "./modules/commission-rules/routes.js";
import { customerSegmentRoutes } from "./modules/customer-segments/routes.js";
import { searchRoutes } from "./modules/search/routes.js";
import { vendorMembershipsRoutes } from "./modules/vendor-memberships/routes.js";
import { inventoryRoutes } from "./modules/inventory/routes.js";
import { metafieldRoutes } from "./modules/metafields/routes.js";
import { settingsRoutes } from "./modules/settings/routes.js";
import { shippingRoutes } from "./modules/shipping/routes.js";
import { taxRoutes } from "./modules/tax/routes.js";
import { newsletterRoutes } from "./modules/newsletter/routes.js";
import { giftCardRoutes } from "./modules/gift-cards/routes.js";
import { apiKeyRoutes } from "./modules/api-keys/routes.js";
import { facetFilterRoutes } from "./modules/facet-filters/routes.js";
import { campaignRoutes } from "./modules/campaigns/routes.js";
import { stockNotifyRoutes } from "./modules/stock-notify/routes.js";
import { recommendationRoutes } from "./modules/recommendations/routes.js";
import { productConfiguratorRoutes } from "./modules/product-configurator/routes.js";
import { loyaltyRoutes } from "./modules/loyalty/routes.js";
import { messagingRoutes } from "./modules/messaging/routes.js";

const isDev = env.NODE_ENV !== "production";

// Register metric series before they're incremented.
initMetrics();

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL ?? (isDev ? "info" : "warn"),
    ...(isDev && {
      transport: { target: "pino-pretty", options: { colorize: true } },
    }),
    // Redact sensitive fields so secrets never leak into log aggregators.
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        'req.headers["x-csrf-token"]',
        "req.body.password",
        "req.body.currentPassword",
        "req.body.newPassword",
        "req.body.token",
        "req.body.refreshToken",
      ],
      remove: true,
    },
  },
  genReqId: () => crypto.randomUUID(),
  requestTimeout: 30_000,
  bodyLimit: 1_048_576, // 1MB
  trustProxy: !isDev, // Trust X-Forwarded-For behind load balancers in prod.
  disableRequestLogging: true, // Our observability plugin emits access logs.
});

async function start() {
  // ── Sentry (optional) ─────────────────────────────────────────────────────
  await initSentry({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  // ── Infrastructure: Redis + Queues ────────────────────────────────────────
  const runWorkers = env.PROCESS_MODE === "all";
  const redisOk = await initRedis(env.REDIS_URL);
  if (redisOk) {
    initQueues();
    if (runWorkers) {
      startEmailWorker(env.REDIS_URL);
      startWebhookWorker(env.REDIS_URL);
      app.log.info("[INFRA] Redis connected, job workers started (mode=all)");
    } else {
      app.log.info(
        "[INFRA] Redis connected, queue producers ready (workers run in separate process; mode=web)"
      );
    }
  } else {
    app.log.warn("[INFRA] Redis unavailable — running without job queue (degraded mode)");
  }

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = [env.NEXT_PUBLIC_STOREFRONT_URL, env.VITE_ADMIN_URL];

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (isDev && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Session-Id",
      "X-Request-Id",
      "X-Api-Key",
      "X-CSRF-Token",
      "Idempotency-Key",
    ],
    exposedHeaders: [
      "X-Request-Id",
      "X-Api-Version",
      "Retry-After",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Idempotent-Replay",
    ],
  });
  await app.register(sensible);

  // ── Security headers ──────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // API returns JSON
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: isDev
      ? false
      : { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  });

  // Strip Fastify's server fingerprint.
  app.addHook("onSend", async (_req, reply) => {
    reply.removeHeader("x-powered-by");
  });

  // ── Multipart (file uploads) ──────────────────────────────────────────────
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // ── Observability (MUST come before routes so hooks attach) ──────────────
  await app.register(observabilityPlugin);

  // ── Rate limiting ─────────────────────────────────────────────────────────
  // Use Redis as the shared store so the limiter is correct across web
  // replicas. Falls back to per-process memory if Redis is unavailable
  // (degraded mode — operator should be alerted via the /ready endpoint).
  const rateLimitRedis = getRedis();
  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
    // allowList must check req.ip — fastify-rate-limit compares the list
    // against keyGenerator output (e.g. "user:abc123"), not req.ip directly,
    // so a bare IP array silently fails to allowlist authenticated requests.
    allowList: isDev
      ? (req) => req.ip === "127.0.0.1" || req.ip === "::1"
      : undefined,
    redis: rateLimitRedis ?? undefined,
    // If Redis dies after startup, degrade to no rate-limit on this request
    // rather than 500'ing every authenticated call.
    skipOnError: true,
    nameSpace: "rl:",
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    keyGenerator: (req) => {
      const auth = req.headers.authorization;
      if (auth?.startsWith("Bearer ")) {
        try {
          const token = auth.slice(7);
          const payload = app.jwt.verify<{ id?: string }>(token);
          if (payload?.id) return `user:${payload.id}`;
        } catch {
          // fall through
        }
      }
      const apiKey = req.headers["x-api-key"];
      if (typeof apiKey === "string" && apiKey) return `key:${apiKey.slice(0, 16)}`;
      return req.ip;
    },
  });

  await app.register(swaggerPlugin);
  await app.register(authPlugin);
  await app.register(idempotencyPlugin);
  await app.register(csrfPlugin);

  // ── Global error handler (RFC 7807 Problem Details shape) ─────────────────
  // Must be registered BEFORE routes — Fastify captures the active error
  // handler at route-registration time, so a handler set later only applies
  // to routes registered after it.
  app.setErrorHandler((error: FastifyError & { code?: string; details?: unknown }, req, reply) => {
    const requestId = req.id;

    if (error instanceof ZodError) {
      return reply.status(400).send({
        type: "about:blank",
        title: "Validation failed",
        status: 400,
        code: "VALIDATION_ERROR",
        errors: error.errors,
        requestId,
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        type: "about:blank",
        title: error.message,
        status: error.statusCode,
        code: error.code,
        detail: error.message,
        ...(error.details ? { errors: error.details } : {}),
        requestId,
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        type: "about:blank",
        title: "Too many requests",
        status: 429,
        code: "RATE_LIMIT_EXCEEDED",
        detail: "Slow down and retry after the Retry-After interval.",
        requestId,
      });
    }

    const status = error.statusCode ?? 500;
    const title = status < 500 ? error.message || "Request failed" : "Internal Server Error";

    if (status >= 500) {
      app.log.error({ err: error, requestId }, "Unhandled server error");
      captureError(error, {
        requestId,
        route: req.routeOptions?.url ?? req.url,
        method: req.method,
      });
    }

    return reply.status(status).send({
      type: "about:blank",
      title,
      status,
      code: error.code ?? "INTERNAL_ERROR",
      detail: title,
      requestId,
    });
  });

  // ── Routes ───────────────────────────────────────────────────────────────
  async function registerApiRoutes(scope: typeof app) {
    await scope.register(authRoutes);
    await scope.register(dashboardRoutes);
    await scope.register(userRoutes);
    await scope.register(vendorRoutes);
    await scope.register(vendorKycRoutes);
    await scope.register(vendorAddressRoutes);
    await scope.register(productRoutes);
    await scope.register(collectionRoutes);
    await scope.register(contentRoutes);
    await scope.register(customerRoutes);
    await scope.register(cartRoutes);
    await scope.register(checkoutRoutes);
    await scope.register(orderRoutes);
    await scope.register(discountRoutes);
    await scope.register(paymentRoutes);
    await scope.register(fulfillmentRoutes);
    await scope.register(refundRoutes);
    await scope.register(returnRoutes);
    await scope.register(payoutRoutes);
    await scope.register(reviewRoutes);
    await scope.register(notificationRoutes);
    await scope.register(fileRoutes);
    await scope.register(webhookRoutes);
    await scope.register(auditLogRoutes);
    await scope.register(commissionRuleRoutes);
    await scope.register(customerSegmentRoutes);
    await scope.register(searchRoutes);
    await scope.register(vendorMembershipsRoutes);
    await scope.register(inventoryRoutes);
    await scope.register(metafieldRoutes);
    await scope.register(settingsRoutes);
    await scope.register(shippingRoutes);
    await scope.register(taxRoutes);
    await scope.register(newsletterRoutes);
    await scope.register(giftCardRoutes);
    await scope.register(apiKeyRoutes);
    await scope.register(facetFilterRoutes);
    await scope.register(campaignRoutes);
    await scope.register(stockNotifyRoutes);
    await scope.register(recommendationRoutes);
    await scope.register(productConfiguratorRoutes);
    await scope.register(loyaltyRoutes);
    await scope.register(messagingRoutes);
  }

  // Unversioned (legacy) paths + versioned /v1 aliases.
  await registerApiRoutes(app);
  await app.register(
    async (v1) => {
      await registerApiRoutes(v1 as unknown as typeof app);
    },
    { prefix: "/v1" }
  );

  // ── Periodic cleanup + scheduled jobs ────────────────────────────────────
  // Only run scheduler in "all" mode. The dedicated worker process owns the
  // scheduler in production so the web tier stays lean and there is exactly
  // one scheduler regardless of web replica count.
  if (runWorkers) {
    startCleanupScheduler();
    registerScheduledJobs();
    startScheduler();
  }

  // ── Liveness / Readiness / Health ────────────────────────────────────────
  app.get("/live", async () => ({ status: "ok", uptime: process.uptime() }));

  app.get("/ready", async (_req, reply) => {
    let dbOk = true;
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbOk = false;
    }
    if (!dbOk) {
      return reply.status(503).send({
        status: "unavailable",
        db: false,
        redis: isRedisConnected(),
      });
    }
    return {
      status: "ready",
      db: true,
      redis: isRedisConnected(),
    };
  });

  app.get("/health", async () => {
    let dbStatus: "connected" | "disconnected" = "disconnected";
    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = "connected";
    } catch {
      // db unavailable
    }
    return {
      status: dbStatus === "connected" ? "ok" : "degraded",
      db: dbStatus,
      redis: isRedisConnected() ? "connected" : "unavailable",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
    };
  });

  // ── Prometheus scrape endpoint ────────────────────────────────────────────
  app.get("/metrics", async (req, reply) => {
    if (env.METRICS_AUTH_TOKEN) {
      const auth = req.headers.authorization;
      const token =
        typeof auth === "string" && auth.startsWith("Bearer ")
          ? auth.slice(7)
          : (req.query as { token?: string })?.token;
      if (token !== env.METRICS_AUTH_TOKEN) {
        return reply.status(401).send("unauthorized\n");
      }
    }

    // Refresh queue-depth gauges before scrape.
    try {
      for (const [name, q] of [
        ["email", getEmailQueue()] as const,
        ["webhook", getWebhookQueue()] as const,
      ]) {
        if (!q) continue;
        const waiting = await q.getWaitingCount();
        const active = await q.getActiveCount();
        setGauge("queue_depth", waiting + active, { queue: name });
      }
    } catch {
      // best-effort
    }

    return reply
      .header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
      .send(collectMetrics());
  });

  // ── Robots + security.txt ────────────────────────────────────────────────
  app.get("/robots.txt", async (_req, reply) => {
    return reply
      .header("Content-Type", "text/plain")
      .send("User-agent: *\nDisallow: /\n");
  });
  app.get("/.well-known/security.txt", async (_req, reply) => {
    return reply
      .header("Content-Type", "text/plain")
      .send(
        [
          "Contact: mailto:security@example.com",
          "Preferred-Languages: en",
          "Canonical: /.well-known/security.txt",
          "",
        ].join("\n")
      );
  });

  process.on("unhandledRejection", (reason) => {
    app.log.error({ reason }, "unhandled.promise.rejection");
    captureError(reason, { kind: "unhandledRejection" });
  });
  process.on("uncaughtException", (err) => {
    app.log.fatal({ err }, "uncaught.exception");
    captureError(err, { kind: "uncaughtException" });
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info(`Received ${signal}, shutting down gracefully...`);

    const killTimer = setTimeout(() => {
      app.log.fatal("Shutdown deadline exceeded, forcing exit");
      process.exit(1);
    }, 15_000);
    killTimer.unref();

    try {
      await app.close(); // stop accepting new requests
      if (runWorkers) {
        stopCleanupScheduler();
        stopScheduler();
        await Promise.all([
          stopEmailWorker(),
          stopWebhookWorker(),
        ]);
      }
      await closeQueues();
      await closeRedis();
      await flushSentry();
      clearTimeout(killTimer);
      process.exit(0);
    } catch (err) {
      app.log.error(err, "Error during shutdown");
      clearTimeout(killTimer);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  app.log.info(`Server listening on ${env.API_HOST}:${env.API_PORT}`);
}

start().catch((err) => {
  app.log.fatal({ err }, "Failed to start server");
  process.exit(1);
});
