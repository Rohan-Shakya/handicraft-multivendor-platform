"use client";

import {
  ArrowRight,
  ChevronLeft,
  Gift,
  Loader2,
  Mail,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatPriceCents, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface GiftCard {
  id: string;
  code: string;
  balance: number;
  initialValue: number;
  currencyCode: string;
  status: "active" | "expired" | "redeemed" | "disabled";
  expiresAt?: string | null;
}

const DENOMINATIONS = [50, 100, 250, 500];

const FAQS = [
  {
    q: "When does my gift card expire?",
    a: "Never. Balances stay on the card until they're spent.",
  },
  {
    q: "Can I top up an existing card?",
    a: "Yes — buy a new card with the same recipient email and the balances combine automatically.",
  },
  {
    q: "Can I use it for international orders?",
    a: "Gift cards work in the same currency they were purchased in. We auto-convert at the checkout.",
  },
];

function statusToTone(status: GiftCard["status"]): {
  label: string;
  className: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-primary/10 text-primary",
      };
    case "expired":
      return {
        label: "Expired",
        className: "bg-muted text-muted-foreground",
      };
    case "redeemed":
      return {
        label: "Redeemed",
        className: "bg-muted text-muted-foreground",
      };
    case "disabled":
      return {
        label: "Disabled",
        className: "bg-destructive/10 text-destructive",
      };
  }
}

