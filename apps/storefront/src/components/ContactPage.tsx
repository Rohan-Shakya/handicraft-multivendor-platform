"use client";

import {
  ArrowUpRight,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TOPICS = [
  "General enquiry",
  "Order or shipping",
  "Custom commission",
  "Trade & wholesale",
  "Press & partnerships",
] as const;

const QUICK_FAQ = [
  {
    q: "How long does shipping take?",
    a: "Domestic Nepal orders ship within 24 hours and arrive in 2–4 business days. Worldwide is 5–10 days via DHL/FedEx Express, fully tracked.",
  },
  {
    q: "Can I return a sculpture if it doesn't suit my space?",
    a: "Yes — 30 days, in unused condition. We arrange return pickup inside Nepal, no questions asked.",
  },
  {
    q: "Do you do custom commissions?",
    a: "Many of our foundries and workshops cast or carve to order. Mention the piece you have in mind and we'll send options.",
  },
] as const;

/** Minimum length we accept for the message body. */
const MIN_MESSAGE = 10;

type FieldName =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "topic"
  | "message";

type FieldErrors = Partial<Record<FieldName, string>>;

interface FormState {
  status: "idle" | "submitting" | "success" | "error";
  message?: string;
  errors: FieldErrors;
}

const INITIAL_STATE: FormState = { status: "idle", errors: {} };

function validate(formData: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (firstName.length < 1) errors.firstName = "Please enter your first name.";
  if (lastName.length < 1) errors.lastName = "Please enter your last name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Please enter a valid email address.";
  if (message.length < MIN_MESSAGE)
    errors.message = `Please write at least ${MIN_MESSAGE} characters.`;

  return errors;
}

export function ContactPage() {
  const [state, setState] = React.useState<FormState>(INITIAL_STATE);
  const formRef = React.useRef<HTMLFormElement>(null);
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.status === "submitting") return;

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot — bots happily fill this; humans never see it.
    if (String(data.get("website") ?? "").length > 0) {
      // Pretend it worked, drop on the floor.
      setState({ status: "success", errors: {} });
      form.reset();
      return;
    }

    const errors = validate(data);
    if (Object.keys(errors).length > 0) {
      setState({ status: "error", errors });
      // Pull focus to the error summary for SR users.
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    setState({ status: "submitting", errors: {} });

    try {
      // Production swap: call your `/api/contact` endpoint or a Server Action.
      // The shape below intentionally matches what a Server Action would expect.
      // const res = await fetch("/api/contact", { method: "POST", body: data });
      // if (!res.ok) throw new Error(await res.text());
      await new Promise((r) => setTimeout(r, 700));

      setState({ status: "success", errors: {} });
      toast({
        title: "Message sent",
        description: brand.contact.supportHoursLabel,
      });
      form.reset();
    } catch (err) {
      setState({
        status: "error",
        errors: {},
        message:
          err instanceof Error
            ? err.message
            : "We couldn't send that just now. Please try again or email us directly.",
      });
    }
  }

  const isSubmitting = state.status === "submitting";
  const showSuccess = state.status === "success";
  const errorList = Object.entries(state.errors) as Array<[FieldName, string]>;
  const hasErrors = errorList.length > 0;

  const QUICK_INFO = [
    {
      icon: Phone,
      label: "Phone",
      value: brand.contact.phoneDisplay,
      href: `tel:${brand.contact.phone}`,
      external: false,
    },
    {
      icon: Mail,
      label: "Email",
      value: brand.contact.email,
      href: `mailto:${brand.contact.email}`,
      external: false,
    },
    {
      icon: MapPin,
      label: "Showroom",
      value: `${brand.contact.address.streetAddress}, ${brand.contact.address.addressLocality}`,
      sub: `Open ${brand.contact.hours[0]?.days.split(" — ")[0] ?? "weekdays"}`,
      href: `https://maps.google.com/?q=${encodeURIComponent(
        brand.contact.address.mapsQuery
      )}`,
      external: true,
    },
  ] as const;

  return (
    <>
      {/* JSON-LD: ContactPage + LocalBusiness + FAQPage. Search engines pick
          up phone, email, address, hours, and FAQs from a single page render. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "ContactPage",
                name: `Contact — ${brand.name}`,
                url: "/pages/contact",
              },
              {
                "@type": ["Organization", "LocalBusiness"],
                name: brand.name,
                email: brand.contact.email,
                telephone: brand.contact.phone,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: brand.contact.address.streetAddress,
                  postalCode: brand.contact.address.postalCode,
                  addressLocality: brand.contact.address.addressLocality,
                  addressRegion: brand.contact.address.addressRegion,
                  addressCountry: brand.contact.address.addressCountry,
                },
                openingHours: brand.contact.hours
                  .filter((h) => h.time.toLowerCase() !== "closed")
                  .map((h) => `${h.days} ${h.time}`),
                contactPoint: {
                  "@type": "ContactPoint",
                  telephone: brand.contact.phone,
                  email: brand.contact.email,
                  contactType: "Customer support",
                  availableLanguage: ["en", "de"],
                },
              },
              {
                "@type": "FAQPage",
                mainEntity: QUICK_FAQ.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
            ],
          }),
        }}
      />

      {/* ── Form + sidebar ───────────────────────────────────────── */}
      <section
        className="pb-20 pt-16 sm:pt-20 lg:pb-24 lg:pt-24"
        aria-labelledby="contact-heading"
      >
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
            {/* Form */}
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-primary"
                />
                Contact
              </p>
              <h1
                id="contact-heading"
                className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.01em] sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Send a message.
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                A few sentences and our team will reply within one business
                day.
              </p>
              <div className="mt-8" />

              {showSuccess && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm"
                >
                  <p className="font-semibold text-foreground">
                    Thanks — your message is on its way.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {brand.contact.supportHoursLabel}. We&apos;ve also sent you
                    a copy by email.
                  </p>
                </div>
              )}

              {hasErrors && (
                <div
                  ref={errorSummaryRef}
                  tabIndex={-1}
                  role="alert"
                  aria-labelledby="contact-error-heading"
                  className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
                >
                  <p
                    id="contact-error-heading"
                    className="font-semibold text-destructive"
                  >
                    Please review {errorList.length}{" "}
                    {errorList.length === 1 ? "field" : "fields"} below.
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive/90">
                    {errorList.map(([key, msg]) => (
                      <li key={key}>
                        <a
                          href={`#contact-${key}`}
                          className="underline underline-offset-2 hover:no-underline"
                        >
                          {msg}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {state.message && (
                <div
                  role="alert"
                  className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
                >
                  {state.message}
                </div>
              )}

              <form
                ref={formRef}
                onSubmit={handleSubmit}
                aria-busy={isSubmitting}
                noValidate
                className="grid grid-cols-1 gap-5 sm:grid-cols-2"
              >
                {/* Honeypot — visually & a11y hidden, never autofocus. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden opacity-0"
                >
                  <label htmlFor="contact-website">Website (leave blank)</label>
                  <input
                    type="text"
                    id="contact-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <Field
                  name="firstName"
                  label="First name"
                  autoComplete="given-name"
                  placeholder="Jane"
                  required
                  error={state.errors.firstName}
                />
                <Field
                  name="lastName"
                  label="Last name"
                  autoComplete="family-name"
                  placeholder="Doe"
                  required
                  error={state.errors.lastName}
                />
                <Field
                  name="email"
                  type="email"
                  label="Email address"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                  error={state.errors.email}
                  className="sm:col-span-2"
                />
                <Field
                  name="phone"
                  type="tel"
                  label="Phone"
                  optional
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+49 …"
                  className="sm:col-span-2"
                />

                <div className="sm:col-span-2">
                  <label
                    htmlFor="contact-topic"
                    className="block text-sm font-medium"
                  >
                    Topic
                  </label>
                  <select
                    id="contact-topic"
                    name="topic"
                    defaultValue={TOPICS[0]}
                    className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-medium"
                  >
                    Message{" "}
                    <span aria-hidden className="text-destructive">
                      *
                    </span>
                    <span className="sr-only">required</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    placeholder="Tell us what you're looking for…"
                    required
                    aria-required="true"
                    aria-invalid={!!state.errors.message}
                    aria-describedby={
                      state.errors.message
                        ? "contact-message-error"
                        : "contact-message-hint"
                    }
                    className={cn(
                      "mt-2 w-full rounded-2xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2",
                      state.errors.message
                        ? "border-destructive focus:ring-destructive"
                        : "border-input focus:ring-ring"
                    )}
                  />
                  {state.errors.message ? (
                    <p
                      id="contact-message-error"
                      className="mt-2 text-xs text-destructive"
                    >
                      {state.errors.message}
                    </p>
                  ) : (
                    <p
                      id="contact-message-hint"
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      A few sentences is plenty — include sizes, room photos, or
                      links if you have them.
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-start gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground sm:max-w-xs">
                    By sending this form you agree to our{" "}
                    <Link
                      href="/pages/privacy"
                      className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                    >
                      privacy policy
                    </Link>
                    .
                  </p>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="rounded-full px-8 sm:min-w-[180px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2
                          className="size-4 animate-spin"
                          aria-hidden
                        />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        Send message
                        <ArrowUpRight className="ml-1 size-4" aria-hidden />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Sidebar */}
            <aside
              aria-label="Other ways to reach us"
              className="flex flex-col gap-6"
            >
              {/* Contact details */}
              <div className="rounded-3xl border bg-card p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Reach us directly
                </p>
                <h3
                  className="mt-2 text-xl font-medium tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Contact details
                </h3>
                <ul className="mt-5 flex flex-col divide-y">
                  {QUICK_INFO.map((item) => (
                    <li key={item.label} className="py-3.5 first:pt-0 last:pb-0">
                      <a
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        className="group flex items-start gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <item.icon className="size-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                            {item.value}
                          </p>
                          {"sub" in item && item.sub && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.sub}
                            </p>
                          )}
                        </div>
                        <ArrowUpRight
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                          aria-hidden
                        />
                        {item.external && (
                          <span className="sr-only">(opens in a new tab)</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hours */}
              <div className="rounded-3xl border bg-card p-7">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Clock className="size-5" aria-hidden />
                  </div>
                  <h3
                    className="text-xl font-medium tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Opening hours
                  </h3>
                </div>
                <dl className="mt-5 divide-y text-sm">
                  {brand.contact.hours.map((row) => (
                    <div
                      key={row.days}
                      className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                    >
                      <dt className="text-muted-foreground">{row.days}</dt>
                      <dd className="font-medium tracking-tight tabular">
                        {row.time}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Quick FAQ */}
              <div className="rounded-3xl border bg-card p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Before you write
                </p>
                <h3
                  className="mt-2 text-xl font-medium tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Frequently asked
                </h3>
                <div className="mt-5 flex flex-col divide-y">
                  {QUICK_FAQ.map((q) => (
                    <details
                      key={q.q}
                      className="group py-3.5 first:pt-0 last:pb-0"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded text-sm font-medium tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {q.q}
                        <span
                          aria-hidden
                          className="grid size-7 shrink-0 place-items-center rounded-full border text-muted-foreground transition-colors group-open:border-primary group-open:bg-primary group-open:text-primary-foreground"
                        >
                          <span className="block transition-transform group-open:rotate-45">
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                        {q.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────── */}
      <section
        className="border-t bg-secondary/40 py-14"
        aria-label="Customer guarantees"
      >
        <div className="mx-auto grid max-w-8xl gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            {
              title: "Buyer protection",
              copy: "Every order covered click-to-doorstep. Full refund if it isn't as described.",
            },
            {
              title: "Free worldwide shipping",
              copy: "On orders over Rs 1,00,000. Express options at checkout, every order tracked.",
            },
            {
              title: "30-day returns",
              copy: "Take it home, live with it, decide later. We pay return shipping in the EU.",
            },
          ].map((b) => (
            <div key={b.title}>
              <h3
                className="text-lg font-medium tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {b.copy}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

interface FieldProps {
  name: FieldName;
  label: string;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  className?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel";
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
  optional,
  error,
  className,
  autoComplete,
  inputMode,
}: FieldProps) {
  const id = `contact-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className={className ?? ""}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && (
          <>
            <span aria-hidden className="text-destructive">
              {" "}
              *
            </span>
            <span className="sr-only"> required</span>
          </>
        )}
        {optional && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </label>
      <Input
        id={id}
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-required={required ? "true" : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "mt-2 rounded-2xl",
          error && "border-destructive focus-visible:ring-destructive"
        )}
      />
      {error && (
        <p id={errorId} className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
