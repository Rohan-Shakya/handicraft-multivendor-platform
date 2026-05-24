import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

/**
 * Any server-paginated resource returns this shape — used widely across
 * admin list endpoints.
 */
export interface PaginatedEnvelope<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ListPageState {
  page: number;
  /** Search string synced to `?q`. Empty string → param stripped. */
  search: string;
  /** Free-form filter values keyed by param name (e.g. `{ status: "active" }`). */
  filters: Record<string, string>;
  /** Sort spec synced to `?sort`. */
  sort: string;
  limit: number;
  view: "grid" | "list";
}

export interface UseListPageOptions<T> {
  /** Stable query key prefix — dictates invalidation. */
  key: readonly unknown[];
  /** Backend path relative to API base. Leading `/` required. */
  path: string;
  /** Param names to treat as filters (synced to URL + forwarded to backend). */
  filterKeys?: readonly string[];
  /** Default page size (overridable via ?limit). */
  limit?: number;
  /** Toggle whether data is kept while a re-fetch is in flight. */
  keepPrevious?: boolean;
  /** Additional query-string entries forwarded but not user-editable. */
  extraParams?: Record<string, string | undefined>;
  /** Select transform applied to the envelope. */
  select?: (envelope: PaginatedEnvelope<T>) => PaginatedEnvelope<T>;
}

/**
 * One-stop hook for list pages: reads pagination + filter + sort from the URL,
 * fetches the data via React Query, and hands back setters that round-trip
 * through the query string so every filter is bookmarkable.
 *
 * Usage:
 * ```ts
 * const list = useListPage<Product>({
 *   key: ["admin", "products"],
 *   path: "/admin/products",
 *   filterKeys: ["status", "vendorId"],
 * });
 * ```
 */
export function useListPage<T>(opts: UseListPageOptions<T>) {
  const [search, setSearch] = useSearchParams();

  const filterKeys = opts.filterKeys ?? [];
  const limit = Number(search.get("limit") ?? opts.limit ?? 20) || 20;
  const page = Math.max(1, Number(search.get("page") ?? "1") || 1);
  const q = search.get("q") ?? "";
  const sort = search.get("sort") ?? "";
  const view = search.get("view") === "grid" ? "grid" : "list";
  const filters = React.useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of filterKeys) {
      const v = search.get(k);
      if (v) out[k] = v;
    }
    return out;
  }, [search, filterKeys]);

  const state: ListPageState = { page, search: q, filters, sort, limit, view };

  // Build the request URL with all active query params.
  const requestQuery = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (q) requestQuery.set("search", q);
  if (sort) requestQuery.set("sort", sort);
  for (const [k, v] of Object.entries(filters)) requestQuery.set(k, v);
  for (const [k, v] of Object.entries(opts.extraParams ?? {})) {
    if (v != null && v !== "") requestQuery.set(k, v);
  }

  const query = useQuery({
    queryKey: [...opts.key, { page, q, sort, limit, filters, extra: opts.extraParams }],
    queryFn: ({ signal }) =>
      apiFetch<PaginatedEnvelope<T>>(`${opts.path}?${requestQuery}`, { signal }),
    placeholderData: opts.keepPrevious === false ? undefined : keepPreviousData,
    select: opts.select,
  });

  const patch = React.useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      setSearch(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(updates)) {
            if (v === null || v === undefined || v === "") next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearch]
  );

  return {
    state,
    query,
    data: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    totalPages: Math.max(1, Math.ceil((query.data?.total ?? 0) / limit)),
    isFetching: query.isFetching,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // State setters — every one resets `page` when the shape of results changes.
    setPage: (p: number) => patch({ page: p === 1 ? undefined : p }),
    setSearch: (q: string) => patch({ q: q || undefined, page: undefined }),
    setFilter: (name: string, value: string | undefined) =>
      patch({ [name]: value, page: undefined }),
    setSort: (s: string) => patch({ sort: s || undefined, page: undefined }),
    setView: (v: "grid" | "list") =>
      patch({ view: v === "list" ? undefined : v }),
    setLimit: (n: number) => patch({ limit: n, page: undefined }),
    clearFilters: () => {
      setSearch(
        (prev) => {
          const next = new URLSearchParams();
          const sortV = prev.get("sort");
          if (sortV) next.set("sort", sortV);
          return next;
        },
        { replace: true }
      );
    },
  };
}
