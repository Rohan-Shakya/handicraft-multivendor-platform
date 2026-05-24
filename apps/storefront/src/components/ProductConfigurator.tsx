"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ConfigValue {
  id: string;
  value: string;
  priceModifier: string;
}
interface ConfigOption {
  id: string;
  name: string;
  type: "select" | "text" | "number";
  required: boolean;
  helpText: string | null;
  values: ConfigValue[];
}
interface ConfiguratorData {
  product: {
    id: string;
    title: string;
    leadTimeDays: number | null;
    vendorId: string;
  };
  options: ConfigOption[];
}

interface ProductConfiguratorProps {
  productId: string;
  basePrice: number;
  currency: string;
  defaultEmail?: string;
}

/**
 * Customer-facing configurator on the PDP for made-to-order products. Renders
 * the vendor-declared inputs (size, material, colour…), accepts free-text
 * notes, and submits a quote request which becomes a draft order the vendor
 * can price. The customer sees a live estimate as they pick options.
 */
export function ProductConfigurator({
  productId,
  basePrice,
  currency,
  defaultEmail = "",
}: ProductConfiguratorProps) {
  const router = useRouter();
  const [data, setData] = React.useState<ConfiguratorData | null>(null);
  const [loading, setLoading] = React.useState(true);
  // Selected value-id per option (for `select`) or freeform text (for `text`/`number`).
  const [selections, setSelections] = React.useState<Record<string, string>>({});
  // For non-select options we also keep the raw entered value
  const [textValues, setTextValues] = React.useState<Record<string, string>>({});
  const [email, setEmail] = React.useState(defaultEmail);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState<{ orderNumber: string } | null>(null);

  React.useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await apiFetch<ConfiguratorData>(
          `/storefront/products/${productId}/configurator`
        );
        if (!aborted) setData(res);
      } catch (err: any) {
        if (!aborted) {
          toast({
            title: "Couldn't load configurator",
            description: err?.message,
            variant: "destructive",
          });
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [productId]);

  // Live price estimate = base + selected price modifiers.
  const estimate = React.useMemo(() => {
    if (!data) return basePrice;
    let total = basePrice;
    for (const opt of data.options) {
      if (opt.type !== "select") continue;
      const valId = selections[opt.id];
      if (!valId) continue;
      const v = opt.values.find((x) => x.id === valId);
      if (v) total += parseFloat(v.priceModifier);
    }
    return total;
  }, [data, selections, basePrice]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;

    // Validate required options
    for (const opt of data.options) {
      if (!opt.required) continue;
      if (opt.type === "select" && !selections[opt.id]) {
        toast({ title: `Please pick a ${opt.name}`, variant: "destructive" });
        return;
      }
      if ((opt.type === "text" || opt.type === "number") && !textValues[opt.id]?.trim()) {
        toast({ title: `Please enter ${opt.name}`, variant: "destructive" });
        return;
      }
    }
    if (!email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        productId,
        customerEmail: email.trim().toLowerCase(),
        customerName: name.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        message: message.trim() || undefined,
        selections: data.options.map((opt) => {
          if (opt.type === "select") {
            const valId = selections[opt.id];
            const v = opt.values.find((x) => x.id === valId);
            return {
              optionId: opt.id,
              valueId: valId,
              value: v?.value ?? "",
            };
          }
          return {
            optionId: opt.id,
            value: textValues[opt.id] ?? "",
          };
        }),
      };
      const res = await apiFetch<{ id: string; orderNumber: string }>(
        "/storefront/quote-requests",
        { method: "POST", body: JSON.stringify(payload) }
      );
      setSubmitted({ orderNumber: res.orderNumber });
      toast({
        title: "Quote requested",
        description: `We'll email you a price for ${data.product.title} soon.`,
      });
    } catch (err: any) {
      toast({
        title: "Couldn't submit",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }
  if (!data || data.options.length === 0) return null;

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          <div>
            <p className="text-base font-semibold">Quote requested</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We've created request <strong>#{submitted.orderNumber}</strong>.
              You'll get an email with a price and lead time soon.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/customer/orders")}
            >
              View my orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-card p-5 sm:p-6"
      aria-labelledby="config-heading"
    >
      <div className="mb-4">
        <h3 id="config-heading" className="text-lg font-semibold">
          Custom request
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Tell us your preferences and we'll send you a quote.
          {data.product.leadTimeDays
            ? ` Typical lead time: ${data.product.leadTimeDays} days.`
            : ""}
        </p>
      </div>

      <div className="space-y-4">
        {data.options.map((opt) => (
          <div key={opt.id}>
            <label
              htmlFor={`opt-${opt.id}`}
              className="mb-1.5 flex items-baseline justify-between text-sm font-medium"
            >
              <span>
                {opt.name}
                {opt.required && (
                  <span className="ml-0.5 text-destructive" aria-label="required">
                    *
                  </span>
                )}
              </span>
              {opt.helpText && (
                <span className="text-xs font-normal text-muted-foreground">
                  {opt.helpText}
                </span>
              )}
            </label>
            {opt.type === "select" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {opt.values.map((v) => {
                  const selected = selections[opt.id] === v.id;
                  const modifier = parseFloat(v.priceModifier);
                  return (
                    <label
                      key={v.id}
                      className={cn(
                        "cursor-pointer rounded-lg border p-3 text-sm transition-colors",
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "hover:bg-muted/30"
                      )}
                    >
                      <input
                        type="radio"
                        name={`opt-${opt.id}`}
                        checked={selected}
                        onChange={() =>
                          setSelections((p) => ({ ...p, [opt.id]: v.id }))
                        }
                        className="sr-only"
                      />
                      <div className="font-medium">{v.value}</div>
                      {modifier !== 0 && (
                        <div className="mt-0.5 text-xs opacity-80">
                          {modifier > 0 ? "+" : ""}
                          {formatPrice(modifier, currency)}
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <input
                id={`opt-${opt.id}`}
                type={opt.type === "number" ? "number" : "text"}
                value={textValues[opt.id] ?? ""}
                onChange={(e) =>
                  setTextValues((p) => ({ ...p, [opt.id]: e.target.value }))
                }
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            )}
          </div>
        ))}

        <hr className="my-2" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="config-email" className="mb-1 block text-sm font-medium">
              Email <span className="text-destructive" aria-label="required">*</span>
            </label>
            <input
              id="config-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="config-name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <input
              id="config-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div>
          <label htmlFor="config-phone" className="mb-1 block text-sm font-medium">
            Phone
          </label>
          <input
            id="config-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label htmlFor="config-message" className="mb-1 block text-sm font-medium">
            Anything else?
          </label>
          <textarea
            id="config-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Special requirements, deadlines, references..."
            className="w-full rounded-lg border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            maxLength={2000}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Starting estimate</p>
          <p className="text-2xl font-bold tabular">
            {formatPrice(estimate, currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            Final price confirmed by the seller.
          </p>
        </div>
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <>
              <Send className="size-4 mr-1.5" aria-hidden />
              Request quote
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
