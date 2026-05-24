"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface Item {
  quote: string;
  source: string;
}

interface Props {
  items: Item[];
  /** Auto-rotate interval. Set to 0 to disable. */
  intervalMs?: number;
}

const DEFAULT_INTERVAL = 6000;

/**
 * Auto-rotating press quote with prefers-reduced-motion + `aria-live`.
 * Each quote announces to screen readers as it changes.
 */
export function PressTestimonialClient({
  items,
  intervalMs = DEFAULT_INTERVAL,
}: Props) {
  const [index, setIndex] = React.useState(0);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    if (!intervalMs || reduceMotion || items.length <= 1) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      intervalMs
    );
    return () => window.clearInterval(id);
  }, [intervalMs, items.length, reduceMotion]);

  if (items.length === 0) return null;
  const current = items[index];
  if (!current) return null;

  return (
    <div aria-live="polite">
      <blockquote
        key={current.source}
        className="text-2xl font-medium italic leading-snug tracking-[-0.01em] sm:text-3xl lg:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        &ldquo;{current.quote}&rdquo;
      </blockquote>
      <p className="mt-6 text-xs uppercase tracking-[0.22em] text-background/60">
        — {current.source}
      </p>

      {items.length > 1 && (
        <ol
          role="tablist"
          aria-label="Press quote"
          className="mt-7 flex items-center justify-center gap-2"
        >
          {items.map((q, i) => (
            <li key={q.source}>
              <button
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Quote from ${q.source}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background",
                  i === index
                    ? "w-8 bg-background"
                    : "w-2 bg-background/40 hover:bg-background/70"
                )}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
