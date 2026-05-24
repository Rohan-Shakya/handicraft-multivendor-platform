"use client";

import type { Order, OrderStatus, PaginatedResponse } from "@repo/types";
import {
  ArrowRight,
  Clock,
  Heart,
  MapPin,
  MessageSquare,
  Package,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CustomerShell } from "@/components/CustomerShell";
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

const QUICK_ACTIONS = [
  {
    href: "/customer/orders",
    icon: Package,
    label: "Track an order",
    blurb: "See status, shipments and returns.",
  },
  {
    href: "/customer/loyalty",
    icon: Sparkles,
    label: "Rewards & points",
    blurb: "Check your balance and earn history.",
  },
  {
    href: "/customer/messages",
    icon: MessageSquare,
    label: "Messages",
    blurb: "Talk to sellers about products & orders.",
  },
  {
    href: "/customer/addresses",
    icon: MapPin,
    label: "Manage addresses",
    blurb: "Save destinations for faster checkout.",
  },
  {
    href: "/wishlist",
    icon: Heart,
    label: "Your wishlist",
    blurb: "Pieces you've saved for later.",
  },
  {
    href: "/customer/account/settings",
    icon: User,
    label: "Profile & security",
    blurb: "Update name, email and password.",
  },
];

export default function AccountPage() {
  const { customer, loading: authLoading } = useAuth();

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);

  React.useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    async function fetchOrders() {
      setLoadingOrders(true);
      try {
        const data = await apiFetch<PaginatedResponse<Order>>(
          "/storefront/orders?limit=4"
        );
        if (!cancelled) setOrders(data.data ?? []);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    }
    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [customer]);

  return (
    <CustomerShell
      title="Your account"
      description="Manage orders, saved pieces and account details from one place."
      breadcrumbs={[{ label: "Account" }]}
      active="account"
    >
      <div className="flex flex-col gap-6">
        {/* Quick actions grid */}
        <ul className="grid gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map(({ href, icon: Icon, label, blurb }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 outline-none transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted/70 ring-1 ring-inset ring-border transition-colors group-hover:bg-primary/10 group-hover:ring-primary/30">
                  <Icon
                    className="size-5 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {blurb}
                  </p>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>

        {/* Account information */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <User
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              Account information
            </h2>
            <Link
              href="/customer/account/settings"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Edit
            </Link>
          </div>
          <dl className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6">
            {authLoading || !customer ? (
              <>
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </>
            ) : (
              <>
                <InfoCell
                  label="First name"
                  value={customer.firstName ?? "—"}
                />
                <InfoCell
                  label="Last name"
                  value={customer.lastName ?? "—"}
                />
                <div className="sm:col-span-2">
                  <InfoCell label="Email" value={customer.email} />
                </div>
              </>
            )}
          </dl>
        </div>

        {/* Recent orders */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ShoppingBag
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              Recent orders
            </h2>
            <Link
              href="/customer/orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {loadingOrders ? (
            <div className="divide-y divide-border/60">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center sm:px-6">
              <span className="grid size-14 place-items-center rounded-full bg-muted">
                <Package
                  className="size-6 text-muted-foreground"
                  aria-hidden
                />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">No orders yet</p>
                <p className="text-xs text-muted-foreground">
                  When you place an order, it&apos;ll appear here.
                </p>
              </div>
              <Link
                href="/products"
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {orders.map((order) => {
                const currency =
                  (order as Order & { currencyCode?: string }).currencyCode ??
                  "USD";
                return (
                  <li key={order.id}>
                    <Link
                      href={`/customer/orders/${order.id}`}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 sm:grid-cols-[1fr_auto_auto_auto] sm:px-6"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          Order #{order.orderNumber}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" aria-hidden />
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <StatusPill status={order.status} />
                      </div>
                      <span className="text-sm font-semibold tabular">
                        {formatPrice(order.totalPrice, currency)}
                      </span>
                      <ArrowRight
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </CustomerShell>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
