"use client";

import type { Order, OrderStatus, PaginatedResponse } from "@repo/types";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CustomerShell } from "@/components/CustomerShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, { wrap: string; dot: string }> = {
  pending: {
    wrap: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  confirmed: {
    wrap: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  processing: {
    wrap: "border-blue-200/70 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  shipped: {
    wrap: "border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  delivered: {
    wrap: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelled: {
    wrap: "border-red-200/70 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
    dot: "bg-red-500",
  },
  refunded: {
    wrap: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  completed: {
    wrap: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  open: {
    wrap: "border-blue-200/70 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
  },
};

function StatusPill({ status }: { status: OrderStatus | string }) {
  const tone =
    STATUS_TONE[status] ?? {
      wrap: "border-border bg-muted text-muted-foreground",
      dot: "bg-muted-foreground",
    };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
        tone.wrap
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", tone.dot)} />
      {status.toString().replace(/_/g, " ")}
    </span>
  );
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const PAGE_LIMIT = 10;

const FILTERS: Array<{ id: string; label: string; statuses: string[] | "all" }> = [
  { id: "all", label: "All", statuses: "all" },
  { id: "active", label: "Active", statuses: ["open", "pending", "confirmed", "processing", "shipped"] },
  { id: "completed", label: "Completed", statuses: ["completed", "delivered"] },
  { id: "cancelled", label: "Cancelled", statuses: ["cancelled", "refunded"] },
];

export default function OrdersPage() {
  const { customer } = useAuth();

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [filterId, setFilterId] = React.useState<string>("all");

  React.useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    async function fetchOrders() {
      setLoading(true);
      try {
        const data = await apiFetch<PaginatedResponse<Order>>(
          `/storefront/orders?limit=${PAGE_LIMIT}&page=${page}`
        );
        if (cancelled) return;
        setOrders(data.data ?? []);
        setTotal(data.total ?? 0);
      } catch {
        if (!cancelled) {
          setOrders([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [customer, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const visibleOrders = React.useMemo(() => {
    const filter = FILTERS.find((f) => f.id === filterId);
    if (!filter || filter.statuses === "all") return orders;
    return orders.filter((o) => filter.statuses.includes(o.status));
  }, [orders, filterId]);

  return (
    <CustomerShell
      title="Orders"
      description="Track shipments, download invoices, and start returns."
      breadcrumbs={[{ label: "Orders" }]}
      active="orders"
    >
      <div className="flex flex-col gap-6">
        {/* Filter pills */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => {
            const isActive = f.id === filterId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterId(f.id)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Orders list */}
        {loading ? (
          <ul className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <li key={i}>
                <Skeleton className="h-24 rounded-2xl" />
              </li>
            ))}
          </ul>
        ) : visibleOrders.length === 0 ? (
          <EmptyState filtered={filterId !== "all"} />
        ) : (
          <ul className="flex flex-col gap-3">
            {visibleOrders.map((order) => {
              const currency =
                (order as Order & { currencyCode?: string }).currencyCode ??
                "USD";
              const itemCount = order.items?.length ?? 0;
              return (
                <li key={order.id}>
                  <Link
                    href={`/customer/orders/${order.id}`}
                    className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 outline-none shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-6"
                  >
                    <div className="flex items-center gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted/70 ring-1 ring-inset ring-border transition-colors group-hover:bg-primary/10 group-hover:ring-primary/30">
                        <Package
                          className="size-5 text-muted-foreground transition-colors group-hover:text-primary"
                          aria-hidden
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Order #{order.orderNumber}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" aria-hidden />
                          {formatDate(order.createdAt)}
                          {itemCount > 0 && (
                            <>
                              <span aria-hidden>·</span>
                              <span>
                                {itemCount} {itemCount === 1 ? "item" : "items"}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusPill status={order.status} />
                      <span className="text-sm font-semibold tabular">
                        {formatPrice(order.totalPrice, currency)}
                      </span>
                      <ArrowRight
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <nav
            aria-label="Orders pagination"
            className="mt-2 flex items-center justify-between gap-3 border-t border-border/60 pt-4"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-10 rounded-full px-4"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Button>
            <p className="text-xs font-medium text-muted-foreground tabular">
              Page {page} of {totalPages}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-10 rounded-full px-4"
            >
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </nav>
        )}
      </div>
    </CustomerShell>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/70 bg-card/60 px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-muted">
        <Package className="size-7 text-muted-foreground" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p
          className="text-lg font-medium tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {filtered ? "No orders match this filter" : "No orders yet"}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {filtered
            ? "Try a different filter or browse all orders."
            : "When you place an order, it'll appear here."}
        </p>
      </div>
      <Button asChild className="mt-1 h-11 rounded-full px-6 font-semibold">
        <Link href="/products">Start shopping</Link>
      </Button>
    </div>
  );
}
