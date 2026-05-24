"use client";

import type { Order, OrderItemStatus, OrderStatus } from "@repo/types";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Download,
  HelpCircle,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  Package,
  PackageCheck,
  PackageOpen,
  Receipt,
  ShoppingBag,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import { AskSellerDialog } from "@/components/AskSellerDialog";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useRequireCustomerAuth } from "@/hooks/useRequireCustomerAuth";
import { apiFetch } from "@/lib/api";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Brand-aligned status tones — each pill carries a small color dot.
const STATUS_TONE: Record<
  string,
  { wrap: string; dot: string }
> = {
  pending: {
    wrap: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  confirmed: {
    wrap: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  processing: {
    wrap: "border-blue-200/70 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  shipped: {
    wrap: "border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  delivered: {
    wrap: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelled: {
    wrap: "border-red-200/70 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
    dot: "bg-red-500",
  },
  refunded: {
    wrap: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  paid: {
    wrap: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  unfulfilled: {
    wrap: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  fulfilled: {
    wrap: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  partially_fulfilled: {
    wrap: "border-blue-200/70 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  partially_refunded: {
    wrap: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  open: {
    wrap: "border-blue-200/70 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  draft: {
    wrap: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  completed: {
    wrap: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  archived: {
    wrap: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

function StatusPill({
  status,
}: {
  status: OrderStatus | OrderItemStatus | string;
}) {
  const tone = STATUS_TONE[status] ?? {
    wrap: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
        tone.wrap
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", tone.dot)} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TIMELINE_STEPS = [
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
] as const;

function timelineIndex(status: string): number {
  switch (status) {
    case "pending":
    case "confirmed":
    case "open":
    case "draft":
      return 0;
    case "processing":
      return 1;
    case "shipped":
      return 2;
    case "delivered":
    case "completed":
      return 3;
    default:
      return 0;
  }
}

function OrderTimeline({ status }: { status: string }) {
  const current = timelineIndex(status);
  return (
    <ol
      className="flex items-center gap-2 sm:gap-3"
      aria-label="Order progress"
    >
      {TIMELINE_STEPS.map((s, i) => {
        const state =
          i < current ? "complete" : i === current ? "current" : "upcoming";
        const Icon = s.icon;
        const isLast = i === TIMELINE_STEPS.length - 1;
        return (
          <li
            key={s.key}
            className="flex flex-1 items-center gap-2 sm:gap-3"
            aria-current={state === "current" ? "step" : undefined}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full transition-all duration-300",
                  state === "complete" &&
                    "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                  state === "current" &&
                    "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-lg shadow-primary/30 ring-[6px] ring-primary/15",
                  state === "upcoming" &&
                    "bg-muted/70 text-muted-foreground/70 ring-1 ring-inset ring-border"
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                    state === "current"
                      ? "text-primary"
                      : "text-muted-foreground/70"
                  )}
                >
                  {state === "complete"
                    ? "Done"
                    : state === "current"
                      ? "Now"
                      : `Step ${i + 1}`}
                </span>
                <span
                  className={cn(
                    "truncate text-sm font-semibold transition-colors",
                    state === "current" && "text-foreground",
                    state === "complete" && "text-foreground/80",
                    state === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </span>
            </div>
            {!isLast && (
              <span
                aria-hidden
                className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-[width] duration-500 ease-out",
                    state === "complete"
                      ? "w-full"
                      : state === "current"
                        ? "w-1/2"
                        : "w-0"
                  )}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

type PayLaterProvider = "khalti" | "esewa" | "fonepay" | "stripe" | "cod";

const PAY_LATER_METHODS: Array<{
  id: PayLaterProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "khalti",
    name: "Khalti",
    description: "Wallet or bank",
    icon: <Wallet className="size-4" aria-hidden />,
  },
  {
    id: "esewa",
    name: "eSewa",
    description: "Pay with your eSewa wallet",
    icon: <Wallet className="size-4" aria-hidden />,
  },
  {
    id: "fonepay",
    name: "Fonepay",
    description: "Scan QR to pay",
    icon: <Landmark className="size-4" aria-hidden />,
  },
  {
    id: "stripe",
    name: "Card",
    description: "Visa, Mastercard, Amex",
    icon: <CreditCard className="size-4" aria-hidden />,
  },
  {
    id: "cod",
    name: "Cash on delivery",
    description: "Pay when the package arrives",
    icon: <Wallet className="size-4" aria-hidden />,
  },
];

type OrderItemExtras = {
  title?: string;
  variantTitle?: string | null;
};

type OrderWithExtras = Omit<Order, "items"> & {
  items?: Array<Order["items"][number] & OrderItemExtras>;
  currencyCode?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  deliveryStatus?: string;
  cancelledAt?: string | null;
  taxTotal?: number;
  addresses?: Array<{
    id: string;
    type: "shipping" | "billing";
    address1: string;
    address2?: string | null;
    city: string;
    province?: string | null;
    country: string;
    countryCode: string;
    zip: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  }>;
  payments?: Array<{
    id: string;
    provider: string;
    status: string;
  }>;
};

export default function OrderDetailPage() {
  const { customer, loading: authLoading } = useRequireCustomerAuth();
  const params = useParams<{ orderNumber: string }>();
  const orderId = params.orderNumber;

  const [order, setOrder] = React.useState<OrderWithExtras | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const [payProvider, setPayProvider] =
    React.useState<PayLaterProvider>("khalti");
  const [paying, setPaying] = React.useState(false);

  const fetchOrder = React.useCallback(async () => {
    if (!customer || !orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<OrderWithExtras>(
        `/storefront/orders/${orderId}`
      );
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found.");
    } finally {
      setLoading(false);
    }
  }, [customer, orderId]);

  React.useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function handlePayNow() {
    if (!order) return;
    setPaying(true);
    try {
      const init = await apiFetch<{
        redirectUrl?: string;
        paymentId?: string;
        providerPaymentId?: string;
      }>("/storefront/payments/initiate", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id, provider: payProvider }),
      });

      if (init.redirectUrl) {
        // Redirect-based providers — hand control over to the provider page.
        window.location.assign(init.redirectUrl);
        return;
      }

      // No redirect (e.g. cash on delivery) — refresh the order so the
      // customer sees the updated state immediately.
      toast({
        title: "Payment intent recorded",
        description:
          payProvider === "cod"
            ? "We'll collect payment when your order is delivered."
            : "We're processing your payment.",
      });
      fetchOrder();
    } catch (err: unknown) {
      const msg =
        (err as Error)?.message ?? "Could not start payment. Please try again.";
      toast({
        title: "Payment failed to start",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    try {
      await apiFetch(`/customer/orders/${order.id}/cancel`, { method: "POST" });
      toast({
        title: "Order cancelled",
        description: `Order #${order.orderNumber} has been cancelled.`,
      });
      setShowCancelConfirm(false);
      fetchOrder();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Could not cancel order";
      toast({
        title: "Cancellation failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  }

  if (authLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20">
        <Skeleton className="mb-3 h-3 w-44" />
        <Skeleton className="mb-6 h-8 w-56" />
        <OrderDetailSkeleton />
      </main>
    );
  }
  if (!customer) return null;

  const currency = order?.currencyCode ?? getPlatformCurrency();

  const canCancel =
    order &&
    (order.status === ("open" as OrderStatus) ||
      order.status === ("draft" as OrderStatus) ||
      order.status === ("pending" as OrderStatus) ||
      order.status === ("confirmed" as OrderStatus) ||
      order.status === ("processing" as OrderStatus)) &&
    order.fulfillmentStatus !== "fulfilled" &&
    order.deliveryStatus !== "shipped" &&
    order.deliveryStatus !== "delivered";

  // Returns are only meaningful once items have been delivered (or at least
  // shipped, in case the customer wants to refuse at the door).
  const canReturn =
    !!order &&
    (order.fulfillmentStatus === "fulfilled" ||
      order.fulfillmentStatus === "partially_fulfilled") &&
    order.status !== ("cancelled" as OrderStatus) &&
    order.status !== ("refunded" as OrderStatus) &&
    !!order.items?.some((i) => {
      const item = i as typeof i & { fulfilledQuantity?: number; refundedQuantity?: number };
      return (item.fulfilledQuantity ?? 0) - (item.refundedQuantity ?? 0) > 0;
    });

  const shippingAddr = order?.addresses?.find((a) => a.type === "shipping");

  const isAwaitingPayment =
    !!order &&
    (order.paymentStatus === "pending" ||
      order.paymentStatus === "partially_paid" ||
      order.paymentStatus === "failed") &&
    order.status !== ("cancelled" as OrderStatus) &&
    order.status !== ("refunded" as OrderStatus) &&
    order.status !== ("archived" as OrderStatus);

  const isTerminal =
    order?.status === ("cancelled" as OrderStatus) ||
    order?.status === ("refunded" as OrderStatus);

  return (
    <>
      <section aria-labelledby="order-heading">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Breadcrumbs
              items={[
                { label: "Account", href: "/customer/account" },
                { label: "Orders", href: "/customer/orders" },
                { label: order ? `#${order.orderNumber}` : "Order" },
              ]}
            />
            <h1
              id="order-heading"
              className="mt-2 text-2xl font-medium tracking-tight sm:text-[1.75rem]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {order ? `Order #${order.orderNumber}` : "Order"}
            </h1>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lock className="size-3.5" aria-hidden /> Buyer protection included
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-2 sm:px-6 sm:pt-3 lg:px-8 lg:pb-20">
        <Link
          href="/customer/orders"
          className="group mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ChevronLeft
            className="size-3.5 transition-transform group-hover:-translate-x-0.5"
            aria-hidden
          />
          All orders
        </Link>

        {loading ? (
          <OrderDetailSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-muted">
              <Package className="size-9 text-muted-foreground" aria-hidden />
            </span>
            <h2
              className="text-xl font-medium tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Order not found
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
            <Button asChild className="mt-2 h-11 rounded-full px-6 font-semibold">
              <Link href="/customer/orders">Back to orders</Link>
            </Button>
          </div>
        ) : order ? (
          <div className="flex flex-col gap-8">
            {/* Hero — order header card */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/40 p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Order placed
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium">
                    <Clock className="size-4 text-muted-foreground" aria-hidden />
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={order.status} />
                  {order.paymentStatus && (
                    <StatusPill status={order.paymentStatus} />
                  )}
                </div>
              </div>

              <Separator className="my-5" />

              {isTerminal ? (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                    order.status === "cancelled"
                      ? "border-red-200/70 bg-red-50/70 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
                      : "border-border bg-muted/40 text-muted-foreground"
                  )}
                  role="status"
                >
                  <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold capitalize">
                      Order {order.status}
                    </p>
                    <p className="text-xs leading-relaxed opacity-90">
                      {order.status === "cancelled"
                        ? "This order has been cancelled. Any captured payment will be refunded."
                        : "This order has been refunded. Funds will appear in your account within 5–10 business days."}
                    </p>
                  </div>
                </div>
              ) : (
                <OrderTimeline status={order.status} />
              )}
            </div>

            {/* Two-column main content */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:gap-10">
              <section className="flex flex-col gap-6">
                {/* Items */}
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                      <ShoppingBag
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                      Items
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {order.items?.length ?? 0}
                      </span>
                    </h2>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {(order.items ?? []).map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted/60 ring-1 ring-inset ring-border">
                            <Package
                              className="size-5 text-muted-foreground"
                              aria-hidden
                            />
                          </span>
                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-semibold"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {item.title ?? item.variantId}
                            </p>
                            {item.variantTitle && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {item.variantTitle}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="tabular">
                                {formatPrice(item.unitPrice, currency)} ×{" "}
                                {item.quantity}
                              </span>
                              <span aria-hidden>·</span>
                              <StatusPill status={item.status} />
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular">
                          {formatPrice(item.totalPrice, currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Shipping address */}
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                      <MapPin
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                      Shipping address
                    </h2>
                  </div>
                  <div className="px-5 py-5 text-sm sm:px-6">
                    {shippingAddr ? (
                      <address className="not-italic leading-relaxed text-muted-foreground">
                        {(shippingAddr.firstName || shippingAddr.lastName) && (
                          <p className="font-semibold text-foreground">
                            {shippingAddr.firstName} {shippingAddr.lastName}
                          </p>
                        )}
                        <p>{shippingAddr.address1}</p>
                        {shippingAddr.address2 && <p>{shippingAddr.address2}</p>}
                        <p>
                          {shippingAddr.city}
                          {shippingAddr.province &&
                            `, ${shippingAddr.province}`}{" "}
                          {shippingAddr.zip}
                        </p>
                        <p>{shippingAddr.country}</p>
                        {shippingAddr.phone && (
                          <p className="mt-1">{shippingAddr.phone}</p>
                        )}
                      </address>
                    ) : (
                      <p className="text-muted-foreground">
                        No shipping address on record.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Right column: totals + actions, sticky on desktop */}
              <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                  <div className="border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                      <Receipt
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                      Order summary
                    </h2>
                  </div>
                  <dl className="flex flex-col gap-3 px-5 py-5 text-sm sm:px-6">
                    <Row
                      label="Subtotal"
                      value={formatPrice(order.subtotalPrice, currency)}
                    />
                    <Row
                      label="Shipping"
                      value={
                        order.shippingPrice === 0
                          ? "Free"
                          : formatPrice(order.shippingPrice, currency)
                      }
                      highlight={order.shippingPrice === 0}
                    />
                    {typeof order.taxTotal !== "undefined" &&
                      order.taxTotal > 0 && (
                        <Row
                          label="Tax"
                          value={formatPrice(order.taxTotal, currency)}
                        />
                      )}
                    <Separator className="my-1" />
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Total
                      </span>
                      <span
                        className="text-2xl font-medium tabular"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {formatPrice(order.totalPrice, currency)}
                      </span>
                    </div>
                  </dl>

                  {order.payments && order.payments.length > 0 && (
                    <div className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-5 py-3 text-xs text-muted-foreground sm:px-6">
                      <CreditCard className="size-3.5" aria-hidden />
                      Paid via{" "}
                      <span className="font-medium capitalize text-foreground">
                        {order.payments[0].provider}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pay now — when an invoice/draft order is awaiting payment */}
                {isAwaitingPayment && (
                  <div
                    className="overflow-hidden rounded-2xl border border-emerald-200/70 bg-emerald-50/50 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20"
                    data-testid="pay-now-card"
                  >
                    <div className="border-b border-emerald-200/70 bg-emerald-100/40 px-5 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 sm:px-6">
                      <h2 className="flex items-center gap-2 text-base font-semibold text-emerald-900 dark:text-emerald-200">
                        <CreditCard
                          className="size-4 text-emerald-700 dark:text-emerald-300"
                          aria-hidden
                        />
                        Pay this order
                      </h2>
                      <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                        Outstanding balance:{" "}
                        <span className="font-medium">
                          {formatPrice(order.totalPrice, currency)}
                        </span>
                      </p>
                    </div>
                    <fieldset
                      className="flex flex-col gap-1 px-3 py-3 sm:px-4"
                      disabled={paying}
                    >
                      <legend className="sr-only">Choose a payment method</legend>
                      {PAY_LATER_METHODS.map((m) => {
                        const selected = payProvider === m.id;
                        return (
                          <label
                            key={m.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                              selected
                                ? "border-emerald-400 bg-white shadow-sm dark:bg-emerald-900/30"
                                : "border-transparent hover:bg-white/60 dark:hover:bg-emerald-900/20"
                            )}
                          >
                            <input
                              type="radio"
                              name="pay-provider"
                              value={m.id}
                              checked={selected}
                              onChange={() => setPayProvider(m.id)}
                              className="sr-only"
                            />
                            <span
                              className={cn(
                                "flex size-8 items-center justify-center rounded-full",
                                selected
                                  ? "bg-emerald-600 text-white"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              )}
                              aria-hidden
                            >
                              {m.icon}
                            </span>
                            <span className="flex flex-col">
                              <span className="font-medium leading-tight">
                                {m.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {m.description}
                              </span>
                            </span>
                            <span className="ml-auto">
                              <span
                                className={cn(
                                  "inline-flex size-4 items-center justify-center rounded-full border",
                                  selected
                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                    : "border-muted-foreground/40"
                                )}
                                aria-hidden
                              >
                                {selected && (
                                  <CheckCircle2 className="size-3" />
                                )}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </fieldset>
                    <div className="border-t border-emerald-200/70 px-5 py-3 dark:border-emerald-900/60 sm:px-6">
                      <Button
                        type="button"
                        className="h-11 w-full gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={handlePayNow}
                        disabled={paying}
                      >
                        {paying ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <Lock className="size-4" aria-hidden />
                        )}
                        {paying ? "Starting payment…" : "Pay now"}
                      </Button>
                      <p className="mt-2 text-center text-[11px] text-emerald-900/70 dark:text-emerald-300/70">
                        Secured by the payment provider. You'll be redirected to complete payment.
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2.5">
                  {order.paymentStatus === "paid" && (
                    <Button
                      variant="outline"
                      asChild
                      className="h-11 justify-start gap-2 rounded-xl px-4"
                    >
                      <Link
                        href={`${process.env.NEXT_PUBLIC_API_URL ?? ""}/storefront/orders/${order.id}/invoice`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="size-4" aria-hidden />
                        Download invoice
                      </Link>
                    </Button>
                  )}
                  {canReturn && (
                    <Button
                      variant="outline"
                      asChild
                      className="h-11 justify-start gap-2 rounded-xl px-4"
                    >
                      <Link href={`/customer/orders/${order.id}/return`}>
                        <PackageOpen className="size-4" aria-hidden />
                        Request a return
                      </Link>
                    </Button>
                  )}
                  {order.items?.[0]?.vendorId && (
                    <AskSellerDialog
                      vendorId={order.items[0].vendorId}
                      orderId={order.id}
                      defaultSubject={`Question about order #${order.orderNumber}`}
                      loginRedirectPath={`/customer/orders/${order.id}`}
                      triggerLabel="Message the seller"
                      className="h-11 justify-start rounded-xl px-4"
                    />
                  )}
                  <Button
                    variant="outline"
                    asChild
                    className="h-11 justify-start gap-2 rounded-xl px-4"
                  >
                    <Link href="/help">
                      <HelpCircle className="size-4" aria-hidden />
                      Need help with this order?
                    </Link>
                  </Button>
                  {canCancel && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={cancelling}
                      className="h-11 justify-start gap-2 rounded-xl px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XCircle className="size-4" aria-hidden />
                      Cancel order
                    </Button>
                  )}
                </div>
              </aside>
            </div>

            {/* Cancel confirmation */}
            {showCancelConfirm && (
              <div
                className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5"
                role="alertdialog"
                aria-labelledby="cancel-order-title"
              >
                <p
                  id="cancel-order-title"
                  className="text-base font-semibold text-destructive"
                >
                  Cancel this order?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This can&apos;t be undone. If payment has been captured, a
                  refund will be initiated automatically.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="h-10 rounded-full px-4"
                  >
                    {cancelling && (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    )}
                    Yes, cancel order
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelling}
                    className="h-10 rounded-full px-4"
                  >
                    Keep order
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular",
          highlight ? "font-semibold text-emerald-700 dark:text-emerald-400" : "font-medium"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <Separator className="my-5" />
        <div className="flex items-center gap-3">
          {[...Array(4)].map((_, i) => (
            <React.Fragment key={i}>
              <Skeleton className="size-10 shrink-0 rounded-full" />
              {i < 3 && <Skeleton className="h-[3px] flex-1 rounded-full" />}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:gap-10">
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-24" />
          <div className="mt-4 flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
