const TOKEN_KEY = "customer_token";
const CUSTOMER_KEY = "customer_info";

export interface CustomerPayload {
  id: string;
  type: string;
  email: string;
  firstName?: string;
  lastName?: string;
  /** JWT exp (seconds since epoch) */
  exp?: number;
  /** JWT iat (seconds since epoch) */
  iat?: number;
}

export interface StoredCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_KEY);
}

export function setStoredCustomer(c: StoredCustomer): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c));
  } catch {
    /* quota or serialization — non-fatal */
  }
}

/**
 * Decode a JWT payload (base64url) for UI-only purposes.
 *
 * WARNING: this does NOT verify the signature — the server always re-validates
 * the token on every request. We use the decoded claims purely for display
 * (e.g. showing the customer's name in the header) and never as an
 * authorization source.
 *
 * Returns null for missing, malformed, or expired tokens so the UI stops
 * rendering stale identities after the access token has expired.
 */
function decodePayload(token: string): CustomerPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Base64url → Base64 → decode
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const json = atob(padded);
    const payload = JSON.parse(json) as CustomerPayload;

    // Treat expired tokens as absent. The next API call will either refresh
    // (via /auth/refresh cookie) or 401, at which point we'll clearToken().
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getCustomer(): StoredCustomer | null {
  const token = getToken();
  if (!token) return null;

  // The JWT we issue to customers is intentionally minimal (id, type, exp).
  // For UI-only display we cache the full customer object alongside the token
  // when login/refresh succeeds, so a hard reload doesn't appear logged-out.
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(CUSTOMER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredCustomer;
        if (parsed?.id && parsed?.email) return parsed;
      } catch {
        /* fall through to JWT decode */
      }
    }
  }

  // Fallback: try to derive from the JWT in case the cache is stale.
  const payload = decodePayload(token);
  if (!payload || !payload.id) return null;
  if (!payload.email) return null;
  return {
    id: payload.id,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
  };
}
