"use client";

import * as React from "react";

const KEY = "preferred_currency";
const EVT = "currency:changed";

interface StorefrontCurrencyState {
  code: string;
  setCode: (code: string) => void;
}

const CurrencyContext = React.createContext<StorefrontCurrencyState | null>(null);

export function CurrencyProvider({
  initial = "USD",
  children,
}: {
  initial?: string;
  children: React.ReactNode;
}) {
  const [code, setCodeState] = React.useState<string>(initial);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(KEY);
    if (stored) setCodeState(stored);

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setCodeState(detail);
    };
    window.addEventListener(EVT, onChange as EventListener);
    return () => window.removeEventListener(EVT, onChange as EventListener);
  }, []);

  const setCode = React.useCallback((next: string) => {
    setCodeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, next);
      window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
    }
  }, []);

  const value = React.useMemo(() => ({ code, setCode }), [code, setCode]);

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): StorefrontCurrencyState {
  const ctx = React.useContext(CurrencyContext);
  // If provider isn't mounted, fall back to a sensible default without throwing
  // so server components / legacy usage don't crash.
  if (!ctx) {
    return { code: "USD", setCode: () => {} };
  }
  return ctx;
}
