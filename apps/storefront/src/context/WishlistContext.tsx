"use client";

import * as React from "react";

import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { track } from "@/hooks/useAnalytics";
import { apiFetch } from "@/lib/api";

const LOCAL_KEY = "wishlist_ids";
const EVT = "wishlist:changed";

interface WishlistState {
  /** Fast lookup — set of productIds currently wishlisted. */
  productIds: Set<string>;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WishlistContext = React.createContext<WishlistState | null>(null);

function readLocal(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeLocal(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify([...ids]));
    window.dispatchEvent(new Event(EVT));
  } catch {
    /* quota */
  }
}

interface WishlistResponse {
  data?: Array<{ productId: string }>;
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { customer, token } = useAuth();
  const [productIds, setProductIds] = React.useState<Set<string>>(() => readLocal());

  // Hydrate from server when the customer logs in. We also merge any
  // locally-wishlisted products (from guest browsing) into the server list.
  const refresh = React.useCallback(async () => {
    if (!token) {
      setProductIds(readLocal());
      return;
    }
    try {
      const data = await apiFetch<WishlistResponse | Array<{ productId: string }>>(
        "/storefront/wishlist"
      );
      const rows = Array.isArray(data) ? data : data.data ?? [];
      const server = new Set(rows.map((r) => r.productId));

      // Merge any guest-side wishlist additions to the server once.
      const local = readLocal();
      const pending = [...local].filter((id) => !server.has(id));
      for (const pid of pending) {
        try {
          await apiFetch("/storefront/wishlist", {
            method: "POST",
            body: JSON.stringify({ productId: pid }),
          });
          server.add(pid);
        } catch {
          /* non-fatal */
        }
      }
      // Local store now mirrors server so guest → login is seamless.
      writeLocal(server);
      setProductIds(server);
    } catch {
      setProductIds(readLocal());
    }
  }, [token]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Cross-tab sync
  React.useEffect(() => {
    const onEvt = () => setProductIds(readLocal());
    window.addEventListener(EVT, onEvt);
    window.addEventListener("storage", (e) => {
      if (e.key === LOCAL_KEY) onEvt();
    });
    return () => window.removeEventListener(EVT, onEvt);
  }, []);

  const has = React.useCallback(
    (productId: string) => productIds.has(productId),
    [productIds]
  );

  const toggle = React.useCallback(
    async (productId: string) => {
      const isAdded = productIds.has(productId);

      // Optimistic update
      const next = new Set(productIds);
      if (isAdded) next.delete(productId);
      else next.add(productId);
      setProductIds(next);
      writeLocal(next);

      if (!customer) {
        // Guest: keep local only. Prompt sign-in so it persists across devices.
        if (!isAdded) {
          toast({
            title: "Saved to wishlist",
            description: "Sign in to keep your wishlist across devices.",
          });
          track("add_to_wishlist", { productId, guest: true });
        }
        return;
      }

      try {
        if (isAdded) {
          await apiFetch(`/storefront/wishlist/${productId}`, {
            method: "DELETE",
          });
        } else {
          await apiFetch("/storefront/wishlist", {
            method: "POST",
            body: JSON.stringify({ productId }),
          });
          track("add_to_wishlist", { productId });
        }
      } catch (err: unknown) {
        // Rollback on failure
        const rollback = new Set(productIds);
        setProductIds(rollback);
        writeLocal(rollback);
        const msg = (err as Error)?.message ?? "Could not update wishlist";
        toast({ title: "Wishlist error", description: msg, variant: "destructive" });
      }
    },
    [productIds, customer]
  );

  const value = React.useMemo(
    () => ({ productIds, has, toggle, refresh }),
    [productIds, has, toggle, refresh]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistState {
  const ctx = React.useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return ctx;
}
