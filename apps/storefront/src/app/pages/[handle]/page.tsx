import type { Page } from "@repo/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AboutPage } from "@/components/AboutPage";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ContactPage } from "@/components/ContactPage";
import { FaqPage } from "@/components/FaqPage";
import { PolicyPage } from "@/components/PolicyPage";
import { SafeHtml } from "@/components/SafeHtml";
import { brand } from "@/config/brand";
import { FAQ_CATEGORIES } from "@/data/faq";
import { POLICIES, type PolicyKind } from "@/data/policies";
import { apiFetch } from "@/lib/api";

// CMS pages are essentially static (legal copy, about, etc.). Cache for
// 10 minutes; on-demand invalidation via the `page:<handle>` tag.
export const revalidate = 600;

/**
 * Hand-built pages (about, contact, faq, terms, privacy, returns, payment,
 * cookie-policy, accessibility, shipping) ship with hard-coded copy in their
 * components, but the *metadata* (SEO title/description/keywords/canonical
 * and the OG image) can be overridden from the admin CMS. This helper
 * fetches the CMS row for a handle and returns a partial Metadata patch
 * to be merged on top of the page's hard-coded defaults. Returns null when
 * no row exists or the API is unreachable — callers fall back to defaults.
 */
async function fetchCmsSeoOverride(
  handle: string,
  url: string
): Promise<Partial<Metadata> | null> {
  const res = await apiFetch<{ page?: Page } | Page>(
    `/storefront/pages/${handle}`,
    { revalidate: 600, tags: [`page:${handle}`] }
  ).catch(() => null);
  if (!res) return null;
  const page = (res as { page?: Page }).page ?? (res as Page);
  if (!page || typeof page !== "object" || !("handle" in page)) return null;

  const overrides: Partial<Metadata> = {};
  const og: Record<string, unknown> = {};
  const tw: Record<string, unknown> = {};

  if (page.seoTitle) {
    overrides.title = { absolute: page.seoTitle };
    og.title = page.seoTitle;
    tw.title = page.seoTitle;
  }
  if (page.seoDescription) {
    overrides.description = page.seoDescription;
    og.description = page.seoDescription;
    tw.description = page.seoDescription;
  }
  if (page.seoKeywords) {
    overrides.keywords = page.seoKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }
  if (page.seoCanonicalUrl || url) {
    overrides.alternates = {
      canonical: page.seoCanonicalUrl || url,
    };
  }
  if (page.ogImage?.url) {
    og.images = [{ url: page.ogImage.url }];
    tw.images = [page.ogImage.url];
  }
  if (Object.keys(og).length) {
    overrides.openGraph = {
      type: "website",
      url,
      siteName: brand.shortName,
      ...og,
    };
  }
  if (Object.keys(tw).length) {
    overrides.twitter = {
      card: "summary_large_image",
      ...tw,
    };
  }
  return overrides;
}

/**
 * Merge an override patch on top of base metadata. Top-level keys win;
 * nested openGraph/twitter/alternates objects are shallow-merged so the
 * override only replaces the keys it explicitly sets.
 */
function mergeMetadata(base: Metadata, patch: Partial<Metadata> | null): Metadata {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    openGraph: { ...(base.openGraph ?? {}), ...(patch.openGraph ?? {}) },
    twitter: { ...(base.twitter ?? {}), ...(patch.twitter ?? {}) },
    alternates: { ...(base.alternates ?? {}), ...(patch.alternates ?? {}) },
  };
}

const POLICY_HANDLES = [
  "terms",
  "privacy",
  "returns",
  "payment",
  "cookie-policy",
  "accessibility",
  "shipping",
] as const;
type PolicyHandle = (typeof POLICY_HANDLES)[number];

function isPolicyHandle(h: string): h is PolicyHandle {
  return (POLICY_HANDLES as readonly string[]).includes(h);
}

