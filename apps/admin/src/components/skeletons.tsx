import { cn } from "@/lib/utils";

/**
 * Shared skeleton primitives for list / detail pages so loading states look
 * consistent. Every skeleton uses the `Skeleton` UI atom which already
 * animates via tailwind's pulse utility.
 */

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

/**
 * Table skeleton — renders `rows` placeholder rows with `cols` columns.
 * Widths alternate so the grid doesn't feel artificially uniform.
 */
export function TableSkeleton({
  rows = 6,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-hidden rounded-xl border", className)}>
      <div className="border-b bg-muted/40 p-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Bar key={i} className="h-3 w-3/4" />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid items-center gap-3 p-3"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Bar
                key={c}
                className={cn(
                  "h-3",
                  c === 0 ? "w-3/4" : c === cols - 1 ? "w-1/3" : "w-1/2"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stats/KPI grid placeholder — 4 cards across on desktop. */
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <Bar className="h-3 w-20" />
          <Bar className="h-7 w-3/4" />
          <Bar className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Detail page header + side-by-side content skeleton. */
export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Bar className="h-4 w-40" />
        <Bar className="h-8 w-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bar key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <Bar className="h-4 w-1/2" />
          <Bar className="h-10 w-full" />
          <Bar className="h-10 w-full" />
          <Bar className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

/** Dashboard grid: 4 KPIs + 2 chart cards + a list. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <StatsGridSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 rounded-xl border bg-card p-4 lg:col-span-2">
          <Bar className="mb-3 h-4 w-40" />
          <Bar className="h-56 w-full" />
        </div>
        <div className="h-72 rounded-xl border bg-card p-4">
          <Bar className="mb-3 h-4 w-24" />
          <Bar className="h-56 w-full" />
        </div>
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
