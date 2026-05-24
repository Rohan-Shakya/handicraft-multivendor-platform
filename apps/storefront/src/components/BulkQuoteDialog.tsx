"use client";

import { Loader2, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  /** Variant the customer is browsing. Required — the quote line item snaps to this. */
  variantId: string;
  /** Optional product reference for the resulting order's product anchor. */
  productId?: string;
  /** Used to redirect unauthenticated visitors back here after login. */
  loginRedirectPath?: string;
  /** Lower-bound qty shown in the placeholder; the input still accepts any int ≥ 1. */
  suggestedMinQuantity?: number;
  /** Custom trigger — falls back to the default outline button. */
  trigger?: React.ReactNode;
  /** Override the trigger button text when using the default trigger. */
  triggerLabel?: string;
  className?: string;
}

interface QuoteResponse {
  id: string;
  orderNumber: string;
}

export function BulkQuoteDialog({
  variantId,
  productId,
  loginRedirectPath,
  suggestedMinQuantity = 10,
  trigger,
  triggerLabel,
  className,
}: Props) {
  const { customer } = useAuth();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [quantity, setQuantity] = React.useState(String(suggestedMinQuantity));
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  function handleTriggerClick(e: React.MouseEvent) {
    if (!customer) {
      e.preventDefault();
      const next = loginRedirectPath
        ? `?next=${encodeURIComponent(loginRedirectPath)}`
        : "";
      router.push(`/customer/login${next}`);
      return;
    }
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const qtyNum = Number.parseInt(quantity, 10);
    if (!Number.isFinite(qtyNum) || qtyNum < 1) {
      toast({
        title: "Enter a quantity",
        description: "Please request at least 1 unit.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<QuoteResponse>(
        "/storefront/bulk-quotes",
        {
          method: "POST",
          body: JSON.stringify({
            variantId,
            productId,
            quantity: qtyNum,
            message: message.trim() || undefined,
          }),
        }
      );
      toast({
        title: "Quote request sent",
        description: `Order ${res.orderNumber} is now a draft — the seller will reply with pricing soon.`,
      });
      setOpen(false);
      setMessage("");
      router.push(`/customer/orders/${res.orderNumber}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send request.";
      toast({
        title: "Couldn't send quote request",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const triggerEl = trigger ? (
    <span onClick={handleTriggerClick} className="inline-flex">
      {trigger}
    </span>
  ) : (
    <Button
      type="button"
      variant="outline"
      onClick={handleTriggerClick}
      className={cn("gap-2 rounded-full", className)}
    >
      <Package className="size-4" aria-hidden />
      {triggerLabel ?? "Request bulk quote"}
    </Button>
  );

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Request a bulk quote</DialogTitle>
            <DialogDescription>
              Tell the seller how many you'd like — they'll reply with a tailored
              price and shipping quote. No payment now; you'll get an invoice
              link when the seller is ready.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 px-6 pb-5">
              <div>
                <label
                  htmlFor="bulk-quote-qty"
                  className="mb-2 block text-sm font-medium"
                >
                  Quantity
                </label>
                <Input
                  id="bulk-quote-qty"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="h-10 rounded-lg"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Most sellers offer the best rates at {suggestedMinQuantity}+
                  units.
                </p>
              </div>
              <div>
                <label
                  htmlFor="bulk-quote-message"
                  className="mb-2 block text-sm font-medium"
                >
                  Notes for the seller{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="bulk-quote-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Timing, finish/colour preferences, delivery country, expected reorder cadence…"
                  maxLength={2000}
                  rows={5}
                  className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {message.length}/2000
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-6 py-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="h-10 rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !quantity.trim()}
                className="h-10 gap-2 rounded-full px-5 font-semibold"
              >
                {submitting && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                Send request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
