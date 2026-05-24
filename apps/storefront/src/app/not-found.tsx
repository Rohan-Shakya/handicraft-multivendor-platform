import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: `Page not found · ${brand.shortName}`,
  description: "The page you're looking for doesn't exist or has moved.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-8 grid size-24 place-items-center rounded-full bg-cream">
        <SearchX className="size-12 text-cream-foreground" aria-hidden />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        404 · Not found
      </p>
      <h1
        className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Lost the thread.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
        Let&apos;s get you back to something you&apos;ll love.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-2xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:translate-y-[-1px] hover:shadow-[var(--shadow-pop)]"
        >
          Back to home
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center rounded-2xl border bg-card px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-accent"
        >
          Browse {brand.productNounPlural}
        </Link>
      </div>
    </main>
  );
}
