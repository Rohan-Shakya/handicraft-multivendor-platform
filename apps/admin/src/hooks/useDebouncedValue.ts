import { useEffect, useState } from "react";

/**
 * Debounces a rapidly-changing value (e.g. a search input). Returns the
 * latest value only after `delayMs` of inactivity. Drop-in replacement for
 * the hand-rolled `setTimeout`/`clearTimeout` blocks scattered across list
 * pages.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
