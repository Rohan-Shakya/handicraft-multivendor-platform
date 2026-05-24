"use client";

import { ArrowUpRight, Loader2, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface WishlistProduct {
  id: string;
  productId: string;
  createdAt: string;
  product?: {
    id: string;
    title: string;
    handle: string;
    description?: string;
    featuredImage?: { url: string; altText?: string } | null;
    lowestPrice?: number | null;
    compareAtPrice?: number | null;
    currencyCode?: string | null;
    defaultVariantId?: string | null;
    vendor?: { id?: string; name?: string; slug?: string } | null;
  };
}

const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Wishlist" }];

export default function WishlistPage() {
  const { customer, token } = useAuth();
  const { addItem } = useCart();
  const [items, setItems] = React.useState<WishlistProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [removingIds, setRemovingIds] = React.useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = React.useState<Set<string>>(new Set());

  const fetchWishlist = React.useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<WishlistProduct[] | { data: WishlistProduct[] }>(
        "/storefront/wishlist"
      );
      setItems(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  async function handleRemove(productId: string) {
    if (!token) return;
    setRemovingIds((prev) => new Set(prev).add(productId));
    try {
      await apiFetch(`/storefront/wishlist/${productId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.productId !== productId));
      toast({ title: "Removed", description: "Item removed from wishlist." });
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Something went wrong.";
      toast({
        title: "Could not remove item",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }

  async function handleAddToCart(item: WishlistProduct) {
    const variantId = item.product?.defaultVariantId;
    if (!variantId) {
      toast({
        title: "Choose options first",
        description: "Open the product page to pick a variant.",
        variant: "destructive",
      });
      return;
    }
    setAddingIds((prev) => new Set(prev).add(item.productId));
    try {
      await addItem(variantId, 1);
      toast({ title: "Added to cart", description: item.product?.title ?? "" });
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.productId);
        return next;
      });
    }
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <WishlistHero count={items.length} loading={loading} authed={!!customer} />

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-8xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {!customer ? (
          <SignInPrompt />
        ) : loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyWishlist />
        ) : (
          <ul
            role="list"
            className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6"
          >
            {items.map((item) => (
              <li key={item.id || item.productId}>
                <WishCard
                  item={item}
                  isRemoving={removingIds.has(item.productId)}
                  isAdding={addingIds.has(item.productId)}
                  onRemove={() => handleRemove(item.productId)}
                  onAdd={() => handleAddToCart(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function WishlistHero({
  count,
  loading,
  authed,
}: {
  count: number;
  loading: boolean;
  authed: boolean;
}) {
  return (
    <section
      aria-labelledby="wishlist-heading"
      className="relative overflow-hidden bg-cream"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          color: "var(--cream-foreground)",
        }}
      />
      <div className="relative mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Breadcrumbs items={breadcrumbs} />
        <div className="mt-5 max-w-3xl">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
            <span aria-hidden className="h-px w-6 bg-primary/60" />
            Saved for later
          </p>
          <h1
            id="wishlist-heading"
            className="mt-3 text-3xl font-medium leading-[1.05] tracking-[-0.015em] text-cream-foreground sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your <span className="italic text-primary">wishlist.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-foreground/75 sm:text-base">
            Pieces you&rsquo;ve set aside — held safely so you can come back when
            the moment&rsquo;s right.
          </p>
          {authed && !loading && count > 0 && (
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-cream-foreground/60">
              {count} {count === 1 ? "item" : "items"} saved
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── States ────────────────────────────────────────────────────────────────────

function SignInPrompt() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-12 text-center">
      <WishlistIllustration />
      <div role="status" aria-live="polite">
        <h2
          className="text-2xl font-medium tracking-tight sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sign in to see your saved pieces
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Save favourites across devices and pick up exactly where you left off.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/customer/login?next=/wishlist"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Sign in
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
        <Link
          href="/customer/register?next=/wishlist"
          className="inline-flex items-center gap-1.5 rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center"
    >
      <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Loading your wishlist…</span>
    </div>
  );
}

function EmptyWishlist() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-12 text-center">
      <WishlistIllustration />
      <div role="status" aria-live="polite">
        <h2
          className="text-2xl font-medium tracking-tight sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Nothing saved yet
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Tap the heart on any piece you love and we&rsquo;ll keep it here for
          when you&rsquo;re ready.
        </p>
      </div>
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Browse the catalogue
        <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function WishCard({
  item,
  isRemoving,
  isAdding,
  onRemove,
  onAdd,
}: {
  item: WishlistProduct;
  isRemoving: boolean;
  isAdding: boolean;
  onRemove: () => void;
  onAdd: () => void;
}) {
  const product = item.product;
  const title = product?.title ?? "Product";
  const handle = product?.handle ?? item.productId;
  const currency = product?.currencyCode ?? getPlatformCurrency();
  const hasDiscount =
    product?.compareAtPrice != null &&
    product?.lowestPrice != null &&
    product.compareAtPrice > product.lowestPrice;

  return (
    <div className="group flex flex-col">
      <Link
        href={`/products/${handle}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-muted/40">
          {product?.featuredImage?.url ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingBag className="size-8 text-muted-foreground/40" aria-hidden />
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            disabled={isRemoving}
            aria-label={`Remove ${title} from wishlist`}
            className={cn(
              "absolute right-3 top-3 grid size-9 place-items-center bg-background/95 shadow-sm backdrop-blur-sm transition-colors",
              "hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isRemoving && "opacity-60"
            )}
          >
            {isRemoving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </Link>

      <div className="pt-4">
        {product?.vendor?.name && (
          <p className="truncate text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {product.vendor.name}
          </p>
        )}
        <Link
          href={`/products/${handle}`}
          className="mt-1.5 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <h3
            className="line-clamp-2 text-base font-semibold leading-snug tracking-tight transition-colors hover:text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h3>
        </Link>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-semibold tabular">
            {product?.lowestPrice != null
              ? formatPrice(product.lowestPrice, currency)
              : "—"}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through tabular">
              {formatPrice(product!.compareAtPrice!, currency)}
            </span>
          )}
        </div>

        {product?.defaultVariantId && (
          <button
            type="button"
            onClick={onAdd}
            disabled={isAdding}
            aria-label={`Add ${title} to cart`}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-foreground text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isAdding ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <>Add to cart</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Illustration ──────────────────────────────────────────────────────────────

function WishlistIllustration() {
  return (
    <svg
      viewBox="0 0 220 180"
      role="img"
      aria-label="Empty wishlist illustration"
      className="h-40 w-auto sm:h-48"
    >
      <defs>
        <linearGradient id="rugWish" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Soft halo */}
      <circle cx="110" cy="92" r="78" fill="url(#rugWish)" />

      {/* Rug rectangle */}
      <g transform="translate(56 56)">
        <rect
          width="108"
          height="74"
          rx="2"
          fill="var(--cream)"
          stroke="var(--cream-foreground)"
          strokeOpacity="0.18"
        />
        {/* Border pattern */}
        <rect
          x="6"
          y="6"
          width="96"
          height="62"
          rx="1"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.35"
          strokeDasharray="3 3"
        />
        {/* Centre medallion */}
        <ellipse
          cx="54"
          cy="37"
          rx="22"
          ry="14"
          fill="none"
          stroke="var(--accent-foreground)"
          strokeOpacity="0.55"
          strokeWidth="1.4"
        />
        <ellipse
          cx="54"
          cy="37"
          rx="10"
          ry="6"
          fill="var(--primary)"
          fillOpacity="0.18"
        />
        {/* Fringe */}
        <g
          stroke="var(--cream-foreground)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeLinecap="round"
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={`l-${i}`} x1={6 + i * 7} y1="74" x2={6 + i * 7} y2="80" />
          ))}
        </g>
      </g>

      {/* Floating heart */}
      <g transform="translate(150 36)">
        <circle r="22" fill="var(--background)" stroke="var(--primary)" strokeOpacity="0.25" />
        <path
          d="M0 7 c-7 -8 -16 -2 -10 5 c3 4 10 8 10 8 c0 0 7 -4 10 -8 c6 -7 -3 -13 -10 -5 z"
          fill="var(--primary)"
          fillOpacity="0.85"
        />
      </g>

      {/* Tiny sparkles */}
      <g fill="var(--primary)" fillOpacity="0.5">
        <circle cx="44" cy="42" r="2" />
        <circle cx="186" cy="124" r="2.5" />
        <circle cx="32" cy="120" r="1.6" />
      </g>
    </svg>
  );
}