/** Tight, SEO-friendly title + description per policy. */
function policyMetaCopy(kind: PolicyKind): { title: string; description: string } {
  const b = brand.shortName;
  switch (kind) {
    case "terms":
      return {
        title: `${b} Terms of Service — Orders, Liability & Use`,
        description: `The terms governing your use of ${brand.name} — orders, pricing, shipping, returns, IP, and liability. Plain language, last reviewed annually.`,
      };
    case "privacy":
      return {
        title: `${b} Privacy Policy — How We Handle Your Data`,
        description: `What ${brand.name} collects, why, and your rights to access, correct, or delete it. Aligned with Nepal's data-protection framework and GDPR. We never sell your data.`,
      };
    case "returns":
      return {
        title: `${b} Returns & Exchanges — 30-Day Easy Returns`,
        description: `30 days to return any piece. Free domestic return pickup inside Nepal, fast refunds to wallet or card, plus rules for damaged orders and international returns.`,
      };
    case "payment":
      return {
        title: `${b} Payment Options — eSewa, Khalti, Fonepay & Cards`,
        description: `Every way you can pay at ${brand.name}: eSewa, Khalti, Fonepay, ConnectIPS, all major cards, Stripe, PayPal, and Cash on Delivery across Nepal.`,
      };
    case "cookie-policy":
      return {
        title: `${b} Cookie Policy — What We Use & How to Opt Out`,
        description: `Every cookie ${brand.name} sets, plain English: strictly necessary, analytics, and marketing. Switch any of them off in one click.`,
      };
    case "accessibility":
      return {
        title: `${b} Accessibility Statement — WCAG 2.1 AA`,
        description: `${brand.name} aims for WCAG 2.1 Level AA across the storefront. What we already do, known issues, and how to give us feedback.`,
      };
    case "shipping":
      return {
        title: `${b} Shipping — Kathmandu to 60+ Countries`,
        description: `Free domestic shipping above Rs 25,000, COD across Nepal, DHL/FedEx Express worldwide. Transit times, customs, and packaging explained.`,
      };
  }
}

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;

  // /pages/contact is a hand-built component, not CMS-driven — give it
  // a dedicated, SEO-friendly metadata block. Admin CMS overrides apply.
  if (handle === "contact") {
    const url = "/pages/contact";
    const city = brand.contact.address.addressLocality.split(" am ")[0];
    const title = `Contact ${brand.name} — ${city} Showroom & Support`;
    const description = `Speak to a human at ${brand.name}. Call, email, or visit our ${city} showroom. Custom commissions welcome — ${brand.contact.supportHoursLabel.toLowerCase()}.`;
    const base: Metadata = {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "website",
        title,
        description,
        url,
        siteName: brand.shortName,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      robots: { index: true, follow: true },
    };
    return mergeMetadata(base, await fetchCmsSeoOverride(handle, url));
  }

  // /pages/{terms|privacy|returns|payment|cookie-policy|accessibility|shipping}
  // — hand-built policy pages, admin CMS overrides apply.
  if (isPolicyHandle(handle)) {
    const url = `/pages/${handle}`;
    const { title, description } = policyMetaCopy(handle);
    const base: Metadata = {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        title,
        description,
        url,
        siteName: brand.shortName,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      robots: { index: true, follow: true },
    };
    return mergeMetadata(base, await fetchCmsSeoOverride(handle, url));
  }

  // /pages/about — hand-built editorial story page.
  if (handle === "about") {
    const title = `About ${brand.name} — Himalayan Handicraft Marketplace`;
    const description = `${brand.name} works directly with foundries, wood-carving workshops, and singing-bowl ateliers across Nepal. Fair-trade sourcing, decade-long partnerships, and a 30-day return promise.`;
    const url = "/pages/about";
    const base: Metadata = {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "website",
        title,
        description,
        url,
        siteName: brand.shortName,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      robots: { index: true, follow: true },
    };
    return mergeMetadata(base, await fetchCmsSeoOverride(handle, url));
  }

  // /pages/faq — also hand-built (categorised, searchable FAQ component).
  if (handle === "faq") {
    const total = FAQ_CATEGORIES.reduce((s, c) => s + c.questions.length, 0);
    const title = `${brand.shortName} Help Centre — FAQ, Shipping & Returns`;
    const description = `${total} answers about ${brand.productNounPlural}, shipping, returns, care, custom orders, and payments at ${brand.shortName}. Searchable, with one-click contact.`;
    const url = "/pages/faq";
    const base: Metadata = {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "website",
        title,
        description,
        url,
        siteName: brand.shortName,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      robots: { index: true, follow: true },
    };
    return mergeMetadata(base, await fetchCmsSeoOverride(handle, url));
  }

  const wrapper = await apiFetch<{ page?: Page } | Page>(
    `/storefront/pages/${handle}`,
    { revalidate: 600, tags: [`page:${handle}`] }
  ).catch(() => null);
  if (!wrapper) return { title: "Page not found" };
  const page = (wrapper as { page?: Page }).page ?? (wrapper as Page);
  if (!page || !("title" in page)) return { title: "Page not found" };
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
    keywords: page.seoKeywords
      ? page.seoKeywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined,
    alternates: { canonical: page.seoCanonicalUrl ?? `/pages/${handle}` },
    openGraph: page.ogImage?.url
      ? {
          type: "article",
          title: page.seoTitle ?? page.title,
          description: page.seoDescription ?? undefined,
          url: `/pages/${handle}`,
          siteName: brand.shortName,
          images: [{ url: page.ogImage.url }],
        }
      : undefined,
  };
}

export default async function CmsPage({ params }: Props) {
  const { handle } = await params;

  // Special-case /pages/contact — render the dedicated Furniro-style form.
  if (handle === "contact") {
    return <ContactPage />;
  }

  // Special-case policy pages — terms / privacy / returns / payment.
  if (isPolicyHandle(handle)) {
    const policy = POLICIES[handle];
    const url = `/pages/${handle}`;
    const policyJsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: policy.title,
      url,
      isPartOf: { "@type": "WebSite", name: brand.name },
      datePublished: policy.effectiveDate ?? policy.lastUpdated,
      dateModified: policy.lastUpdated,
      inLanguage: "en",
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "/" },
          { "@type": "ListItem", position: 2, name: policy.title, item: url },
        ],
      },
    };
    return (
      <>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(policyJsonLd) }}
        />
        <PolicyPage policy={policy} />
      </>
    );
  }

  // Special-case /pages/about — editorial, hand-built story page.
  if (handle === "about") {
    return <AboutPage />;
  }

  // Special-case /pages/faq — searchable, categorised FAQ + JSON-LD.
  if (handle === "faq") {
    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_CATEGORIES.flatMap((c) =>
        c.questions.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: q.answer },
        }))
      ),
    };
    return (
      <>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <FaqPage />
      </>
    );
  }

  const wrapper = await apiFetch<{ page?: Page } | Page>(
    `/storefront/pages/${handle}`,
    { revalidate: 600, tags: [`page:${handle}`] }
  ).catch(() => null);
  const page = wrapper
    ? ((wrapper as { page?: Page }).page ?? (wrapper as Page))
    : null;
  if (!page || !("title" in page)) notFound();

  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-8xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: page.title },
            ]}
            center
          />
          <h1
            className="mt-4 text-4xl font-bold tracking-tight text-cream-foreground sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {page.title}
          </h1>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <SafeHtml
          as="article"
          html={page.body}
          className="prose-shop"
        />
      </main>
    </>
  );
}
