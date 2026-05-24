import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { RevenueArea, LineSeries } from "@/components/charts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingDown, TrendingUp, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "7d" | "30d" | "90d" | "12m";

interface AnalyticsResponse {
  period: Period;
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

function delta(curr: number, prev: number): { pct: number; up: boolean } | null {
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return null;
  if (prev === 0) return curr > 0 ? { pct: 100, up: true } : null;
  const pct = ((curr - prev) / prev) * 100;
  return { pct: Math.abs(pct), up: pct >= 0 };
}

export function VendorAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    apiFetch<AnalyticsResponse>(`/vendor/analytics?period=${period}`, {
      signal: ctrl.signal,
    })
      .then(setData)
      .catch((err) => {
        if (err?.name !== "AbortError") setData(null);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [period]);

  const totals = data?.totals;
  const revenueNum = totals ? parseFloat(totals.revenue) : 0;
  const prevRevenueNum = totals ? parseFloat(totals.previousRevenue) : 0;
  const revenueDelta = totals ? delta(revenueNum, prevRevenueNum) : null;
  const ordersDelta = totals ? delta(totals.orders, totals.previousOrders) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Sales, orders, and best-sellers for your store."
        action={
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-36" aria-label="Time range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Headline KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="Revenue"
          value={loading ? "—" : formatPrice(revenueNum)}
          delta={revenueDelta}
          loading={loading}
        />
        <KpiCard
          title="Orders"
          value={loading ? "—" : (totals?.orders ?? 0).toLocaleString()}
          delta={ordersDelta}
          loading={loading}
        />
      </div>

      {/* Revenue chart */}
      <Card className="border shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Revenue over time</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : data && data.series.length > 0 ? (
            <RevenueArea
              data={data.series.map((p) => ({
                date: new Date(p.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                }),
                revenue: parseFloat(p.revenue),
              }))}
              xKey="date"
              yKey="revenue"
              height={260}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No sales in this period yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Orders chart */}
      <Card className="border shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Orders over time</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : data && data.series.length > 0 ? (
            <LineSeries
              data={data.series.map((p) => ({
                date: new Date(p.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                }),
                orders: p.orderCount,
              }))}
              xKey="date"
              series={[{ key: "orders", label: "Orders" }]}
              height={220}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No orders in this period yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top products */}
      <Card className="border shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Top products</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="space-y-2 px-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.topProducts.length > 0 ? (
            <ul className="divide-y">
              {data.topProducts.map((p, idx) => (
                <li
                  key={p.productId}
                  className="flex items-center gap-4 px-6 py-3"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-bold tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.unitsSold.toLocaleString()} unit
                      {p.unitsSold === 1 ? "" : "s"} sold
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {formatPrice(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              No products sold in this period yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  delta,
  loading,
}: {
  title: string;
  value: string;
  delta: { pct: number; up: boolean } | null;
  loading?: boolean;
}) {
  return (
    <Card className="border p-6 shadow-none">
      <p className="text-sm text-muted-foreground">{title}</p>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-32" />
      ) : (
        <p className="mt-1.5 text-3xl font-bold tracking-tight">{value}</p>
      )}
      {delta && !loading && (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            delta.up ? "text-emerald-600" : "text-destructive"
          )}
        >
          {delta.up ? (
            <TrendingUp className="size-3.5" aria-hidden />
          ) : (
            <TrendingDown className="size-3.5" aria-hidden />
          )}
          {delta.pct.toFixed(1)}% vs previous period
        </p>
      )}
      {!delta && !loading && (
        <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
          <ShoppingBag className="size-3.5" aria-hidden />
          No prior period data
        </p>
      )}
    </Card>
  );
}
