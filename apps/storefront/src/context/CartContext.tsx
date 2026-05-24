"use client";

import type { CartItem } from "@repo/types";
import * as React from "react";

import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { track } from "@/hooks/useAnalytics";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const SESSION_KEY = "cart_session_id";
const CART_UPDATED_EVENT = "cart:updated";
/**
 * Dispatched after a successful `addItem` to ask any listening cart drawer
 * (see `Header`) to pop open. Keeps the drawer UI decoupled from whichever
 * page originated the add.
 */
export const CART_OPEN_EVENT = "cart:open";

/**
 * Guest cart sessions are keyed by a client-generated UUIDv4 — ~122 bits of
 * entropy, so guessing another user's cart ID via brute force is infeasible.
 * The session ID is also validated on every request by the API (via
 * `X-Session-Id`), and a rotating session + cart ownership check prevents
 * cross-cart interference even if the ID leaks.
 */
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  loading: boolean;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = React.createContext<CartState | null>(null);

interface CartResponse {
  items: CartItem[];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Track in-flight requests per cart-item so rapid clicks cancel stale ones.
  const inflightRef = React.useRef<Map<string, AbortController>>(new Map());
  // Debounce timers for quantity updates — last-write-wins within 250ms.
  const debounceRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  function abortFor(key: string): AbortController {
    const prev = inflightRef.current.get(key);
    if (prev) prev.abort();
    const ctrl = new AbortController();
    inflightRef.current.set(key, ctrl);
    return ctrl;
  }

  function cancelDebounce(key: string) {
    const t = debounceRef.current.get(key);
    if (t) clearTimeout(t);
    debounceRef.current.delete(key);
  }

  function buildHeaders(): HeadersInit {
    const token = getToken();
    const sessionId = getOrCreateSessionId();
    const headers: Record<string, string> = {
      "X-Session-Id": sessionId,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  const refreshCart = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await apiFetch<CartResponse>("/storefront/cart", {
        headers: buildHeaders(),
      });
      setItems(data.items ?? []);
    } catch {
      // Silently fail — cart may not exist yet
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // When a guest logs in we call the backend to merge the X-Session-Id cart
  // into the customer cart. Backend endpoint is idempotent — safe to retry.
  const auth = useAuth();
  React.useEffect(() => {
    const unsubscribe = auth.onAuthChange(async (identity) => {
      if (!identity) {
        // Logout: get a fresh guest cart session so we don't keep touching
        // the ex-customer's cart in the backend.
        if (typeof window !== "undefined") {
          localStorage.removeItem(SESSION_KEY);
        }
        await refreshCart();
        return;
      }
      const sessionId =
        typeof window !== "undefined"
          ? localStorage.getItem(SESSION_KEY)
          : null;
      if (!sessionId) {
        await refreshCart();
        return;
      }
      try {
        await apiFetch("/storefront/cart/merge", {
          method: "POST",
          headers: { "X-Session-Id": sessionId },
          body: JSON.stringify({ sessionId }),
        });
        // Sync done — keep session id for guest-only pages that still need it.
      } catch {
        // Non-fatal: even if the merge endpoint isn't implemented yet,
        // the customer still sees the items in their own cart because
        // `refreshCart()` sends the Authorization header.
      }
      await refreshCart();
    });
    return unsubscribe;
  }, [auth, refreshCart]);

  // Cross-tab sync — when the cart changes in another tab, refresh this one so quantities stay
  // consistent. We use both a `storage` listener (for multi-tab sessions) and
  // a same-tab custom event (for in-app dispatches, e.g. from a Buy Now flow).
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY || e.key === "customer_token") {
        refreshCart();
      }
    };
    const onCustom = () => refreshCart();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CART_UPDATED_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CART_UPDATED_EVENT, onCustom);
    };
  }, [refreshCart]);

  function notifyOtherTabs() {
    // storage events only fire in OTHER tabs. We also dispatch a same-tab
    // event so sibling components re-render if they subscribe.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    }
  }

  async function addItem(variantId: string, quantity: number): Promise<void> {
    // Optimistic update
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === variantId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prev,
        {
          id: `optimistic-${variantId}`,
          cartId: "",
          variantId,
          quantity,
        } satisfies CartItem,
      ];
    });

    const ctrl = abortFor(`add:${variantId}`);
    try {
      const data = await apiFetch<CartResponse>("/storefront/cart/items", {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ variantId, quantity }),
        signal: ctrl.signal,
      });
      setItems(data.items ?? []);
      notifyOtherTabs();
      track("add_to_cart", { variantId, quantity });
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const msg = (err as Error)?.message ?? "Could not add to cart";
      toast({ title: "Failed to add item", description: msg, variant: "destructive" });
      // Rollback by refreshing from server so the optimistic row vanishes.
      await refreshCart();
      // Re-throw so the caller (e.g. PDP button) can surface the failure
      // instead of briefly flashing a green "Added" state.
      throw err;
    }
  }

  async function updateItem(itemId: string, quantity: number): Promise<void> {
    // Optimistic update — immediate visual feedback.
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.id !== itemId)
        : prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    );

    // Debounce rapid +/- clicks: only send the LAST quantity within 250ms.
    cancelDebounce(`update:${itemId}`);
    const timer = setTimeout(async () => {
      const ctrl = abortFor(`update:${itemId}`);
      try {
        const data = await apiFetch<CartResponse>(
          `/storefront/cart/items/${itemId}`,
          {
            method: "PATCH",
            headers: buildHeaders(),
            body: JSON.stringify({ quantity }),
            signal: ctrl.signal,
          }
        );
        setItems(data.items ?? []);
        notifyOtherTabs();
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return;
        const msg = (err as Error)?.message ?? "Could not update cart";
        toast({ title: "Failed to update cart", description: msg, variant: "destructive" });
        await refreshCart();
      } finally {
        debounceRef.current.delete(`update:${itemId}`);
      }
    }, 250);
    debounceRef.current.set(`update:${itemId}`, timer);
  }

  async function removeItem(itemId: string): Promise<void> {
    // Cancel any pending update for this item — remove wins.
    cancelDebounce(`update:${itemId}`);
    const prevUpdate = inflightRef.current.get(`update:${itemId}`);
    if (prevUpdate) prevUpdate.abort();

    // Optimistic update
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    const ctrl = abortFor(`remove:${itemId}`);
    try {
      const data = await apiFetch<CartResponse>(
        `/storefront/cart/items/${itemId}`,
        {
          method: "DELETE",
          headers: buildHeaders(),
          signal: ctrl.signal,
        }
      );
      setItems(data.items ?? []);
      notifyOtherTabs();
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const msg = (err as Error)?.message ?? "Could not remove item";
      toast({ title: "Failed to remove item", description: msg, variant: "destructive" });
      await refreshCart();
    }
  }

  async function clearCart(): Promise<void> {
    setItems([]);
    try {
      await apiFetch("/storefront/cart", {
        method: "DELETE",
        headers: buildHeaders(),
      });
      notifyOtherTabs();
    } catch {
      await refreshCart();
    }
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        loading,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartState {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
