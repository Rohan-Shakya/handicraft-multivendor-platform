"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, PackageOpen } from "lucide-react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useRequireCustomerAuth } from "@/hooks/useRequireCustomerAuth";
import { apiFetch } from "@/lib/api";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  vendorOrderId: string;
  productId: string | null;
  variantId: string | null;
  title: string;
  variantTitle: string | null;
  quantity: number;
  fulfilledQuantity: number;
  refundedQuantity: number;
  unitPrice: string;
  totalPrice: string;
  status: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  currencyCode: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  items: OrderItem[];
}

type Reason =
  | ""
  | "damaged"
  | "wrong_item"
  | "not_as_described"
  | "no_longer_needed"
  | "size_issue"
  | "other";

const REASON_LABELS: Record<Exclude<Reason, "">, string> = {
  damaged: "Arrived damaged",
  wrong_item: "Received wrong item",
  not_as_described: "Not as described",
  size_issue: "Size or fit issue",
  no_longer_needed: "No longer needed",
  other: "Other",
};

export default function ReturnRequestPage() {
  const { customer, loading: authLoading } = useRequireCustomerAuth();
  const params = useParams<{ orderNumber: string }>();
  const orderId = params.orderNumber;
  const router = useRouter();

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});
  const [reason, setReason] = React.useState<Reason>("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (!customer) return;
    let aborted = false;
    (async () => {
      try {
        const data = await apiFetch<OrderDetail>(`/storefront/orders/${orderId}`);
        if (aborted) return;
        setOrder(data);
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : "Order not found.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [customer, orderId]);

  // Returnable items: only items that were actually fulfilled and not already
  // fully refunded. A real return requires the customer to have received the
  // item.
  const returnableItems = React.useMemo(() => {
    if (!order) return [];
    return order.items.filter((i) => {
      const maxReturnable = i.fulfilledQuantity - i.refundedQuantity;
      return maxReturnable > 0 && i.status !== "cancelled";
    });
  }, [order]);

  const currency = order?.currencyCode ?? getPlatformCurrency();

  function setItemQuantity(item: OrderItem, value: number) {
    const max = item.fulfilledQuantity - item.refundedQuantity;
    const clamped = Math.max(0, Math.min(max, value));
    setQuantities((prev) => ({ ...prev, [item.id]: clamped }));
  }

  const selectedItems = returnableItems
    .map((i) => ({ item: i, qty: quantities[i.id] ?? 0 }))
    .filter((row) => row.qty > 0);

  const totalRefundEstimate = selectedItems.reduce((sum, row) => {
    const unit = parseFloat(row.item.unitPrice);
    return sum + (Number.isFinite(unit) ? unit * row.qty : 0);
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    if (selectedItems.length === 0) {
      toast({
        title: "Pick at least one item",
        description: "Select the quantity you'd like to return.",
        variant: "destructive",
      });
      return;
    }
    if (!reason) {
      toast({
        title: "Pick a reason",
        description: "Tell us why you're returning these items.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      // Group items by their vendorOrderId. The API accepts items spanning
      // multiple vendor orders in a single request — it will fan out into the
      // appropriate per-vendor return records.
      const vendorOrderIds = [
        ...new Set(selectedItems.map((s) => s.item.vendorOrderId)),
      ];
      for (const voId of vendorOrderIds) {
        const itemsForVo = selectedItems.filter(
          (s) => s.item.vendorOrderId === voId
        );
        await apiFetch("/storefront/returns", {
          method: "POST",
          body: JSON.stringify({
            orderId: order.id,
            vendorOrderId: voId,
            reason,
            note: note.trim() || undefined,
            items: itemsForVo.map((s) => ({
              orderItemId: s.item.id,
              quantity: s.qty,
              reason,
            })),
          }),
        });
      }
      setSubmitted(true);
      toast({
        title: "Return requested",
        description:
          "We've received your request. You'll get an email update soon.",
      });
    } catch (err) {
      toast({
        title: "Couldn't submit return",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-3 h-3 w-44" />
        <Skeleton className="mb-6 h-8 w-56" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </main>
    );
  }

  if (!customer) return null;
  if (error || !order) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "We couldn't load this order."}
        </p>
        <Link
          href="/customer/orders"
          className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          ← Back to orders
        </Link>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="size-8" aria-hidden />
        </div>
        <h1 className="text-3xl font-bold">Return requested</h1>
        <p className="mt-3 text-muted-foreground">
          We've sent your request to the seller. You'll receive an email when they
          approve it with shipping instructions and an estimated refund timeline.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href={`/customer/orders/${order.id}`}>Back to order</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/customer/orders">All orders</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (returnableItems.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <PackageOpen className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-bold">Nothing to return</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Items must be delivered before you can return them. If your order
          hasn't arrived yet, please wait — we'll email you when it ships.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/customer/orders/${order.id}`}>
            <ArrowLeft className="size-4 mr-1" aria-hidden /> Back to order
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Account", href: "/customer/account" },
          { label: "Orders", href: "/customer/orders" },
          { label: `#${order.orderNumber}`, href: `/customer/orders/${order.id}` },
          { label: "Return" },
        ]}
      />

      <header className="mt-6 mb-8">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Request a return
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose the items you'd like to send back from order{" "}
          <strong>#{order.orderNumber}</strong>. You can return up to the
          delivered quantity.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Items */}
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Items
          </legend>
          {returnableItems.map((item) => {
            const max = item.fulfilledQuantity - item.refundedQuantity;
            const qty = quantities[item.id] ?? 0;
            const selected = qty > 0;
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  selected ? "border-foreground bg-muted/30" : "bg-card"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{item.title}</p>
                    {item.variantTitle && (
                      <p className="text-xs text-muted-foreground">
                        {item.variantTitle}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatPrice(item.unitPrice, currency)} each · up to {max}{" "}
                      returnable
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`qty-${item.id}`} className="sr-only">
                      Quantity to return for {item.title}
                    </label>
                    <button
                      type="button"
                      onClick={() => setItemQuantity(item, qty - 1)}
                      disabled={qty <= 0}
                      className="grid size-9 place-items-center rounded-lg border bg-background disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      id={`qty-${item.id}`}
                      type="number"
                      min={0}
                      max={max}
                      value={qty}
                      onChange={(e) =>
                        setItemQuantity(item, parseInt(e.target.value, 10) || 0)
                      }
                      className="h-9 w-16 rounded-lg border bg-background text-center text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setItemQuantity(item, qty + 1)}
                      disabled={qty >= max}
                      className="grid size-9 place-items-center rounded-lg border bg-background disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </fieldset>

        {/* Reason */}
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Reason
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(REASON_LABELS) as Array<keyof typeof REASON_LABELS>).map(
              (r) => {
                const selected = reason === r;
                return (
                  <label
                    key={r}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                      selected
                        ? "border-foreground bg-muted/30 font-medium"
                        : "hover:bg-muted/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={selected}
                      onChange={() => setReason(r)}
                      className="size-4"
                    />
                    {REASON_LABELS[r]}
                  </label>
                );
              }
            )}
          </div>
        </fieldset>

        {/* Additional note */}
        <div>
          <label
            htmlFor="note"
            className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Anything we should know? (optional)
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the issue in detail so the seller can help faster."
            rows={4}
            maxLength={1000}
            className="w-full rounded-lg border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Summary + submit */}
        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Estimated refund (subject to vendor approval)
              </p>
              <p className="text-2xl font-bold tabular">
                {formatPrice(totalRefundEstimate.toFixed(2), currency)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href={`/customer/orders/${order.id}`}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting || selectedItems.length === 0 || !reason
                }
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  "Submit return request"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
