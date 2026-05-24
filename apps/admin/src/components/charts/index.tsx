import * as React from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

/**
 * Chart wrappers tuned for the admin's dark/light theme. Every chart accepts
 * `data` + `xKey` + `yKey(s)` and renders into a responsive container so the
 * caller never has to fight with layout. Tooltips use the same muted styling
 * as the rest of the admin UI.
 */

const CHART_COLORS = [
  "hsl(231, 83%, 60%)", // indigo
  "hsl(262, 82%, 60%)", // violet
  "hsl(162, 75%, 45%)", // emerald
  "hsl(25, 94%, 58%)", // orange
  "hsl(340, 80%, 60%)", // rose
  "hsl(196, 85%, 50%)", // sky
];

interface BaseProps {
  /** Height in pixels. Defaults to 280. */
  height?: number;
  className?: string;
  /** Chart title shown above the plot. */
  title?: string;
  /** Subtitle / period label shown under the title. */
  subtitle?: string;
  /** Optional header-right actions (e.g. date range picker). */
  actions?: React.ReactNode;
}

interface AreaProps extends BaseProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  /** Render values as money using this currency code. */
  currency?: string;
}

export function RevenueArea({
  data,
  xKey,
  yKey,
  height = 280,
  className,
  title,
  subtitle,
  actions,
  currency,
}: AreaProps) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={className}
      height={height}
    >
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
        <XAxis
          dataKey={xKey}
          stroke="currentColor"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="currentColor"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatPrice(v, currency).replace(/\.\d+$/, "")}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          content={(tooltipProps) => (
            <ChartTooltip
              {...(tooltipProps as ChartTooltipProps)}
              formatter={(value: number) => formatPrice(value, currency)}
            />
          )}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          fill="url(#chart-gradient)"
        />
      </AreaChart>
    </ChartCard>
  );
}

interface LineProps extends BaseProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  /** One or more numeric series to plot. */
  series: Array<{ key: string; label: string; color?: string }>;
}

export function LineSeries({
  data,
  xKey,
  series,
  height = 280,
  className,
  title,
  subtitle,
  actions,
}: LineProps) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={className}
      height={height}
    >
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
        <XAxis dataKey={xKey} stroke="currentColor" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke="currentColor" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={(p) => <ChartTooltip {...(p as ChartTooltipProps)} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartCard>
  );
}

interface BarProps extends BaseProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  color?: string;
}

export function BarSeries({
  data,
  xKey,
  yKey,
  height = 280,
  className,
  title,
  subtitle,
  actions,
  color = CHART_COLORS[2],
}: BarProps) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={className}
      height={height}
    >
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
        <XAxis dataKey={xKey} stroke="currentColor" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke="currentColor" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.04 }} content={(p) => <ChartTooltip {...(p as ChartTooltipProps)} />} />
        <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

interface DonutProps extends BaseProps {
  data: Array<{ name: string; value: number }>;
  /** Inner radius as a % of outer. Defaults to 60% for donut. */
  innerRadius?: number;
}

export function DonutBreakdown({
  data,
  height = 240,
  className,
  title,
  subtitle,
  actions,
  innerRadius = 60,
}: DonutProps) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={className}
      height={height}
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={`${innerRadius}%`}
          outerRadius="90%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={(p) => (
            <ChartTooltip
              {...(p as ChartTooltipProps)}
              formatter={(v: number) =>
                `${v} (${total === 0 ? 0 : Math.round((v / total) * 100)}%)`
              }
            />
          )}
        />
      </PieChart>
    </ChartCard>
  );
}

function ChartCard({
  title,
  subtitle,
  actions,
  children,
  height,
  className,
}: BaseProps & { children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-2">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div style={{ height }} className="text-muted-foreground">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  formatter?: (value: number) => string;
};

function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label != null && (
        <p className="mb-1 font-semibold text-foreground">{String(label)}</p>
      )}
      <div className="flex flex-col gap-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="block size-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-medium text-foreground">
              {formatter && typeof p.value === "number"
                ? formatter(p.value)
                : String(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
