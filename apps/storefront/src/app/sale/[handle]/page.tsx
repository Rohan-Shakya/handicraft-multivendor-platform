import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Product } from "@repo/types";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CampaignBanner, type ActiveCampaign } from "@/components/CampaignBanner";
import { ProductCard } from "@/components/ProductCard";
import { SafeHtml } from "@/components/SafeHtml";
import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface CampaignDetail extends ActiveCampaign {
  description: string | null;
  discounts: Array<{
    id: string;
    title: string;
    type: "percentage" | "fixed_amount" | "free_shipping";
    value: string;
  }>;
}

type ProductCardProduct = Product & {
  featuredImage?: { url: string; altText?: string } | null;
  secondaryImage?: { url: string; altText?: string } | null;
  lowestPrice?: number | null;
  compareAtPrice?: number | null;
  currencyCode?: string | null;
  defaultVariantId?: string | null;
  vendor?: { id?: string; name?: string; slug?: string } | null;
  inStock?: boolean | null;
  sale?: {
    salePrice: number;
    savings: number;
    percentOff: number;
    campaignId: string | null;
    discountTitle: string;
  } | null;
};

interface Props {
  params: Promise<{ handle: string }>;
}

// Sale landing pages refresh every minute — the campaign window itself is
// stable but featured product price/inventory should flicker faster.
export const revalidate = 60;

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const campaign = await apiFetch<CampaignDetail>(
    `/storefront/sales/${handle}`,
    { revalidate: 60, tags: [`sale:${handle}`] }
  ).catch(() => null);
  if (!campaign) {
    return {
      title: "Sale not found",
      robots: { index: false, follow: false },
    };
  }
  const title = campaign.title;
  const description =
    campaign.description ||
    campaign.headline ||
    `Shop ${campaign.title} on ${brand.shortName} — limited-time deals on selected ${brand.productNounPlural}.`;
  const canonical = `${SITE_URL}/sale/${handle}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      ...(campaign.heroImageUrl
        ? { images: [{ url: campaign.heroImageUrl, alt: title }] }
        : {}),
    },
    twitter: {
      title,
      description,
      card: campaign.heroImageUrl ? "summary_large_image" : "summary",
      ...(campaign.heroImageUrl ? { images: [campaign.heroImageUrl] } : {}),
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function SaleLandingPage({ params }: Props) {
  const { handle } = await params;

  const campaign = await apiFetch<CampaignDetail>(
    `/storefront/sales/${handle}`,
    { revalidate: 60, tags: [`sale:${handle}`] }
  ).catch(() => null);
  if (!campaign) notFound();

  const productsRes = await apiFetch<{ data: ProductCardProduct[]; total: number }>(
    `/storefront/products?campaignId=${campaign.id}&limit=48`,
    { revalidate: 60, tags: [`sale:${handle}:products`] }
  ).catch(() => ({ data: [], total: 0 }));
  const products = productsRes.data ?? [];

  // JSON-LD: ItemList of qualifying products + priceValidUntil pointing to the
  // campaign end date. Lets Google show the sale price + crossed-out original
  // in the SERP product card.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SaleEvent",
    name: campaign.title,
    description: campaign.description ?? campaign.headline ?? undefined,
    startDate: campaign.startsAt,
    endDate: campaign.endsAt,
    url: `${SITE_URL}/sale/${handle}`,
    ...(products.length > 0
      ? {
          subjectOf: {
            "@type": "ItemList",
            numberOfItems: products.length,
            itemListElement: products.slice(0, 12).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Product",
                name: p.title,
                url: `${SITE_URL}/products/${p.handle}`,
                ...(p.featuredImage?.url ? { image: p.featuredImage.url } : {}),
                offers: p.sale
                  ? {
                      "@type": "Offer",
                      price: p.sale.salePrice,
                      priceCurrency: p.currencyCode ?? brand.currencyCode,
                      priceValidUntil: campaign.endsAt,
                      availability:
                        p.inStock === false
                          ? "https://schema.org/OutOfStock"
                          : "https://schema.org/InStock",
                    }
                  : p.lowestPrice != null
                    ? {
                        "@type": "Offer",
                        price: p.lowestPrice,
                        priceCurrency: p.currencyCode ?? brand.currencyCode,
                        availability:
                          p.inStock === false
                            ? "https://schema.org/OutOfStock"
                            : "https://schema.org/InStock",
                      }
                    : undefined,
              },
            })),
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-8xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Sale", href: "/sale" },
            { label: campaign.title },
          ]}
        />

        <div className="mt-6">
          <CampaignBanner
            campaign={{
              id: campaign.id,
              handle: campaign.handle,
              title: campaign.title,
              headline: campaign.headline,
              heroImageUrl: campaign.heroImageUrl,
              ctaText: campaign.ctaText,
              ctaUrl: null, // banner CTA is already the page itself; suppress nav
              accentColor: campaign.accentColor,
              backgroundColor: campaign.backgroundColor,
              startsAt: campaign.startsAt,
              endsAt: campaign.endsAt,
            }}
            surface="footer"
          />
        </div>

        {campaign.description && (
          <SafeHtml
            html={campaign.description}
            className="prose-shop mx-auto mt-10 max-w-3xl text-center text-base text-muted-foreground"
          />
        )}

        {campaign.discounts.length > 0 && (
          <section
            aria-labelledby="campaign-discounts-title"
            className="mx-auto mt-10 max-w-3xl rounded-2xl border border-red-200/70 bg-red-50/50 p-6 dark:border-red-900/60 dark:bg-red-950/20"
          >
            <h2
              id="campaign-discounts-title"
              className="text-sm font-bold uppercase tracking-[0.18em] text-red-700 dark:text-red-400"
            >
              What's on sale
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {campaign.discounts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-baseline gap-2 text-sm text-foreground"
                >
                  <span className="inline-block size-1.5 rounded-full bg-red-600" aria-hidden />
                  <span className="font-medium">
                    {d.type === "percentage"
                      ? `${parseFloat(d.value)}% off`
                      : d.type === "fixed_amount"
                        ? `${d.value} off`
                        : "Free shipping"}
                  </span>
                  <span className="text-muted-foreground">— {d.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          aria-labelledby="sale-products-title"
          className="mt-12"
        >
          <div className="flex items-baseline justify-between">
            <h2
              id="sale-products-title"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              On sale now
            </h2>
            <p className="text-sm text-muted-foreground">
              {products.length} product{products.length === 1 ? "" : "s"}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing on this sale right now — check back soon.
              </p>
              <Link
                href="/products"
                className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Browse all {brand.productNounPlural}
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  list={`sale-${campaign.handle}`}
                  priority={i < 4}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
