"use client";

import type { Product } from "@repo/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { formatPrice } from "@/lib/format";

type ProductWithDetails = Product & {
  featuredImage?: { url: string; altText?: string } | null;
  lowestPrice?: number | null;
  currencyCode?: string | null;
};

interface ProductSliderProps {
  title: string;
  products: ProductWithDetails[];
  viewAllHref?: string;
  badge?: string;
  badgeColor?: "primary" | "amber" | "emerald" | "rose";
}

const BADGE_STYLES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
};

export function ProductSlider({
  title,
  products,
  viewAllHref,
  badge,
  badgeColor = "primary",
}: ProductSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    if (!sliderRef.current) return;
    const amount = sliderRef.current.offsetWidth * 0.75;
    sliderRef.current.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }

  if (products.length === 0) return null;

  return (
    <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {badge && (
            <span
              className={`rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest ${BADGE_STYLES[badgeColor]}`}
            >
              {badge}
            </span>
          )}
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="hidden sm:inline text-sm font-medium text-primary hover:underline underline-offset-4 mr-1"
            >
              View All →
            </Link>
          )}
          <button
            onClick={() => scroll("left")}
            className="flex size-8 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex size-8 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Slider track */}
      <div
        ref={sliderRef}
        className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-3 -mx-4 px-4 sm:-mx-0 sm:px-0"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="shrink-0 w-[160px] sm:w-[200px] lg:w-[220px] snap-start"
          >
            <a
              href={`/products/${product.handle}`}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
                {product.featuredImage?.url ? (
                  <Image
                    src={product.featuredImage.url}
                    alt={product.featuredImage.altText ?? product.title}
                    fill
                    sizes="220px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-2.5 space-y-0.5">
                <p className="font-medium text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {product.title}
                </p>
                <p className="text-sm font-bold text-primary">
                  {product.lowestPrice != null
                    ? formatPrice(product.lowestPrice, product.currencyCode)
                    : "—"}
                </p>
              </div>
            </a>
          </div>
        ))}

        {/* View all card */}
        {viewAllHref && (
          <div className="shrink-0 w-[160px] sm:w-[200px] lg:w-[220px] snap-start">
            <Link
              href={viewAllHref}
              className="group flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <div className="text-center">
                <div className="mb-2 mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <ChevronRight className="size-5 text-primary" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                  View All
                </p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
