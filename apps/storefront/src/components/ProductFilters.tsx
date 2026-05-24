"use client";

import { Filter, X } from "lucide-react";
import { usePathname,useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { StarRating } from "@/components/StarRating";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FilterFacet {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  collections?: FilterFacet[];
  vendors?: FilterFacet[];
  tags?: FilterFacet[];
  priceRange?: { min: number; max: number; currency: string };
  /** Admin-controlled toggles. Undefined = render (legacy behaviour). */
  showRating?: boolean;
  showAvailability?: boolean;
  /**
   * Source-type order from the admin-managed facet list. Keys supported:
   * `variant_price`, `collection`, `vendor`, `tag`, `rating`, `availability`.
   * When provided, sections render in this order; otherwise the historical
   * default order is used.
   */
  order?: string[];
}

interface Props {
  config: FilterConfig;
  /** Number of results — shown on the "Apply" button in the mobile sheet. */
  totalResults?: number;
  /**
   * When true, the desktop sidebar is hidden and only the trigger + drawer
   * is rendered. Used by collection pages that want a single filter
   * affordance regardless of viewport. Default: false (split sidebar/drawer).
   */
  drawerOnly?: boolean;
  /** Open the drawer from a side panel instead of a bottom sheet. */
  drawerSide?: "bottom" | "right";
  /** Size of the drawer trigger button. Default: "sm". */
  triggerSize?: "sm" | "default" | "lg";
  /** When true, on small viewports (`<sm`) the trigger is rendered as a
   *  fixed floating action button anchored to the bottom-right of the
   *  viewport. Above `sm`, behavior is unchanged. */
  mobileFloating?: boolean;
}

/**
 * URL-driven faceted filter panel. Writes every filter to the query string so
 * users can bookmark / share filtered views and so the server component
 * picks them up without client-side refetch plumbing.
 */
export function ProductFilters({
  config,
  totalResults,
  drawerOnly = false,
  drawerSide,
  triggerSize = "sm",
  mobileFloating = false,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const side = drawerSide ?? (drawerOnly ? "right" : "bottom");

  const trigger = (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size={triggerSize}
          className={cn(
            "rounded-full",
            mobileFloating && [
              "max-sm:fixed max-sm:bottom-20 max-sm:right-4 max-sm:z-40",
              "max-sm:size-14 max-sm:p-0 max-sm:gap-0",
              "max-sm:border-foreground max-sm:bg-foreground max-sm:text-background",
              "max-sm:shadow-lg max-sm:shadow-foreground/25",
              "max-sm:hover:bg-foreground/90 max-sm:hover:text-background",
            ],
          )}
        >
          <Filter
            className={cn("size-4", mobileFloating && "max-sm:size-5")}
            aria-hidden
          />
          <span className={cn(mobileFloating && "max-sm:sr-only")}>
            Filters
          </span>
          <ActiveCount floating={mobileFloating} />
        </Button>
      </SheetTrigger>
      <SheetContent
        side={side}
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          side === "bottom" && "max-h-[88vh] rounded-t-2xl",
          side === "right" && "w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4 pr-14 text-left">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            Filters
            <ActiveCountBadge />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Refine the product list by price, category, vendor, rating, or
            availability. Changes apply immediately.
          </SheetDescription>
        </SheetHeader>

        <ActiveChipsBar config={config} />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-2">
          <FilterPanel config={config} bare />
        </div>

        <div className="shrink-0 border-t bg-background px-6 py-3 pb-[max(env(safe-area-inset-bottom,0),0.75rem)]">
          <div className="flex items-center gap-3">
            <ClearAllButton variant="ghost" />
            <Button
              className="flex-1"
              size="lg"
              onClick={() => setOpen(false)}
            >
              Show
              {totalResults != null ? ` ${totalResults.toLocaleString()} ` : " "}
              results
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  if (drawerOnly) {
    return <div className="flex">{trigger}</div>;
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Filters"
        className="sticky top-24 hidden h-fit w-64 shrink-0 lg:block"
      >
        <FilterPanel config={config} />
      </aside>

      {/* Mobile trigger */}
      <div className="flex lg:hidden">{trigger}</div>
    </>
  );
}

const DEFAULT_ORDER = [
  "variant_price",
  "collection",
  "vendor",
  "tag",
  "rating",
  "availability",
];

function FilterPanel({
  config,
  bare = false,
}: {
  config: FilterConfig;
  /** When true, render only the accordion sections (no heading, no chips,
   *  no clear button) — used inside the drawer where the header owns those. */
  bare?: boolean;
}) {
  const {
    priceRange,
    collections,
    vendors,
    tags,
    showRating,
    showAvailability,
    order,
  } = config;

  // Render each section as a keyed entry so we can order them dynamically
  // based on the admin-controlled `order` array.
  const sections: Record<string, React.ReactNode> = {};

  if (priceRange) {
    sections.variant_price = (
      <AccordionItem key="price" value="price" className="border-0">
        <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">Price</AccordionTrigger>
        <AccordionContent>
          <PriceSlider range={priceRange} />
        </AccordionContent>
      </AccordionItem>
    );
  }
  if (collections && collections.length > 0) {
    sections.collection = (
      <AccordionItem key="collection" value="collection" className="border-0">
        <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">Collection</AccordionTrigger>
        <AccordionContent>
          <FacetList paramKey="collection" facets={collections} />
        </AccordionContent>
      </AccordionItem>
    );
  }
  if (vendors && vendors.length > 0) {
    sections.vendor = (
      <AccordionItem key="vendor" value="vendor" className="border-0">
        <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">Vendor</AccordionTrigger>
        <AccordionContent>
          <FacetList paramKey="vendor" facets={vendors} />
        </AccordionContent>
      </AccordionItem>
    );
  }
  if (tags && tags.length > 0) {
    sections.tag = (
      <AccordionItem key="tag" value="tag" className="border-0">
        <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">Tags</AccordionTrigger>
        <AccordionContent>
          <FacetList paramKey="tag" facets={tags} />
        </AccordionContent>
      </AccordionItem>
    );
  }
  // Treat `undefined` as "show" so existing callers keep working unchanged.
  if (showRating !== false) {
    sections.rating = (
      <AccordionItem key="rating" value="rating" className="border-0">
        <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">Rating</AccordionTrigger>
        <AccordionContent>
          <RatingFilter />
        </AccordionContent>
      </AccordionItem>
    );
  }
  if (showAvailability !== false) {
    sections.availability = (
      <AccordionItem
        key="availability"
        value="availability"
        className="border-0"
      >
        <AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">Availability</AccordionTrigger>
        <AccordionContent>
          <AvailabilityFilter />
        </AccordionContent>
      </AccordionItem>
    );
  }

  const sourceOrder = order && order.length > 0 ? order : DEFAULT_ORDER;
  // Honor the admin order; anything not listed falls through to the end.
  const rendered: React.ReactNode[] = [];
  const seen = new Set<string>();
  for (const key of sourceOrder) {
    if (sections[key]) {
      rendered.push(sections[key]);
      seen.add(key);
    }
  }
  for (const [key, node] of Object.entries(sections)) {
    if (!seen.has(key)) rendered.push(node);
  }

  const accordion = (
    <Accordion
      type="multiple"
      defaultValue={["price", "collection", "rating", "availability"]}
      className="divide-y divide-border/70"
    >
      {rendered}
    </Accordion>
  );

  if (bare) return accordion;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Refine
        </h2>
        <ClearAllButton />
      </div>
      <ActiveChips config={config} />
      {accordion}
    </div>
  );
}

// ── Param helpers ───────────────────────────────────────────────────────────

function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = React.useCallback(
    (key: string, value: string | undefined | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
      // Reset page when a filter changes.
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  /**
   * Write several params in a single `router.push`. Back-to-back `setParam`
   * calls each seed from the same stale `searchParams` snapshot, so the later
   * write clobbers the earlier one — use this for anything that needs to
   * update ≥ 2 keys atomically (e.g. a price-range slider with min + max).
   */
  const setParams = React.useCallback(
    (patch: Record<string, string | undefined | null>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") params.delete(k);
        else params.set(k, v);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const toggleMulti = React.useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const list = (params.get(key) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const idx = list.indexOf(value);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(value);
      if (list.length === 0) params.delete(key);
      else params.set(key, list.join(","));
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const getMulti = React.useCallback(
    (key: string): string[] => {
      return (searchParams?.get(key) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    },
    [searchParams]
  );

  return { searchParams, setParam, setParams, toggleMulti, getMulti };
}

// ── Facet list ───────────────────────────────────────────────────────────────

function FacetList({
  paramKey,
  facets,
}: {
  paramKey: string;
  facets: FilterFacet[];
}) {
  const { getMulti, toggleMulti } = useFilterNav();
  const selected = new Set(getMulti(paramKey));
  const [showAll, setShowAll] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const cutoff = showAll ? facets.length : 8;

  const filtered = React.useMemo(() => {
    if (!query.trim()) return facets;
    const q = query.trim().toLowerCase();
    return facets.filter((f) => f.label.toLowerCase().includes(q));
  }, [facets, query]);

  const visible = filtered.slice(0, query ? filtered.length : cutoff);

  return (
    <div className="flex flex-col gap-2">
      {facets.length > 10 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          aria-label={`Search ${paramKey}`}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      )}
      {visible.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">No matches.</p>
      ) : (
        <ul className="flex flex-col gap-0.5" role="group">
          {visible.map((f) => {
            const checked = selected.has(f.value);
            return (
              <li key={f.value}>
                <label
                  className={cn(
                    "group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                    checked
                      ? "bg-primary/5 text-foreground"
                      : "hover:bg-muted/60",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleMulti(paramKey, f.value)}
                    aria-label={f.label}
                  />
                  <span className="flex-1 truncate">{f.label}</span>
                  {f.count != null && (
                    <span className="shrink-0 text-[11px] tabular text-muted-foreground">
                      {f.count.toLocaleString()}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {!query && facets.length > 8 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start rounded-sm px-1 text-xs font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {showAll ? "Show fewer" : `Show all (${facets.length})`}
        </button>
      )}
    </div>
  );
}

// ── Price slider ─────────────────────────────────────────────────────────────

function PriceSlider({
  range,
}: {
  range: { min: number; max: number; currency: string };
}) {
  const { searchParams, setParams } = useFilterNav();
  const current: [number, number] = [
    Number(searchParams?.get("priceMin") ?? range.min),
    Number(searchParams?.get("priceMax") ?? range.max),
  ];
  const [local, setLocal] = React.useState<[number, number]>(current);

  React.useEffect(() => {
    setLocal(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function commit(values: number[]) {
    const [min, max] = values as [number, number];
    // Write both bounds atomically — two separate router.push calls would
    // race and clobber each other (both seed from the same stale snapshot).
    setParams({
      priceMin: min > range.min ? String(min) : undefined,
      priceMax: max < range.max ? String(max) : undefined,
    });
  }

  return (
    <div className="px-1 pb-2 pt-1">
      <Slider
        min={range.min}
        max={range.max}
        step={Math.max(1, Math.floor((range.max - range.min) / 100))}
        value={local}
        onValueChange={(v) => setLocal(v as [number, number])}
        onValueCommit={commit}
        minStepsBetweenThumbs={1}
        aria-label="Price range"
      />
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1">
          <span
            className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            id="price-min-label"
          >
            Min
          </span>
          <span
            className="mt-0.5 block text-sm font-medium tabular text-foreground"
            aria-labelledby="price-min-label"
          >
            {formatPrice(local[0], range.currency)}
          </span>
        </div>
        <span aria-hidden className="mt-3 h-px w-3 bg-border" />
        <div className="flex-1 text-right">
          <span
            className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            id="price-max-label"
          >
            Max
          </span>
          <span
            className="mt-0.5 block text-sm font-medium tabular text-foreground"
            aria-labelledby="price-max-label"
          >
            {formatPrice(local[1], range.currency)}
            {local[1] === range.max ? "+" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Rating filter ────────────────────────────────────────────────────────────

function RatingFilter() {
  const { searchParams, setParam } = useFilterNav();
  const current = Number(searchParams?.get("rating") ?? "0");

  return (
    <div className="flex flex-col gap-1" role="radiogroup" aria-label="Minimum rating">
      {[4, 3, 2, 1].map((r) => {
        const active = current === r;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setParam("rating", active ? undefined : String(r))}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
              active
                ? "bg-primary/5 text-foreground"
                : "hover:bg-muted/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <StarRating rating={r} size="sm" />
            <span className="text-muted-foreground">& up</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Availability ─────────────────────────────────────────────────────────────

function AvailabilityFilter() {
  const { searchParams, setParam } = useFilterNav();
  const inStock = searchParams?.get("inStock") === "1";
  const onSale = searchParams?.get("onSale") === "1";

  return (
    <div className="flex flex-col gap-0.5">
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
          inStock ? "bg-primary/5" : "hover:bg-muted/60",
        )}
      >
        <Checkbox
          checked={inStock}
          onCheckedChange={() => setParam("inStock", inStock ? undefined : "1")}
          aria-label="In stock only"
        />
        In stock only
      </label>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
          onSale ? "bg-primary/5" : "hover:bg-muted/60",
        )}
      >
        <Checkbox
          checked={onSale}
          onCheckedChange={() => setParam("onSale", onSale ? undefined : "1")}
          aria-label="On sale"
        />
        On sale
      </label>
    </div>
  );
}

// ── Active chips + clear-all ─────────────────────────────────────────────────

type Chip = { key: string; value?: string; label: string };

function useActiveChips(config: FilterConfig): Chip[] {
  const searchParams = useSearchParams();
  return React.useMemo(() => {
    const chips: Chip[] = [];
    if (!searchParams) return chips;
    for (const key of ["collection", "vendor", "tag"] as const) {
      const values = (searchParams.get(key) ?? "").split(",").filter(Boolean);
      const facets =
        key === "collection"
          ? config.collections
          : key === "vendor"
            ? config.vendors
            : config.tags;
      for (const v of values) {
        const label = facets?.find((f) => f.value === v)?.label ?? v;
        chips.push({ key, value: v, label });
      }
    }
    const q = searchParams.get("q");
    if (q) chips.push({ key: "q", value: q, label: `"${q}"` });
    const r = searchParams.get("rating");
    if (r) chips.push({ key: "rating", value: r, label: `${r}★ & up` });
    if (searchParams.get("inStock") === "1")
      chips.push({ key: "inStock", value: "1", label: "In stock" });
    if (searchParams.get("onSale") === "1")
      chips.push({ key: "onSale", value: "1", label: "On sale" });
    const pmin = searchParams.get("priceMin");
    const pmax = searchParams.get("priceMax");
    if (pmin || pmax) {
      const cur = config.priceRange?.currency ?? getPlatformCurrency();
      const lo = pmin ? formatPrice(Number(pmin), cur) : "";
      const hi = pmax ? formatPrice(Number(pmax), cur) : "";
      const label =
        pmin && pmax ? `${lo} – ${hi}` : pmin ? `from ${lo}` : `up to ${hi}`;
      chips.push({ key: "price", value: "1", label });
    }
    return chips;
  }, [searchParams, config]);
}

function useRemoveChip() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return React.useCallback(
    (c: Chip) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (["collection", "vendor", "tag"].includes(c.key) && c.value) {
        const list = (params.get(c.key) ?? "")
          .split(",")
          .filter((v) => v && v !== c.value);
        if (list.length) params.set(c.key, list.join(","));
        else params.delete(c.key);
      } else if (c.key === "price") {
        params.delete("priceMin");
        params.delete("priceMax");
      } else {
        params.delete(c.key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}

function ActiveChips({ config }: { config: FilterConfig }) {
  const chips = useActiveChips(config);
  const removeChip = useRemoveChip();
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Active filters">
      {chips.map((c, i) => (
        <li key={`${c.key}-${c.value}-${i}`}>
          <button
            type="button"
            onClick={() => removeChip(c)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Remove filter ${c.label}`}
          >
            <span className="truncate max-w-[14rem]">{c.label}</span>
            <X className="size-3 shrink-0" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ActiveChipsBar({ config }: { config: FilterConfig }) {
  const chips = useActiveChips(config);
  if (chips.length === 0) return null;
  return (
    <div className="shrink-0 border-b bg-muted/30 px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Active
        </p>
        <ClearAllButton />
      </div>
      <div className="mt-2">
        <ActiveChips config={config} />
      </div>
    </div>
  );
}

function ActiveCountBadge() {
  const searchParams = useSearchParams();
  const count = React.useMemo(() => {
    if (!searchParams) return 0;
    const skip = new Set(["sort", "page", "q"]);
    let n = 0;
    for (const [k, v] of searchParams.entries()) {
      if (skip.has(k)) continue;
      if (["collection", "vendor", "tag"].includes(k))
        n += v.split(",").filter(Boolean).length;
      else n += 1;
    }
    return n;
  }, [searchParams]);
  if (!count) return null;
  return (
    <span
      className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground"
      aria-label={`${count} active filters`}
    >
      {count}
    </span>
  );
}

function ClearAllButton({
  variant = "link",
}: {
  /** "link" — small text link (used in panels); "ghost" — Button-shaped, used in the drawer footer. */
  variant?: "link" | "ghost";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasFilters = React.useMemo(() => {
    if (!searchParams) return false;
    const keys = Array.from(searchParams.keys()).filter(
      (k) => k !== "sort" && k !== "page" && k !== "view",
    );
    return keys.length > 0;
  }, [searchParams]);

  if (!hasFilters) return null;

  const onClick = () => {
    const keep = ["sort", "view"];
    const params = new URLSearchParams();
    for (const k of keep) {
      const v = searchParams?.get(k);
      if (v) params.set(k, v);
    }
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`, {
      scroll: false,
    });
  };

  if (variant === "ghost") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={onClick}
        className="text-muted-foreground hover:text-foreground"
      >
        Clear all
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
    >
      Clear all
    </button>
  );
}

function ActiveCount({ floating = false }: { floating?: boolean }) {
  const searchParams = useSearchParams();
  const count = React.useMemo(() => {
    if (!searchParams) return 0;
    const skip = new Set(["sort", "page", "q"]);
    let n = 0;
    for (const [k, v] of searchParams.entries()) {
      if (skip.has(k)) continue;
      if (["collection", "vendor", "tag"].includes(k)) {
        n += v.split(",").filter(Boolean).length;
      } else {
        n += 1;
      }
    }
    return n;
  }, [searchParams]);
  if (!count) return null;
  return (
    <span
      className={cn(
        "rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground",
        floating
          ? "ml-1 max-sm:absolute max-sm:-right-1 max-sm:-top-1 max-sm:ml-0 max-sm:min-w-[20px] max-sm:px-1.5 max-sm:py-1 max-sm:ring-2 max-sm:ring-background"
          : "ml-1",
      )}
    >
      {count}
    </span>
  );
}
