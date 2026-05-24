import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { brand } from "@/config/brand";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Boxes,
  CalendarRange,
  MessageSquare,
  Package,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  Star,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { OrderItem } from "@repo/types";

/** The dashboard endpoint joins through to the order_items.title column so the
 *  recent-orders list can show product names without a second fetch. */
type RecentOrderItem = OrderItem & { title: string };

// ─── Types ───────────────────────────────────────────────────────────────────

type PeriodKey = "7d" | "30d" | "90d" | "12m";

interface VendorStats {
  productCount: number;
  pendingItemCount: number;
  activeItemCount: number;
  revenue: string;
  avgRating: number | null;
  recentItems: RecentOrderItem[];
}

interface VendorAnalytics {
  period: string;
  series: Array<{
    date: string;
    revenue: string;
    orderCount: number;
    unitsSold: number;
  }>;
  topProducts: Array<{
    productId: string;
    title: string;
    unitsSold: number;
    revenue: string;
  }>;
  totals: {
    revenue: string;
    previousRevenue: string;
    orders: number;
    previousOrders: number;
  };
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({
  data,
  color = "currentColor",
  width = 96,
  height = 36,
}: {
  data: Array<{ value: number }>;
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return <div style={{ width, height }} aria-hidden />;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d.value - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${width.toFixed(1)},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={areaPath} fill={color} fillOpacity={0.12} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  changePercent,
  series,
  loading,
  accent = "var(--primary)",
  icon: Icon,
}: {
  label: string;
  value: string;
  changePercent?: number;
  series?: Array<{ value: number }>;
  loading?: boolean;
  accent?: string;
  icon?: React.ElementType;
}) {
  const positive = (changePercent ?? 0) >= 0;
  const deltaColor = positive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
  return (
    <Card className="relative overflow-hidden border bg-card p-5 shadow-none">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{ background: `linear-gradient(180deg, ${accent}15 0%, transparent 100%)` }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <span
                className="flex size-7 items-center justify-center rounded-lg"
                style={{ background: `${accent}20`, color: accent }}
              >
                <Icon className="size-4" aria-hidden />
              </span>
            )}
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            )}
            {changePercent !== undefined && !loading && (
              <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
                {positive ? (
                  <TrendingUp className="size-3" aria-hidden />
                ) : (
                  <TrendingDown className="size-3" aria-hidden />
                )}
                {Math.abs(changePercent).toFixed(1)}%
                <span className="font-normal text-muted-foreground">vs prior</span>
              </p>
            )}
          </div>
        </div>
        {series && series.length > 1 && !loading && (
          <div className="self-end" style={{ color: accent }}>
            <Sparkline data={series} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Quick action ────────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  hint,
  to,
  badge,
  accent = "var(--primary)",
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  to: string;
  badge?: number | string;
  accent?: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-xl border bg-card p-4 shadow-none transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accent}20`, color: accent }}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{label}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {badge !== undefined && badge !== 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: `${accent}20`, color: accent }}
          >
            {badge}
          </span>
        )}
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

// ─── Period chips ────────────────────────────────────────────────────────────

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "12m", label: "12m" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export function VendorDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<VendorStats>("/vendor/dashboard", { signal: controller.signal })
      .then((d) => {
        setStats(d);
        setFetchError(null);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setStats(null);
        const message = err instanceof Error ? err.message : "Failed to load dashboard data";
        setFetchError(message);
        // eslint-disable-next-line no-console
        console.error("[vendor-dashboard] /vendor/dashboard failed:", err);
      })
      .finally(() => setStatsLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setAnalyticsLoading(true);
    apiFetch<VendorAnalytics>(`/vendor/analytics?period=${period}`, {
      signal: controller.signal,
    })
      .then((d) => setAnalytics(d))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setAnalytics(null);
        const message = err instanceof Error ? err.message : "Failed to load analytics";
        setFetchError((prev) => prev ?? message);
        // eslint-disable-next-line no-console
        console.error("[vendor-dashboard] /vendor/analytics failed:", err);
      })
      .finally(() => setAnalyticsLoading(false));
    return () => controller.abort();
  }, [period]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const periodLabel =
    period === "7d"
      ? "this week"
      : period === "30d"
        ? "this month"
        : period === "90d"
          ? "this quarter"
          : "this year";

  const revenueSeries = useMemo(
    () => (analytics?.series ?? []).map((p) => ({ value: Number(p.revenue) || 0 })),
    [analytics]
  );
  const ordersSeries = useMemo(
    () => (analytics?.series ?? []).map((p) => ({ value: Number(p.orderCount) || 0 })),
    [analytics]
  );

  const revenueChange = useMemo(() => {
    if (!analytics) return undefined;
    const curr = Number(analytics.totals.revenue) || 0;
    const prev = Number(analytics.totals.previousRevenue) || 0;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  }, [analytics]);

  const ordersChange = useMemo(() => {
    if (!analytics) return undefined;
    const curr = analytics.totals.orders;
    const prev = analytics.totals.previousOrders;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  }, [analytics]);

  const currentRevenue = analytics
    ? formatPrice(Number(analytics.totals.revenue) || 0)
    : "—";

  return (
    <div className="space-y-6">
      {/* Error banner — visible when an API call failed so vendors don't stare
          at silent "—" placeholders. Common causes: stale JWT, server down,
          or the actor is missing the `vendor` role. */}
      {fetchError && !statsLoading && !analyticsLoading && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/60">
            !
          </span>
          <div className="flex-1">
            <p className="font-semibold">Couldn&apos;t load dashboard data</p>
            <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/80">
              {fetchError}. Try refreshing the page or check that you&apos;re signed in as a vendor.
            </p>
          </div>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Card className="relative overflow-hidden border-none bg-primary p-7 text-primary-foreground shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-4 size-48 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm/6 text-primary-foreground/80">{greeting}</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Here's how your {brand.shortName} workshop is doing {periodLabel}{" "}
              <span aria-hidden>✨</span>
            </h1>
            <div className="flex items-baseline gap-3 pt-1">
              {analyticsLoading ? (
                <Skeleton className="h-10 w-44 bg-white/20" />
              ) : (
                <>
                  <span className="text-4xl font-bold tracking-tight md:text-5xl tabular-nums">
                    {currentRevenue}
                  </span>
                  <span className="text-sm font-medium text-primary-foreground/85">
                    Revenue
                  </span>
                </>
              )}
            </div>
            {revenueChange !== undefined && !analyticsLoading && (
              <p className="text-sm text-primary-foreground/85">
                {revenueChange >= 0 ? "↑" : "↓"} {Math.abs(revenueChange).toFixed(1)}% vs prior
                period
              </p>
            )}
            <div className="pt-3">
              <Button
                asChild
                variant="secondary"
                className="rounded-full bg-white text-primary hover:bg-white/90"
              >
                <Link to="/vendor/analytics">
                  View full analytics
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Period selector */}
          <div
            className="inline-flex items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur"
            role="tablist"
            aria-label="Reporting period"
          >
            <CalendarRange className="ml-2 size-3.5 text-primary-foreground/70" aria-hidden />
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  period === p.key
                    ? "bg-white text-primary"
                    : "text-primary-foreground/85 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={
            analytics ? formatPrice(Number(analytics.totals.revenue) || 0) : "—"
          }
          changePercent={revenueChange}
          series={revenueSeries}
          loading={analyticsLoading}
          accent="#16a34a"
          icon={Wallet}
        />
        <KpiCard
          label="Orders"
          value={analytics ? String(analytics.totals.orders) : "—"}
          changePercent={ordersChange}
          series={ordersSeries}
          loading={analyticsLoading}
          accent="#2563eb"
          icon={ShoppingCart}
        />
        <KpiCard
          label="Catalog size"
          value={stats ? String(stats.productCount) : "—"}
          loading={statsLoading}
          accent="#9333ea"
          icon={Boxes}
        />
        <KpiCard
          label="Avg. rating"
          value={
            stats?.avgRating != null ? `${stats.avgRating.toFixed(1)} / 5` : "—"
          }
          loading={statsLoading}
          accent="#d97706"
          icon={Star}
        />
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            icon={PackagePlus}
            label={`Add ${brand.productNoun}`}
            hint="Create a new listing"
            to="/vendor/products"
            accent="#16a34a"
          />
          <QuickAction
            icon={ShoppingCart}
            label="Pending orders"
            hint="Need fulfilment"
            to="/vendor/orders?status=open"
            badge={stats?.pendingItemCount ?? 0}
            accent="#d97706"
          />
          <QuickAction
            icon={MessageSquare}
            label="Customer messages"
            hint="Replies & bulk quotes"
            to="/vendor/messages"
            accent="#2563eb"
          />
          <QuickAction
            icon={ReceiptText}
            label="Reviews"
            hint="Moderate & reply"
            to="/vendor/reviews"
            accent="#9333ea"
          />
        </div>
      </div>

      {/* ── Top products + Recent orders ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Top products (left, 2/5) */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Top {brand.productNounPlural} · {periodLabel}
          </h2>
          <Card className="overflow-hidden border shadow-none">
            {analyticsLoading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            ) : !analytics?.topProducts.length ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-3 rounded-full bg-muted p-3">
                  <Package className="size-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm font-medium">
                  {brand.emptyStates.topProductsTitle}
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  {brand.emptyStates.topProductsDescription}
                </p>
              </div>
            ) : (
              <ol className="divide-y">
                {analytics.topProducts.map((p, idx) => (
                  <li
                    key={p.productId}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.unitsSold} sold · {formatPrice(Number(p.revenue) || 0)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Recent orders (right, 3/5) */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Recent orders
            </h2>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link to="/vendor/orders">
                View all
                <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
          <Card className="overflow-hidden border shadow-none">
            {statsLoading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="ml-auto h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : !stats?.recentItems.length ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="mb-3 rounded-full bg-muted p-3">
                  <ShoppingCart className="size-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm font-medium">{brand.emptyStates.ordersTitle}</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  {brand.emptyStates.ordersDescription}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Order</TableHead>
                    <TableHead className="font-semibold">Item</TableHead>
                    <TableHead className="font-semibold">Qty</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentItems.slice(0, 6).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.orderId.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {item.title}
                      </TableCell>
                      <TableCell className="tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatPrice(Number(item.totalPrice))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
