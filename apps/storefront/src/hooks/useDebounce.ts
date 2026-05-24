"use client";

import * as React from "react";

/**
 * Returns a value that only updates after `delay` ms of no changes.
 * Handy for search autocomplete, filter debouncing, etc.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
