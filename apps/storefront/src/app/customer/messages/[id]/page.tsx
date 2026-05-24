"use client";

import {
  ArrowLeft,
  Loader2,
  Package,
  Send,
  ShoppingBag,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import { CustomerShell } from "@/components/CustomerShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ThreadDetail {
  id: string;
  subject: string;
  status: "open" | "resolved" | "closed";
  customerId: string;
  vendorId: string;
  productId: string | null;
  orderId: string | null;
  lastMessageAt: string;
  createdAt: string;
}

interface MessageRow {
  id: string;
  threadId: string;
  senderType: "customer" | "vendor";
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

interface ThreadResponse {
  thread: ThreadDetail;
  messages: MessageRow[];
}

function formatTime(date: string): string {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CustomerMessageThreadPage() {
  const { customer } = useAuth();
  const params = useParams<{ id: string }>();
  const threadId = params.id;

  const [data, setData] = React.useState<ThreadResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const listEndRef = React.useRef<HTMLDivElement | null>(null);

  const fetchThread = React.useCallback(async () => {
    if (!customer || !threadId) return;
    try {
      const res = await apiFetch<ThreadResponse>(
        `/storefront/messages/threads/${threadId}`
      );
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load thread.");
    } finally {
      setLoading(false);
    }
  }, [customer, threadId]);

  React.useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  React.useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [data?.messages.length]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !reply.trim() || !data) return;

    const optimisticMessage: MessageRow = {
      id: `optimistic-${Date.now()}`,
      threadId: data.thread.id,
      senderType: "customer",
      senderId: customer?.id ?? "",
      body: reply.trim(),
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setData({
      ...data,
      messages: [...data.messages, optimisticMessage],
    });
    const previous = reply;
    setReply("");
    setSending(true);

    try {
      await apiFetch(
        `/storefront/messages/threads/${data.thread.id}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ body: previous.trim() }),
        }
      );
      // Refetch to get the canonical row.
      await fetchThread();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not send reply.";
      toast({
        title: "Couldn't send reply",
        description: message,
        variant: "destructive",
      });
      // Roll back optimistic insertion.
      setData((d) =>
        d
          ? {
              ...d,
              messages: d.messages.filter(
                (m) => m.id !== optimisticMessage.id
              ),
            }
          : d
      );
      setReply(previous);
    } finally {
      setSending(false);
    }
  }

  return (
    <CustomerShell
      title="Conversation"
      breadcrumbs={[
        { label: "Messages", href: "/customer/messages" },
        { label: data?.thread.subject ?? "Thread" },
      ]}
      active="messages"
    >
      <div className="flex flex-col gap-4">
        <Link
          href="/customer/messages"
          className="group inline-flex items-center gap-1.5 self-start rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft
            className="size-3.5 transition-transform group-hover:-translate-x-0.5"
            aria-hidden
          />
          All conversations
        </Link>

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
            {error}
          </div>
        ) : data ? (
          <>
            <header className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">
                    {data.thread.subject}
                  </h2>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Store className="size-3" aria-hidden />
                    Started {formatTime(data.thread.createdAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
                    data.thread.status === "open"
                      ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {data.thread.status}
                </span>
              </div>
              {(data.thread.orderId || data.thread.productId) && (
                <div className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/30 px-5 py-3 sm:px-6">
                  {data.thread.orderId && (
                    <Link
                      href={`/customer/orders/${data.thread.orderId}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ShoppingBag className="size-3.5" aria-hidden />
                      View order
                    </Link>
                  )}
                  {data.thread.productId && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                      <Package className="size-3.5" aria-hidden />
                      Linked to product
                    </span>
                  )}
                </div>
              )}
            </header>

            <ul className="flex flex-col gap-3">
              {data.messages.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-border/70 bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
                  No messages yet.
                </li>
              ) : (
                data.messages.map((m) => {
                  const mine = m.senderType === "customer";
                  return (
                    <li
                      key={m.id}
                      className={cn(
                        "flex",
                        mine ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[75%]",
                          mine
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border bg-card text-foreground"
                        )}
                      >
                        <p
                          className="leading-relaxed"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {m.body}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-[10px] uppercase tracking-wide",
                            mine
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {mine ? "You" : "Seller"} ·{" "}
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
              <div ref={listEndRef} />
            </ul>

            {data.thread.status === "open" ? (
              <form
                onSubmit={handleReply}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
              >
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply…"
                  maxLength={5000}
                  rows={3}
                  className="w-full resize-none border-0 bg-transparent px-5 py-4 text-sm outline-none focus-visible:ring-0"
                />
                <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-5 py-3">
                  <p className="text-xs text-muted-foreground">
                    {reply.length}/5000
                  </p>
                  <Button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="h-10 gap-2 rounded-full px-5 font-semibold"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Send className="size-4" aria-hidden />
                    )}
                    Send
                  </Button>
                </div>
              </form>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/70 bg-card/60 px-5 py-4 text-center text-xs text-muted-foreground">
                This conversation is {data.thread.status}. Reach out via a new
                message if you need more help.
              </p>
            )}
          </>
        ) : null}
      </div>
    </CustomerShell>
  );
}
