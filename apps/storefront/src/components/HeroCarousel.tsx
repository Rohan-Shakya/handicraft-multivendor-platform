"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback,useEffect, useState } from "react";

const SLIDES = [
  {
    id: 1,
    eyebrow: "New Arrivals",
    title: "Discover Unique",
    highlight: "Independent Finds",
    description:
      "Shop thousands of one-of-a-kind items from verified sellers worldwide. Quality goods, curated just for you.",
    cta: { label: "Shop Now", href: "/products" },
    cta2: { label: "Browse Collections", href: "/collections" },
    bg: "from-indigo-950 via-violet-900 to-purple-900",
    accent: "from-violet-300 via-pink-300 to-amber-300",
  },
  {
    id: 2,
    eyebrow: "Editor's Pick",
    title: "Curated Style,",
    highlight: "Unique Stories",
    description:
      "Explore hand-picked collections from the best independent designers and makers around the globe.",
    cta: { label: "View Collections", href: "/collections" },
    cta2: { label: "Meet Vendors", href: "/vendors" },
    bg: "from-slate-900 via-blue-950 to-indigo-900",
    accent: "from-cyan-300 via-blue-300 to-indigo-300",
  },
  {
    id: 3,
    eyebrow: "Community Picks",
    title: "Support Small",
    highlight: "Business Makers",
    description:
      "Every purchase directly supports an independent creator. Shop with purpose, discover with passion.",
    cta: { label: "Start Shopping", href: "/products" },
    cta2: { label: "Become a Vendor", href: "/vendors" },
    bg: "from-emerald-950 via-teal-900 to-cyan-950",
    accent: "from-emerald-300 via-teal-300 to-cyan-300",
  },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const goTo = useCallback(
    (idx: number) => {
      if (transitioning) return;
      setTransitioning(true);
      setCurrent(idx);
      setTimeout(() => setTransitioning(false), 600);
    },
    [transitioning]
  );

  const prev = useCallback(
    () => goTo((current - 1 + SLIDES.length) % SLIDES.length),
    [current, goTo]
  );

  const next = useCallback(
    () => goTo((current + 1) % SLIDES.length),
    [current, goTo]
  );

  useEffect(() => {
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [next]);

  const slide = SLIDES[current]!;

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-br ${slide.bg} text-white transition-all duration-700`}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
        <div className="max-w-3xl">
          {/* Eyebrow badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            {slide.eyebrow}
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-7xl leading-[1.05]">
            {slide.title}
            <br />
            <span
              className={`bg-gradient-to-r ${slide.accent} bg-clip-text text-transparent`}
            >
              {slide.highlight}
            </span>
          </h1>

          <p className="mt-6 text-base text-white/70 max-w-lg sm:text-lg leading-relaxed">
            {slide.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={slide.cta.href}
              className="inline-flex items-center justify-center rounded-xl bg-white text-gray-900 px-8 py-3.5 text-sm font-bold shadow-lg hover:bg-white/90 transition-all active:scale-[0.98]"
            >
              {slide.cta.label}
            </Link>
            <Link
              href={slide.cta2.href}
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold hover:bg-white/20 transition-all backdrop-blur-sm active:scale-[0.98]"
            >
              {slide.cta2.label}
            </Link>
          </div>
        </div>
      </div>

      {/* Prev / Next */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Next slide"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === current ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Slide counter */}
      <div className="absolute bottom-6 right-6 text-xs font-semibold text-white/50 tabular-nums hidden sm:block">
        {current + 1} / {SLIDES.length}
      </div>
    </section>
  );
}