export default function GiftCardsPage() {
  const { customer } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [cards, setCards] = React.useState<GiftCard[]>([]);
  const [code, setCode] = React.useState("");
  const [redeeming, setRedeeming] = React.useState(false);

  async function fetchCards() {
    setLoading(true);
    try {
      const data = await apiFetch<GiftCard[] | { data: GiftCard[] }>(
        "/storefront/gift-cards"
      );
      setCards(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (customer) fetchCards();
    else setLoading(false);
  }, [customer]);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      await apiFetch("/storefront/gift-cards/redeem", {
        method: "POST",
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      toast({
        title: "Gift card added",
        description: "The balance is now in your account.",
      });
      setCode("");
      fetchCards();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Invalid gift card code";
      toast({
        title: "Redemption failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  }

  const totalBalance = cards.reduce(
    (sum, c) => (c.status === "active" ? sum + c.balance : sum),
    0
  );
  const balanceCurrency = cards[0]?.currencyCode ?? getPlatformCurrency();

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="border-b" aria-labelledby="gift-heading">
        <div className="mx-auto max-w-8xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-12 lg:pt-16">
          {customer && (
            <Link
              href="/customer/account"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Back to account
            </Link>
          )}
          <div className="mt-3">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Gift cards" }]}
            />
          </div>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                Give a gift
              </p>
              <h1
                id="gift-heading"
                className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.01em] sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {brand.shortName} gift cards.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                The thoughtful way to gift a hand-crafted heirloom — recipients
                pick the {brand.productNoun}, you pick the budget. Delivered by
                email instantly, never expires.
              </p>
            </div>
            {customer && cards.length > 0 && (
              <div className="rounded-3xl bg-primary/10 px-6 py-4 text-primary">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">
                  Your balance
                </p>
                <p
                  className="mt-1 text-3xl font-medium tabular sm:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {formatPriceCents(totalBalance, balanceCurrency)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Buy a gift card (denominations) ─────────────────────── */}
      <section className="py-16 lg:py-20" aria-labelledby="buy-heading">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Send a gift
              </p>
              <h2
                id="buy-heading"
                className="mt-3 text-3xl font-medium tracking-[-0.01em] sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Pick an amount.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Choose a denomination, add a personal message, and we&apos;ll
                email it the same day. Or pick a custom amount at checkout.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4">
              {DENOMINATIONS.map((amount) => (
                <Link
                  key={amount}
                  href={`/products?giftCardAmount=${amount}`}
                  className="group flex flex-col justify-between rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-soft)] sm:p-6"
                >
                  <div className="flex items-start justify-between">
                    <Gift
                      className="size-5 text-primary"
                      aria-hidden
                    />
                    <ArrowRight
                      className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                      aria-hidden
                    />
                  </div>
                  <p
                    className="mt-6 text-3xl font-medium tracking-tight sm:text-4xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    ${amount}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Email delivery
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* How it works */}
          <ol className="mt-16 grid gap-6 border-t pt-12 sm:grid-cols-3">
            {[
              {
                n: "01",
                title: "Pick an amount",
                body: "Choose a denomination above or enter a custom amount.",
              },
              {
                n: "02",
                title: "Add a message",
                body: "Personalise it with a note — they'll get a beautifully designed email.",
              },
              {
                n: "03",
                title: "Send instantly",
                body: "Delivered the same day. No expiry, no fees, applied at checkout.",
              },
            ].map((s) => (
              <li key={s.n}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                  {s.n}
                </p>
                <h3
                  className="mt-3 text-xl font-medium tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Redeem + your cards ─────────────────────────────────── */}
      <section
        className="border-t bg-secondary/30 py-16 lg:py-20"
        aria-labelledby="redeem-heading"
      >
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-14">
            {/* Redeem */}
            <div className="rounded-3xl border bg-card p-7 lg:p-8">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Plus className="size-5" aria-hidden />
              </div>
              <h2
                id="redeem-heading"
                className="mt-4 text-2xl font-medium tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Got a code?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Add a gift card to your account and the balance will apply
                automatically at checkout.
              </p>
              <form
                onSubmit={redeem}
                className="mt-5 flex flex-col gap-3 sm:flex-row"
                aria-label="Redeem gift card"
              >
                <label htmlFor="gift-code" className="sr-only">
                  Gift card code
                </label>
                <Input
                  id="gift-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 rounded-2xl font-mono uppercase tracking-wider"
                />
                <Button
                  type="submit"
                  disabled={redeeming || code.trim().length === 0}
                  className="rounded-full px-6"
                >
                  {redeeming && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  Redeem
                </Button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                Codes are case-insensitive — we&apos;ll handle the formatting.
              </p>
            </div>

            {/* Your cards */}
            <div>
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Your balance
                  </p>
                  <h3
                    className="text-xl font-medium tracking-tight sm:text-2xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Active gift cards
                  </h3>
                </div>
              </div>

              {!customer ? (
                <div className="mt-6 rounded-3xl border border-dashed bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Sign in to view your balance and saved gift cards.
                  </p>
                  <Link
                    href="/customer/login?next=/customer/gift-cards"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Sign in
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              ) : loading ? (
                <div className="mt-6 flex items-center justify-center rounded-3xl border bg-card p-12">
                  <Loader2
                    className="size-6 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                </div>
              ) : cards.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed bg-card p-8 text-center">
                  <p className="text-sm font-medium">No gift cards yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Redeem a code on the left to get started.
                  </p>
                </div>
              ) : (
                <ul className="mt-6 flex flex-col gap-3">
                  {cards.map((g) => {
                    const masked = `•••• ${g.code.slice(-4)}`;
                    const pct =
                      g.initialValue > 0
                        ? (g.balance / g.initialValue) * 100
                        : 0;
                    const tone = statusToTone(g.status);
                    return (
                      <li
                        key={g.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-5"
                      >
                        <div className="flex items-start gap-4">
                          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cream text-cream-foreground">
                            <Gift className="size-5" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-semibold tracking-wider">
                              {masked}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatPriceCents(g.initialValue, g.currencyCode)}{" "}
                              initial
                              {g.expiresAt && (
                                <>
                                  {" "}
                                  · Expires{" "}
                                  {new Date(g.expiresAt).toLocaleDateString()}
                                </>
                              )}
                            </p>
                            <div className="mt-2 h-1 w-44 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{
                                  width: `${Math.max(0, Math.min(100, pct))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              tone.className
                            )}
                          >
                            {tone.label}
                          </span>
                          <p
                            className="mt-2 text-2xl font-medium tabular tracking-tight"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {formatPriceCents(g.balance, g.currencyCode)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Common questions
          </p>
          <h2
            id="faq-heading"
            className="mt-3 text-3xl font-medium tracking-[-0.01em] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Good to know.
          </h2>
          <div className="mt-8 flex flex-col divide-y rounded-3xl border bg-card">
            {FAQS.map((f) => (
              <details key={f.q} className="group p-6">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full border text-muted-foreground transition-colors group-open:border-primary group-open:bg-primary group-open:text-primary-foreground"
                  >
                    <span className="block transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Still stuck?{" "}
            <Link
              href="/pages/contact"
              className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              <Mail className="size-3" aria-hidden />
              Email us
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
