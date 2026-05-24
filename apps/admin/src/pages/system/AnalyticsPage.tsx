import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPrice, currencySymbol } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsData {
  revenue: {
    series: Array<{ date: string; amount: number }>;
    total: number;
    previousTotal: number;
    changePercent: number;
  };
  orders: {
    series: Array<{ date: string; count: number }>;
    total: number;
    previousTotal: number;
    changePercent: number;
  };
  averageOrderValue: {
    current: number;
    previous: number;
    changePercent: number;
  };
  topProducts: Array<{
    productId: string;
    title: string;
    totalSold: number;
    revenue: number;
  }>;
}

interface DashboardStats {
  vendorCount: number;
  orderCount: number;
  customerCount: number;
  productCount: number;
  totalRevenue: string;
  recentOrders: Array<{ id: string; status: string }>;
  pendingApprovals?: number;
  pendingKyc?: number;
  pendingReturns?: number;
  pendingReviews?: number;
}

type PeriodKey = "7d" | "30d" | "90d" | "12m";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Currency in this aggregate view = platform default. */
function formatCents(cents: number): string {
  const major = cents / 100;
  const sym = currencySymbol();
  if (major >= 1_000_000) return `${sym}${(major / 1_000_000).toFixed(1)}M`;
  if (major >= 1000) return `${sym}${(major / 1000).toFixed(1)}k`;
  return formatPrice(major);
}

function formatDollars(cents: number): string {
  return formatPrice(cents / 100);
}

