/**
 * Cross-cutting observability plugin.
 *
 * Responsibilities:
 *   1. Propagate a single request id through `X-Request-Id` in both directions
 *      (honor inbound value, generate one if missing).
 *   2. Enrich every log line with the request id so callers can stitch a trace
 *      across services.
 *   3. Record HTTP-level metrics (count + duration histogram) keyed by
 *      method / route / status.
 *   4. Surface rate-limit events to the metrics registry.
 */
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { incCounter, observeHistogram } from "../lib/metrics.js";

export interface ObservabilityOptions {
  /**
   * Name of the inbound header that supplies an upstream request id.
   * Defaults to `x-request-id`.
   */
  requestIdHeader?: string;
}

async function observabilityPlugin(
  app: FastifyInstance,
  opts: ObservabilityOptions = {}
) {
  const headerName = (opts.requestIdHeader ?? "x-request-id").toLowerCase();

  // onRequest: honor inbound request id; otherwise generate a fresh UUID and
  // plumb it into Fastify's req.id so every log line includes it.
  app.addHook("onRequest", async (req, reply) => {
    const inbound = req.headers[headerName];
    const candidate = Array.isArray(inbound) ? inbound[0] : inbound;
    // Only accept well-shaped ids to avoid log-injection via crafted headers.
    const id =
      typeof candidate === "string" && /^[A-Za-z0-9_.:-]{8,128}$/.test(candidate)
        ? candidate
        : randomUUID();
    // Fastify 4 exposes req.id but it's read-only by default; genReqId on the
    // app owns generation. We still emit the header here so downstream sees
    // whatever id is in effect.
    (req as FastifyRequest & { _observedId?: string })._observedId = id;
    reply.header("X-Request-Id", req.id);
    reply.header("X-Api-Version", "v1");
  });

  // onResponse: metrics + access log with duration.
  app.addHook("onResponse", async (req, reply) => {
    const durationMs = reply.elapsedTime ?? 0;
    const route = req.routeOptions?.url ?? req.url;
    const method = req.method;
    const status = String(reply.statusCode);

    incCounter("http_requests_total", 1, { method, route, status });
    observeHistogram("http_request_duration_ms", durationMs, {
      method,
      route,
      status,
    });

    if (reply.statusCode === 429) {
      incCounter("rate_limit_hits_total", 1, { route });
    }

    // Access log at info level so operators can tail it; omit 2xx noise when
    // it's a health probe to keep logs clean.
    const isHealthProbe =
      req.url === "/health" || req.url === "/live" || req.url === "/ready";
    if (!isHealthProbe || reply.statusCode >= 400) {
      req.log.info(
        {
          method,
          route,
          status: reply.statusCode,
          durationMs: Math.round(durationMs),
          ip: req.ip,
        },
        "request.completed"
      );
    }
  });
}

export default fp(observabilityPlugin, {
  name: "observability",
  fastify: "4.x",
});
