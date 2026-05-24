"use client";

import {
  ArrowRight,
  Gift,
  History,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CustomerShell } from "@/components/CustomerShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LoyaltyBalance {
  balance: number;
  lifetimeEarned: number;
}

interface LoyaltyLedgerRow {
  id: string;
  type: "earn" | "redeem" | "adjust" | "expire";
  points: number;
  orderId: string | null;
  note: string | null;
  createdAt: string;
}

const TYPE_META: Record<
  LoyaltyLedgerRow["type"],
  { label: string; tone: string; icon: typeof Plus }
> = {
  earn: {
    label: "Earned",
    tone: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: Plus,
  },
  redeem: {
    label: "Redeemed",
    tone: "border-blue-200/70 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    icon: Minus,
  },
  adjust: {
    label: "Adjusted",
    tone: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    icon: Sparkles,
  },
  expire: {
    label: "Expired",
    tone: "border-border bg-muted text-muted-foreground",
    icon: History,
  },
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPoints(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export default function LoyaltyPage() {
  const { customer } = useAuth();
  const currency = getPlatformCurrency();

  const [balance, setBalance] = React.useState<LoyaltyBalance | null>(null);
  const [history, setHistory] = React.useState<LoyaltyLedgerRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [bal, hist] = await Promise.all([
          apiFetch<LoyaltyBalance>("/storefront/loyalty/balance"),
          apiFetch<{ data: LoyaltyLedgerRow[] }>(
            "/storefront/loyalty/history"
          ),
        ]);
        if (cancelled) return;
        setBalance(bal);
        setHistory(hist.data ?? []);
      } catch {
        if (!cancelled) {
          setBalance({ balance: 0, lifetimeEarned: 0 });
          setHistory([]);
        }
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
      title="Rewards"
      description="Earn points on every order and redeem them on your next purchase."
      breadcrumbs={[{ label: "Rewards" }]}
      active="loyalty"
    >
      <div className="flex flex-col gap-6">
        {/* Balance card */}
        <section
          aria-labelledby="loyalty-balance-heading"
          className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-lg sm:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary-foreground/80">
                <Sparkles className="size-3.5" aria-hidden />
                Current balance
              </p>
              <h2
                id="loyalty-balance-heading"
                className="mt-2 text-4xl font-medium tracking-tight tabular sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {loading ? (
                  <Skeleton className="h-12 w-40 bg-primary-foreground/20" />
                ) : (
                  `${formatPoints(balance?.balance ?? 0)} pts`
                )}
              </h2>
              {!loading && (balance?.balance ?? 0) > 0 && (
                <p className="mt-2 text-sm text-primary-foreground/80">
                  Worth about {formatPrice(balance?.balance ?? 0, currency)}{" "}
                  off your next order.
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 px-5 py-3 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/80">
                Lifetime earned
              </p>
              <p className="mt-1 text-xl font-semibold tabular">
                {loading ? (
                  <Skeleton className="h-6 w-20 bg-primary-foreground/20" />
                ) : (
                  `${formatPoints(balance?.lifetimeEarned ?? 0)} pts`
                )}
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Gift className="size-4 text-muted-foreground" aria-hidden />
              How it works
            </h2>
          </div>
          <ul className="grid gap-4 px-5 py-5 sm:grid-cols-3 sm:px-6">
            <HowItem
              step="1"
              title="Shop"
              body="Earn 1 point for every Rs 1 you spend on completed orders."
            />
            <HowItem
              step="2"
              title="Collect"
              body="Points credit automatically when your order ships. Track them right here."
            />
            <HowItem
              step="3"
              title="Redeem"
              body="Apply points at checkout for an instant discount. 1 point = Rs 1 off."
            />
          </ul>
        </section>

        {/* History */}
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <History
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              Activity
            </h2>
            <span className="text-xs text-muted-foreground">
              Last 50 transactions
            </span>
          </div>

          {loading ? (
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
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center sm:px-6">
              <span className="grid size-14 place-items-center rounded-full bg-muted">
                <Sparkles
                  className="size-6 text-muted-foreground"
                  aria-hidden
                />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">No activity yet</p>
                <p className="text-xs text-muted-foreground">
                  Place an order to start earning points.
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
              {history.map((row) => {
                const meta = TYPE_META[row.type] ?? TYPE_META.adjust;
                const Icon = meta.icon;
                const positive = row.points >= 0;
                return (
                  <li
                    key={row.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 sm:px-6"
                  >
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
                        meta.tone
                      )}
                    >
                      <Icon className="size-3" aria-hidden />
                      {meta.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(row.createdAt)}
                        {row.orderId && (
                          <>
                            <span aria-hidden className="px-1">
                              ·
                            </span>
                            <Link
                              href={`/customer/orders/${row.orderId}`}
                              className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              View order
                              <ArrowRight
                                className="size-3"
                                aria-hidden
                              />
                            </Link>
                          </>
                        )}
                      </p>
                      {row.note && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.note}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular",
                        positive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                      )}
                    >
                      {positive ? "+" : ""}
                      {formatPoints(row.points)} pts
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </CustomerShell>
  );
}

function HowItem({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex flex-col gap-2">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary"
      >
        {step}
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}
