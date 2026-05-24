/**
 * CSRF defense for browser-originating mutations.
 *
 * We use the double-submit cookie pattern: every `GET /auth/csrf` hands out a
 * short-lived HMAC-signed token. Clients store the token (as a non-HttpOnly
 * cookie AND in a custom header) and echo it back on every state-changing
 * request. Servers verify the HMAC and reject mismatches.
 *
 * Why double-submit rather than per-session server state? It stays stateless
 * so horizontal scaling is trivial and we don't need Redis round-trips on the
 * hot path.
 *
 * Scope: applies to POST/PUT/PATCH/DELETE routes with path prefixes in
 * PROTECTED_PREFIXES. Bearer-token requests (API clients) are skipped because
 * they're not vulnerable to CSRF — browsers won't attach an Authorization
 * header cross-origin without the developer's explicit code.
 */
import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { getEnv } from "../lib/env.js";

const COOKIE_NAME = "csrf_token";
const HEADER_NAME = "x-csrf-token";
const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const PROTECTED_PREFIXES = ["/storefront/", "/customer/", "/auth/"];
const EXEMPT_PATHS = new Set([
  "/auth/csrf",
  // Auth bootstrap paths — the user has no CSRF token yet on first visit.
  "/auth/admin/login",
  "/auth/vendor/login",
  "/auth/vendor/memberships",
  "/auth/customer/login",
  "/auth/customer/register",
  "/auth/customer/forgot-password",
  "/auth/customer/reset-password",
  "/auth/admin/forgot-password",
  "/auth/admin/reset-password",
  "/auth/refresh",
  "/auth/logout",
  // Marketing analytics — anonymous storefront visitors fire these via
  // sendBeacon/fetch on banner render/click. They're idempotent and carry no
  // sensitive data; the rate-limit on the route is the primary abuse gate.
  "/storefront/campaigns/events",
  // Anonymous customer signs up for restock alert — no auth context.
  "/storefront/stock-notify",
  // Anonymous gift card balance check — no sensitive state mutated.
  "/storefront/gift-cards/lookup",
  // Customer submits a custom-product quote request — anonymous friendly.
  "/storefront/quote-requests",
  // Payment provider callbacks come from external servers.
  "/webhooks/payments/:provider",
  "/payments/verify/:provider",
]);

function sign(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/** Build a new token of the form `{random}.{hmac}`. */
export function mintCsrfToken(secret: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const issued = Date.now().toString(36);
  const payload = `${salt}.${issued}`;
  return `${payload}.${sign(payload, secret)}`;
}

function isValidToken(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [salt, issued, mac] = parts as [string, string, string];
  const expected = sign(`${salt}.${issued}`, secret);
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return false;
  const issuedMs = parseInt(issued, 36);
  if (!Number.isFinite(issuedMs)) return false;
  return Date.now() - issuedMs < TOKEN_TTL_SECONDS * 1000;
}

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

function needsCheck(req: FastifyRequest): boolean {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;

  // API clients using Bearer tokens are not vulnerable to CSRF. Skip.
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return false;

  // Route-level exemptions (provider callbacks, auth bootstrap).
  if (EXEMPT_PATHS.has(req.routeOptions?.url ?? req.url)) return false;

  return PROTECTED_PREFIXES.some((p) => req.url.startsWith(p));
}

async function csrfPlugin(app: FastifyInstance) {
  const env = getEnv();
  const secret = env.CSRF_SECRET ?? env.JWT_SECRET;

  // Endpoint: issue token + cookie.
  // The `Secure` flag is required in production (HTTPS) but would cause
  // browsers to drop the cookie on plain `http://localhost` during dev —
  // which is exactly when we set it.
  const isProd = env.NODE_ENV === "production";
  app.get("/auth/csrf", async (req, reply) => {
    const token = mintCsrfToken(secret);
    const parts = [
      `${COOKIE_NAME}=${encodeURIComponent(token)}`,
      "Path=/",
      `Max-Age=${TOKEN_TTL_SECONDS}`,
      // SameSite=None is required when the storefront lives on a different
      // origin than the API (e.g. localhost:3000 ↔ localhost:4000 — browsers
      // treat different ports as cross-site for cookie purposes). `None`
      // mandates `Secure`, so we pair them.
      isProd ? "SameSite=None" : "SameSite=Lax",
      ...(isProd ? ["Secure"] : []),
    ];
    reply.header("Set-Cookie", parts.join("; "));
    return { token, header: HEADER_NAME };
  });

  // preHandler: enforce token on state-changing cookie-based requests.
  app.addHook("preHandler", async (req, reply) => {
    if (!needsCheck(req)) return;

    const cookieToken = readCookie(req.headers.cookie, COOKIE_NAME);
    const headerRaw = req.headers[HEADER_NAME];
    const headerToken = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return reply.status(403).send({
        statusCode: 403,
        code: "CSRF_TOKEN_MISSING",
        message: "CSRF token is missing or does not match.",
        requestId: req.id,
      });
    }
    if (!isValidToken(cookieToken, secret)) {
      return reply.status(403).send({
        statusCode: 403,
        code: "CSRF_TOKEN_INVALID",
        message: "CSRF token is invalid or expired. Refresh and retry.",
        requestId: req.id,
      });
    }
  });
}

export default fp(csrfPlugin, {
  name: "csrf",
  fastify: "4.x",
});
