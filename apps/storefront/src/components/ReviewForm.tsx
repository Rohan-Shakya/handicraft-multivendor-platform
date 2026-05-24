"use client";

import { Loader2, Star } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

interface Props {
  productId: string;
  /** Called after a successful submit so the parent can re-fetch reviews. */
  onSubmitted?: () => void;
}

/**
 * Customer-facing review form. Requires an authenticated customer.
 *
 * Review moderation is server-side — newly submitted reviews may sit in
 * `pending_review` state until approved by staff.
 */
export function ReviewForm({ productId, onSubmitted }: Props) {
  const { customer } = useAuth();
  const [rating, setRating] = React.useState<number>(0);
  const [hoverRating, setHoverRating] = React.useState<number>(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  if (!customer) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <a
          href="/customer/login"
          className="font-medium text-primary underline underline-offset-2"
        >
          Sign in
        </a>{" "}
        to write a review.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast({
        title: "Please pick a rating",
        description: "Choose between 1 and 5 stars.",
        variant: "destructive",
      });
      return;
    }
    if (body.trim().length < 10) {
      toast({
        title: "Review too short",
        description: "Tell us a bit more — at least 10 characters.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/storefront/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });
      toast({
        title: "Review submitted",
        description: "Thanks! We'll publish it after a quick moderation check.",
      });
      setRating(0);
      setTitle("");
      setBody("");
      onSubmitted?.();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Could not submit review";
      toast({ title: "Submit failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Write a review">
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Rating</legend>
        <div className="flex items-center gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= (hoverRating || rating);
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                aria-pressed={rating === n}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={`size-6 transition-colors ${
                    filled
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="review-title" className="text-sm font-medium">
          Title (optional)
        </label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Summarize your experience"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="review-body" className="text-sm font-medium">
          Review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="What did you think of this product?"
        />
        <p className="text-xs text-muted-foreground">
          {body.length}/2000 characters
        </p>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Submit review
      </Button>
    </form>
  );
}
