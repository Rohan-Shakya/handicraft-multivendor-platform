"use client";

import type { Order } from "@repo/types";
import {
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Gift,
  Landmark,
  Loader2,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  type CheckoutStep,
  CheckoutStepper,
} from "@/components/CheckoutStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { track } from "@/hooks/useAnalytics";
import { apiFetch } from "@/lib/api";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type ShippingAddressInput,
  validateEmail,
  validateShippingAddress,
} from "@/lib/validation";

type Step = "contact" | "shipping" | "payment";
const STEPS = [
  { id: "contact", label: "Contact", icon: Mail },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "payment", label: "Payment", icon: CreditCard },
] as const;

/**
 * Cart line as returned by `GET /storefront/cart` — flat money fields in
 * decimal-string dollars, plus a normalized `product` block for thumbnails
 * and deep-linking.
 */
interface CartItemDetail {
  id: string;
  cartId: string;
  variantId: string;
  productId: string;
  title: string;
  variantTitle?: string | null;
  unitPrice: string;
  quantity: number;
  lineSubtotal: string;
  lineTotal: string;
  currencyCode?: string;
  product?: {
    id: string;
    handle: string;
    title: string;
    featuredImage?: { url: string; altText?: string | null } | null;
  } | null;
}

const toNumber = (s: string | null | undefined): number => {
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/** Checkout math is in dollars throughout — matches the cart API's wire format. */
const FREE_SHIPPING_THRESHOLD = 50;
const TAX_RATE = 0.08;

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  etaLabel?: string;
  description?: string;
}

interface ShippingForm extends ShippingAddressInput {
  email?: string;
}

const EMPTY_FORM: ShippingForm = {
  email: "",
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  country: "",
  countryCode: "",
  zip: "",
  phone: "",
};

const DEFAULT_SHIPPING_RATES: ShippingRate[] = [
  {
    id: "standard",
    name: "Standard shipping",
    price: 0,
    etaLabel: "5–7 business days",
    description: "Free on orders over Rs 25,000",
  },
  {
    id: "express",
    name: "Express",
    price: 12,
    etaLabel: "2–3 business days",
    description: "Tracked & insured",
  },
];

type PaymentMethod = "stripe" | "esewa" | "khalti" | "fonepay" | "cod";
const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "stripe",
    name: "Credit / debit card",
    description: "Visa, Mastercard, Amex via Stripe",
    icon: <CreditCard className="size-5" aria-hidden />,
  },
  {
    id: "esewa",
    name: "eSewa",
    description: "Pay with your eSewa wallet",
    icon: <Wallet className="size-5" aria-hidden />,
  },
  {
    id: "khalti",
    name: "Khalti",
    description: "Pay with Khalti",
    icon: <Wallet className="size-5" aria-hidden />,
  },
  {
    id: "fonepay",
    name: "Fonepay",
    description: "Scan QR to pay",
    icon: <Landmark className="size-5" aria-hidden />,
  },
  {
    id: "cod",
    name: "Cash on delivery",
    description: "Pay when the package arrives",
    icon: <Wallet className="size-5" aria-hidden />,
  },
];

function useIdempotencyKey(): string {
  const [key] = React.useState(() => {
    if (typeof window === "undefined") return "";
    return crypto.randomUUID();
  });
  return key;
}

