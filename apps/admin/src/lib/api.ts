const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

/**
 * In-memory access token store.
 * Access tokens are short-lived (15min) and stored in a JS variable — NOT localStorage.
 * This protects against XSS: even if an attacker runs JS on the page, they can't
 * steal the refresh token (it's in an HttpOnly cookie the browser manages).
 *
 * On page refresh, a silent /auth/refresh call restores the access token using the cookie.
 */
let accessToken: string | null = null;

/**
 * AbortController shared by every in-flight apiFetch call. When `clearTokens`
 * fires (logout / forced sign-out), we abort this controller so lingering
 * requests don't leak authenticated state — then install a fresh controller
 * for any subsequent calls.
 */
let inflightAbort = new AbortController();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function clearTokens() {
  accessToken = null;

  // Cancel any in-flight requests so their responses don't arrive after logout.
  inflightAbort.abort();
  inflightAbort = new AbortController();

  // Clean up legacy localStorage keys from previous versions
  localStorage.removeItem("admin_access_token");
  localStorage.removeItem("admin_refresh_token");
  localStorage.removeItem("admin_token");
}

// ── Token refresh (deduplicated) ─────────────────────────────────────────────
// Tracks the currently-running refresh so parallel 401s don't each fire one.
// Also remembers the last failure for a brief cooldown to avoid hammering the
// server when the refresh cookie is definitively invalid.

let refreshPromise: Promise<boolean> | null = null;
let lastRefreshFailedAt: number | null = null;
const REFRESH_FAIL_COOLDOWN_MS = 2_000;

async function tryRefreshToken(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  // Brief cooldown after a failure so a burst of 401s doesn't fan out into
  // many refresh calls. The user will be redirected to /login below; we just
  // avoid extra server traffic in the intervening milliseconds.
  if (lastRefreshFailedAt && Date.now() - lastRefreshFailedAt < REFRESH_FAIL_COOLDOWN_MS) {
    return false;
  }

  refreshPromise = (async () => {
    try {
      // The HttpOnly refresh_token cookie is sent automatically via credentials: 'include'.
      // Send an empty body — the server reads the cookie.
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });

      if (!res.ok) {
        lastRefreshFailedAt = Date.now();
        return false;
      }

      const data = await res.json();
      accessToken = data.accessToken;
      lastRefreshFailedAt = null;
      return true;
    } catch {
      lastRefreshFailedAt = Date.now();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Try to restore a session from the HttpOnly refresh cookie.
 * Call once on app startup / page load.
 */
export async function restoreSession(): Promise<boolean> {
  return tryRefreshToken();
}

/**
 * Compose the caller's AbortSignal (if any) with our global inflight signal,
 * so a logout aborts even requests with their own controllers.
 */
function composeSignals(callerSignal?: AbortSignal): AbortSignal {
  if (!callerSignal) return inflightAbort.signal;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (callerSignal.aborted) controller.abort();
  else callerSignal.addEventListener("abort", onAbort, { once: true });
  if (inflightAbort.signal.aborted) controller.abort();
  else inflightAbort.signal.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

/**
 * Auth endpoints. A 401 from any of these is the user's INPUT being wrong
 * (bad password, bad 2FA code, expired reset token), NOT an expired session.
 * Surface the error to the caller instead of redirecting to the login page —
 * otherwise typing a wrong password triggers a full page reload.
 */
const AUTH_ENDPOINTS = [
  "/auth/admin/login",
  "/auth/vendor/login",
  "/auth/vendor/memberships",
  "/auth/2fa/authenticate",
  "/auth/admin/forgot-password",
  "/auth/admin/reset-password",
  "/auth/refresh",
  "/auth/logout",
];

function isAuthEndpoint(path: string): boolean {
  return AUTH_ENDPOINTS.some((p) => path.startsWith(p));
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const signal = composeSignals(options?.signal);

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
    ...options,
    credentials: "include", // Send HttpOnly cookie on every request
    signal,
  });

  // On 401, attempt token refresh — UNLESS this is an auth endpoint, in
  // which case the 401 is the API rejecting the credentials the user just
  // typed. We must NOT retry/refresh/redirect; let the caller surface it.
  if (res.status === 401 && !isAuthEndpoint(path)) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the request with the new token
      const retryRes = await fetch(`${API_URL}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...options?.headers,
        },
        ...options,
        credentials: "include",
        signal,
      });

      if (retryRes.ok) {
        return retryRes.json() as Promise<T>;
      }
    }

    // Refresh failed — clear tokens and redirect to login.
    // clearTokens() aborts other in-flight requests so they don't reach
    // this branch concurrently and double-redirect.
    clearTokens();
    const isVendor = window.location.pathname.startsWith("/vendor");
    window.location.href = isVendor ? "/login" : "/admin/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));

    // Retry once for idempotent requests on transient 5xx failures. Do NOT
    // retry mutating methods — the server may have already applied them.
    const method = (options?.method ?? "GET").toUpperCase();
    const isIdempotent = method === "GET" || method === "HEAD";
    if (isIdempotent && res.status >= 500 && res.status < 600) {
      await new Promise((r) => setTimeout(r, 300));
      const retryRes = await fetch(`${API_URL}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...options?.headers,
        },
        ...options,
        credentials: "include",
        signal,
      });
      if (retryRes.ok) return retryRes.json() as Promise<T>;
    }

    throw Object.assign(new Error(error.message ?? "API error"), {
      statusCode: res.status,
    });
  }

  return res.json() as Promise<T>;
}
