import type {
  PaginatedResponse,
  Product,
  ProductImage,
  ProductOption,
  Review,
  Variant,
} from "@repo/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getPlatformCurrency } from "@/lib/format";

import { ProductClient } from "./ProductClient";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Product detail pages are near-static — cache for 5 minutes. Inventory
// numbers come from a client-side fetch on the PDP, so stale price/title
// here doesn't impact "can I buy it" correctness.
export const revalidate = 300;

// ─── Extended types ───────────────────────────────────────────────────────────

export interface ProductWithDetails extends Product {
  images: ProductImage[];
  options: ProductOption[];
  variants: Variant[];
  vendor?: { id: string; name: string; slug: string };
  currencyCode?: string;
  /** Made-to-order flag — when true the PDP shows a configurator instead of the cart flow. */
  isConfigurable?: boolean;
  configuratorLeadTimeDays?: number | null;
  /** Campaign auto-discount applied to this product. */
  sale?: {
    salePrice: number;
    savings: number;
    percentOff: number;
    campaignId: string | null;
    discountTitle: string;
  } | null;
}

export interface ReviewWithCustomer extends Review {
  customer?: { firstName?: string; lastName?: string };
}

type RelatedProduct = Product & {
  featuredImage?: { url: string; altText?: string } | null;
  lowestPrice?: number | null;
  compareAtPrice?: number | null;
  currencyCode?: string;
  averageRating?: number | null;
  reviewCount?: number | null;
  defaultVariantId?: string | null;
  vendor?: { id: string; name: string; slug: string } | null;
};

// ─── Route params ─────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ handle: string }>;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await apiFetch<ProductWithDetails>(
    `/storefront/products/${handle}`,
    { revalidate: 300, tags: [`product:${handle}`] }
  ).catch(() => null);
  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

  const title = product.seoTitle ?? product.title;
  const description = product.seoDescription ?? product.description ?? undefined;
  const imageUrl = product.images?.[0]?.url;
  const canonical = `${SITE_URL}/products/${handle}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      ...(imageUrl ? { images: [{ url: imageUrl, alt: title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;

  // The metadata generator above already fetches this product. Next.js
  // de-duplicates identical cacheable fetches within a single render, so
  // passing the same revalidate key here just returns the cached value.
  const product = await apiFetch<ProductWithDetails>(
    `/storefront/products/${handle}`,
    { revalidate: 300, tags: [`product:${handle}`] }
  ).catch(() => null);

  if (!product) notFound();

  // Parallel fetches: reviews + recommendations. The /storefront/recommendations
  // endpoint ranks products by co-purchase first, then falls back to same
  // collection / same vendor — better signal than the flat "more from this
  // vendor" list it used to show.
  const [reviewsResponse, relatedResponse] = await Promise.all([
    apiFetch<PaginatedResponse<ReviewWithCustomer>>(
      `/storefront/products/${product.id}/reviews?limit=8`,
      { revalidate: 120, tags: [`product:${product.id}:reviews`] }
    ).catch(() => null),
    apiFetch<PaginatedResponse<RelatedProduct>>(
      `/storefront/recommendations?productId=${product.id}&limit=6`,
      { revalidate: 600, tags: [`product:${product.id}:recommendations`] }
    ).catch(() => null),
  ]);

  const reviews = reviewsResponse?.data ?? [];
  const related = (relatedResponse?.data ?? []).filter((p) => p.id !== product.id).slice(0, 6);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const currencyCode = product.currencyCode ?? getPlatformCurrency();
  const images = product.images?.map((img) => img.url).filter(Boolean) ?? [];
  const variantPrices = product.variants
    ?.map((v) => v.price)
    .filter((p): p is number => typeof p === "number" && p >= 0);
  const rawLowPrice = variantPrices?.length ? Math.min(...variantPrices) : undefined;
  const rawHighPrice = variantPrices?.length ? Math.max(...variantPrices) : undefined;
  // When a campaign auto-discount is active, surface the sale price to search
  // engines as well — Google shows the discounted price in rich results.
  const lowPrice =
    product.sale?.salePrice != null ? product.sale.salePrice : rawLowPrice;
  const highPrice =
    product.sale?.salePrice != null && rawHighPrice != null
      ? Math.max(product.sale.salePrice, rawHighPrice * (1 - product.sale.percentOff / 100))
      : rawHighPrice;
  const inStock = product.variants?.some((v) => (v.inventoryQuantity ?? 0) > 0);
  const productUrl = `${SITE_URL}/products/${product.handle}`;
  const productSku = product.variants?.find((v) => v.sku)?.sku ?? undefined;

  const offer =
    variantPrices && variantPrices.length > 1 && lowPrice !== highPrice
      ? {
          "@type": "AggregateOffer",
          priceCurrency: currencyCode,
          lowPrice,
          highPrice,
          offerCount: variantPrices.length,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: productUrl,
        }
      : {
          "@type": "Offer",
          ...(lowPrice != null ? { price: lowPrice } : {}),
          priceCurrency: currencyCode,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          url: productUrl,
        };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": productUrl,
    name: product.title,
    description: product.description,
    url: productUrl,
    ...(images.length > 0
      ? { image: images.length === 1 ? images[0] : images }
      : {}),
    ...(productSku ? { sku: productSku } : {}),
    productID: product.id,
    ...(product.vendor
      ? {
          brand: {
            "@type": "Brand",
            name: product.vendor.name,
            ...(product.vendor.slug
              ? { url: `${SITE_URL}/vendors/${product.vendor.slug}` }
              : {}),
          },
        }
      : {}),
    offers: offer,
    ...(reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: reviews.length,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 3).map((r) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            author: {
              "@type": "Person",
              name: r.customer?.firstName ?? "Customer",
            },
            reviewBody: r.body,
          })),
        }
      : {}),
  };


  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClient
        product={product}
        reviews={reviews}
        related={related}
        currencyCode={currencyCode}
      />
    </>
  );
}
