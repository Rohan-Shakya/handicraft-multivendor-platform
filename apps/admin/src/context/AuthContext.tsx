import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { AuthActor } from "@repo/types";
import { saveToken, clearToken, decodeActor } from "@/lib/auth";
import { apiFetch, clearTokens, restoreSession, setAccessToken } from "@/lib/api";

interface VendorMembership {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  vendorStatus: string;
  memberRole: string;
  memberStatus: string;
}

interface TwoFAChallenge {
  tempToken: string;
  user: { id: string; email: string; firstName?: string; lastName?: string };
  vendor?: { id: string; name: string; slug: string };
}

type LoginResult =
  | { requires2FA: false }
  | { requires2FA: true; challenge: TwoFAChallenge };

interface AuthContextValue {
  actor: AuthActor | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  vendorLogin: (email: string, password: string, vendorId: string) => Promise<LoginResult>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  fetchVendorMemberships: (email: string, password: string) => Promise<VendorMembership[]>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [actor, setActor] = useState<AuthActor | null>(() => decodeActor());
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session from HttpOnly refresh cookie.
  // This handles page refreshes — the access token lives in memory and is lost,
  // but the cookie persists and we can silently get a new access token.
  useEffect(() => {
    restoreSession()
      .then((restored) => {
        if (restored) {
          setActor(decodeActor());
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const res = await apiFetch<any>(
      "/auth/admin/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    if (res.requires2FA) {
      return {
        requires2FA: true,
        challenge: { tempToken: res.tempToken, user: res.user, vendor: res.vendor },
      };
    }
    saveToken(res.accessToken);
    setActor(decodeActor());
    return { requires2FA: false };
  }, []);

  const fetchVendorMemberships = useCallback(
    async (email: string, password: string): Promise<VendorMembership[]> => {
      const res = await apiFetch<{ memberships: VendorMembership[] }>(
        "/auth/vendor/memberships",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );
      return res.memberships;
    },
    []
  );

  const vendorLogin = useCallback(
    async (email: string, password: string, vendorId: string): Promise<LoginResult> => {
      const res = await apiFetch<any>(
        "/auth/vendor/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password, vendorId }),
        }
      );
      if (res.requires2FA) {
        return {
          requires2FA: true,
          challenge: { tempToken: res.tempToken, user: res.user, vendor: res.vendor },
        };
      }
      saveToken(res.accessToken);
      setActor(decodeActor());
      return { requires2FA: false };
    },
    []
  );

  const verify2FA = useCallback(async (tempToken: string, code: string) => {
    const res = await apiFetch<TokenResponse>(
      "/auth/2fa/authenticate",
      {
        method: "POST",
        body: JSON.stringify({ tempToken, code }),
      }
    );
    saveToken(res.accessToken);
    setActor(decodeActor());
  }, []);

  const logout = useCallback(async () => {
    // Clear local state immediately so UI stops rendering authenticated views.
    setActor(null);

    // Await server-side revocation: refresh token + HttpOnly cookie.
    // We await (rather than fire-and-forget) so a failure can be surfaced —
    // the caller is already awaiting this promise and can display an error.
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch (err) {
      // Server unreachable? Log the failure so ops can spot it, but still
      // complete client-side logout — the token will still expire within 15min.
      console.warn("Server logout failed — cleaning local state only", err);
    } finally {
      // clearTokens aborts any in-flight requests so responses don't arrive
      // after the user has logged out.
      clearTokens();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ actor, loading, login, vendorLogin, verify2FA, fetchVendorMemberships, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
