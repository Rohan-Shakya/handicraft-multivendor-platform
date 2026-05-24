import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { formatPrice, currencySymbol } from "@/lib/format";
import type { Order } from "@repo/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MarketplaceHero, EmptyStateIllustration } from "@/components/illustrations/MarketplaceHero";
import { brand } from "@/config/brand";
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
  Store,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  RotateCcw,
  Star,
  AlertTriangle,
  UserPlus,
  Ban,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardStats {
  vendorCount: number;
  orderCount: number;
  customerCount: number;
  productCount: number;
  totalRevenue: string;
  recentOrders: Order[];
  pendingApprovals?: number;
  pendingKyc?: number;
  pendingReturns?: number;
  pendingReviews?: number;
  newVendorsThisMonth?: number;
  suspendedVendors?: number;
  activeVendors?: number;
  activeCustomers?: number;
}

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

type PeriodKey = "7d" | "30d" | "90d" | "12m";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; direction: "up" | "down" };
  loading?: boolean;
  iconBg: string;
  iconColor: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// Currency for dashboard rollups falls back to the platform default. When
// individual records carry their own currencyCode the relevant table cells
// pass that value to formatPrice directly.
function formatCents(cents: number): string {
  const major = cents / 100;
  if (major >= 1000) {
    return `${currencySymbol()}${(major / 1000).toFixed(1)}k`;
  }
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

// ─── Components ─────────────────────────────────────────────────────────────

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  iconBg,
  iconColor,
}: StatsCardProps) {
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
          {trend && !loading && (
            <div className="mt-1.5 flex items-center gap-1">
              {trend.direction === "up" ? (
                <TrendingUp className="size-3.5 text-green-600" />
              ) : (
                <TrendingDown className="size-3.5 text-red-500" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend.direction === "up" ? "text-green-600" : "text-red-500"
                }`}
              >
                {Math.abs(trend.value).toFixed(1)}%
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

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  count: number;
  to: string;
  loading?: boolean;
  color: string;
}

function QuickAction({
  icon: Icon,
  label,
  count,
  to,
  loading,
  color,
}: QuickActionProps) {
  return (
    <Link to={to}>
      <Card className="p-4 border shadow-none hover:bg-accent/50 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${color}`}>
              <Icon className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              {loading ? (
                <Skeleton className="mt-1 h-4 w-12" />
              ) : (
                <p className="text-lg font-bold">{count}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            tabIndex={-1}
            aria-label="View details"
          >
            <ArrowRight className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </Card>
    </Link>
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

  const padding = { top: 20, right: 16, bottom: 40, left: 56 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { points, minVal, maxVal, yTicks, xTicks } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], minVal: 0, maxVal: 0, yTicks: [], xTicks: [] };
    }
    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    // Add 10% padding to min/max, floor min to 0
    const mn = Math.max(0, rawMin - (rawMax - rawMin) * 0.1);
    const mx = rawMax + (rawMax - rawMin) * 0.1 || 1;

    const pts = data.map((d, i) => ({
      x: padding.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
      y: padding.top + chartH - ((d.value - mn) / (mx - mn)) * chartH,
      ...d,
    }));

    // Y-axis: 4-5 ticks
    const tickCount = 4;
    const yT = Array.from({ length: tickCount + 1 }, (_, i) => {
      const val = mn + ((mx - mn) * i) / tickCount;
      return {
        value: val,
        y: padding.top + chartH - ((val - mn) / (mx - mn)) * chartH,
      };
    });

    // X-axis: show ~5-6 labels evenly spaced
    const labelCount = Math.min(data.length, 6);
    const step = Math.max(1, Math.floor((data.length - 1) / (labelCount - 1)));
    const xT: Array<{ label: string; x: number }> = [];
    for (let i = 0; i < data.length; i += step) {
      xT.push({
        label: data[i].label,
        x: pts[i].x,
      });
    }
    // Always include last
    if (xT.length > 0 && xT[xT.length - 1].label !== data[data.length - 1].label) {
      xT.push({
        label: data[data.length - 1].label,
        x: pts[data.length - 1].x,
      });
    }

    return { points: pts, minVal: mn, maxVal: mx, yTicks: yT, xTicks: xT };
  }, [data, chartW, chartH, padding.left, padding.top]);

  // Build SVG path
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const base = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
    return base;
  }, [linePath, points, padding.top, chartH]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX =
        ((e.clientX - rect.left) / rect.width) * width;
      // Find closest point
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
    [points, width]
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
          x={padding.left - 8}
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
          y={height - 8}
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
          {/* Tooltip background */}
          <rect
            x={Math.min(hovered.x - 50, width - padding.right - 100)}
            y={Math.max(hovered.y - 44, padding.top)}
            width={100}
            height={32}
            rx={6}
            className="fill-foreground"
            opacity={0.9}
          />
          {/* Tooltip text */}
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

