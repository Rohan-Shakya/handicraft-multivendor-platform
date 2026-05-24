"use client";

import type { Product } from "@repo/types";
import { ArrowRight, Heart, Loader2, ShoppingBag, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { CART_OPEN_EVENT, useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { track } from "@/hooks/useAnalytics";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductCardProduct = Product & {
  featuredImage?: { url: string; altText?: string } | null;
  secondaryImage?: { url: string; altText?: string } | null;
  lowestPrice?: number | null;
  compareAtPrice?: number | null;
  currencyCode?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  swatches?: string[] | null;
  defaultVariantId?: string | null;
  vendor?: { id?: string; name?: string; slug?: string } | null;
  inStock?: boolean | null;
  /** Campaign auto-discount applied to this product (from API). */
  sale?: {
    salePrice: number;
    savings: number;
    percentOff: number;
    campaignId: string | null;
    discountTitle: string;
  } | null;
};

type ProductCardProps = {
  product: ProductCardProduct;
  list?: string;
  /** "grid" (default) renders a vertical card. "list" renders a row with
   *  content on the left and image on the right. */
  view?: "grid" | "list";
  /** Prioritize the featured image for LCP. Pass `true` for above-the-fold
   *  cards (typically only the first one on a listing page). */
  priority?: boolean;
};

function isNewProduct(createdAt: Date | string): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(createdAt) >= thirtyDaysAgo;
}

function discountPercent(price: number, compareAt: number): number {
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function ProductCard({
  product,
  list,
  view = "grid",
  priority = false,
}: ProductCardProps) {
  const isNew = isNewProduct(product.createdAt);

  // Campaign auto-discount takes precedence over variant compareAtPrice. When
  // a campaign sale is active for this product, we display the *sale price* as
  // the primary number, the original `lowestPrice` as strikethrough, and the
  // campaign %-off on the badge. Otherwise fall back to the existing
  // compareAtPrice behaviour.
  const campaignSale = product.sale ?? null;
  const hasCompareAtDiscount =
    product.compareAtPrice != null &&
    product.lowestPrice != null &&
    product.compareAtPrice > product.lowestPrice;

  const displayPrice = campaignSale?.salePrice ?? product.lowestPrice ?? null;
  const strikePrice = campaignSale
    ? product.lowestPrice ?? null
    : hasCompareAtDiscount
      ? product.compareAtPrice ?? null
      : null;
  const discount = campaignSale
    ? campaignSale.percentOff
    : hasCompareAtDiscount
      ? discountPercent(product.lowestPrice!, product.compareAtPrice!)
      : 0;
  const savingsAmount = campaignSale
    ? campaignSale.savings
    : hasCompareAtDiscount
      ? product.compareAtPrice! - product.lowestPrice!
      : 0;
  const hasDiscount = discount > 0 && strikePrice != null;
  const currency = product.currencyCode ?? getPlatformCurrency();
  const outOfStock = product.inStock === false;

  const { has, toggle } = useWishlist();
  const { addItem } = useCart();
  const wished = has(product.id);
  const [adding, setAdding] = React.useState(false);

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.defaultVariantId || adding) return;
    setAdding(true);
    try {
      await addItem(product.defaultVariantId, 1);
      window.dispatchEvent(new Event(CART_OPEN_EVENT));
    } finally {
      setAdding(false);
    }
  }

  function onToggleWish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
  }

  function onCardClick() {
    track("select_item", {
      item_id: product.id,
      item_name: product.title,
      item_list_name: list,
    });
  }

  if (view === "list") {
    return (
      <Link
        href={`/products/${product.handle}`}
        prefetch={false}
        onClick={onCardClick}
        className="group relative block border-b py-6 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:py-7"
      >
        <div className="flex items-stretch gap-5 sm:gap-7 lg:gap-10">
          {/* Left image — portrait thumbnail with hover swap */}
          <div className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden bg-muted/40 sm:w-40 lg:w-48">
            {product.featuredImage?.url ? (
              <>
                <Image
                  src={product.featuredImage.url}
                  alt={product.featuredImage.altText ?? product.title}
                  fill
                  sizes="(max-width: 640px) 112px, (max-width: 1024px) 160px, 192px"
                  priority={priority}
                  className={cn(
                    "object-cover transition-[transform,opacity] duration-700 group-hover:scale-[1.04]",
                    product.secondaryImage?.url && "group-hover:opacity-0",
                  )}
                />
                {product.secondaryImage?.url && (
                  <Image
                    src={product.secondaryImage.url}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(max-width: 640px) 112px, (max-width: 1024px) 160px, 192px"
                    className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag
                  className="size-8 text-muted-foreground/40"
                  aria-hidden
                />
              </div>
            )}

            {outOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                <span
                  role="status"
                  className="bg-foreground/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-background"
                >
                  Sold out
                </span>
              </div>
            )}

            {/* Badges — top-left */}
            <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5 sm:left-2.5 sm:top-2.5">
              {isNew && !hasDiscount && (
                <span
                  aria-label="New arrival"
                  className="inline-flex items-center bg-foreground px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-background sm:px-2.5 sm:py-1 sm:text-[10px]"
                >
                  New
                </span>
              )}
              {discount > 0 && (
                <span
                  aria-label={`${discount} percent off`}
                  className="inline-flex items-center bg-destructive px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white sm:px-2.5 sm:py-1 sm:text-[10px]"
                >
                  <span aria-hidden>−{discount}%</span>
                </span>
              )}
            </div>

            {/* Wishlist heart — top-right of image */}
            <button
              type="button"
              onClick={onToggleWish}
              aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
              aria-pressed={wished}
              className={cn(
                "absolute right-2 top-2 grid size-8 place-items-center bg-background/95 shadow-sm backdrop-blur-sm transition-opacity sm:right-2.5 sm:top-2.5 sm:size-9",
                wished
                  ? "text-rose-500 opacity-100"
                  : "text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"
              )}
            >
              <Heart
                className={cn("size-3.5 sm:size-4", wished && "fill-rose-500")}
                aria-hidden
              />
            </button>
          </div>

          {/* Right content — vertical layout, actions pinned to bottom */}
          <div className="flex min-w-0 flex-1 flex-col py-1">
            <div className="flex flex-col gap-2">
              {product.vendor?.name && (
                <p className="truncate text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {product.vendor.name}
                </p>
              )}
              <h3
                className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-xl lg:text-2xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {product.title}
              </h3>

              {((product.averageRating ?? 0) > 0 ||
                (product.swatches && product.swatches.length > 0)) && (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                  {(product.averageRating ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star
                        className="size-3.5 fill-amber-400 text-amber-400"
                        aria-hidden
                      />
                      <span className="font-medium text-foreground" aria-hidden>
                        {product.averageRating!.toFixed(1)}
                      </span>
                      {product.reviewCount ? (
                        <span aria-hidden>({product.reviewCount})</span>
                      ) : null}
                      <span className="sr-only">
                        Rated {product.averageRating!.toFixed(1)} out of 5
                        {product.reviewCount
                          ? `, ${product.reviewCount} reviews`
                          : ""}
                      </span>
                    </div>
                  )}

                  {product.swatches && product.swatches.length > 0 && (
                    <div className="flex items-center gap-1.5" aria-hidden>
                      {product.swatches.slice(0, 5).map((hex, i) => (
                        <span
                          key={i}
                          className="size-3.5 rounded-full border border-border shadow-sm"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                      {product.swatches.length > 5 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{product.swatches.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-xl font-semibold tabular sm:text-2xl",
                      campaignSale && "text-red-600"
                    )}
                  >
                    {displayPrice != null ? formatPrice(displayPrice, currency) : "—"}
                  </span>
                  {hasDiscount && strikePrice != null && (
                    <span className="text-sm text-muted-foreground line-through tabular">
                      {formatPrice(strikePrice, currency)}
                    </span>
                  )}
                </div>
                {hasDiscount && (
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-destructive">
                    Save {formatPrice(savingsAmount, currency)}
                  </span>
                )}
              </div>

              {product.defaultVariantId && !outOfStock && (
                <button
                  type="button"
                  onClick={quickAdd}
                  disabled={adding}
                  aria-label={`Add ${product.title} to cart`}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-xs font-semibold text-background transition-all hover:bg-foreground/90 hover:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 sm:text-sm"
                >
                  {adding ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      Add to cart
                      <ArrowRight className="size-4 transition-transform" aria-hidden />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/products/${product.handle}`}
      prefetch={false}
      onClick={onCardClick}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* Image — flat rectangle, no rounding, image is the hero */}
      <div className="relative aspect-[4/5] overflow-hidden bg-muted/40">
        {product.featuredImage?.url ? (
          <>
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              className={cn(
                "object-cover transition-[transform,opacity] duration-700 group-hover:scale-[1.04]",
                product.secondaryImage?.url && "group-hover:opacity-0",
              )}
            />
            {product.secondaryImage?.url && (
              <Image
                src={product.secondaryImage.url}
                alt=""
                aria-hidden
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ShoppingBag className="size-8 text-muted-foreground/40" aria-hidden />
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <span
              role="status"
              className="bg-foreground/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-background"
            >
              Sold out
            </span>
          </div>
        )}

        {/* Badges — top-left */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {isNew && !hasDiscount && (
            <span
              aria-label="New arrival"
              className="inline-flex items-center bg-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-background"
            >
              New
            </span>
          )}
          {discount > 0 && (
            <span
              aria-label={`${discount} percent off`}
              className="inline-flex items-center bg-destructive px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
            >
              <span aria-hidden>−{discount}%</span>
            </span>
          )}
        </div>

        {/* Wishlist heart — top-right, always interactive, opacity fades on hover */}
        <button
          type="button"
          onClick={onToggleWish}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wished}
          className={cn(
            "absolute right-3 top-3 grid size-9 place-items-center bg-background/95 shadow-sm backdrop-blur-sm transition-opacity",
            wished
              ? "text-rose-500 opacity-100"
              : "text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"
          )}
        >
          <Heart
            className={cn("size-4", wished && "fill-rose-500")}
            aria-hidden
          />
        </button>
      </div>

      {/* Info — flat, no card chrome, sits directly under the image */}
      <div className="pt-4">
        {product.vendor?.name && (
          <p className="truncate text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {product.vendor.name}
          </p>
        )}
        <h3
          className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {product.title}
        </h3>

        {(product.averageRating ?? 0) > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
            <span className="font-medium text-foreground" aria-hidden>
              {product.averageRating!.toFixed(1)}
            </span>
            {product.reviewCount ? (
              <span aria-hidden>({product.reviewCount})</span>
            ) : null}
            <span className="sr-only">
              Rated {product.averageRating!.toFixed(1)} out of 5
              {product.reviewCount
                ? `, ${product.reviewCount} reviews`
                : ""}
            </span>
          </div>
        )}

        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={cn(
              "text-base font-semibold tabular",
              campaignSale && "text-red-600"
            )}
          >
            {displayPrice != null ? formatPrice(displayPrice, currency) : "—"}
          </span>
          {hasDiscount && strikePrice != null && (
            <span className="text-xs text-muted-foreground line-through tabular">
              {formatPrice(strikePrice, currency)}
            </span>
          )}
        </div>

        {product.swatches && product.swatches.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1" aria-hidden>
            {product.swatches.slice(0, 5).map((hex, i) => (
              <span
                key={i}
                className="size-3.5 rounded-full border border-border shadow-sm"
                style={{ backgroundColor: hex }}
              />
            ))}
            {product.swatches.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                +{product.swatches.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
