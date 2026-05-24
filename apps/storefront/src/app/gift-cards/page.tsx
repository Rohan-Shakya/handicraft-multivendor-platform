"use client";

import * as React from "react";
import type { Metadata } from "next";
import { Gift, Loader2, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { brand } from "@/config/brand";

// We can't export metadata from a "use client" file — sibling layout/parent
// metadata covers the basic title. For a richer SEO footprint move the lookup
// form into a client subcomponent.

interface LookupResponse {
  code: string;
  balance: number;
  currencyCode: string;
  expiresAt: string | null;
  status: "active" | "disabled" | "consumed" | "expired";
}

export default function GiftCardsPage() {
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<LookupResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch<LookupResponse>("/storefront/gift-cards/lookup", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message ?? "We couldn't find that gift card.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Gift cards" }]} />

      <header className="mt-6 text-center">
        <div
          aria-hidden
          className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary/10 text-primary"
        >
          <Gift className="size-7" />
        </div>
        <h1
          className="text-4xl font-bold tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Gift cards
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
          Give the gift of {brand.productNounPlural}. Check your balance or redeem at
          checkout — gift cards never lose value before expiry.
        </p>
      </header>

      <section
        aria-labelledby="check-balance"
        className="mt-10 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
      >
        <h2
          id="check-balance"
          className="text-lg font-semibold tracking-tight"
        >
          Check your balance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the code from your gift card to see the remaining balance.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="gift-card-code" className="sr-only">
            Gift card code
          </label>
          <input
            id="gift-card-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH-1234"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-12 flex-1 rounded-xl border bg-background px-4 text-base tracking-widest tabular-nums uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            aria-describedby={error ? "code-error" : undefined}
            aria-invalid={!!error}
          />
          <Button type="submit" size="lg" disabled={loading || !code.trim()}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              "Check balance"
            )}
          </Button>
        </form>

        {error && (
          <p id="code-error" role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {result && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20"
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              <Sparkles className="size-3.5" aria-hidden />
              {result.status === "active" ? "Card is active" : `Card status: ${result.status}`}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {formatPrice(result.balance / 100, result.currencyCode)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Balance for code{" "}
              <span className="font-mono">{result.code}</span>
              {result.expiresAt
                ? ` · expires ${new Date(result.expiresAt).toLocaleDateString()}`
                : " · no expiry"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Apply this code at checkout to pay with your card balance.
            </p>
          </div>
        )}
      </section>

      <section className="mt-10 rounded-2xl bg-muted/30 p-6 text-sm text-muted-foreground sm:p-8">
        <h2 className="mb-2 text-base font-semibold text-foreground">
          About our gift cards
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Gift cards never expire unless explicitly marked with an expiry date.</li>
          <li>Balances are deducted automatically when applied at checkout.</li>
          <li>Partial use leaves the remainder on the card for next time.</li>
          <li>Lost a card? Contact support — we can re-issue it.</li>
        </ul>
      </section>
    </main>
  );
}