export default function CheckoutPage() {
  const { items, clearCart, refreshCart } = useCart();
  const { customer } = useAuth();
  const router = useRouter();
  const idempotencyKey = useIdempotencyKey();

  const typed = items as unknown as CartItemDetail[];
  const currency = typed[0]?.currencyCode ?? getPlatformCurrency();
  const subtotal = typed.reduce(
    (s, i) => s + (toNumber(i.lineTotal) || toNumber(i.unitPrice) * i.quantity),
    0
  );
  const itemCount = typed.reduce((s, i) => s + i.quantity, 0);

  const [step, setStep] = React.useState<Step>("contact");
  const currentIndex = STEPS.findIndex((s) => s.id === step);

  const [form, setForm] = React.useState<ShippingForm>({
    ...EMPTY_FORM,
    email: customer?.email ?? "",
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
  });
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<keyof ShippingForm, string>>
  >({});
  const [shippingRateId, setShippingRateId] = React.useState<string>("standard");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("stripe");
  const [placing, setPlacing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [gift, setGift] = React.useState<{
    code: string;
    balance: number;
    currencyCode: string;
  } | null>(null);
  const [orderInfo, setOrderInfo] = React.useState<{
    id: string;
    orderNumber: string;
    total: number;
    currency: string;
    email: string;
    paymentMethod: PaymentMethod;
    giftCard?: { debited: number; currencyCode: string } | null;
  } | null>(null);

  React.useEffect(() => {
    track("begin_checkout", { value: subtotal, currency, items: itemCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect to /cart if the cart is empty — prevents staying on a stuck
  // checkout page after items are removed in another tab, or when a user
  // navigates here directly without items. Skip the redirect while an order
  // has just been placed (we want the success UI), and during the initial
  // mount before useCart() has hydrated.
  React.useEffect(() => {
    if (typed.length === 0 && !orderInfo && !placing) {
      router.replace("/cart");
    }
  }, [typed.length, orderInfo, placing, router]);

  const selectedRate =
    DEFAULT_SHIPPING_RATES.find((r) => r.id === shippingRateId) ??
    DEFAULT_SHIPPING_RATES[0];
  const shippingCost =
    subtotal >= FREE_SHIPPING_THRESHOLD && shippingRateId === "standard"
      ? 0
      : selectedRate.price;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + shippingCost + tax;
  // Gift cards are stored as cents/minor units on the API. Convert to the
  // major-unit numbers checkout works in. Cap the applied portion at the
  // order total so we never show a balance bigger than the order.
  const giftBalanceMajor = gift ? gift.balance / 100 : 0;
  const giftApplied = Math.min(giftBalanceMajor, total);
  const dueAfterGift = Math.max(0, total - giftApplied);
  const giftCoversAll = gift !== null && giftApplied >= total;

  function updateField<K extends keyof ShippingForm>(key: K, value: ShippingForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validateContact(): boolean {
    const errs: Partial<Record<keyof ShippingForm, string>> = {};
    const emailErr = validateEmail(form.email ?? "");
    if (emailErr) errs.email = emailErr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateShippingStep(): boolean {
    const errors = validateShippingAddress({
      ...form,
      countryCode: form.countryCode?.toUpperCase(),
    });
    const map: Partial<Record<keyof ShippingForm, string>> = {};
    for (const e of errors) {
      map[e.field as keyof ShippingForm] = e.message;
    }
    setFieldErrors(map);
    return errors.length === 0;
  }

  function nextFromContact() {
    if (!validateContact()) return;
    setStep("shipping");
  }

  function nextFromShipping() {
    if (!validateShippingStep()) return;
    track("add_shipping_info", { shipping_tier: shippingRateId });
    setStep("payment");
  }

  async function placeOrder() {
    if (!validateShippingStep()) {
      setStep("shipping");
      return;
    }
    const cartId = typed[0]?.cartId;
    if (!cartId) {
      setError("Your cart is empty");
      return;
    }

    setPlacing(true);
    setError(null);
    try {
      await refreshCart(); // last stock check

      track("add_payment_info", { payment_method: paymentMethod });

      const sessionId =
        typeof window !== "undefined"
          ? localStorage.getItem("cart_session_id") ?? ""
          : "";

      const order = await apiFetch<Order>("/storefront/checkout", {
        method: "POST",
        headers: {
          "X-Session-Id": sessionId,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          cartId,
          shippingAddress: {
            firstName: form.firstName,
            lastName: form.lastName,
            address1: form.address1,
            address2: form.address2 || undefined,
            city: form.city,
            province: form.province,
            country: form.country,
            countryCode: form.countryCode?.toUpperCase(),
            zip: form.zip,
            phone: form.phone || undefined,
          },
          sameAsBilling: true,
          shippingMethod: shippingRateId,
          paymentMethod,
          email: form.email,
          giftCardCode: gift?.code,
        }),
      });

      const giftApplied = (order as Order & {
        giftCardApplied?: { debited: number; currencyCode: string };
        paymentStatus?: string;
      }).giftCardApplied;
      const orderPaymentStatus = (order as Order & {
        paymentStatus?: string;
      }).paymentStatus;

      track("purchase", {
        transaction_id: order.orderNumber,
        value: total / 100,
        currency,
      });

      // If the gift card paid for the entire order, skip the provider redirect
      // and go straight to success — there's nothing left to charge.
      const fullyPaidByGiftCard =
        giftApplied && orderPaymentStatus === "paid";

      // For redirect-based payments, initiate the provider redirect.
      if (
        !fullyPaidByGiftCard &&
        ["esewa", "khalti", "fonepay"].includes(paymentMethod)
      ) {
        try {
          const init = await apiFetch<{ redirectUrl?: string }>(
            "/storefront/payments/initiate",
            {
              method: "POST",
              body: JSON.stringify({ orderId: order.id, provider: paymentMethod }),
            }
          );
          if (init.redirectUrl) {
            window.location.assign(init.redirectUrl);
            return;
          }
        } catch {
          /* fallthrough — show success anyway; user will be emailed */
        }
      }

      setOrderInfo({
        id: order.id,
        orderNumber: order.orderNumber,
        total,
        currency,
        email: form.email ?? "",
        paymentMethod,
        giftCard: giftApplied
          ? {
              debited: giftApplied.debited,
              currencyCode: giftApplied.currencyCode,
            }
          : null,
      });
      await clearCart();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to place order. Please try again.";
      setError(message);
    } finally {
      setPlacing(false);
    }
  }

  if (orderInfo) {
    return (
      <CheckoutSuccess
        info={orderInfo}
        isAuthenticated={Boolean(customer)}
      />
    );
  }

  if (typed.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-muted">
          <ShoppingBag
            className="size-7 text-muted-foreground"
            aria-hidden
          />
        </span>
        <h1
          className="mt-5 text-2xl font-medium tracking-tight sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {brand.emptyStates.cartEmptyTitle}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {brand.emptyStates.cartEmptyDescription}
        </p>
        <Button asChild className="mt-6 h-11 rounded-full px-6 font-semibold">
          <Link href="/products">Browse {brand.productNounPlural}</Link>
        </Button>
      </main>
    );
  }

  return (
    <>
      <section aria-labelledby="checkout-heading">
        <div className="mx-auto flex max-w-8xl flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
          <div>
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Cart", href: "/cart" },
                { label: "Checkout" },
              ]}
            />
            <h1
              id="checkout-heading"
              className="mt-2 text-2xl font-medium tracking-tight sm:text-[1.75rem]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Checkout
            </h1>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lock className="size-3.5" aria-hidden /> Secure SSL checkout
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-8xl px-4 pb-16 pt-2 sm:px-6 sm:pt-3 lg:px-8 lg:pb-20">
      <Link
        href="/cart"
        className="group mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ChevronLeft
          className="size-3.5 transition-transform group-hover:-translate-x-0.5"
          aria-hidden
        />
        Back to cart
      </Link>

      <div className="mb-8 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
        <CheckoutStepper
          steps={STEPS as unknown as CheckoutStep[]}
          currentIndex={currentIndex}
          onSelect={(i) => setStep(STEPS[i].id as Step)}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)] lg:gap-12">
        {/* Left column: active step */}
        <section aria-labelledby="checkout-step-heading" className="flex flex-col gap-6">
          {step === "contact" && (
            <ContactStep
              form={form}
              errors={fieldErrors}
              updateField={updateField}
              onNext={nextFromContact}
              signedIn={Boolean(customer)}
            />
          )}

          {step === "shipping" && (
            <ShippingStep
              form={form}
              errors={fieldErrors}
              updateField={updateField}
              rates={DEFAULT_SHIPPING_RATES}
              selectedRateId={shippingRateId}
              setSelectedRateId={setShippingRateId}
              subtotal={subtotal}
              currency={currency}
              onBack={() => setStep("contact")}
              onNext={nextFromShipping}
            />
          )}

          {step === "payment" && (
            <PaymentStep
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              onBack={() => setStep("shipping")}
              onEditAddress={() => setStep("shipping")}
              onSubmit={placeOrder}
              placing={placing}
              error={error}
              total={total}
              currency={currency}
              shipping={form}
              gift={gift}
              setGift={setGift}
              giftApplied={giftApplied}
              dueAfterGift={dueAfterGift}
              giftCoversAll={giftCoversAll}
            />
          )}
        </section>

        {/* Right column: sticky order summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary
            items={typed}
            currency={currency}
            subtotal={subtotal}
            shipping={shippingCost}
            tax={tax}
            total={total}
            giftApplied={giftApplied}
            dueAfterGift={dueAfterGift}
          />
        </aside>
      </div>
      </main>
    </>
  );
}

// ── Step 1: Contact ────────────────────────────────────────────────────────────

function ContactStep({
  form,
  errors,
  updateField,
  onNext,
  signedIn,
}: {
  form: ShippingForm;
  errors: Partial<Record<keyof ShippingForm, string>>;
  updateField: <K extends keyof ShippingForm>(k: K, v: ShippingForm[K]) => void;
  onNext: () => void;
  signedIn: boolean;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle
          id="checkout-step-heading"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            1
          </span>
          Contact information
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-6">
        {!signedIn && (
          <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/customer/login?next=/checkout"
              className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Sign in
            </Link>{" "}
            for faster checkout.
          </div>
        )}
        <Field
          id="email"
          label="Email"
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          hint="We'll send your receipt and shipping updates here."
          value={form.email ?? ""}
          onChange={(v) => updateField("email", v)}
          error={errors.email}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="firstName"
            label="First name"
            value={form.firstName ?? ""}
            onChange={(v) => updateField("firstName", v)}
            autoComplete="given-name"
          />
          <Field
            id="lastName"
            label="Last name"
            value={form.lastName ?? ""}
            onChange={(v) => updateField("lastName", v)}
            autoComplete="family-name"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Button
            onClick={onNext}
            className="h-11 rounded-full px-6 font-semibold"
          >
            Continue to shipping
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 2: Shipping ──────────────────────────────────────────────────────────

function ShippingStep({
  form,
  errors,
  updateField,
  rates,
  selectedRateId,
  setSelectedRateId,
  subtotal,
  currency,
  onBack,
  onNext,
}: {
  form: ShippingForm;
  errors: Partial<Record<keyof ShippingForm, string>>;
  updateField: <K extends keyof ShippingForm>(k: K, v: ShippingForm[K]) => void;
  rates: ShippingRate[];
  selectedRateId: string;
  setSelectedRateId: (id: string) => void;
  subtotal: number;
  currency: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle
            id="checkout-step-heading"
            className="flex items-center gap-2 text-base font-semibold"
          >
            <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <MapPin className="size-4" aria-hidden /> Shipping address
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Field
            id="address1"
            label="Street address"
            required
            value={form.address1 ?? ""}
            onChange={(v) => updateField("address1", v)}
            error={errors.address1}
            autoComplete="address-line1"
          />
          <Field
            id="address2"
            label="Apt, suite, etc."
            value={form.address2 ?? ""}
            onChange={(v) => updateField("address2", v)}
            autoComplete="address-line2"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="city"
              label="City"
              required
              value={form.city ?? ""}
              onChange={(v) => updateField("city", v)}
              error={errors.city}
              autoComplete="address-level2"
            />
            <Field
              id="province"
              label="State / Province"
              value={form.province ?? ""}
              onChange={(v) => updateField("province", v)}
              error={errors.province}
              autoComplete="address-level1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1.4fr]">
            <Field
              id="country"
              label="Country"
              required
              value={form.country ?? ""}
              onChange={(v) => updateField("country", v)}
              error={errors.country}
              autoComplete="country-name"
            />
            <Field
              id="countryCode"
              label="Code"
              required
              maxLength={2}
              value={form.countryCode ?? ""}
              onChange={(v) => updateField("countryCode", v.toUpperCase())}
              error={errors.countryCode}
              autoComplete="country"
            />
            <Field
              id="zip"
              label="ZIP / Postal"
              required
              value={form.zip ?? ""}
              onChange={(v) => updateField("zip", v)}
              error={errors.zip}
              autoComplete="postal-code"
            />
          </div>
          <Field
            id="phone"
            label="Phone"
            hint="Optional — used for delivery updates."
            type="tel"
            value={form.phone ?? ""}
            onChange={(v) => updateField("phone", v)}
            error={errors.phone}
            autoComplete="tel"
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Truck className="size-4" aria-hidden /> Shipping method
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <RadioGroup
            value={selectedRateId}
            onValueChange={setSelectedRateId}
            className="gap-3"
          >
            {rates.map((rate) => {
              const effectivePrice =
                rate.id === "standard" && subtotal >= FREE_SHIPPING_THRESHOLD
                  ? 0
                  : rate.price;
              const isSelected = selectedRateId === rate.id;
              return (
                <label
                  key={rate.id}
                  htmlFor={`rate-${rate.id}`}
                  className={cn(
                    "group flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition-all focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-foreground/30 hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem
                      value={rate.id}
                      id={`rate-${rate.id}`}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold">{rate.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {rate.etaLabel}
                        {rate.description ? ` · ${rate.description}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular",
                      effectivePrice === 0 && "text-accent-foreground"
                    )}
                  >
                    {effectivePrice === 0
                      ? "Free"
                      : formatPrice(effectivePrice, currency)}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-11 rounded-full px-5"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          className="h-11 rounded-full px-6 font-semibold"
        >
          Continue to payment
        </Button>
      </div>
    </>
  );
}

// ── Gift card apply box ──────────────────────────────────────────────────────

function GiftCardCard({
  gift,
  setGift,
  giftApplied,
  currency,
}: {
  gift: { code: string; balance: number; currencyCode: string } | null;
  setGift: (
    g: { code: string; balance: number; currencyCode: string } | null
  ) => void;
  giftApplied: number;
  currency: string;
}) {
  const [code, setCode] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || applying) return;
    setApplying(true);
    setError(null);
    try {
      const res = await apiFetch<{
        code: string;
        balance: number;
        currencyCode: string;
        status: string;
        expiresAt: string | null;
      } | null>("/storefront/gift-cards/lookup", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res) {
        setError("That code doesn't match any active gift card.");
        return;
      }
      if (res.status !== "active") {
        setError(`This gift card is ${res.status}.`);
        return;
      }
      if (res.expiresAt && new Date(res.expiresAt) < new Date()) {
        setError("This gift card has expired.");
        return;
      }
      if (res.balance <= 0) {
        setError("This gift card has no remaining balance.");
        return;
      }
      setGift({
        code: res.code,
        balance: res.balance,
        currencyCode: res.currencyCode,
      });
      setCode("");
    } catch (err: unknown) {
      const e = err as { statusCode?: number; body?: { title?: string }; message?: string };
      if (e?.statusCode === 404) {
        setError("That code doesn't match any active gift card.");
      } else if (e?.body?.title) {
        setError(e.body.title);
      } else if (e?.message && e.message !== "API error") {
        setError(e.message);
      } else {
        setError("Could not apply code. Please try again.");
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Gift className="size-4" aria-hidden /> Gift card
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {gift ? (
          <div
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30"
            role="status"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Gift card {gift.code} applied
              </p>
              <p className="mt-0.5 text-xs text-emerald-900/80 dark:text-emerald-200/80">
                {formatPrice(giftApplied, currency)} off this order ·{" "}
                {formatPrice(gift.balance / 100, gift.currencyCode)} balance
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setGift(null)}
              className="h-9 rounded-full px-3 text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
            >
              <X className="size-3.5" aria-hidden />
              Remove
            </Button>
          </div>
        ) : (
          <form onSubmit={handleApply} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter gift card code"
                maxLength={64}
                autoComplete="off"
                className="h-11 flex-1 rounded-xl uppercase tracking-wider"
              />
              <Button
                type="submit"
                disabled={!code.trim() || applying}
                className="h-11 rounded-full px-5 font-semibold"
              >
                {applying ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Gift cards stack with other payment methods if the balance is
              less than your total.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ── Step 3: Payment ──────────────────────────────────────────────────────────

function PaymentStep({
  paymentMethod,
  setPaymentMethod,
  onBack,
  onEditAddress,
  onSubmit,
  placing,
  error,
  total,
  currency,
  shipping,
  gift,
  setGift,
  giftApplied,
  dueAfterGift,
  giftCoversAll,
}: {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  onBack: () => void;
  onEditAddress: () => void;
  onSubmit: () => void;
  placing: boolean;
  error: string | null;
  total: number;
  currency: string;
  shipping: ShippingForm;
  gift: { code: string; balance: number; currencyCode: string } | null;
  setGift: (
    g: { code: string; balance: number; currencyCode: string } | null
  ) => void;
  giftApplied: number;
  dueAfterGift: number;
  giftCoversAll: boolean;
}) {
  const recipientName = [shipping.firstName, shipping.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const addressLine2 = [shipping.city, shipping.province, shipping.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Truck className="size-4 text-muted-foreground" aria-hidden />
            Shipping to
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEditAddress}
            className="h-8 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-1 py-4 text-sm">
          {recipientName ? (
            <p className="font-semibold text-foreground">{recipientName}</p>
          ) : null}
          {shipping.address1 ? <p className="text-muted-foreground">{shipping.address1}</p> : null}
          {shipping.address2 ? <p className="text-muted-foreground">{shipping.address2}</p> : null}
          {addressLine2 ? <p className="text-muted-foreground">{addressLine2}</p> : null}
          {shipping.country ? <p className="text-muted-foreground">{shipping.country}</p> : null}
          {shipping.email ? (
            <p className="pt-1 text-xs text-muted-foreground">{shipping.email}</p>
          ) : null}
        </CardContent>
      </Card>

      <GiftCardCard
        gift={gift}
        setGift={setGift}
        giftApplied={giftApplied}
        currency={currency}
      />

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle
            id="checkout-step-heading"
            className="flex items-center gap-2 text-base font-semibold"
          >
            <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <CreditCard className="size-4" aria-hidden /> Payment method
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {giftCoversAll ? (
            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              Your gift card covers the full order — no other payment method
              needed.
            </div>
          ) : (
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            className="gap-3"
          >
            {PAYMENT_METHODS.map((m) => {
              const isSelected = paymentMethod === m.id;
              return (
                <label
                  key={m.id}
                  htmlFor={`pm-${m.id}`}
                  className={cn(
                    "group flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-foreground/30 hover:bg-muted/40"
                  )}
                >
                  <RadioGroupItem value={m.id} id={`pm-${m.id}`} />
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-lg transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {m.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
          )}
        </CardContent>
      </Card>

      <div
        className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30"
        role="note"
      >
        <ShieldCheck
          className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200">
          <span className="font-semibold">Buyer protection included.</span>{" "}
          You&apos;re covered from click to delivery — full refund if it&apos;s
          not as described.
        </p>
      </div>

      {error && (
        <div
          className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <span aria-hidden>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 rounded-full px-5"
        >
          Back
        </Button>
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={placing}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-semibold sm:flex-initial sm:min-w-[240px]"
        >
          {placing ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>Placing order…</span>
            </>
          ) : giftCoversAll ? (
            <>
              <Lock className="size-4" aria-hidden />
              Place order
            </>
          ) : (
            <>
              <Lock className="size-4" aria-hidden />
              Pay {formatPrice(dueAfterGift, currency)}
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        By placing your order you agree to our{" "}
        <Link
          href="/pages/terms"
          className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/pages/privacy"
          className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}

// ── Order summary ────────────────────────────────────────────────────────────

function OrderSummary({
  items,
  currency,
  subtotal,
  shipping,
  tax,
  total,
  giftApplied,
  dueAfterGift,
}: {
  items: CartItemDetail[];
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  giftApplied: number;
  dueAfterGift: number;
}) {
  return (
    <section
      aria-label="Order summary"
      className="rounded-3xl bg-cream p-6 sm:p-7"
    >
      <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
        <span aria-hidden className="h-px w-6 bg-primary/60" />
        Order summary
      </p>
      <h2
        className="mt-2 text-2xl font-medium tracking-tight text-cream-foreground sm:text-[1.6rem]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Review &amp; pay
      </h2>

      <ul className="mt-5 divide-y divide-cream-foreground/10">
        {items.map((item) => {
          const img = item.product?.featuredImage?.url;
          const title = item.title ?? item.product?.title ?? "Item";
          const price = toNumber(item.unitPrice);
          const lineTotal =
            toNumber(item.lineTotal) || price * item.quantity;
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-background/70 ring-1 ring-cream-foreground/10">
                {img ? (
                  <Image
                    src={img}
                    alt={item.product?.featuredImage?.altText ?? title}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
                <span
                  aria-label={`Quantity ${item.quantity}`}
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background ring-2 ring-cream"
                >
                  {item.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="line-clamp-2 text-sm font-semibold leading-snug text-cream-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {title}
                </p>
                <p className="mt-0.5 text-xs tabular text-cream-foreground/65">
                  {formatPrice(price, currency)} × {item.quantity}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular text-cream-foreground">
                {formatPrice(lineTotal, currency)}
              </span>
            </li>
          );
        })}
      </ul>

      <Separator className="my-5 bg-cream-foreground/10" />

      <dl className="flex flex-col gap-2 text-sm">
        <Row label="Subtotal" value={formatPrice(subtotal, currency)} />
        <Row
          label="Shipping"
          value={shipping === 0 ? "Free" : formatPrice(shipping, currency)}
          highlight={shipping === 0}
        />
        <Row label="Tax (est.)" value={formatPrice(tax, currency)} />
        {giftApplied > 0 && (
          <Row
            label="Gift card"
            value={`− ${formatPrice(giftApplied, currency)}`}
            highlight
          />
        )}
      </dl>

      <Separator className="my-5 bg-cream-foreground/10" />

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-cream-foreground/80">
          {giftApplied > 0 ? "Due now" : "Total"}
        </span>
        <span
          className="text-3xl font-medium tabular text-cream-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {formatPrice(giftApplied > 0 ? dueAfterGift : total, currency)}
        </span>
      </div>
      {giftApplied > 0 && (
        <p className="mt-1 text-right text-xs text-cream-foreground/65">
          {formatPrice(total, currency)} total ·{" "}
          {formatPrice(giftApplied, currency)} paid with gift card
        </p>
      )}

      <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-cream-foreground/65">
        <Lock className="size-3" aria-hidden />
        256-bit SSL · Buyer protection · 30-day returns
      </p>
    </section>
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
      <dt className="text-cream-foreground/75">{label}</dt>
      <dd
        className={cn(
          "tabular",
          highlight
            ? "font-semibold text-accent-foreground"
            : "font-medium text-cream-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

// ── Success ──────────────────────────────────────────────────────────────────

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  stripe: "Credit / debit card",
  esewa: "eSewa",
  khalti: "Khalti",
  fonepay: "Fonepay",
  cod: "Cash on delivery",
};

function CheckoutSuccess({
  info,
  isAuthenticated,
}: {
  info: {
    id: string;
    orderNumber: string;
    total: number;
    currency: string;
    email: string;
    paymentMethod: PaymentMethod;
    giftCard?: { debited: number; currencyCode: string } | null;
  };
  isAuthenticated: boolean;
}) {
  const eta = React.useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() + 5);
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(start)} — ${fmt(end)}`;
  }, []);

  return (
    <main
      className="mx-auto max-w-2xl px-4 pb-20 pt-10 sm:pt-14"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <span className="relative grid size-20 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 ring-8 ring-emerald-50/60 dark:from-emerald-950/60 dark:to-emerald-950/30 dark:ring-emerald-950/30">
          <CheckCircle2
            className="size-10 text-emerald-600 dark:text-emerald-400"
            aria-hidden
            strokeWidth={2.25}
          />
          <span
            aria-hidden
            className="absolute inset-0 -m-2 animate-ping rounded-full bg-emerald-500/15"
          />
        </span>
        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          Order confirmed
        </span>
        <h1
          className="mt-4 text-3xl font-medium tracking-tight sm:text-[2.1rem]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Thank you, your order is on its way
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          We&apos;ve sent a confirmation to{" "}
          <span className="font-medium text-foreground">{info.email}</span>.
          Track this order anytime from your account.
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/40 shadow-sm">
        <dl className="grid divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="flex flex-col gap-1 px-5 py-4 sm:px-6 sm:py-5">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Order number
            </dt>
            <dd className="text-base font-semibold tabular">
              #{info.orderNumber}
            </dd>
          </div>
          <div className="flex flex-col gap-1 px-5 py-4 sm:px-6 sm:py-5 sm:text-right">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Order total
            </dt>
            <dd className="text-base font-semibold tabular">
              {formatPrice(info.total, info.currency)}
            </dd>
          </div>
        </dl>
        <div className="grid gap-3 border-t border-border/60 bg-muted/20 px-5 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
          <div className="flex items-start gap-2.5">
            <Truck
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Estimated delivery
              </p>
              <p className="mt-0.5 text-sm font-medium">{eta}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 sm:justify-end">
            <CreditCard
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Payment
              </p>
              <p className="mt-0.5 text-sm font-medium capitalize">
                {info.giftCard
                  ? `Gift card · ${PAYMENT_LABELS[info.paymentMethod] ?? info.paymentMethod}`
                  : (PAYMENT_LABELS[info.paymentMethod] ?? info.paymentMethod)}
              </p>
              {info.giftCard && info.giftCard.debited > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatPrice(info.giftCard.debited / 100, info.giftCard.currencyCode)}{" "}
                  paid with gift card
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-full px-6 font-medium"
        >
          <Link href="/products">Continue shopping</Link>
        </Button>
        {isAuthenticated ? (
          <Button asChild className="h-11 rounded-full px-6 font-semibold">
            <Link href={`/customer/orders/${info.id}`}>View order details</Link>
          </Button>
        ) : (
          <Button asChild className="h-11 rounded-full px-6 font-semibold">
            <Link
              href={`/customer/register?email=${encodeURIComponent(info.email)}&next=${encodeURIComponent(`/customer/orders/${info.id}`)}`}
            >
              Create account to track
            </Link>
          </Button>
        )}
      </div>

      {!isAuthenticated && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can also{" "}
          <Link
            href={`/customer/login?next=${encodeURIComponent(`/customer/orders/${info.id}`)}`}
            className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            sign in
          </Link>{" "}
          if you already have an account.
        </p>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Questions about your order?{" "}
        <Link
          href="/help"
          className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Contact support
        </Link>
      </p>
    </main>
  );
}

// ── Inputs ───────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  value,
  onChange,
  required,
  error,
  hint,
  type = "text",
  inputMode,
  maxLength,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  autoComplete?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {label}
        {required && (
          <span aria-label="required" className="text-destructive">
            *
          </span>
        )}
      </label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          "h-11 rounded-xl",
          error && "border-destructive focus-visible:ring-destructive"
        )}
      />
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