// ─── Top Products Table ─────────────────────────────────────────────────────

function TopProductsTable({
  products,
  loading,
}: {
  products: AnalyticsData["topProducts"];
  loading: boolean;
}) {
  if (loading) {
    return (
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
    );
  }

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <EmptyStateIllustration className="h-24 w-32 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{brand.emptyStates.topProductsTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {brand.emptyStates.topProductsDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="font-semibold w-12">#</TableHead>
          <TableHead className="font-semibold">Product</TableHead>
          <TableHead className="font-semibold text-right">Sold</TableHead>
          <TableHead className="font-semibold text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.slice(0, 5).map((product, i) => (
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
  );
}

// ─── Modern dashboard primitives ────────────────────────────────────────────

/** Tiny inline SVG sparkline — no axes, just a path + soft fill. */
function Sparkline({
  data,
  color = "currentColor",
  width = 120,
  height = 40,
  fill = true,
}: {
  data: Array<{ value: number }>;
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  if (data.length < 2) {
    return <div style={{ width, height }} aria-hidden />;
  }
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
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${(width).toFixed(1)},${height} L0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      {fill && <path d={areaPath} fill={color} fillOpacity={0.12} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Hero card — greeting, headline metric, period delta, CTA, soft brand wash. */
function HeroCard({
  greeting,
  displayName,
  totalRevenue,
  changePercent,
  period,
  loading,
}: {
  greeting: string;
  displayName: string;
  totalRevenue: string;
  changePercent: number | undefined;
  period: PeriodKey;
  loading: boolean;
}) {
  const periodLabel = period === "7d" ? "this week" : period === "30d" ? "this month" : period === "90d" ? "this quarter" : "this year";
  const positive = (changePercent ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden border-none bg-primary p-7 text-primary-foreground shadow-sm lg:col-span-2">
      {/* Decorative wash — soft circles, mimics the reference's friendly hero. */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-4 size-44 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-2 bottom-0 top-0 hidden items-center lg:flex">
        <MarketplaceHero className="h-44 w-auto opacity-95" />
      </div>

      <div className="relative max-w-xl space-y-3">
        <p className="text-sm/6 text-primary-foreground/80">
          {greeting}, <span className="capitalize">{displayName}</span>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Here's what's happening in your sales {periodLabel} <span aria-hidden>👋</span>
        </h1>
        <div className="flex items-baseline gap-3 pt-1">
          {loading ? (
            <Skeleton className="h-10 w-40 bg-white/20" />
          ) : (
            <>
              <span className="text-4xl font-bold tracking-tight md:text-5xl">{totalRevenue}</span>
              <span className="text-sm font-medium text-primary-foreground/85">Sales total</span>
            </>
          )}
        </div>
        {changePercent !== undefined && !loading && (
          <p className="text-sm text-primary-foreground/85">
            {positive ? "↑" : "↓"} {Math.abs(changePercent).toFixed(1)}% vs prior period
          </p>
        )}
        <div className="pt-3">
          <Button asChild variant="secondary" className="rounded-full bg-white text-primary hover:bg-white/90">
            <Link to="/system/analytics">
              View report
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** KPI card with sparkline — value + delta + tiny chart, plus a tinted icon
 * chip and a soft background wash that picks up the accent color. */
function KpiSparklineCard({
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
  loading: boolean;
  accent?: string;
  icon?: React.ElementType;
}) {
  const positive = (changePercent ?? 0) >= 0;
  const deltaColor = positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  return (
    <Card className="relative overflow-hidden border bg-card p-5 shadow-none">
      {/* Soft accent wash — picks up the metric color without dominating. */}
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
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            )}
            {changePercent !== undefined && !loading && (
              <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
                {positive ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
                {Math.abs(changePercent).toFixed(1)}%
                <span className="font-normal text-muted-foreground">vs prior</span>
              </p>
            )}
          </div>
        </div>
        {series && series.length > 1 && !loading && (
          <div className="self-end" style={{ color: accent }}>
            <Sparkline data={series} width={88} height={42} />
          </div>
        )}
      </div>
    </Card>
  );
}

/** Donut chart for top products / categories. */
function DonutCard({
  title,
  data,
  loading,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  loading: boolean;
}) {
  const COLORS = [
    "hsl(140, 65%, 50%)",
    "hsl(140, 55%, 65%)",
    "hsl(35, 85%, 60%)",
    "hsl(220, 30%, 70%)",
    "hsl(0, 0%, 85%)",
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  // SVG donut ring math
  const radius = 56;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = total > 0 ? data.map((d, i) => {
    const fraction = d.value / total;
    const length = circumference * fraction;
    const segment = {
      color: COLORS[i % COLORS.length],
      length,
      offset,
      label: d.label,
      value: d.value,
      percent: fraction * 100,
    };
    offset += length;
    return segment;
  }) : [];

  return (
    <Card className="border bg-card p-5 shadow-none">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-4 flex flex-col items-center gap-4">
        {loading ? (
          <Skeleton className="size-36 rounded-full" />
        ) : segments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <EmptyStateIllustration className="h-20 w-28 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Sales data will appear once orders flow in.</p>
          </div>
        ) : (
          <div className="relative">
            <svg width={radius * 2 + stroke} height={radius * 2 + stroke} viewBox={`0 0 ${radius * 2 + stroke} ${radius * 2 + stroke}`}>
              <circle cx={radius + stroke / 2} cy={radius + stroke / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
              {segments.map((s, i) => (
                <circle
                  key={i}
                  cx={radius + stroke / 2}
                  cy={radius + stroke / 2}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${s.length} ${circumference - s.length}`}
                  strokeDashoffset={-s.offset}
                  transform={`rotate(-90 ${radius + stroke / 2} ${radius + stroke / 2})`}
                  strokeLinecap="butt"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="text-xl font-bold tabular-nums">{total.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
      {!loading && segments.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {segments.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="font-medium tabular-nums">{s.percent.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Vertical stack of pending-action chips with counts and links. */
function PendingStack({
  items,
  loading,
}: {
  items: Array<{ icon: React.ElementType; label: string; count: number; to: string; tone: string }>;
  loading: boolean;
}) {
  return (
    <Card className="border bg-card p-5 shadow-none">
      <p className="text-sm font-semibold">Action required</p>
      <ul className="mt-4 space-y-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <li key={i}>
              <Link
                to={item.to}
                className="group flex items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-3">
                  <span className={`flex size-9 items-center justify-center rounded-lg ${item.tone}`}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </span>
                <span className="flex items-center gap-2">
                  {loading ? (
                    <Skeleton className="h-5 w-7" />
                  ) : (
                    <span className="text-sm font-semibold tabular-nums">{item.count}</span>
                  )}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { actor } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("30d");

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<DashboardStats>("/admin/dashboard", { signal: controller.signal })
      .then(setStats)
      .catch((err) => { if (err?.name !== "AbortError") setStats(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setAnalyticsLoading(true);
    apiFetch<AnalyticsData>(`/admin/dashboard/analytics?period=${period}`, { signal: controller.signal })
      .then(setAnalytics)
      .catch((err) => { if (err?.name !== "AbortError") setAnalytics(null); })
      .finally(() => { if (!controller.signal.aborted) setAnalyticsLoading(false); });
    return () => controller.abort();
  }, [period]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const displayName = actor?.role?.replace(/_/g, " ") ?? "Admin";

  // Derive stats card values from analytics when available
  const revenue =
    analytics?.revenue != null
      ? formatDollars(analytics.revenue.total)
      : stats?.totalRevenue != null
        ? formatPrice(Number(stats.totalRevenue))
        : formatPrice(0);

  const revenueTrend = analytics?.revenue
    ? {
        value: analytics.revenue.changePercent,
        direction: (analytics.revenue.changePercent >= 0 ? "up" : "down") as
          | "up"
          | "down",
      }
    : undefined;

  const ordersTrend = analytics?.orders
    ? {
        value: analytics.orders.changePercent,
        direction: (analytics.orders.changePercent >= 0 ? "up" : "down") as
          | "up"
          | "down",
      }
    : undefined;

  const aovTrend = analytics?.averageOrderValue
    ? {
        value: analytics.averageOrderValue.changePercent,
        direction: (analytics.averageOrderValue.changePercent >= 0
          ? "up"
          : "down") as "up" | "down",
      }
    : undefined;

  // Chart data
  const revenueChartData = useMemo(
    () =>
      analytics?.revenue.series.map((d) => ({
        label: formatDateLabel(d.date, period),
        value: d.amount,
      })) ?? [],
    [analytics, period]
  );

  const ordersChartData = useMemo(
    () =>
      analytics?.orders.series.map((d) => ({
        label: formatDateLabel(d.date, period),
        value: d.count,
      })) ?? [],
    [analytics, period]
  );

  // Top categories donut: derive from top products by revenue (top 4 + "Other")
  const categoriesData = useMemo(() => {
    if (!analytics?.topProducts?.length) return [];
    const top = analytics.topProducts.slice(0, 4);
    const rest = analytics.topProducts.slice(4);
    const data = top.map((p) => ({ label: p.title, value: p.revenue }));
    if (rest.length > 0) {
      data.push({ label: `Other (${rest.length})`, value: rest.reduce((s, p) => s + p.revenue, 0) });
    }
    return data;
  }, [analytics]);

  const pendingItems = [
    { icon: ShieldCheck, label: "Vendor approvals", count: stats?.pendingApprovals ?? 0, to: "/vendors/approvals", tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    { icon: FileCheck, label: "KYC reviews", count: stats?.pendingKyc ?? 0, to: "/vendors/kyc", tone: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
    { icon: RotateCcw, label: "Pending returns", count: stats?.pendingReturns ?? 0, to: "/orders/returns", tone: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
    { icon: Star, label: "Review moderation", count: stats?.pendingReviews ?? 0, to: "/reviews", tone: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero + Top categories ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <HeroCard
          greeting={greeting}
          displayName={displayName}
          totalRevenue={revenue}
          changePercent={analytics?.revenue?.changePercent}
          period={period}
          loading={loading && analyticsLoading}
        />
        <DonutCard
          title="Top products by revenue"
          data={categoriesData}
          loading={analyticsLoading}
        />
      </div>

      {/* ── Sales funnel: 4 KPI sparkline cards ─────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sales funnel</h2>
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiSparklineCard
            label="Revenue"
            value={revenue}
            changePercent={analytics?.revenue?.changePercent}
            series={revenueChartData}
            loading={loading && analyticsLoading}
            accent="hsl(140, 65%, 45%)"
            icon={DollarSign}
          />
          <KpiSparklineCard
            label="Orders"
            value={(analytics?.orders.total ?? stats?.orderCount ?? 0).toLocaleString()}
            changePercent={analytics?.orders?.changePercent}
            series={ordersChartData}
            loading={loading && analyticsLoading}
            accent="hsl(220, 75%, 55%)"
            icon={ShoppingCart}
          />
          <KpiSparklineCard
            label="Avg. order"
            value={analytics?.averageOrderValue ? formatDollars(analytics.averageOrderValue.current) : "$0.00"}
            changePercent={analytics?.averageOrderValue?.changePercent}
            loading={analyticsLoading}
            accent="hsl(35, 85%, 55%)"
            icon={TrendingUp}
          />
          <KpiSparklineCard
            label="Active customers"
            value={(stats?.activeCustomers ?? stats?.customerCount ?? 0).toLocaleString()}
            loading={loading}
            accent="hsl(280, 60%, 60%)"
            icon={Users}
          />
        </div>
      </div>

      {/* ── Performance trend (revenue + orders area charts) ────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border bg-card p-5 shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Revenue trend</p>
              {analyticsLoading ? (
                <Skeleton className="mt-1 h-7 w-28" />
              ) : (
                <p className="text-xl font-bold">{analytics ? formatDollars(analytics.revenue.total) : "--"}</p>
              )}
            </div>
            {analytics?.revenue && !analyticsLoading && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  analytics.revenue.changePercent >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {analytics.revenue.changePercent >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {Math.abs(analytics.revenue.changePercent).toFixed(1)}%
              </div>
            )}
          </div>
          {analyticsLoading ? (
            <Skeleton className="h-[220px] w-full rounded-lg" />
          ) : (
            <AreaChart
              id="revenue"
              data={revenueChartData}
              width={560}
              height={240}
              formatValue={(v) => formatCents(v)}
              color="hsl(140, 65%, 45%)"
            />
          )}
        </Card>

        <Card className="border bg-card p-5 shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Orders trend</p>
              {analyticsLoading ? (
                <Skeleton className="mt-1 h-7 w-20" />
              ) : (
                <p className="text-xl font-bold">{analytics ? analytics.orders.total.toLocaleString() : "--"}</p>
              )}
            </div>
            {analytics?.orders && !analyticsLoading && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  analytics.orders.changePercent >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {analytics.orders.changePercent >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {Math.abs(analytics.orders.changePercent).toFixed(1)}%
              </div>
            )}
          </div>
          {analyticsLoading ? (
            <Skeleton className="h-[220px] w-full rounded-lg" />
          ) : (
            <AreaChart
              id="orders"
              data={ordersChartData}
              width={560}
              height={240}
              formatValue={(v) => v.toLocaleString()}
              color="hsl(220, 75%, 55%)"
            />
          )}
        </Card>
      </div>

      {/* ── Top selling products + Pending actions ──────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top selling products</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/catalog/products">
                View all
                <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
          <Card className="overflow-hidden border shadow-none">
            <TopProductsTable products={analytics?.topProducts ?? []} loading={analyticsLoading} />
          </Card>
        </div>

        <PendingStack items={pendingItems} loading={loading} />
      </div>

      {/* ── Recent orders ───────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent orders</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/orders">
              View all
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
        <Card className="overflow-hidden border shadow-none">
          {loading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="ml-auto h-4 w-16" />
                </div>
              ))}
            </div>
          ) : !stats?.recentOrders?.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <EmptyStateIllustration className="h-24 w-32 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{brand.emptyStates.ordersTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {brand.emptyStates.ordersDescription}
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Order #</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Total</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.slice(0, 8).map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/orders`);
                      }
                    }}
                    onClick={() => navigate(`/orders`)}
                  >
                    <TableCell className="font-bold font-mono text-sm">#{order.orderNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.customerId?.slice(0, 8) ?? "Guest"}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{formatPrice(Number(order.totalPrice), (order as { currencyCode?: string | null }).currencyCode)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
