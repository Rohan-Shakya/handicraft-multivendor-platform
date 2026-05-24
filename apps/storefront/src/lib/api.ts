import { clearToken, getToken, setToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export { API_URL };

/** HTTP methods that trigger the API's CSRF double-submit check. */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Single-flight refresh — multiple concurrent 401s share one /auth/refresh
 * round-trip instead of stampeding the endpoint and rotating the refresh
 * token several times in parallel.
 */
let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        // Refresh cookie is missing/expired — caller will see the original
        // 401 and route the user to /customer/login.
        clearToken();
        return null;
      }
      const body = (await res.json()) as { accessToken?: string; token?: string };
      const next = body.accessToken ?? body.token ?? null;
      if (next) setToken(next);
      return next;
    } catch {
      return null;
    } finally {
      // Allow the next refresh to proceed once this one settles.
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

/**
 * Cached CSRF token (in-memory, tab-scoped). The browser also stores it as a
 * non-HttpOnly `csrf_token` cookie; we mirror the value into the
 * `x-csrf-token` header on every mutation. If the cookie has already been
 * issued on a previous page load, we pick it up from `document.cookie` on
 * first use rather than re-requesting.
 */
let csrfToken: string | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]!) : null;
}

async function getCsrfToken(): Promise<string | null> {
  if (typeof window === "undefined") return null; // Server requests don't need CSRF.
  if (csrfToken) return csrfToken;

  // Pick up an already-issued cookie first (avoids an extra round-trip).
  const fromCookie = readCookie("csrf_token");
  if (fromCookie) {
    csrfToken = fromCookie;
    return fromCookie;
  }

  try {
    const res = await fetch(`${API_URL}/auth/csrf`, { credentials: "include" });
    if (!res.ok) return null;
    const body = (await res.json()) as { token: string };
    csrfToken = body.token;
    return body.token;
  } catch {
    return null;
  }
}

/**
 * Extra options layered on top of standard `RequestInit`.
 *
 * - `revalidate`: enables Next.js Data Cache for this read by setting
 *   `next.revalidate` AND dropping `credentials: "include"` (cookies opt out
 *   of fetch caching). Use for public storefront SSR reads. Omit for
 *   authenticated requests — the wrapper falls back to the legacy
 *   credentialed-uncached behaviour.
 * - `tags`: cache tags, used with `revalidateTag()` to invalidate on demand.
 */
type ApiFetchOptions = RequestInit & {
  revalidate?: number;
  tags?: string[];
};

/**
 * Thin fetch wrapper.
 *
 * - Injects the current customer access token if present (client-side only).
 * - Sends cookies (`credentials: "include"`) so the HttpOnly refresh_token
 *   cookie can ride along for authenticated requests.
 * - For mutating requests (POST/PUT/PATCH/DELETE) from the browser, fetches a
 *   CSRF token once and echoes it in `x-csrf-token`. The matching cookie is
 *   set by the API on `/auth/csrf`.
 * - When `revalidate` is supplied, opts the call into Next's Data Cache
 *   (cookies are dropped so the cache key is stable across users — only safe
 *   for public reads).
 * - Throws a typed error on non-2xx responses so callers can react to 401/429.
 */
export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions
): Promise<T> {
  const { revalidate, tags, ...rest } = options ?? {};
  const method = (rest.method ?? "GET").toUpperCase();
  const cacheable = revalidate !== undefined;
  const isBrowser = typeof window !== "undefined";

  let csrfHeader: Record<string, string> = {};
  if (isBrowser && MUTATING.has(method)) {
    const t = await getCsrfToken();
    if (t) csrfHeader = { "x-csrf-token": t };
  }

  // Snapshot the body once so we can replay the same payload after a token
  // refresh — fetch consumes the body on send, so reusing `options` directly
  // would fail on the retry.
  const sendOnce = async (accessToken: string | null) => {
    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        // Skip the Authorization header on cacheable reads — Next.js refuses
        // to cache requests with auth headers, which would silently disable
        // caching for any signed-in user otherwise.
        ...(accessToken && !cacheable
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
        ...csrfHeader,
        ...rest.headers,
      },
      // `credentials: "include"` also opts out of Next's Data Cache, so we
      // only send cookies on uncached requests (which is everything that
      // actually needs the session anyway).
      ...(cacheable ? {} : { credentials: "include" as const }),
      ...(cacheable
        ? { next: { revalidate, ...(tags ? { tags } : {}) } }
        : {}),
    });
  };

  let res = await sendOnce(isBrowser ? getToken() : null);

  // Try once to refresh an expired access token before surfacing the 401 to
  // the caller. Only attempted in the browser (server SSR has no
  // refresh-token cookie context) and never on the refresh endpoint itself.
  if (
    res.status === 401 &&
    isBrowser &&
    !cacheable &&
    !path.startsWith("/auth/refresh") &&
    !path.startsWith("/auth/customer/login")
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await sendOnce(refreshed);
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    // If the token was rejected (expired or rotated), clear cache so the next
    // call re-fetches.
    if (res.status === 403 && (error?.code === "CSRF_TOKEN_INVALID" || error?.code === "CSRF_TOKEN_MISSING")) {
      csrfToken = null;
    }
    throw Object.assign(new Error(error.message ?? "API error"), {
      statusCode: res.status,
      body: error,
    });
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
