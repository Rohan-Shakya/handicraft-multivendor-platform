import { ArrowLeft, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: { absolute: `Offline · ${brand.shortName}` },
  description: `${brand.name} is offline. Reconnect to keep shopping hand-crafted sculptures from Kathmandu.`,
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"
      >
        <WifiOff className="size-6" />
      </span>

      <p className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        <span aria-hidden className="h-px w-6 bg-primary/60" />
        You&rsquo;re offline
      </p>

      <h1
        className="mt-3 text-4xl font-medium leading-[1.05] tracking-[-0.01em] sm:text-5xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        The bench keeps working. <span className="italic text-primary">We&rsquo;ll wait.</span>
      </h1>

      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        Looks like your connection dropped. Anything you&rsquo;ve already viewed
        is cached and still browsable. New product pages and checkout will be
        ready once you&rsquo;re back online.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-1.5 rounded-full border bg-card px-5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to home
        </Link>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        {brand.name} · Hand-crafted in {brand.contact.address.addressLocality},{" "}
        {brand.contact.address.countryName}
      </p>
    </main>
  );
}
