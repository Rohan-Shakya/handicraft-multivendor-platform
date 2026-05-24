"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[storefront] unhandled error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-8 grid size-24 place-items-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-12 text-destructive" aria-hidden />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-destructive">
        Error
      </p>
      <h1
        className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Something went wrong.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
        An unexpected error occurred while loading this page. Try again or
        head back to the home page.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:translate-y-[-1px] hover:shadow-[var(--shadow-pop)]"
        >
          <RefreshCw className="size-4" /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-2xl border bg-card px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-accent"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
