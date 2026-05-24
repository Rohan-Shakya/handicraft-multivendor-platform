"use client";

import { ArrowDownUp, Check, LayoutGrid, Rows3 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating_desc", label: "Top rated" },
  { value: "created_at_desc", label: "Newest" },
  { value: "bestseller", label: "Best selling" },
  { value: "title_asc", label: "A–Z" },
] as const;

export function SortSelect({ size = "sm" }: { size?: "sm" | "lg" } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams?.get("sort") ?? "";
  const label = SORT_OPTIONS.find((o) => o.value === current)?.label ?? "Featured";

  const [open, setOpen] = React.useState(false);

  function setSort(next: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next) params.set("sort", next);
    else params.delete("sort");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  const sizeClass =
    size === "lg" ? "h-10 px-4 py-2" : "px-3.5 py-1.5";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-full border bg-background text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          sizeClass,
        )}
        aria-label={`Sort products: ${label}`}
      >
        <ArrowDownUp className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">Sort:</span>
        <span className="text-foreground">{label}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5" role="menu" aria-label="Sort by">
        {SORT_OPTIONS.map((o) => {
          const active = o.value === current;
          return (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => setSort(o.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                active && "font-semibold text-primary",
              )}
            >
              {o.label}
              {active && <Check className="size-4" aria-hidden />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Grid / list view toggle. Updates ?view=grid|list in the URL.
 */
export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams?.get("view") === "list" ? "list" : "grid";

  function setView(next: "grid" | "list") {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "grid") params.delete("view");
    else params.set("view", next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      role="group"
      aria-label="Layout"
      className="hidden items-center rounded-full border p-0.5 sm:inline-flex"
    >
      <button
        type="button"
        onClick={() => setView("grid")}
        aria-pressed={view === "grid"}
        aria-label="Grid view"
        className={cn(
          "grid size-8 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          view === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setView("list")}
        aria-pressed={view === "list"}
        aria-label="List view"
        className={cn(
          "grid size-8 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          view === "list"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Rows3 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
