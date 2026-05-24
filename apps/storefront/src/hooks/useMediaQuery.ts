"use client";

import * as React from "react";

/**
 * Live media-query matcher. Returns `false` on the server so SSR stays stable.
 */
export function useMediaQuery(query: string): boolean {
  const get = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = React.useState<boolean>(() => get());

  React.useEffect(() => {
    const list = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(list.matches);
    list.addEventListener("change", handler);
    return () => list.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export const useIsMobile = () => useMediaQuery("(max-width: 768px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
