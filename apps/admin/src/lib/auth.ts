import type { AuthActor } from "@repo/types";
import { setAccessToken, getAccessToken, clearTokens } from "./api";

/**
 * Save the access token in memory. The refresh token is managed
 * by the browser as an HttpOnly cookie — we never touch it in JS.
 */
export function saveToken(accessToken: string, _refreshToken?: string) {
  setAccessToken(accessToken);
}

export function clearToken() {
  clearTokens();
}

export function getToken(): string | null {
  return getAccessToken();
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

/**
 * Decode JWT payload for UI-only purposes (role gates, display name).
 *
 * The server re-validates every request — never trust the returned claims
 * for anything security-sensitive. We return `null` when the token is expired
 * so the UI doesn't render stale actor state while the next API call refreshes.
 */
export function decodeActor(): AuthActor | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!));
    // Treat expired tokens as missing — refresh happens on next API call.
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload as AuthActor;
  } catch {
    return null;
  }
}
