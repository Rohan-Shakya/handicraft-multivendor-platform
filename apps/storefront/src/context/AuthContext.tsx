"use client";

import * as React from "react";

import { track } from "@/hooks/useAnalytics";
import { apiFetch } from "@/lib/api";
import {
  clearToken,
  getCustomer,
  getToken,
  setStoredCustomer,
  setToken,
} from "@/lib/auth";

interface Customer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  customer: Customer | null;
  token: string | null;
  /** True while the initial token restore is running. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  /** Called by consumers (e.g. CartContext) when the logged-in identity changes. */
  onAuthChange: (
    listener: (identity: Customer | null) => void
  ) => () => void;
}

const AuthContext = React.createContext<AuthState | null>(null);

// Backend returns `accessToken`; keep the older `token` alias for
// backwards compatibility with older callers.
interface TokenResponse {
  accessToken?: string;
  token?: string;
  customer?: Customer;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = React.useState<string | null>(null);
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Fan-out so CartContext (+ others) can react to login/logout without
  // creating a circular dep on AuthContext's module.
  const listenersRef = React.useRef<Set<(c: Customer | null) => void>>(new Set());
  const fanOut = React.useCallback((c: Customer | null) => {
    for (const fn of listenersRef.current) {
      try {
        fn(c);
      } catch {
        /* noop */
      }
    }
  }, []);

  // Hydrate from localStorage on mount.
  React.useEffect(() => {
    const stored = getToken();
    if (stored) {
      setTokenState(stored);
      setCustomer(getCustomer());
    }
    setLoading(false);
  }, []);

  const onAuthChange = React.useCallback(
    (listener: (identity: Customer | null) => void) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    []
  );

  const persistTokens = React.useCallback(
    (res: TokenResponse) => {
      const access = res.accessToken ?? res.token;
      if (!access) throw new Error("Auth response missing access token");
      setToken(access);
      setTokenState(access);
      const c = res.customer ?? getCustomer();
      if (c) setStoredCustomer(c);
      setCustomer(c);
      fanOut(c);
    },
    [fanOut]
  );

  async function login(email: string, password: string): Promise<void> {
    const data = await apiFetch<TokenResponse>("/auth/customer/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    persistTokens(data);
    track("login", { method: "password" });
  }

  async function register(opts: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    const data = await apiFetch<TokenResponse>("/auth/customer/register", {
      method: "POST",
      body: JSON.stringify(opts),
    });
    persistTokens(data);
    track("sign_up", { method: "password" });
  }

  async function logout(): Promise<void> {
    // Revoke refresh token + HttpOnly cookie on the server.
    apiFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }).catch(() => {
      /* client-side logout proceeds regardless */
    });
    clearToken();
    setTokenState(null);
    setCustomer(null);
    fanOut(null);
  }

  return (
    <AuthContext.Provider
      value={{ customer, token, loading, login, logout, register, onAuthChange }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
