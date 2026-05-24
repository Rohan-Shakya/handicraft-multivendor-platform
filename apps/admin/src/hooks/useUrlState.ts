import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Two-way bind a piece of list-page state (filter, sort, page, search) to
 * the URL's query string. Lets users bookmark / share / refresh filtered views.
 *
 * Usage:
 * ```tsx
 * const [status, setStatus] = useUrlState("status", "");
 * const [page, setPage] = useUrlState("page", 1, { parse: Number });
 * ```
 */
export function useUrlState<T extends string | number>(
  key: string,
  defaultValue: T,
  options?: {
    parse?: (raw: string) => T;
    serialize?: (v: T) => string;
  }
): [T, (next: T) => void] {
  const [search, setSearch] = useSearchParams();

  const parse = options?.parse ?? ((raw: string) => raw as T);
  const serialize = options?.serialize ?? ((v: T) => String(v));

  const value = useMemo<T>(() => {
    const raw = search.get(key);
    if (raw === null) return defaultValue;
    try {
      return parse(raw);
    } catch {
      return defaultValue;
    }
  }, [search, key, defaultValue, parse]);

  const setValue = useCallback(
    (next: T) => {
      setSearch(
        (prev) => {
          const params = new URLSearchParams(prev);
          const serialized = serialize(next);
          const isEmpty =
            serialized === "" ||
            serialized === serialize(defaultValue) ||
            next === null ||
            next === undefined;
          if (isEmpty) {
            params.delete(key);
          } else {
            params.set(key, serialized);
          }
          return params;
        },
        { replace: true }
      );
    },
    [setSearch, key, defaultValue, serialize]
  );

  return [value, setValue];
}
