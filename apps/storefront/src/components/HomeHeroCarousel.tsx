"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface HeroSlide {
  id: string;
  /** Tiny eyebrow above the headline. */
  eyebrow: string;
  /** Headline. Will render with the brand display font. */
  title: string;
  /** Optional italic word inside the title — wrapped in `<em>`. */
  emphasis?: string;
  /** Continuation after the emphasis. */
  titleAfter?: string;
  /** Subhead body copy. */
  description: string;
  /** Primary CTA. */
  cta: { label: string; href: string };
  /** Secondary CTA, rendered as text link. */
  secondaryCta?: { label: string; href: string };
  /** Background image (Unsplash, R2, etc.). */
  image: string;
  /** Optional explicit text/scrim alignment. */
  align?: "left" | "center";
  /** Image alt text. */
  alt?: string;
}

interface Props {
  slides: HeroSlide[];
  /** Auto-rotate interval in ms. Set 0 to disable. */
  intervalMs?: number;
  className?: string;
}

const AUTOPLAY_DEFAULT = 6500;

export function HomeHeroCarousel({
  slides,
  intervalMs = AUTOPLAY_DEFAULT,
  className,
}: Props) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Honour the user's prefers-reduced-motion setting.
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const total = slides.length;
  const next = React.useCallback(
    () => setIndex((i) => (i + 1) % total),
    [total]
  );
  const prev = React.useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total]
  );

  // Autoplay — pauses on hover, focus-within, or when tab is hidden.
  React.useEffect(() => {
    if (!intervalMs || reduceMotion || paused || total <= 1) return;
    const id = window.setInterval(next, intervalMs);
    return () => window.clearInterval(id);
  }, [next, intervalMs, paused, reduceMotion, total]);

  // Keyboard nav while the carousel has focus.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  }

  if (total === 0) return null;

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Featured stories"
      className={cn(
        "relative isolate overflow-hidden bg-foreground text-background",
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      {/* Full-viewport: 100dvh minus the header. Mobile has only the main
          header (4rem); on lg the utility bar adds ~2rem on top. */}
      <div className="relative h-[calc(100dvh-4rem)] min-h-[520px] lg:h-[calc(100dvh-6rem)]">
        {slides.map((slide, i) => {
          const isActive = i === index;
          const align = slide.align ?? "left";
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${total}: ${slide.title}`}
              aria-hidden={!isActive}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out",
                isActive ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <Image
                src={slide.image}
                alt={slide.alt ?? ""}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
              {/* Side scrim for readability */}
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0",
                  align === "center"
                    ? "bg-gradient-to-t from-foreground/75 via-foreground/30 to-foreground/15"
                    : "bg-gradient-to-r from-foreground/85 via-foreground/45 to-foreground/0"
                )}
              />

              <div
                className={cn(
                  "relative mx-auto flex h-full max-w-8xl flex-col justify-center px-4 pb-20 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pb-28 lg:pt-32",
                  align === "center" && "items-center text-center"
                )}
              >
                <div
                  className={cn(
                    "max-w-2xl",
                    align === "center" && "max-w-3xl"
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-background/80">
                    {slide.eyebrow}
                  </p>
                  <h2
                    className="mt-5 text-5xl font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[5rem]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {slide.title}
                    {slide.emphasis && (
                      <>
                        {" "}
                        <em className="not-italic" style={{ fontStyle: "italic" }}>
                          {slide.emphasis}
                        </em>
                      </>
                    )}
                    {slide.titleAfter}
                  </h2>
                  <p className="mt-5 max-w-md text-base leading-relaxed text-background/85 sm:text-lg">
                    {slide.description}
                  </p>
                  <div
                    className={cn(
                      "mt-8 flex flex-wrap items-center gap-4",
                      align === "center" && "justify-center"
                    )}
                  >
                    <Link
                      href={slide.cta.href}
                      className="inline-flex items-center gap-2 rounded-full bg-background px-7 py-3.5 text-sm font-bold tracking-wide text-foreground shadow-[var(--shadow-pop)] transition-all hover:-translate-y-0.5 hover:bg-background/95"
                    >
                      {slide.cta.label}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                    {slide.secondaryCta && (
                      <Link
                        href={slide.secondaryCta.href}
                        className="inline-flex items-center gap-1.5 border-b border-background/60 pb-1 text-sm font-medium text-background transition-colors hover:border-background"
                      >
                        {slide.secondaryCta.label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls (only show when more than one slide) */}
      {total > 1 && (
        <>
          {/* Prev / next */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-background/30 bg-background/10 text-background backdrop-blur-sm transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background sm:left-6 lg:left-10"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-background/30 bg-background/10 text-background backdrop-blur-sm transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background sm:right-6 lg:right-10"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          {/* Bottom controls */}
          <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-3">
            <ol
              role="tablist"
              aria-label="Choose slide"
              className="flex items-center gap-2"
            >
              {slides.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-label={`Slide ${i + 1}: ${s.title}`}
                    aria-selected={i === index}
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
            {intervalMs > 0 && !reduceMotion && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Resume autoplay" : "Pause autoplay"}
                className="ml-2 grid size-7 place-items-center rounded-full border border-background/30 bg-background/10 text-background backdrop-blur-sm transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
              >
                {paused ? (
                  <Play className="size-3" aria-hidden />
                ) : (
                  <Pause className="size-3" aria-hidden />
                )}
              </button>
            )}
          </div>

          {/* Slide counter */}
          <p
            aria-live="polite"
            className="absolute right-6 bottom-7 hidden text-[10px] font-semibold uppercase tracking-[0.22em] tabular text-background/70 sm:block lg:right-12"
          >
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </p>
        </>
      )}
    </section>
  );
}
