"use client";

import type { ProductOption,Variant } from "@repo/types";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { AskSellerDialog } from "@/components/AskSellerDialog";
import { BulkQuoteDialog } from "@/components/BulkQuoteDialog";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NotifyMeButton } from "@/components/NotifyMeButton";
import { ProductConfigurator } from "@/components/ProductConfigurator";
import { ProductCard } from "@/components/ProductCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { ReviewForm } from "@/components/ReviewForm";
import { ShareButtons } from "@/components/ShareButtons";
import { StarRating } from "@/components/StarRating";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/components/WishlistButton";
import { useAuth } from "@/context/AuthContext";
import { CART_OPEN_EVENT, useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { track } from "@/hooks/useAnalytics";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { ProductWithDetails, ReviewWithCustomer } from "./page";

type RelatedProduct = Parameters<typeof ProductCard>[0]["product"];

interface Props {
  product: ProductWithDetails;
  reviews: ReviewWithCustomer[];
  related?: RelatedProduct[];
  currencyCode?: string;
}

/**
 * Build a lookup by option name → option value string for a given variant.
 * The source of truth is `variant.selectedOptions` which references option
 * + value by id; we resolve those ids to names / strings via the
 * `options` definitions on the parent product.
 */
function variantOptionMap(
  variant: Variant,
  options: ProductOption[]
): Record<string, string> {
  const map: Record<string, string> = {};
  const selected = (variant as Variant & {
    selectedOptions?: Array<{ optionId: string; optionValueId: string }>;
  }).selectedOptions;
  if (!Array.isArray(selected)) return map;
  for (const pair of selected) {
    const option = options.find((o) => o.id === pair.optionId);
    if (!option) continue;
    const val = option.values.find((v) => v.id === pair.optionValueId);
    if (!val) continue;
    map[option.name] = val.value;
  }
  return map;
}

function findVariant(
  variants: Variant[],
  options: ProductOption[],
  selected: Record<string, string>
): Variant | undefined {
  return variants.find((v) => {
    const m = variantOptionMap(v, options);
    return Object.entries(selected).every(([k, val]) => m[k] === val);
  });
}

const COLOR_NAMES = new Set([
  "black", "white", "red", "blue", "green", "pink", "yellow",
  "purple", "orange", "brown", "grey", "gray", "navy", "beige",
  "cream", "gold", "silver", "ivory", "teal", "mint",
]);

function looksLikeColor(values: string[]): boolean {
  const hexRe = /^#?[0-9a-fA-F]{3,8}$/;
  return values.some((v) => hexRe.test(v) || COLOR_NAMES.has(v.toLowerCase()));
}

function colorToken(value: string): string {
  if (value.startsWith("#")) return value;
  if (/^[0-9a-fA-F]{6}$/.test(value)) return `#${value}`;
  return value.toLowerCase();
}

export function ProductClient({
  product,
  reviews: initialReviews,
  related = [],
  currencyCode: currencyProp,
}: Props) {
  const currency = currencyProp ?? product.currencyCode ?? getPlatformCurrency();

  const { addItem } = useCart();
  const { customer } = useAuth();
  const recently = useRecentlyViewed();

  // ── Variant selection ────────────────────────────────────────────────────
  const [selected, setSelected] = React.useState<Record<string, string>>(() => {
    const first = product.variants[0];
    return first ? variantOptionMap(first, product.options) : {};
  });

  const activeVariant = React.useMemo(
    () =>
      findVariant(product.variants, product.options, selected) ??
      product.variants[0],
    [product.variants, product.options, selected]
  );

  // ── Image gallery ────────────────────────────────────────────────────────
  const [imageIdx, setImageIdx] = React.useState(0);
  const [zoom, setZoom] = React.useState<{ x: number; y: number } | null>(null);

  const currentImage = product.images[imageIdx] ?? product.images[0];

  // ── Quantity + add to cart ──────────────────────────────────────────────
  const [quantity, setQuantity] = React.useState(1);
  const [adding, setAdding] = React.useState(false);
  const [added, setAdded] = React.useState(false);

  const variantPrice = activeVariant?.price ?? product.variants[0]?.price;
  const compareAt = activeVariant?.compareAtPrice ?? product.variants[0]?.compareAtPrice;

  // Campaign auto-discount (from API) — applied as a percentage on the
  // selected variant's price. Takes precedence over variant compareAtPrice.
  const productSale = (product as ProductWithDetails & {
    sale?: {
      salePrice: number;
      savings: number;
      percentOff: number;
      campaignId: string | null;
      discountTitle: string;
    } | null;
  }).sale ?? null;
  const variantSalePrice =
    productSale && typeof variantPrice === "number"
      ? Math.round(variantPrice * (1 - productSale.percentOff / 100) * 100) / 100
      : null;
  const price = variantSalePrice ?? variantPrice;
  const strikePrice =
    variantSalePrice != null
      ? variantPrice
      : typeof compareAt === "number" && typeof variantPrice === "number" && compareAt > variantPrice
        ? compareAt
        : null;
  const hasDiscount = strikePrice != null && typeof price === "number" && strikePrice > price;
  const discountPercentOff = productSale
    ? productSale.percentOff
    : hasDiscount
      ? Math.round(((strikePrice! - price!) / strikePrice!) * 100)
      : 0;

  // Out-of-stock when the selected variant has tracked inventory and none left.
  // When inventoryQuantity is missing (untracked / "continue selling") we treat
  // the variant as available.
  const activeOutOfStock =
    typeof activeVariant?.inventoryQuantity === "number" &&
    activeVariant.inventoryQuantity <= 0;
  const allVariantsOutOfStock = product.variants.every(
    (v) =>
      typeof v.inventoryQuantity === "number" && v.inventoryQuantity <= 0
  );

  React.useEffect(() => {
    track("view_item", {
      item_id: product.id,
      item_name: product.title,
      currency,
      value: price,
    });
    recently.add({
      id: product.id,
      handle: product.handle,
      title: product.title,
      image: product.images?.[0]?.url ?? null,
      price: price ?? null,
      currencyCode: currency,
      vendorName: product.vendor?.name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  async function handleAddToCart() {
    if (!activeVariant?.id || adding) return;
    setAdding(true);
    try {
      await addItem(activeVariant.id, quantity);
      // Success: flash the green state + pop the cart drawer so the shopper
      // sees their item land in the cart.
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
      window.dispatchEvent(new Event(CART_OPEN_EVENT));
    } catch {
      // CartContext already surfaces a toast — nothing else to do here.
      // The optimistic row has been rolled back by `refreshCart()`.
    } finally {
      setAdding(false);
    }
  }

  // ── Reviews ──────────────────────────────────────────────────────────────
  const [reviews, setReviews] = React.useState<ReviewWithCustomer[]>(initialReviews);
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
  function onReviewSubmitted() {
    // Review is pending moderation — show success via the form's own toast.
    // For now we don't hot-insert; parent page refresh will pull approved ones.
  }

  // ── Image zoom ───────────────────────────────────────────────────────────
  function onImageMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ x, y });
  }

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        setImageIdx((i) => (i === 0 ? product.images.length - 1 : i - 1));
      } else if (e.key === "ArrowRight") {
        setImageIdx((i) => (i === product.images.length - 1 ? 0 : i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product.images.length]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
    ...(product.vendor
      ? [{ label: product.vendor.name, href: `/${product.vendor.slug}` }]
      : []),
    { label: product.title },
  ];

  return (
    <main className="mx-auto max-w-8xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,1fr)]">
        {/* ── Gallery ─────────────────────────────────────────────────── */}
        <section
          aria-label="Product images"
          aria-roledescription="carousel"
          className="flex flex-col-reverse gap-3 lg:sticky lg:top-24 lg:flex-row lg:self-start"
        >
          {product.images.length > 1 && (
            <div
              role="group"
              aria-label="Image thumbnails"
              className="no-scrollbar flex gap-2 overflow-x-auto lg:max-h-[520px] lg:flex-col lg:overflow-y-auto"
            >
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setImageIdx(i)}
                  aria-label={`Show image ${i + 1} of ${product.images.length}`}
                  aria-pressed={i === imageIdx}
                  aria-controls="product-active-image"
                  className={cn(
                    "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    i === imageIdx
                      ? "border-primary"
                      : "border-transparent hover:border-muted",
                  )}
                >
                  <Image
                    src={img.url}
                    alt=""
                    aria-hidden
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div
            id="product-active-image"
            role="group"
            aria-roledescription="slide"
            aria-label={`Image ${imageIdx + 1} of ${product.images.length}`}
            aria-live="polite"
            aria-atomic="true"
            className="group relative aspect-square flex-1 overflow-hidden rounded-2xl bg-muted/40"
            onMouseMove={onImageMouseMove}
            onMouseLeave={() => setZoom(null)}
          >
            {currentImage ? (
              <>
                <Image
                  src={currentImage.url}
                  alt={currentImage.altText ?? product.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-300"
                  style={
                    zoom
                      ? {
                          transform: "scale(1.8)",
                          transformOrigin: `${zoom.x}% ${zoom.y}%`,
                        }
                      : undefined
                  }
                />
                {product.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous image"
                      aria-controls="product-active-image"
                      onClick={() =>
                        setImageIdx((i) =>
                          i === 0 ? product.images.length - 1 : i - 1,
                        )
                      }
                      className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-background/95 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <ChevronLeft className="size-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      aria-controls="product-active-image"
                      onClick={() =>
                        setImageIdx((i) =>
                          i === product.images.length - 1 ? 0 : i + 1,
                        )
                      }
                      className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-background/95 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <ChevronRight className="size-5" aria-hidden />
                    </button>
                    <span
                      aria-hidden
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground/85 px-2.5 py-0.5 text-[11px] font-medium tabular text-background opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      {imageIdx + 1} / {product.images.length}
                    </span>
                  </>
                )}
                {hasDiscount && (
                  <span
                    className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow"
                    role="img"
                    aria-label={`Sale, ${discountPercentOff} percent off`}
                  >
                    <span aria-hidden>−{discountPercentOff}%</span>
                  </span>
                )}
                <div className="absolute right-3 top-3">
                  <WishlistButton productId={product.id} size="md" />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBag className="size-16 text-muted-foreground" aria-hidden />
              </div>
            )}
          </div>
        </section>

        {/* ── Info / actions ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {product.vendor && (
            <Link
              href={`/${product.vendor.slug}`}
              className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Store className="size-3.5" aria-hidden />
              {product.vendor.name}
            </Link>
          )}

          <div>
            <h1
              className="text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {product.title}
            </h1>
            {(product as ProductWithDetails & { excerpt?: string }).excerpt && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {(product as ProductWithDetails & { excerpt?: string }).excerpt}
              </p>
            )}
          </div>

          {reviews.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <StarRating rating={avgRating} size="sm" />
              <span className="font-medium">{avgRating.toFixed(1)}</span>
              <a
                href="#reviews"
                className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </a>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span
                className={cn(
                  "text-3xl font-bold",
                  productSale && "text-red-600"
                )}
              >
                {price != null ? formatPrice(price, currency) : "—"}
              </span>
              {hasDiscount && strikePrice != null && (
                <>
                  <span className="text-base text-muted-foreground line-through">
                    {formatPrice(strikePrice, currency)}
                  </span>
                  <span className="rounded bg-red-600/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                    Save {formatPrice(strikePrice - price!, currency)}
                  </span>
                </>
              )}
            </div>
            {productSale && (
              <p className="text-xs text-red-700 dark:text-red-400">
                <strong>Sale:</strong> {productSale.discountTitle}
              </p>
            )}
          </div>

          {product.options?.map((option) => {
            const values = option.values ?? [];
            const valueStrings = values.map((v) => v.value);
            const isColor = looksLikeColor(valueStrings);
            return (
              <div key={option.id ?? option.name} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{option.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {selected[option.name] ?? "—"}
                  </span>
                </div>
                <div className={cn("flex flex-wrap gap-2", isColor && "gap-2.5")}>
                  {values.map((ov) => {
                    const value = ov.value;
                    const active = selected[option.name] === value;
                    const tryOn = { ...selected, [option.name]: value };
                    const candidate = findVariant(product.variants, product.options, tryOn);
                    const unavailable = candidate == null;

                    if (isColor) {
                      return (
                        <button
                          key={ov.id}
                          type="button"
                          onClick={() =>
                            setSelected((s) => ({ ...s, [option.name]: value }))
                          }
                          aria-label={`${option.name}: ${value}`}
                          aria-pressed={active}
                          disabled={unavailable}
                          title={value}
                          className={cn(
                            "grid size-9 place-items-center rounded-full border-2 transition-all",
                            active
                              ? "border-primary ring-2 ring-primary ring-offset-2"
                              : "border-transparent hover:border-muted",
                            unavailable && "cursor-not-allowed opacity-40"
                          )}
                        >
                          <span
                            className="block size-7 rounded-full border"
                            style={{ backgroundColor: colorToken(value) }}
                          />
                        </button>
                      );
                    }

                    return (
                      <button
                        key={ov.id}
                        type="button"
                        onClick={() =>
                          setSelected((s) => ({ ...s, [option.name]: value }))
                        }
                        aria-pressed={active}
                        disabled={unavailable}
                        className={cn(
                          "relative min-w-[2.5rem] rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
                          active
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-muted-foreground/50",
                          unavailable && "cursor-not-allowed opacity-40 line-through"
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-xl border">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="grid size-11 place-items-center rounded-l-xl text-muted-foreground hover:bg-muted disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="grid size-11 place-items-center rounded-r-xl text-muted-foreground hover:bg-muted"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={!activeVariant?.id || adding || activeOutOfStock}
                className={cn(
                  "h-11 flex-1 rounded-xl text-sm font-bold",
                  added && "bg-emerald-600 hover:bg-emerald-600"
                )}
                size="lg"
                aria-label={
                  activeOutOfStock
                    ? "This variant is sold out"
                    : allVariantsOutOfStock
                      ? "This product is sold out"
                      : undefined
                }
              >
                {adding ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : activeOutOfStock ? (
                  "Sold out"
                ) : added ? (
                  <>
                    <Check className="size-4" aria-hidden /> Added to cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="size-4" aria-hidden /> Add to cart
                  </>
                )}
              </Button>
            </div>

            {activeOutOfStock && activeVariant?.id && (
              <NotifyMeButton
                variantId={activeVariant.id}
                defaultEmail={customer?.email ?? ""}
              />
            )}

            {(product as ProductWithDetails).isConfigurable && (
              <ProductConfigurator
                productId={product.id}
                basePrice={typeof variantPrice === "number" ? variantPrice : 0}
                currency={currency}
                defaultEmail={customer?.email ?? ""}
              />
            )}

            <div className="flex items-center justify-between">
              <InlineWishlist productId={product.id} />
              <ShareButtons title={product.title} compact />
            </div>

            {product.vendorId && (
              <div className="grid grid-cols-2 gap-2">
                <AskSellerDialog
                  vendorId={product.vendorId}
                  productId={product.id}
                  defaultSubject={`Question about ${product.title}`}
                  loginRedirectPath={`/products/${product.handle}`}
                  className="h-10 w-full justify-center text-sm"
                />
                {activeVariant?.id && (
                  <BulkQuoteDialog
                    variantId={activeVariant.id}
                    productId={product.id}
                    loginRedirectPath={`/products/${product.handle}`}
                    className="h-10 w-full justify-center text-sm"
                  />
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/30 p-3 text-[11px]">
            <div className="flex flex-col items-center gap-1 text-center">
              <Truck className="size-4 text-primary" aria-hidden />
              <span className="font-medium">Free shipping over Rs 25,000</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <RotateCcw className="size-4 text-primary" aria-hidden />
              <span className="font-medium">30-day returns</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              <span className="font-medium">Buyer protection</span>
            </div>
          </div>

          <Accordion type="multiple" className="rounded-xl border">
            {product.description && (
              <AccordionItem value="description" className="px-4">
                <AccordionTrigger>Description</AccordionTrigger>
                <AccordionContent>
                  <div className="prose-shop text-sm">
                    <p>{product.description}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="shipping" className="px-4">
              <AccordionTrigger>Shipping & delivery</AccordionTrigger>
              <AccordionContent>
                <p>
                  Standard shipping is free on orders over Rs 25,000. Expedited and
                  international rates are calculated at checkout. Most orders
                  ship within 1–2 business days.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns" className="px-4">
              <AccordionTrigger>Returns & exchanges</AccordionTrigger>
              <AccordionContent>
                <p>
                  Not quite right? You have 30 days to return unworn items for a
                  full refund. Start a return from your order history — we&apos;ll
                  email you a prepaid label.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* ── Reviews section ─────────────────────────────────────────── */}
      <section id="reviews" className="mt-20 scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Customer reviews
            </h2>
            {reviews.length > 0 ? (
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <StarRating rating={avgRating} size="sm" />
                <span>
                  {avgRating.toFixed(1)} out of 5 · {reviews.length} review
                  {reviews.length === 1 ? "" : "s"}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to review this product.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <div className="rounded-2xl border bg-muted/30 p-6">
            <h3 className="mb-3 text-base font-semibold">Write a review</h3>
            <ReviewForm productId={product.id} onSubmitted={onReviewSubmitted} />
          </div>

          <div className="flex flex-col divide-y">
            {reviews.length === 0 && (
              <div className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                No reviews yet. Your feedback helps other shoppers.
              </div>
            )}
            {reviews.map((r) => {
              const author = [r.customer?.firstName, r.customer?.lastName]
                .filter(Boolean)
                .join(" ");
              return (
                <article key={r.id} className="flex flex-col gap-2 py-5 first:pt-0">
                  <div className="flex items-center justify-between">
                    <StarRating rating={r.rating} size="sm" />
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={String(r.createdAt)}
                    >
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  {r.title && <p className="font-semibold">{r.title}</p>}
                  {r.body && <p className="text-sm leading-relaxed">{r.body}</p>}
                  <p className="text-xs text-muted-foreground">
                    By {author || "Customer"}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Related products ─────────────────────────────────────────── */}
      {related.length > 0 && (
        <RelatedProductsCarousel
          products={related}
          vendorSlug={product.vendor?.slug}
        />
      )}

      <div className="mt-20">
        <RecentlyViewed excludeId={product.id} />
      </div>
    </main>
  );
}

function RelatedProductsCarousel({
  products,
  vendorSlug,
}: {
  products: RelatedProduct[];
  vendorSlug?: string;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  function scrollBy(direction: "prev" | "next") {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  return (
    <section className="mt-20">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" aria-hidden /> You may also like
          </p>
          <h2
            className="mt-1 text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            More from this store
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {vendorSlug && (
            <Link
              href={`/${vendorSlug}`}
              className="hidden text-sm font-medium text-primary hover:underline sm:inline"
            >
              Visit store →
            </Link>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollBy("prev")}
              disabled={!canPrev}
              aria-label="Scroll to previous products"
              className="flex size-9 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollBy("next")}
              disabled={!canNext}
              aria-label="Scroll to next products"
              className="flex size-9 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((r) => (
          <div
            key={r.id}
            className="w-[calc((100%-1rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-5rem)/6)]"
          >
            <ProductCard product={r} list="related_products" />
          </div>
        ))}
      </div>
    </section>
  );
}

function InlineWishlist({ productId }: { productId: string }) {
  const { has, toggle } = useWishlist();
  const wished = has(productId);
  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={wished}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
        wished ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Heart className={cn("size-4", wished && "fill-rose-500")} aria-hidden />
      {wished ? "Saved" : "Save for later"}
    </button>
  );
}
