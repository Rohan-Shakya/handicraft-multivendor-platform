"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import * as React from "react";

import { toast } from "@/hooks/use-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function HomepageNewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/storefront/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({ title: "Error", description: data.message ?? "Something went wrong", variant: "destructive" });
        return;
      }

      toast({ title: "Subscribed!", description: data.message ?? "You have been subscribed to our newsletter." });
      setEmail("");
    } catch {
      toast({ title: "Error", description: "Could not connect to the server. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 max-w-md">
      <div className="group flex items-center gap-1.5 rounded-full border border-border bg-background p-1.5 shadow-sm transition-all duration-200 focus-within:border-primary/60 focus-within:shadow-[0_8px_24px_-8px_rgb(15_23_42_/_0.16)]">
        <input
          type="email"
          placeholder="Enter your email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          aria-label="Email address"
          className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:gap-2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <>
              Subscribe
              <ArrowRight className="size-3.5" aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
