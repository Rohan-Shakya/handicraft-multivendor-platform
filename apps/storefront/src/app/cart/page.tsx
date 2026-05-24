"use client";

import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useCart } from "@/context/CartContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CartOption {
  name: string;
  value: string;
  displayType?: string;
  swatchColor?: string | null;
}

interface CartItemDetail {
  id: string;
  cartId: string;
  variantId: string;
  productId: string;
  title: string;
  variantTitle?: string | null;
  sku?: string | null;
  unitPrice: string;
  quantity: number;
  lineSubtotal: string;
  lineTotal: string;
  currencyCode?: string;
  selectedOptions?: CartOption[];
  product?: {
    id: string;
    handle: string;
    title: string;
    featuredImage?: { url: string; altText?: string | null } | null;
    vendor?: { id?: string; name?: string } | null;
  } | null;
}

const toNumber = (s: string | null | undefined): number => {
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const FREE_SHIPPING_THRESHOLD = 50;
const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Cart" }];

export default function CartPage() {
  const { items, updateItem, removeItem, loading, refreshCart } = useCart();
  const router = useRouter();

  const typed = items as unknown as CartItemDetail[];
  const currency = typed[0]?.currencyCode ?? getPlatformCurrency();
  const fmt = (amount: number) => formatPrice(amount, currency);

  const subtotal = typed.reduce(
    (s, i) => s + (toNumber(i.lineTotal) || toNumber(i.unitPrice) * i.quantity),
    0
  );
  const itemCount = typed.reduce((s, i) => s + i.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPct = Math.min(
    100,
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100
  );

  const [promoCode, setPromoCode] = React.useState("");
  const [applyingPromo, setApplyingPromo] = React.useState(false);

  async function applyPromo(e: React.FormEvent) {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) return;
    const cartId = typed[0]?.cartId;
    if (!cartId) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setApplyingPromo(true);
    try {
      await apiFetch(`/storefront/carts/${cartId}/discounts`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      toast({ title: "Promo applied", description: `"${code}" was applied.` });
      setPromoCode("");
      await refreshCart();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "That code isn't valid.";
      toast({
        title: "Couldn't apply code",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setApplyingPromo(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <CartHero count={0} />
        <div className="mx-auto max-w-8xl px-4 py-20 sm:px-6 lg:px-8">
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center"
          >
            <Loader2
              className="size-7 animate-spin text-muted-foreground"
              aria-hidden
            />
            <span className="sr-only">Loading your cart…</span>
          </div>
        </div>
      </>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (typed.length === 0) {
    return (
      <>
        <CartHero count={0} />
        <div className="mx-auto max-w-8xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-12 text-center">
            <CartIllustration />
            <div role="status" aria-live="polite">
              <h2
                className="text-2xl font-medium tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Your cart is empty
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Find a piece you love and bring it home — we&rsquo;ll keep it
                here when you&rsquo;re ready.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Browse the catalogue
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CartHero count={itemCount} />

      <div className="mx-auto max-w-8xl px-4 pb-12 pt-2 sm:px-6 sm:pt-3 lg:px-8 lg:pb-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)] lg:gap-14">
          {/* ── Items ───────────────────────────────────────────── */}
          <section aria-label="Cart items">
            <div className="flex items-baseline justify-between border-b pb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
              </h2>
              <span className="text-[11px] font-medium tabular text-muted-foreground">
                {fmt(subtotal)}
              </span>
            </div>

            <ul role="list" className="divide-y">
              {typed.map((item) => {
                const price = toNumber(item.unitPrice);
                const title = item.title ?? item.product?.title ?? "Item";
                const imageUrl = item.product?.featuredImage?.url;
                const handle = item.product?.handle;
                const lineTotal =
                  toNumber(item.lineTotal) || price * item.quantity;
                const options = item.selectedOptions ?? [];

                return (
                  <li
                    key={item.id}
                    className="flex gap-5 py-6 sm:gap-6"
                  >
                    {/* Image */}
                    <Link
                      href={handle ? `/products/${handle}` : "#"}
                      aria-label={`View ${title}`}
                      className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-32"
                    >
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.product?.featuredImage?.altText ?? title}
                          fill
                          sizes="(max-width: 640px) 112px, 128px"
                          className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBag
                            className="size-7 text-muted-foreground"
                            aria-hidden
                          />
                        </div>
                      )}
                    </Link>

                    {/* Body */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {handle ? (
                            <Link
                              href={`/products/${handle}`}
                              className="line-clamp-2 rounded-sm text-base font-semibold leading-snug transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:text-lg"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {title}
                            </Link>
                          ) : (
                            <p
                              className="line-clamp-2 text-base font-semibold leading-snug sm:text-lg"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {title}
                            </p>
                          )}

                          {options.length > 0 ? (
                            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                              {options.map((opt) => (
                                <div
                                  key={opt.name}
                                  className="flex items-center gap-1.5"
                                >
                                  <dt className="text-muted-foreground">
                                    {opt.name}:
                                  </dt>
                                  <dd className="flex items-center gap-1.5 font-medium text-foreground">
                                    {opt.swatchColor && (
                                      <span
                                        aria-hidden
                                        className="inline-block size-3 rounded-full ring-1 ring-border"
                                        style={{
                                          backgroundColor: opt.swatchColor,
                                        }}
                                      />
                                    )}
                                    {opt.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          ) : item.variantTitle ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {item.variantTitle}
                            </p>
                          ) : null}

                          {item.sku && (
                            <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                              SKU: <span className="tabular">{item.sku}</span>
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${title} from cart`}
                          className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>

                      {/* Price + Quantity row */}
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                        <div
                          role="group"
                          aria-label={`Quantity for ${title}`}
                          className="inline-flex items-center rounded-full border bg-background"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(
                                item.id,
                                Math.max(1, item.quantity - 1)
                              )
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                            className="grid size-10 place-items-center rounded-l-full transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Minus className="size-3.5" aria-hidden />
                          </button>
                          <span
                            className="w-9 text-center text-sm font-semibold tabular"
                            aria-live="polite"
                            aria-atomic="true"
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                            className="grid size-10 place-items-center rounded-r-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Plus className="size-3.5" aria-hidden />
                          </button>
                        </div>

                        <div className="flex flex-col items-end leading-tight">
                          {item.quantity > 1 && (
                            <span className="text-[11px] tabular text-muted-foreground">
                              {fmt(price)} each
                            </span>
                          )}
                          <span
                            className="text-base font-semibold tabular sm:text-lg"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {fmt(lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8">
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Continue shopping
              </Link>
            </div>
          </section>

          {/* ── Summary ─────────────────────────────────────────── */}
          <aside
            aria-label="Order summary"
            className="h-fit lg:sticky lg:top-28"
          >
            <div className="rounded-3xl bg-cream p-6 sm:p-7">
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
                <span aria-hidden className="h-px w-6 bg-primary/60" />
                Order summary
              </p>
              <h2
                className="mt-2 text-2xl font-medium tracking-tight text-cream-foreground sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Review &amp; check out
              </h2>

              {/* Free-shipping progress */}
              <div className="mt-5 rounded-2xl bg-background/60 p-4 ring-1 ring-cream-foreground/10">
                {remaining > 0 ? (
                  <>
                    <p className="text-xs leading-snug text-cream-foreground/85">
                      <Truck
                        className="mr-1.5 inline-block size-3.5 -translate-y-px"
                        aria-hidden
                      />
                      Add{" "}
                      <span className="font-semibold text-cream-foreground">
                        {fmt(remaining)}
                      </span>{" "}
                      for{" "}
                      <span className="font-semibold text-accent-foreground">
                        free shipping
                      </span>
                    </p>
                    <div
                      className="mt-2 h-1 overflow-hidden rounded-full bg-cream-foreground/10"
                      role="progressbar"
                      aria-label="Progress to free shipping"
                      aria-valuenow={Math.round(progressPct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-foreground">
                    <Truck className="size-3.5" aria-hidden />
                    You&rsquo;ve unlocked free shipping.
                  </p>
                )}
              </div>

              {/* Lines */}
              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-cream-foreground/75">
                    Subtotal · {itemCount}{" "}
                    {itemCount === 1 ? "item" : "items"}
                  </dt>
                  <dd className="font-medium tabular text-cream-foreground">
                    {fmt(subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-cream-foreground/75">Shipping</dt>
                  <dd
                    className={cn(
                      "tabular",
                      subtotal >= FREE_SHIPPING_THRESHOLD
                        ? "font-semibold text-accent-foreground"
                        : "text-cream-foreground/75"
                    )}
                  >
                    {subtotal >= FREE_SHIPPING_THRESHOLD
                      ? "Free"
                      : "Calc. at checkout"}
                  </dd>
                </div>
              </dl>

              <div className="my-5 h-px bg-cream-foreground/10" aria-hidden />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-cream-foreground/80">
                  Total
                </span>
                <span
                  className="text-3xl font-medium tabular text-cream-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {fmt(subtotal)}
                </span>
              </div>

              {/* Promo */}
              <form onSubmit={applyPromo} className="mt-5 flex gap-2">
                <div className="relative flex-1">
                  <Tag
                    className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-cream-foreground/55"
                    aria-hidden
                  />
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={applyingPromo}
                    aria-label="Promo code"
                    className="h-11 w-full rounded-full border border-cream-foreground/15 bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={applyingPromo || !promoCode.trim()}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {applyingPromo ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    "Apply"
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => router.push("/checkout")}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Checkout securely
                <ArrowRight className="size-4" aria-hidden />
              </button>

              <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-cream-foreground/65">
                <Lock className="size-3" aria-hidden />
                256-bit SSL · Buyer protection · 30-day returns
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────────

function CartHero({ count: _count }: { count: number }) {
  return (
    <section aria-labelledby="cart-heading">
      <div className="mx-auto max-w-8xl px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />
        <h1
          id="cart-heading"
          className="mt-2 text-2xl font-medium tracking-tight sm:text-[1.75rem]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your cart
        </h1>
      </div>
    </section>
  );
}

// ─── Empty illustration ────────────────────────────────────────────────────────

function CartIllustration() {
  return (
    <svg
      viewBox="0 0 220 180"
      role="img"
      aria-label="Empty cart illustration"
      className="h-44 w-auto sm:h-52"
    >
      <defs>
        <linearGradient id="cartHalo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <circle cx="110" cy="92" r="80" fill="url(#cartHalo)" />

      {/* Rolled rug bundle */}
      <g transform="translate(48 78)">
        <rect width="124" height="22" rx="11" fill="var(--cream)" stroke="var(--cream-foreground)" strokeOpacity="0.22" />
        <line x1="0" y1="11" x2="124" y2="11" stroke="var(--primary)" strokeOpacity="0.45" strokeDasharray="3 4" />
        <circle cx="9" cy="11" r="4.5" fill="var(--accent-foreground)" fillOpacity="0.65" />
        <circle cx="115" cy="11" r="4.5" fill="var(--accent-foreground)" fillOpacity="0.65" />
        <circle cx="9" cy="11" r="1.6" fill="var(--cream)" />
        <circle cx="115" cy="11" r="1.6" fill="var(--cream)" />
      </g>

      {/* Bag handles */}
      <path
        d="M70 78 q40 -42 80 0"
        fill="none"
        stroke="var(--cream-foreground)"
        strokeOpacity="0.55"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Tag */}
      <g transform="translate(140 38)">
        <path d="M0 0 L24 0 L30 7 L24 14 L0 14 Z" fill="var(--background)" stroke="var(--primary)" strokeOpacity="0.4" />
        <circle cx="22" cy="7" r="1.6" fill="var(--primary)" />
      </g>

      {/* Sparkles */}
      <g fill="var(--primary)" fillOpacity="0.5">
        <circle cx="40" cy="46" r="2" />
        <circle cx="186" cy="124" r="2.5" />
        <circle cx="32" cy="120" r="1.6" />
      </g>
    </svg>
  );
}
