"use client";

import { ArrowRight, Minus, Plus, ShoppingBag, Truck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brand } from "@/config/brand";
import { useCart } from "@/context/CartContext";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { formatPrice } from "@/lib/format";
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
  lineDiscountTotal?: string;
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: Props) {
  const { items, updateItem, removeItem } = useCart();
  const isMobile = useIsMobile();

  const typed = items as unknown as CartItemDetail[];
  const currency = typed[0]?.currencyCode ?? brand.currencyCode;
  const subtotal = typed.reduce(
    (s, i) => s + (toNumber(i.lineTotal) || toNumber(i.unitPrice) * i.quantity),
    0
  );
  const itemCount = typed.reduce((s, i) => s + i.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  const titleText = (
    <span className="flex w-full items-baseline justify-center gap-2.5">
      <span
        className="text-xl font-medium tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Your bag
      </span>
      {itemCount > 0 && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      )}
    </span>
  );

  const descriptionText =
    typed.length === 0
      ? "Your bag is empty."
      : `You have ${itemCount} ${itemCount === 1 ? "item" : "items"} in your bag, subtotal ${formatPrice(subtotal, currency)}. Review or proceed to checkout.`;

  const body = (
    <CartBody
      items={typed}
      currency={currency}
      subtotal={subtotal}
      remaining={remaining}
      progressPct={progressPct}
      onClose={close}
      onIncrease={(id, qty) => updateItem(id, qty + 1)}
      onDecrease={(id, qty) => updateItem(id, Math.max(1, qty - 1))}
      onRemove={(id) => removeItem(id)}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="border-b px-6 py-4 text-center sm:text-center">
            <DrawerTitle asChild>{titleText}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {descriptionText}
            </DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-12 py-4 text-center">
          <SheetTitle asChild>{titleText}</SheetTitle>
          <SheetDescription className="sr-only">
            {descriptionText}
          </SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}

// ─── Shared body (works in either Sheet or Drawer) ─────────────────────────────

function CartBody({
  items,
  currency,
  subtotal,
  remaining,
  progressPct,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  items: CartItemDetail[];
  currency: string;
  subtotal: number;
  remaining: number;
  progressPct: number;
  onClose: () => void;
  onIncrease: (id: string, qty: number) => void;
  onDecrease: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      {items.length > 0 && (
        <div className="border-b bg-cream px-6 py-3.5">
          {remaining > 0 ? (
            <>
              <p className="text-xs leading-snug text-cream-foreground/85">
                <Truck
                  className="mr-1.5 inline-block size-3.5 -translate-y-px"
                  aria-hidden
                />
                Add{" "}
                <span className="font-semibold text-cream-foreground">
                  {formatPrice(remaining, currency)}
                </span>{" "}
                more for{" "}
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
      )}

      <div className="soft-scroll flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <EmptyDrawer onClose={onClose} />
        ) : (
          <ul className="divide-y px-6">
            {items.map((item) => (
              <CartLineItem
                key={item.id}
                item={item}
                currency={currency}
                onClose={onClose}
                onIncrease={() => onIncrease(item.id, item.quantity)}
                onDecrease={() => onDecrease(item.id, item.quantity)}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t bg-card px-6 py-5">
          <dl className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold tabular">
                {formatPrice(subtotal, currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd
                className={cn(
                  "tabular",
                  subtotal >= FREE_SHIPPING_THRESHOLD
                    ? "font-semibold text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                {subtotal >= FREE_SHIPPING_THRESHOLD
                  ? "Free"
                  : "Calc. at checkout"}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Taxes calculated at checkout.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/checkout"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Checkout
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-full border bg-background text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View cart
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Line item ─────────────────────────────────────────────────────────────────

function CartLineItem({
  item,
  currency,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItemDetail;
  currency: string;
  onClose: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const title = item.title ?? item.product?.title ?? "Item";
  const img = item.product?.featuredImage?.url;
  const handle = item.product?.handle;
  const price = toNumber(item.unitPrice);
  const lineTotal = toNumber(item.lineTotal) || price * item.quantity;

  return (
    <li className="flex items-stretch gap-4 py-5">
      <Link
        href={handle ? `/products/${handle}` : "#"}
        onClick={onClose}
        aria-label={`View ${title}`}
        className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {img ? (
          <Image
            src={img}
            alt={item.product?.featuredImage?.altText ?? title}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="size-6" aria-hidden />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={handle ? `/products/${handle}` : "#"}
            onClick={onClose}
            className="line-clamp-2 rounded-sm text-sm font-semibold leading-snug transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </Link>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${title} from bag`}
            className="-mr-1 -mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>

        <CartItemOptions
          options={item.selectedOptions}
          fallback={item.variantTitle}
        />

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div
            role="group"
            aria-label={`Quantity for ${title}`}
            className="inline-flex items-center rounded-full border bg-background"
          >
            <button
              type="button"
              onClick={onDecrease}
              disabled={item.quantity <= 1}
              aria-label="Decrease quantity"
              className="grid size-8 place-items-center rounded-l-full transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Minus className="size-3" aria-hidden />
            </button>
            <span
              className="w-7 text-center text-xs font-semibold tabular"
              aria-live="polite"
              aria-atomic="true"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={onIncrease}
              aria-label="Increase quantity"
              className="grid size-8 place-items-center rounded-r-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="size-3" aria-hidden />
            </button>
          </div>

          <span className="text-sm font-semibold tabular leading-none">
            {formatPrice(lineTotal, currency)}
          </span>
        </div>
      </div>
    </li>
  );
}

// ─── Option chips ──────────────────────────────────────────────────────────────

function CartItemOptions({
  options,
  fallback,
}: {
  options?: CartOption[];
  fallback?: string | null;
}) {
  if (options && options.length > 0) {
    return (
      <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-tight">
        {options.map((opt) => (
          <div key={opt.name} className="flex items-center gap-1">
            <dt className="text-muted-foreground">{opt.name}:</dt>
            <dd className="flex items-center gap-1 font-medium text-foreground">
              {opt.swatchColor && (
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: opt.swatchColor }}
                />
              )}
              {opt.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  if (fallback) {
    return (
      <p className="mt-1.5 text-[11px] text-muted-foreground">{fallback}</p>
    );
  }
  return null;
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-5 px-6 text-center">
      <CartIllustration />
      <div role="status" aria-live="polite">
        <p
          className="text-lg font-medium tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your bag is empty
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
          Find a piece you love and bring it home.
        </p>
      </div>
      <Link
        href="/products"
        onClick={onClose}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Start shopping
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

function CartIllustration() {
  return (
    <svg
      viewBox="0 0 160 130"
      role="img"
      aria-label="Empty cart illustration"
      className="h-28 w-auto"
    >
      <defs>
        <linearGradient id="bagFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="68" r="52" fill="url(#bagFill)" />
      <g transform="translate(38 56)">
        <rect width="84" height="14" rx="7" fill="var(--cream)" stroke="var(--cream-foreground)" strokeOpacity="0.25" />
        <line x1="0" y1="7" x2="84" y2="7" stroke="var(--primary)" strokeOpacity="0.45" strokeDasharray="2 3" />
        <circle cx="6" cy="7" r="3" fill="var(--accent-foreground)" fillOpacity="0.6" />
        <circle cx="78" cy="7" r="3" fill="var(--accent-foreground)" fillOpacity="0.6" />
      </g>
      <path
        d="M58 56 q22 -28 44 0"
        fill="none"
        stroke="var(--cream-foreground)"
        strokeOpacity="0.5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <g fill="var(--primary)" fillOpacity="0.45">
        <circle cx="32" cy="40" r="2" />
        <circle cx="130" cy="98" r="2.5" />
        <circle cx="120" cy="34" r="1.6" />
      </g>
    </svg>
  );
}

