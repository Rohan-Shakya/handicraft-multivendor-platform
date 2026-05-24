import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface AdminNotification {
  id: string;
  title: string;
  body?: string | null;
  /** ISO date */
  createdAt: string;
  /** When null the notification is unread. */
  readAt?: string | null;
  /** Optional URL to open when the card is clicked. */
  actionUrl?: string | null;
  /** Free-form level so the UI can render an icon. */
  severity?: "info" | "success" | "warning" | "error";
  /** Topic key — maps to a filter tab (order, payment, inventory, …). */
  topic?: string;
}

interface NotificationsEnvelope {
  data: AdminNotification[];
  unread: number;
}

const KEY = ["admin", "notifications"] as const;
const POLL_MS = 30_000;

/**
 * Poll-based admin notifications. Every 30s we pull the latest feed + unread
 * count. When a real-time transport (SSE / WS) exists on the backend, swap
 * this for a subscription — the consumer API stays identical.
 */
export function useNotifications() {
  const client = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) =>
      apiFetch<NotificationsEnvelope>("/admin/notifications?limit=20", {
        signal,
      }).catch(() => ({ data: [], unread: 0 })),
    refetchInterval: POLL_MS,
    // Re-check when the tab regains focus so operators don't miss something.
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/notifications/${id}/read`, { method: "POST" }),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<NotificationsEnvelope>(KEY);
      if (prev) {
        client.setQueryData<NotificationsEnvelope>(KEY, {
          ...prev,
          unread: Math.max(0, prev.unread - 1),
          data: prev.data.map((n) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) client.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      apiFetch("/admin/notifications/read-all", { method: "POST" }),
    onMutate: async () => {
      await client.cancelQueries({ queryKey: KEY });
      const prev = client.getQueryData<NotificationsEnvelope>(KEY);
      if (prev) {
        client.setQueryData<NotificationsEnvelope>(KEY, {
          unread: 0,
          data: prev.data.map((n) => ({
            ...n,
            readAt: n.readAt ?? new Date().toISOString(),
          })),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) client.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });

  return {
    notifications: query.data?.data ?? [],
    unread: query.data?.unread ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    markAsRead: markAsRead.mutate,
    markAllRead: markAllRead.mutate,
    refetch: query.refetch,
  };
}
