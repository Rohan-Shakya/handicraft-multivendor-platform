"use client";

import * as React from "react";

const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 12;

export interface RecentlyViewedItem {
  id: string;
  handle: string;
  title: string;
  image?: string | null;
  price?: number | null;
  currencyCode?: string;
  vendorName?: string;
  viewedAt: number;
}

function read(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: RecentlyViewedItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("recently-viewed:updated"));
  } catch {
    /* quota — ignore */
  }
}

/**
 * Track recently-viewed products in localStorage. Used for the
 * "You recently viewed" carousel on product detail + home pages.
 */
export function useRecentlyViewed(): {
  items: RecentlyViewedItem[];
  add: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clear: () => void;
} {
  const [items, setItems] = React.useState<RecentlyViewedItem[]>([]);

  React.useEffect(() => {
    setItems(read());
    const onUpdate = () => setItems(read());
    window.addEventListener("recently-viewed:updated", onUpdate);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) onUpdate();
    });
    return () => {
      window.removeEventListener("recently-viewed:updated", onUpdate);
    };
  }, []);

  const add = React.useCallback(
    (item: Omit<RecentlyViewedItem, "viewedAt">) => {
      const current = read();
      const next = [
        { ...item, viewedAt: Date.now() },
        ...current.filter((i) => i.id !== item.id),
      ].slice(0, MAX_ITEMS);
      write(next);
      setItems(next);
    },
    []
  );

  const clear = React.useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  return { items, add, clear };
}
