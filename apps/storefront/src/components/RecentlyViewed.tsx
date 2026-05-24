"use client";

import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { formatPrice, getPlatformCurrency } from "@/lib/format";

interface Props {
  /** Exclude the currently-shown product id from the list */
  excludeId?: string;
  title?: string;
  className?: string;
}

export function RecentlyViewed({
  excludeId,
  title = "Recently viewed",
  className,
}: Props) {
  const { items, clear } = useRecentlyViewed();
  const filtered = items.filter((i) => i.id !== excludeId);

  if (filtered.length === 0) return null;

  return (
    <section className={className} aria-labelledby="recently-viewed-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="recently-viewed-heading"
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" aria-hidden />
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {filtered.slice(0, 6).map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.handle}`}
            className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted/60">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="mt-2 space-y-0.5">
              <p className="line-clamp-1 text-xs font-medium">{item.title}</p>
              {item.price != null && (
                <p className="text-xs font-semibold">
                  {formatPrice(item.price, getPlatformCurrency())}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
