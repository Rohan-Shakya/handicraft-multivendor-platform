"use client";

import * as React from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NotifyMeButtonProps {
  variantId: string;
  /** Pre-fill the email if the customer is logged in. */
  defaultEmail?: string;
  className?: string;
}

/**
 * "Notify me when back in stock" — shown on the PDP/cart when the selected
 * variant is sold out. Captures the customer's email and posts to
 * /storefront/stock-notify. The backend's `back_in_stock_notify` scheduled job
 * sends the email when inventory restocks.
 *
 * Accessibility: button toggles a disclosure region with a labeled email
 * input. After successful subscription, swaps to a confirmation pill.
 */
export function NotifyMeButton({
  variantId,
  defaultEmail = "",
  className,
}: NotifyMeButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState(defaultEmail);
  const [submitting, setSubmitting] = React.useState(false);
  const [subscribed, setSubscribed] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch("/storefront/stock-notify", {
        method: "POST",
        body: JSON.stringify({ variantId, email: email.trim() }),
      });
      setSubscribed(true);
      toast({
        title: "You're on the list",
        description: `We'll email ${email.trim()} the moment this is back in stock.`,
      });
    } catch (err: any) {
      toast({
        title: "Couldn't sign you up",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (subscribed) {
    return (
      <div
        role="status"
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
          className
        )}
      >
        <BellRing className="size-4" aria-hidden />
        We'll let you know
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-xl border border-foreground/20 bg-background px-5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          className
        )}
        aria-expanded="false"
      >
        <Bell className="size-4" aria-hidden /> Notify me when back in stock
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center",
        className
      )}
      aria-label="Restock notification signup"
    >
      <label htmlFor="notify-email" className="sr-only">
        Email
      </label>
      <input
        id="notify-email"
        type="email"
        required
        autoFocus
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        disabled={submitting || !email.trim()}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <>
            <Bell className="size-4" aria-hidden /> Notify me
          </>
        )}
      </button>
    </form>
  );
}