function formatDateLabel(dateStr: string, period: PeriodKey): string {
  const d = new Date(dateStr);
  if (period === "12m") {
    return d.toLocaleDateString(undefined, { month: "short" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Period Selector ────────────────────────────────────────────────────────

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
];

function PeriodTabs({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (v: PeriodKey) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === p.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Summary Card ───────────────────────────────────────────────────────────

interface SummaryCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
}

function SummaryCard({
  title,
  value,
  change,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
}: SummaryCardProps) {
  const direction = change != null && change >= 0 ? "up" : "down";
  return (
    <Card className="p-5 border shadow-none">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
          )}
          {change != null && !loading && (
            <div className="mt-1.5 flex items-center gap-1">
              {direction === "up" ? (
                <TrendingUp className="size-3.5 text-green-600" />
              ) : (
                <TrendingDown className="size-3.5 text-red-500" />
              )}
              <span
                className={`text-xs font-medium ${
                  direction === "up" ? "text-green-600" : "text-red-500"
                }`}
              >
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs prior period
              </span>
            </div>
          )}
        </div>
        <div className={`rounded-full p-2.5 ${iconBg} shrink-0 ml-4`}>
          <Icon className={`size-5 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}

// ─── SVG Area Chart ─────────────────────────────────────────────────────────

interface AreaChartProps {
  data: Array<{ label: string; value: number }>;
  width: number;
  height: number;
  formatValue: (v: number) => string;
  color?: string;
  id: string;
}

function AreaChart({
  data,
  width,
  height,
  formatValue,
  color = "#3b82f6",
  id,
}: AreaChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const padding = { top: 24, right: 20, bottom: 48, left: 64 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { points, yTicks, xTicks } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], yTicks: [], xTicks: [] };
    }
    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const mn = Math.max(0, rawMin - (rawMax - rawMin) * 0.1);
    const mx = rawMax + (rawMax - rawMin) * 0.1 || 1;

    const pts = data.map((d, i) => ({
      x:
        padding.left +
        (data.length > 1
          ? (i / (data.length - 1)) * chartW
          : chartW / 2),
      y: padding.top + chartH - ((d.value - mn) / (mx - mn)) * chartH,
      ...d,
    }));

    const tickCount = 5;
    const yT = Array.from({ length: tickCount + 1 }, (_, i) => {
      const val = mn + ((mx - mn) * i) / tickCount;
      return {
        value: val,
        y: padding.top + chartH - ((val - mn) / (mx - mn)) * chartH,
      };
    });

    const labelCount = Math.min(data.length, 8);
    const step = Math.max(1, Math.floor((data.length - 1) / (labelCount - 1)));
    const xT: Array<{ label: string; x: number }> = [];
    for (let i = 0; i < data.length; i += step) {
      xT.push({ label: data[i].label, x: pts[i].x });
    }
    if (
      xT.length > 0 &&
      xT[xT.length - 1].label !== data[data.length - 1].label
    ) {
      xT.push({
        label: data[data.length - 1].label,
        x: pts[data.length - 1].x,
      });
    }

    return { points: pts, yTicks: yT, xTicks: xT };
  }, [data, chartW, chartH, padding.left, padding.top]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    return `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
  }, [linePath, points, padding.top, chartH]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * width;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(points[i].x - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      setHoveredIndex(closest);
    },
    [points, width],
  );

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={tick.y}
          x2={width - padding.right}
          y2={tick.y}
          stroke="currentColor"
          className="text-border"
          strokeWidth={1}
          strokeDasharray={i === 0 ? "none" : "4 4"}
          opacity={0.5}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <text
          key={i}
          x={padding.left - 10}
          y={tick.y + 4}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={11}
        >
          {formatValue(tick.value)}
        </text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((tick, i) => (
        <text
          key={i}
          x={tick.x}
          y={height - 10}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={11}
        >
          {tick.label}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#grad-${id})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Hover indicator */}
      {hovered && (
        <>
          <line
            x1={hovered.x}
            y1={padding.top}
            x2={hovered.x}
            y2={padding.top + chartH}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
          <circle
            cx={hovered.x}
            cy={hovered.y}
            r={5}
            fill="white"
            stroke={color}
            strokeWidth={2}
          />
          <rect
            x={Math.min(hovered.x - 50, width - padding.right - 100)}
            y={Math.max(hovered.y - 44, padding.top)}
            width={100}
            height={32}
            rx={6}
            className="fill-foreground"
            opacity={0.9}
          />
          <text
            x={Math.min(hovered.x, width - padding.right - 50)}
            y={Math.max(hovered.y - 24, padding.top + 16) + 2}
            textAnchor="middle"
            className="fill-background"
            fontSize={12}
            fontWeight={600}
          >
            {formatValue(hovered.value)}
          </text>
          <text
            x={Math.min(hovered.x, width - padding.right - 50)}
            y={Math.max(hovered.y - 44, padding.top) - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {hovered.label}
          </text>
        </>
      )}
    </svg>
  );
}

// ─── SVG Bar Chart ──────────────────────────────────────────────────────────

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  width: number;
  height: number;
  formatValue: (v: number) => string;
  color?: string;
}

function BarChart({
  data,
  width,
  height,
  formatValue,
  color = "#8b5cf6",
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const padding = { top: 24, right: 20, bottom: 48, left: 64 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { bars, yTicks, xTicks } = useMemo(() => {
    if (data.length === 0) return { bars: [], yTicks: [], xTicks: [] };

    const values = data.map((d) => d.value);
    const mx = Math.max(...values) * 1.1 || 1;

    const barGap = 4;
    const barWidth = Math.max(
      4,
      (chartW - barGap * (data.length - 1)) / data.length,
    );

    const b = data.map((d, i) => {
      const barH = (d.value / mx) * chartH;
      return {
        x: padding.left + i * (barWidth + barGap),
        y: padding.top + chartH - barH,
        w: barWidth,
        h: barH,
        ...d,
      };
    });

    const tickCount = 5;
    const yT = Array.from({ length: tickCount + 1 }, (_, i) => {
      const val = (mx * i) / tickCount;
      return {
        value: val,
        y: padding.top + chartH - (val / mx) * chartH,
      };
    });

    const labelCount = Math.min(data.length, 8);
    const step = Math.max(1, Math.floor((data.length - 1) / (labelCount - 1)));
    const xT: Array<{ label: string; x: number }> = [];
    for (let i = 0; i < data.length; i += step) {
      xT.push({ label: data[i].label, x: b[i].x + barWidth / 2 });
    }

    return { bars: b, yTicks: yT, xTicks: xT };
  }, [data, chartW, chartH, padding.left, padding.top]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || bars.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * width;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < bars.length; i++) {
        const cx = bars[i].x + bars[i].w / 2;
        const dist = Math.abs(cx - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      setHoveredIndex(closest);
    },
    [bars, width],
  );

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={tick.y}
          x2={width - padding.right}
          y2={tick.y}
          stroke="currentColor"
          className="text-border"
          strokeWidth={1}
          strokeDasharray={i === 0 ? "none" : "4 4"}
          opacity={0.5}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <text
          key={i}
          x={padding.left - 10}
          y={tick.y + 4}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={11}
        >
          {formatValue(tick.value)}
        </text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((tick, i) => (
        <text
          key={i}
          x={tick.x}
          y={height - 10}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={11}
        >
          {tick.label}
        </text>
      ))}

      {/* Bars */}
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width={bar.w}
          height={bar.h}
          rx={3}
          fill={color}
          opacity={hoveredIndex === i ? 1 : 0.75}
          className="transition-opacity"
        />
      ))}

      {/* Hover tooltip */}
      {hoveredIndex !== null && bars[hoveredIndex] && (
        <>
          <rect
            x={Math.min(
              bars[hoveredIndex].x + bars[hoveredIndex].w / 2 - 50,
              width - padding.right - 100,
            )}
            y={Math.max(bars[hoveredIndex].y - 44, padding.top)}
            width={100}
            height={32}
            rx={6}
            className="fill-foreground"
            opacity={0.9}
          />
          <text
            x={Math.min(
              bars[hoveredIndex].x + bars[hoveredIndex].w / 2,
              width - padding.right - 50,
            )}
            y={
              Math.max(bars[hoveredIndex].y - 24, padding.top + 16) + 2
            }
            textAnchor="middle"
            className="fill-background"
            fontSize={12}
            fontWeight={600}
          >
            {formatValue(bars[hoveredIndex].value)}
          </text>
          <text
            x={Math.min(
              bars[hoveredIndex].x + bars[hoveredIndex].w / 2,
              width - padding.right - 50,
            )}
            y={Math.max(bars[hoveredIndex].y - 44, padding.top) - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {bars[hoveredIndex].label}
          </text>
        </>
      )}
    </svg>
  );
}

// ─── Order Status Colors ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; bar: string }> =
  {
    pending: {
      bg: "bg-yellow-50 dark:bg-yellow-950/40",
      text: "text-yellow-700",
      bar: "#eab308",
    },
    processing: {
      bg: "bg-blue-50 dark:bg-blue-950/40",
      text: "text-blue-700",
      bar: "#3b82f6",
    },
    shipped: {
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
      text: "text-indigo-700",
      bar: "#6366f1",
    },
    delivered: {
      bg: "bg-green-50 dark:bg-green-950/40",
      text: "text-green-700",
      bar: "#22c55e",
    },
    cancelled: {
      bg: "bg-red-50 dark:bg-red-950/40",
      text: "text-red-700",
      bar: "#ef4444",
    },
    refunded: {
      bg: "bg-orange-50 dark:bg-orange-950/40",
      text: "text-orange-700",
      bar: "#f97316",
    },
  };

function getStatusStyle(status: string) {
  return (
    STATUS_COLORS[status] ?? {
      bg: "bg-gray-50",
      text: "text-gray-700",
      bar: "#6b7280",
    }
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Fetch analytics
  useEffect(() => {
    const controller = new AbortController();
    setAnalyticsLoading(true);
    apiFetch<AnalyticsData>(`/admin/dashboard/analytics?period=${period}`, { signal: controller.signal })
      .then(setAnalytics)
      .catch((err) => { if (err?.name !== "AbortError") setAnalytics(null); })
      .finally(() => setAnalyticsLoading(false));
    return () => controller.abort();
  }, [period]);

  // Fetch dashboard stats (for order status breakdown)
  useEffect(() => {
    const controller = new AbortController();
    apiFetch<DashboardStats>("/admin/dashboard", { signal: controller.signal })
      .then(setDashboard)
      .catch((err) => { if (err?.name !== "AbortError") setDashboard(null); })
      .finally(() => setDashboardLoading(false));
    return () => controller.abort();
  }, []);

  // Derive values
  const revenue = analytics
    ? formatDollars(analytics.revenue.total)
    : "$0.00";
  const orders = analytics ? analytics.orders.total.toLocaleString() : "0";
  const aov = analytics
    ? formatDollars(analytics.averageOrderValue.current)
    : "$0.00";

  const conversionDirection =
    analytics && analytics.orders.changePercent >= 0 ? "up" : "down";

  // Chart data
  const revenueChartData = useMemo(
    () =>
      analytics?.revenue.series.map((d) => ({
        label: formatDateLabel(d.date, period),
        value: d.amount,
      })) ?? [],
    [analytics, period],
  );

  const ordersChartData = useMemo(
    () =>
      analytics?.orders.series.map((d) => ({
        label: formatDateLabel(d.date, period),
        value: d.count,
      })) ?? [],
    [analytics, period],
  );

  // Order status breakdown from recent orders
  const statusCounts = useMemo(() => {
    if (!dashboard?.recentOrders) return [];
    const counts: Record<string, number> = {};
    for (const order of dashboard.recentOrders) {
      counts[order.status] = (counts[order.status] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [dashboard]);

  const totalStatusOrders = statusCounts.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Analytics & Reports"
          description="Detailed performance metrics across your marketplace."
        />
        <PeriodTabs value={period} onChange={setPeriod} />
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={revenue}
          change={analytics?.revenue.changePercent}
          icon={DollarSign}
          iconBg="bg-green-50 dark:bg-green-950/40"
          iconColor="text-green-600 dark:text-green-300"
          loading={analyticsLoading}
        />
        <SummaryCard
          title="Total Orders"
          value={orders}
          change={analytics?.orders.changePercent}
          icon={ShoppingCart}
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          iconColor="text-blue-600 dark:text-blue-300"
          loading={analyticsLoading}
        />
        <SummaryCard
          title="Avg Order Value"
          value={aov}
          change={analytics?.averageOrderValue.changePercent}
          icon={BarChart3}
          iconBg="bg-purple-50 dark:bg-purple-950/40"
          iconColor="text-purple-600 dark:text-purple-300"
          loading={analyticsLoading}
        />
        <SummaryCard
          title="Conversion Trend"
          value={
            analytics
              ? `${Math.abs(analytics.orders.changePercent).toFixed(1)}%`
              : "--"
          }
          change={undefined}
          icon={Activity}
          iconBg={
            conversionDirection === "up" ? "bg-emerald-50" : "bg-red-50"
          }
          iconColor={
            conversionDirection === "up"
              ? "text-emerald-600"
              : "text-red-500"
          }
          loading={analyticsLoading}
        />
      </div>

      {/* ── Revenue Chart ──────────────────────────────────────────── */}
      <Card className="border shadow-none">
        <div className="p-6 pb-2">
          <h2 className="text-base font-semibold">Revenue</h2>
          <p className="text-sm text-muted-foreground">
            Revenue over the selected period
          </p>
        </div>
        <div className="px-2 pb-4">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-[320px]">
              <Skeleton className="h-full w-full mx-4 rounded-lg" />
            </div>
          ) : (
            <AreaChart
              id="analytics-revenue"
              data={revenueChartData}
              width={900}
              height={340}
              formatValue={formatCents}
              color="#22c55e"
            />
          )}
        </div>
      </Card>

      {/* ── Orders Chart (Bar) ─────────────────────────────────────── */}
      <Card className="border shadow-none">
        <div className="p-6 pb-2">
          <h2 className="text-base font-semibold">Orders</h2>
          <p className="text-sm text-muted-foreground">
            Order volume over the selected period
          </p>
        </div>
        <div className="px-2 pb-4">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Skeleton className="h-full w-full mx-4 rounded-lg" />
            </div>
          ) : (
            <BarChart
              data={ordersChartData}
              width={900}
              height={300}
              formatValue={(v) => Math.round(v).toLocaleString()}
              color="#6366f1"
            />
          )}
        </div>
      </Card>

      {/* ── Bottom row: Top Products + Sales by Status ─────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card className="border shadow-none">
          <div className="p-6 pb-2">
            <h2 className="text-base font-semibold">Top Products</h2>
            <p className="text-sm text-muted-foreground">
              Best sellers by revenue in this period
            </p>
          </div>
          {analyticsLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="ml-auto h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : !analytics?.topProducts?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No product data available yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold w-12">#</TableHead>
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold text-right">
                    Sold
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    Revenue
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topProducts.slice(0, 5).map((product, i) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-bold text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium text-sm truncate max-w-[200px]">
                      {product.title}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {product.totalSold.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatDollars(product.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Sales by Status */}
        <Card className="border shadow-none">
          <div className="p-6 pb-4">
            <h2 className="text-base font-semibold">Sales by Status</h2>
            <p className="text-sm text-muted-foreground">
              Order distribution by current status
            </p>
          </div>
          <div className="px-6 pb-6">
            {dashboardLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded" />
                ))}
              </div>
            ) : statusCounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No order data available.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stacked bar */}
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
                  {statusCounts.map(({ status, count }) => {
                    const style = getStatusStyle(status);
                    const pct =
                      totalStatusOrders > 0
                        ? (count / totalStatusOrders) * 100
                        : 0;
                    return (
                      <div
                        key={status}
                        className="h-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: style.bar,
                          minWidth: pct > 0 ? 4 : 0,
                        }}
                        title={`${status}: ${count}`}
                      />
                    );
                  })}
                </div>

                {/* Legend / breakdown */}
                <div className="space-y-3">
                  {statusCounts.map(({ status, count }) => {
                    const style = getStatusStyle(status);
                    const pct =
                      totalStatusOrders > 0
                        ? ((count / totalStatusOrders) * 100).toFixed(1)
                        : "0";
                    return (
                      <div
                        key={status}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block size-3 rounded-sm"
                            style={{ backgroundColor: style.bar }}
                          />
                          <span className="text-sm font-medium capitalize">
                            {status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm tabular-nums font-semibold">
                            {count}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
