import {
  QueryClient,
  type QueryClientConfig,
  type DefaultError,
} from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

/**
 * Shared React Query client.
 *
 * Defaults optimised for an admin UI:
 *   - Short `staleTime` (30s) so table data feels live but we still dedupe
 *     rapid re-mounts.
 *   - Retry GETs once on transient failure (5xx / network).
 *   - Never retry mutations — surface the error to the user immediately.
 *   - Surface unhandled errors via toast so individual mutations don't need
 *     boilerplate `onError` handlers.
 *   - Keep requests on window-focus stable (most admin surfaces prefer the
 *     "pull to refresh" button rather than surprise reloads).
 */
const config: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false;
        const err = error as DefaultError & { statusCode?: number };
        // Never retry auth / authorization / client errors.
        if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
          return false;
        }
        return true;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        const err = error as DefaultError & {
          statusCode?: number;
          message?: string;
        };
        // Swallow auth errors — the apiFetch interceptor redirects to login.
        if (err?.statusCode === 401) return;
        toast({
          title: "Something went wrong",
          description:
            err?.message ??
            "The server rejected the request. Please try again.",
          variant: "destructive",
        });
      },
    },
  },
};

export const queryClient = new QueryClient(config);

/**
 * Helper to invalidate every query whose key starts with `prefix`.
 * Use after mutations that affect multiple unrelated pages (e.g. vendor
 * approval invalidates both the list AND the dashboard counters).
 */
export function invalidateByPrefix(prefix: string | readonly string[]) {
  const key = Array.isArray(prefix) ? prefix : [prefix];
  return queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey.length >= key.length &&
      (key as string[]).every((part, i) => q.queryKey[i] === part),
  });
}
