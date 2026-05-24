"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

/**
 * Newsletter subscription form with explicit opt-in consent.
 *
 * GDPR / CAN-SPAM require that subscription is active consent — the user
 * must tick a box rather than be pre-consented. The backend should send a
 * double opt-in confirmation email before activating the subscription.
 */
export function NewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;
    if (!consent) {
      toast({
        title: "Please confirm consent",
        description: "Tick the box to agree to receive emails.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ message?: string }>(
        "/storefront/newsletter/subscribe",
        {
          method: "POST",
          body: JSON.stringify({ email, consent: true }),
        }
      );
      toast({
        title: "Check your inbox",
        description:
          data.message ??
          "We sent a confirmation link — click it to finish subscribing.",
      });
      setEmail("");
      setConsent(false);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Could not connect to the server.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-col gap-2"
      aria-label="Newsletter signup"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        placeholder="Enter your email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-0.5"
        />
        <span>
          I agree to receive marketing emails and understand I can unsubscribe at
          any time.
        </span>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        Subscribe
      </button>
    </form>
  );
}
