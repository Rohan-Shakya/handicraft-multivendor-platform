/**
 * Generic `Idempotency-Key` handling for mutation routes.
 *
 * Decorates the Fastify instance with `app.withIdempotency(scope, handler)` —
 * wrap any handler that performs a side effect (create order, issue refund,
 * send money, etc.) and the plugin will:
 *
 *   - Accept the client-supplied `Idempotency-Key` header (8–128 chars).
 *   - If the same key was used within the TTL, return the cached response
 *     verbatim (same status, body) without re-running the handler.
 *   - Otherwise, run the handler, capture the response, and cache it.
 *
 * Storage is Redis via `idempotencyGet/Set`, so the cache is shared across
 * API instances. Callers without Redis get normal (non-idempotent) behavior.
 */
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RouteHandlerMethod,
} from "fastify";
import fp from "fastify-plugin";
import { idempotencyGet, idempotencySet } from "../lib/redis.js";

declare module "fastify" {
  interface FastifyInstance {
    /**
     * Wrap a handler so it runs at-most-once per `Idempotency-Key` within the
     * TTL. The scope string namespaces keys (so a checkout IDEMP_KEY can't
     * collide with a refund IDEMP_KEY).
     */
    withIdempotency: (scope: string, handler: RouteHandlerMethod) => RouteHandlerMethod;
  }
}

interface CachedReply {
  status: number;
  body: unknown;
}

const MIN_LEN = 8;
const MAX_LEN = 128;

async function idempotencyPlugin(app: FastifyInstance) {
  app.decorate(
    "withIdempotency",
    (scope: string, handler: RouteHandlerMethod): RouteHandlerMethod => {
      return async function wrapped(
        this: FastifyInstance,
        req: FastifyRequest,
        reply: FastifyReply
      ) {
        const raw = req.headers["idempotency-key"];
        const key = Array.isArray(raw) ? raw[0] : raw;

        // If no key (or malformed), run the handler directly.
        if (typeof key !== "string" || key.length < MIN_LEN || key.length > MAX_LEN) {
          return handler.call(this, req, reply);
        }

        const cacheKey = scopeForActor(scope, req, key);
        const cached = await idempotencyGet<CachedReply>(
          "mutate",
          cacheKey
        ).catch(() => null);

        if (cached) {
          reply.header("Idempotent-Replay", "true");
          return reply.status(cached.status).send(cached.body);
        }

        // Capture the body the handler tries to send so we can cache it.
        let captured: unknown = undefined;
        const origSend = reply.send.bind(reply);
        reply.send = ((payload: unknown) => {
          captured = payload;
          return origSend(payload);
        }) as typeof reply.send;

        const result = await handler.call(this, req, reply);
        // If the handler returned data via `return`, use that.
        const body = captured ?? result;

        // Only cache success + client-safe statuses. 5xx/429 shouldn't lock
        // the key — the client should be able to retry cleanly.
        const status = reply.statusCode;
        if (status >= 200 && status < 400 && body !== undefined) {
          await idempotencySet("mutate", cacheKey, { status, body }).catch(
            () => {
              // Redis unavailable — skip cache silently.
            }
          );
        }

        return result;
      };
    }
  );
}

/**
 * Namespace the key by scope AND by the calling actor so one user's replay of
 * a leaked key can't collide with another user's cart.
 */
function scopeForActor(scope: string, req: FastifyRequest, key: string): string {
  const actorId =
    req.actor?.id ??
    ((req.headers["x-session-id"] as string | undefined) ?? "guest");
  return `${scope}:${actorId}:${key}`;
}

export default fp(idempotencyPlugin, {
  name: "idempotency",
  fastify: "4.x",
});
