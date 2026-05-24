"use client";

import {
  ArrowRight,
  Clock,
  MessageSquare,
  Store,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CustomerShell } from "@/components/CustomerShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ThreadRow {
  id: string;
  subject: string;
  status: "open" | "resolved" | "closed";
  lastMessageAt: string;
  unread: number;
  vendorName: string;
  vendorSlug: string;
  productId: string | null;
  orderId: string | null;
}

function formatRelative(date: string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.round(diff / minute)} min ago`;
  if (diff < day) return `${Math.round(diff / hour)} h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)} d ago`;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MessagesPage() {
  const { customer } = useAuth();
  const [threads, setThreads] = React.useState<ThreadRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch<{ data: ThreadRow[] }>(
          "/storefront/messages/threads"
        );
        if (!cancelled) setThreads(res.data ?? []);
      } catch {
        if (!cancelled) setThreads([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [customer]);

  return (
    <CustomerShell
      title="Messages"
      description="Conversations with sellers about your products and orders."
      breadcrumbs={[{ label: "Messages" }]}
      active="messages"
    >
      <div className="flex flex-col gap-6">
        {loading ? (
          <ul className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <li key={i}>
                <Skeleton className="h-24 rounded-2xl" />
              </li>
            ))}
          </ul>
        ) : threads.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-3">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/customer/messages/${t.id}`}
                  className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 outline-none shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-6"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span
                      className={cn(
                        "grid size-12 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition-colors",
                        t.unread > 0
                          ? "bg-primary/10 ring-primary/30 text-primary"
                          : "bg-muted/70 ring-border text-muted-foreground"
                      )}
                    >
                      <Store className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {t.subject}
                        </p>
                        {t.unread > 0 && (
                          <span
                            aria-label={`${t.unread} unread`}
                            className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground"
                          >
                            {t.unread}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Store className="size-3" aria-hidden />
                        {t.vendorName}
                        <span aria-hidden>·</span>
                        <Clock className="size-3" aria-hidden />
                        {formatRelative(t.lastMessageAt)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CustomerShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/70 bg-card/60 px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-muted">
        <MessageSquare className="size-7 text-muted-foreground" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p
          className="text-lg font-medium tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          No conversations yet
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Use the &ldquo;Ask the seller&rdquo; button on any product or order to
          start a chat.
        </p>
      </div>
    </div>
  );
}
