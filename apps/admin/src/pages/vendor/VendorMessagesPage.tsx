import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Loader2,
  MessageSquare,
  Package,
  Send,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ThreadRow {
  id: string;
  subject: string;
  status: "open" | "resolved" | "closed";
  lastMessageAt: string;
  unread: number;
  customerName: string;
  customerEmail: string;
  productId: string | null;
  orderId: string | null;
}

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

function formatTime(date: string): string {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── List page ──────────────────────────────────────────────────────────────

export function VendorMessagesPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch<{ data: ThreadRow[] }>(
          "/vendor/messages/threads",
          { signal: controller.signal }
        );
        setThreads(res.data ?? []);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") setThreads([]);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Messages"
        description="Conversations with your customers about products and orders."
      />

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="When a customer asks a question, it'll show up here."
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => navigate(`/vendor/messages/${t.id}`)}
                className="group flex w-full items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 text-left shadow-sm transition-all hover:border-foreground/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-lg ring-1 ring-inset",
                      t.unread > 0
                        ? "bg-primary/10 text-primary ring-primary/30"
                        : "bg-muted text-muted-foreground ring-border"
                    )}
                  >
                    <UserRound className="size-4" aria-hidden />
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
                      <UserRound className="size-3" aria-hidden />
                      <span className="truncate">{t.customerName}</span>
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Thread page ────────────────────────────────────────────────────────────

export function VendorMessageThreadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const fetchThread = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch<{ thread: ThreadDetail; messages: MessageRow[] }>(
        `/vendor/messages/threads/${id}`
      );
      setThread(res.thread);
      setMessages(res.messages);
    } catch (err) {
      toast({
        title: "Could not load thread",
        description: (err as Error)?.message ?? "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!id || sending || !reply.trim()) return;
    const previous = reply.trim();
    setSending(true);
    try {
      await apiFetch(`/vendor/messages/threads/${id}/reply`, {
        method: "POST",
        body: JSON.stringify({ body: previous }),
      });
      setReply("");
      await fetchThread();
    } catch (err) {
      toast({
        title: "Couldn't send reply",
        description: (err as Error)?.message ?? "Try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/vendor/messages")}
        className="mb-4 gap-1.5"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        All conversations
      </Button>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      ) : !thread ? null : (
        <>
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">
                  {thread.subject}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Started {formatTime(thread.createdAt)}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
                  thread.status === "open"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                {thread.status}
              </span>
            </div>
            {(thread.orderId || thread.productId) && (
              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                {thread.orderId && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                    <ShoppingBag className="size-3.5" aria-hidden />
                    Linked to an order
                  </span>
                )}
                {thread.productId && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Package className="size-3.5" aria-hidden />
                    Linked to a product
                  </span>
                )}
              </div>
            )}
          </Card>

          <ul className="mb-4 flex flex-col gap-3">
            {messages.length === 0 ? (
              <li className="rounded-lg border border-dashed bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
                No messages yet.
              </li>
            ) : (
              messages.map((m) => {
                const mine = m.senderType === "vendor";
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
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        mine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md border bg-card text-foreground"
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
                        {mine ? "You" : "Customer"} ·{" "}
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })
            )}
            <div ref={listEndRef} />
          </ul>

          {thread.status === "open" ? (
            <form
              onSubmit={handleReply}
              className="overflow-hidden rounded-lg border bg-card shadow-sm"
            >
              <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply to the customer…"
                  maxLength={5000}
                  rows={4}
                  className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm outline-none focus-visible:ring-0"
                />
                <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    {reply.length}/5000
                  </p>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={sending || !reply.trim()}
                    className="gap-1.5"
                  >
                    {sending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Send className="size-3.5" aria-hidden />
                    )}
                    Send reply
                  </Button>
                </div>
              </form>
          ) : (
            <p className="rounded-lg border border-dashed bg-card/60 px-4 py-3 text-center text-xs text-muted-foreground">
              This conversation is {thread.status}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
