"use client";

import { Loader2, MessageSquare } from "lucide-react";
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
  /** Vendor that owns the product or order being asked about. */
  vendorId: string;
  /** Optional product anchor — surfaced as a preview chip in the seller's inbox. */
  productId?: string;
  /** Optional order anchor — used when the trigger lives on an order detail page. */
  orderId?: string;
  /** Used to redirect unauthenticated visitors back here after login. */
  loginRedirectPath?: string;
  /** Suggested subject line; the customer can edit it. */
  defaultSubject?: string;
  /** Custom trigger — falls back to the default outline button. */
  trigger?: React.ReactNode;
  /** Override the trigger button text when using the default trigger. */
  triggerLabel?: string;
  className?: string;
}

export function AskSellerDialog({
  vendorId,
  productId,
  orderId,
  loginRedirectPath,
  defaultSubject = "",
  trigger,
  triggerLabel,
  className,
}: Props) {
  const { customer } = useAuth();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [subject, setSubject] = React.useState(defaultSubject);
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Keep subject in sync with the latest default when the prop changes
  // (e.g. user navigates between products).
  React.useEffect(() => {
    setSubject(defaultSubject);
  }, [defaultSubject]);

  function handleTriggerClick(e?: React.MouseEvent) {
    if (!customer) {
      e?.preventDefault();
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
    if (!subject.trim() || !body.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiFetch<{ id: string }>(
        "/storefront/messages/threads",
        {
          method: "POST",
          body: JSON.stringify({
            vendorId,
            subject: subject.trim(),
            body: body.trim(),
            productId,
            orderId,
          }),
        }
      );
      toast({
        title: "Message sent",
        description: "The seller will reply by email and in your inbox.",
      });
      setOpen(false);
      setBody("");
      router.push(`/customer/messages/${res.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not send message.";
      toast({
        title: "Couldn't send message",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const triggerEl = trigger ? (
    <span
      role="button"
      tabIndex={0}
      onClick={handleTriggerClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleTriggerClick();
        }
      }}
      className="inline-flex cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
    >
      {trigger}
    </span>
  ) : (
    <Button
      type="button"
      variant="outline"
      onClick={handleTriggerClick}
      className={cn("gap-2 rounded-full", className)}
    >
      <MessageSquare className="size-4" aria-hidden />
      {triggerLabel ?? "Ask the seller"}
    </Button>
  );

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Message the seller</DialogTitle>
            <DialogDescription>
              Questions about this {orderId ? "order" : "product"}? The seller
              usually replies within 1–2 business days.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 px-6 pb-5">
              <div>
                <label
                  htmlFor="ask-seller-subject"
                  className="mb-2 block text-sm font-medium"
                >
                  Subject
                </label>
                <Input
                  id="ask-seller-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's your question about?"
                  maxLength={200}
                  required
                  className="h-10 rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="ask-seller-body"
                  className="mb-2 block text-sm font-medium"
                >
                  Message
                </label>
                <textarea
                  id="ask-seller-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Be clear and friendly — include sizing, colour, or order details if helpful."
                  maxLength={5000}
                  required
                  rows={5}
                  className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {body.length}/5000
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
                disabled={submitting || !subject.trim() || !body.trim()}
                className="h-10 gap-2 rounded-full px-5 font-semibold"
              >
                {submitting && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                Send message
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
