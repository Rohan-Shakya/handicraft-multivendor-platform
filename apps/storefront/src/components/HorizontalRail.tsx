"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  /** Pixels to scroll per arrow click. Defaults to one viewport width of the rail. */
  scrollBy?: number;
  /** Extra classes for the rail's `<ul>`. */
  className?: string;
  /** Hide the arrow controls entirely. */
  hideArrows?: boolean;
  /** Accessible name describing what the rail contains. */
  ariaLabel?: string;
}

/**
 * Snap-scrolling horizontal list with optional prev/next arrow controls.
 * The arrows fade out when you can't scroll further in that direction.
 */
export function HorizontalRail({
  children,
  scrollBy,
  className,
  hideArrows,
  ariaLabel,
}: Props) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(true);

  const update = React.useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 8);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  React.useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function nudge(direction: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    const distance = scrollBy ?? Math.round(el.clientWidth * 0.85);
    el.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={railRef}
        role={ariaLabel ? "region" : undefined}
        aria-label={ariaLabel}
        className={cn(
          "no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4",
          className
        )}
      >
        {children}
      </div>

      {!hideArrows && (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between sm:flex">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Scroll left"
            disabled={!canPrev}
            className={cn(
              "pointer-events-auto -ml-3 grid size-11 place-items-center rounded-full border bg-background/95 text-foreground shadow-[var(--shadow-soft)] transition-all backdrop-blur-sm",
              "disabled:pointer-events-none disabled:opacity-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "hover:bg-foreground hover:text-background"
            )}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Scroll right"
            disabled={!canNext}
            className={cn(
              "pointer-events-auto -mr-3 grid size-11 place-items-center rounded-full border bg-background/95 text-foreground shadow-[var(--shadow-soft)] transition-all backdrop-blur-sm",
              "disabled:pointer-events-none disabled:opacity-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "hover:bg-foreground hover:text-background"
            )}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
