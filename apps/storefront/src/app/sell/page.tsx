import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  LayoutDashboard,
  Package,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { brand } from "@/config/brand";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173";

const TITLE = `Sell on ${brand.shortName}`;
const DESCRIPTION = `Reach more shoppers, manage your inventory, and grow your independent business on ${brand.shortName}. Open your store in minutes — no listing fees.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/sell` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/sell`,
    type: "website",
  },
  twitter: {
    title: TITLE,
    description: DESCRIPTION,
    card: "summary_large_image",
  },
};

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Reach more shoppers",
    desc: `Get discovered by ${brand.shortName} customers actively searching for what you sell.`,
  },
  {
    icon: LayoutDashboard,
    title: "All-in-one dashboard",
    desc: "Inventory, orders, fulfillment, payouts and analytics in one place.",
  },
  {
    icon: CreditCard,
    title: "Get paid on time",
    desc: "Automated payouts on a regular schedule, no chasing invoices.",
  },
  {
    icon: Shield,
    title: "Trusted & supported",
    desc: "Buyer protection, dispute support, and a dedicated seller team.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Apply",
    desc: "Tell us about your store — name, contact, and a short bio. Takes about 2 minutes.",
  },
  {
    num: "02",
    title: "Set up your storefront",
    desc: "Upload a logo and banner, list your first products, and customize your store page.",
  },
  {
    num: "03",
    title: "Start selling",
    desc: "Once approved, your store goes live. Track orders, ship items, and get paid.",
  },
];

const FAQ = [
  {
    q: "How much does it cost?",
    a: `${brand.shortName} doesn't charge a listing fee. We take a small commission on each sale to cover payments and platform costs — full breakdown is shown when you complete your application.`,
  },
  {
    q: "How long does approval take?",
    a: "Most applications are reviewed within 1–3 business days. You'll get an email as soon as your store is approved.",
  },
  {
    q: "Do I need a business registration?",
    a: "Not to apply — but you'll need to provide tax information before your first payout. We support sole traders and registered businesses alike.",
  },
  {
    q: "Can I bring my existing catalog?",
    a: "Yes. After approval you can bulk-import products via CSV, or create them one-by-one in the dashboard.",
  },
];

export default function SellPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/sell`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Sell",
          item: `${SITE_URL}/sell`,
        },
      ],
    },
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="sell-hero-heading"
        className="relative overflow-hidden bg-gradient-to-b from-cream to-background"
      >
        <div className="absolute inset-0 -z-10 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,_currentColor_1px,_transparent_0)] [background-size:24px_24px] text-cream-foreground" />

        <div className="mx-auto grid max-w-8xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3" aria-hidden />
              For makers & ateliers
            </span>
            <h1
              id="sell-hero-heading"
              className="mt-5 text-4xl font-bold tracking-tight text-cream-foreground sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sell on {brand.shortName}.
              <br />
              Grow your craft.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-cream-foreground/75 sm:text-lg">
              Reach a curated audience of shoppers who care about quality and
              story. Our team helps you set up your storefront, ship orders, and
              get paid — so you can focus on making.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sell/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Apply to sell
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href={`${ADMIN_URL}/login`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                I already have an account
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-3.5 text-emerald-600" aria-hidden />
                No listing fees
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-3.5 text-emerald-600" aria-hidden />
                Approved in 1–3 days
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-3.5 text-emerald-600" aria-hidden />
                Cancel anytime
              </span>
            </div>
          </div>

          {/* Visual — abstract dashboard preview */}
          <div className="relative" aria-hidden>
            <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-emerald-900/5">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-rose-400" />
                  <div className="size-2 rounded-full bg-amber-400" />
                  <div className="size-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  vendor dashboard
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                    Today
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-900">
                    $1,284
                  </p>
                </div>
                <div className="rounded-xl bg-violet-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-700">
                    Orders
                  </p>
                  <p className="mt-1 text-lg font-bold text-violet-900">14</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">
                    Items
                  </p>
                  <p className="mt-1 text-lg font-bold text-amber-900">42</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold">Sales last 7 days</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    +24%
                  </span>
                </div>
                <div className="flex h-20 items-end gap-1.5">
                  {[40, 55, 32, 78, 65, 90, 72].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-primary"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              <ul className="mt-6 space-y-2">
                {[
                  { label: "Order #2841", amount: "$248" },
                  { label: "Order #2840", amount: "$96" },
                  { label: "Order #2839", amount: "$184" },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Package
                        className="size-3.5 text-muted-foreground"
                        aria-hidden
                      />
                      {row.label}
                    </span>
                    <span className="font-semibold tabular">{row.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="benefits-heading"
        className="mx-auto max-w-8xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mb-12 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Why {brand.shortName}
          </span>
          <h2
            id="benefits-heading"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Everything you need to grow
          </h2>
        </div>
        <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Steps ─────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="steps-heading"
        className="bg-cream py-20"
      >
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              How it works
            </span>
            <h2
              id="steps-heading"
              className="mt-2 text-3xl font-bold tracking-tight text-cream-foreground sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              From application to first sale
            </h2>
          </div>

          <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map(({ num, title, desc }) => (
              <li
                key={num}
                className="relative rounded-2xl bg-background p-6 shadow-sm"
              >
                <span
                  className="absolute -top-4 left-6 inline-flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow"
                  aria-hidden
                >
                  {num}
                </span>
                <h3
                  className="mt-4 text-lg font-bold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="faq-heading"
        className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mb-10 text-center">
          <h2
            id="faq-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Frequently asked
          </h2>
        </div>
        <ul role="list" className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <li
              key={q}
              className="rounded-2xl border bg-card p-1 shadow-sm"
            >
              <details className="group rounded-2xl">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span>{q}</span>
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full border text-muted-foreground transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                  {a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready to open your store?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-primary-foreground/80">
            Apply in 2 minutes. No listing fees, no commitments.
          </p>
          <Link
            href="/sell/register"
            className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            Apply to sell
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}
