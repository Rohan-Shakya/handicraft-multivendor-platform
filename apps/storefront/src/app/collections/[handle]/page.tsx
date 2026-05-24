import type {
  Collection,
  PaginatedResponse,
  Product,
  Vendor,
} from "@repo/types";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionCard } from "@/components/CollectionCard";
import { ProductCard } from "@/components/ProductCard";
import { type FilterConfig, ProductFilters } from "@/components/ProductFilters";
import { SafeHtml } from "@/components/SafeHtml";
import { SortSelect } from "@/components/SortSelect";
import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const PAGE_LIMIT = 24;

// Collection pages are mostly stable — cache for a minute so navigating
// between collections/filter combos is fast.
export const revalidate = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

type CollectionWithImage = Collection & {
  productCount?: number;
  image?: { url: string; altText?: string | null } | null;
};

type CollectionProduct = Product & {
  featuredImage?: { url: string; altText?: string } | null;
  secondaryImage?: { url: string; altText?: string } | null;
  lowestPrice?: number | null;
  compareAtPrice?: number | null;
  currencyCode?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
};

type VendorBasic = Pick<Vendor, "id" | "name" | "slug">;

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    vendor?: string;
    tag?: string;
    priceMin?: string;
    priceMax?: string;
    rating?: string;
    inStock?: string;
    onSale?: string;
  }>;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const collection = await apiFetch<CollectionWithImage>(
    `/storefront/collections/${handle}`,
    { revalidate: 300, tags: [`collection:${handle}`] }
  ).catch(() => null);

  if (!collection) {
    return {
      title: "Collection not found",
      robots: { index: false, follow: false },
    };
  }

  const title = collection.seoTitle ?? collection.title;
  const description =
    collection.seoDescription ??
    collection.description ??
    `Explore the ${collection.title} edit — curated ${brand.productNounPlural} from ${brand.shortName}.`;
  const url = `${SITE_URL}/collections/${collection.handle}`;
  const image = collection.image?.url;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${title} — ${brand.shortName}`,
      description,
      url,
      ...(image ? { images: [{ url: image, alt: collection.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} — ${brand.shortName}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csv(value?: string) {
  return value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",")
    : undefined;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CollectionPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // Build the products query — filters this collection on top of any
  // optional facet filters the visitor has applied.
  const query = new URLSearchParams({
    limit: String(PAGE_LIMIT),
    page: String(page),
    collection: handle,
  });
  if (sp.sort) query.set("sort", sp.sort);
  const ven = csv(sp.vendor);
  if (ven) query.set("vendor", ven);
  const tag = csv(sp.tag);
  if (tag) query.set("tag", tag);
  if (sp.priceMin) query.set("priceMin", sp.priceMin);
  if (sp.priceMax) query.set("priceMax", sp.priceMax);
  if (sp.rating) query.set("rating", sp.rating);
  if (sp.inStock === "1") query.set("inStock", "1");
  if (sp.onSale === "1") query.set("onSale", "1");

  const [
    collection,
    productsResponse,
    related,
    vendors,
    priceRange,
    facets,
  ] = await Promise.all([
    apiFetch<CollectionWithImage>(
      `/storefront/collections/${handle}`,
      { revalidate: 300, tags: [`collection:${handle}`] }
    ).catch(() => null),
    apiFetch<PaginatedResponse<CollectionProduct>>(
      `/storefront/products?${query.toString()}`,
      { revalidate: 60, tags: ["products:list"] }
    ).catch(() => null),
    apiFetch<
      PaginatedResponse<CollectionWithImage> | CollectionWithImage[]
    >("/storefront/collections?limit=4", {
      revalidate: 300,
      tags: ["collections"],
    }).catch(() => null),
    apiFetch<PaginatedResponse<VendorBasic> | VendorBasic[]>(
      "/storefront/vendors?limit=30",
      { revalidate: 300, tags: ["vendors"] }
    ).catch(() => null),
    apiFetch<{ min: number; max: number }>(
      "/storefront/products/price-range",
      { revalidate: 300, tags: ["products:price-range"] }
    ).catch(() => ({ min: 0, max: 1000 })),
    apiFetch<
      Array<{
        key: string;
        label: string;
        sourceType: string;
        displayType: string;
      }>
    >("/storefront/facets", { revalidate: 600, tags: ["facets"] }).catch(
      () =>
        [] as Array<{
          key: string;
          label: string;
          sourceType: string;
          displayType: string;
        }>
    ),
  ]);

  if (!collection) notFound();

  const products = productsResponse?.data ?? [];
  const total = productsResponse?.total ?? products.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Related collections — exclude current
  const relatedAll = related
    ? Array.isArray(related)
      ? related
      : related.data
    : [];
  const relatedCollections = relatedAll
    .filter((c) => c.handle !== collection.handle)
    .slice(0, 3);

  // Vendor facets
  const vendorList: VendorBasic[] = vendors
    ? Array.isArray(vendors)
      ? vendors
      : vendors.data
    : [];

  const facetList = Array.isArray(facets) ? facets : [];
  const enabledSourceTypes = new Set(facetList.map((f) => f.sourceType));
  // Hide the "collection" filter — the page is already scoped to one collection.
  const order = facetList
    .map((f) => f.sourceType)
    .filter((s) => s !== "collection");

  const filterConfig: FilterConfig = {
    vendors:
      enabledSourceTypes.has("vendor") && vendorList.length > 0
        ? vendorList.map((v) => ({ value: v.slug, label: v.name }))
        : undefined,
    priceRange: enabledSourceTypes.has("variant_price")
      ? { min: priceRange.min, max: priceRange.max, currency: "NPR" }
      : undefined,
    showRating: enabledSourceTypes.has("rating"),
    showAvailability: enabledSourceTypes.has("availability"),
    order,
  };

  const url = `${SITE_URL}/collections/${collection.handle}`;

  // ── JSON-LD ──
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description:
      collection.seoDescription ??
      collection.description ??
      `${collection.title} — ${brand.shortName} curated edit`,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: brand.name,
      url: SITE_URL,
    },
    ...(collection.image?.url ? { image: collection.image.url } : {}),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: products.map((p, idx) => ({
        "@type": "ListItem",
        position: (page - 1) * PAGE_LIMIT + idx + 1,
        url: `${SITE_URL}/products/${p.handle}`,
        name: p.title,
      })),
    },
  };


  const collectionHandle = collection.handle;
  function buildHref(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v) params.set(k, v);
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    return `/collections/${collectionHandle}${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />

      {/* ── Cream editorial hero ─────────────────────────────── */}
      <section
        aria-labelledby="collection-heading"
        className="relative overflow-hidden bg-cream"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            color: "var(--cream-foreground)",
          }}
        />
        <div className="relative mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Collections", href: "/collections" },
              { label: collection.title },
            ]}
          />

          <div className="mt-5 max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
              <span aria-hidden className="h-px w-6 bg-primary/60" />
              {brand.shortName} edit
            </p>
            <h1
              id="collection-heading"
              className="mt-3 text-3xl font-medium leading-[1.05] tracking-[-0.015em] text-cream-foreground sm:text-4xl lg:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {collection.seoTitle ?? collection.title}
            </h1>
            {collection.seoDescription && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-foreground/75 sm:text-base">
                {collection.seoDescription}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-8xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Toolbar — Result count | Sort Filters
            Filter button becomes a fixed FAB on mobile (`<sm`). */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border pb-5">
          <div
            className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1"
            aria-hidden
          >
            <p className="text-foreground">
              <span
                className="text-xl font-semibold tabular tracking-tight sm:text-2xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {total.toLocaleString()}
              </span>{" "}
              <span className="text-base text-muted-foreground sm:text-lg">
                {total === 1 ? brand.productNoun : brand.productNounPlural}
              </span>
            </p>
            {total > PAGE_LIMIT && (
              <>
                <span
                  aria-hidden
                  className="hidden h-3.5 w-px bg-border sm:inline-block"
                />
                <p className="text-xs text-muted-foreground sm:text-sm">
                  <span className="hidden sm:inline">Showing </span>
                  <span className="font-medium tabular text-foreground">
                    {Math.min(
                      (page - 1) * PAGE_LIMIT + 1,
                      total,
                    ).toLocaleString()}
                    –
                    {Math.min(page * PAGE_LIMIT, total).toLocaleString()}
                  </span>
                </p>
              </>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            Showing {Math.min((page - 1) * PAGE_LIMIT + 1, total).toLocaleString()}
            –{Math.min(page * PAGE_LIMIT, total).toLocaleString()} of{" "}
            {total.toLocaleString()}{" "}
            {total === 1 ? brand.productNoun : brand.productNounPlural} in{" "}
            {collection.title}
          </p>
          <div className="flex items-center gap-2.5">
            <SortSelect size="lg" />
            <ProductFilters
              config={filterConfig}
              totalResults={total}
              drawerOnly
              drawerSide="right"
              triggerSize="lg"
              mobileFloating
            />
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Product grid */}
            <ul
              role="list"
              className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6"
            >
              {products.map((product, i) => (
                <li key={product.id}>
                  <ProductCard
                    product={product}
                    list={`collection_${collection.handle}`}
                    priority={i < 4}
                  />
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-14 flex items-center justify-center gap-1.5"
              >
                <PageLink
                  href={hasPrev ? buildHref({ page: String(page - 1) }) : undefined}
                  rel="prev"
                  ariaLabel="Previous page"
                >
                  ← Prev
                </PageLink>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  if (p < 1 || p > totalPages) return null;
                  const isCurrent = p === page;
                  return (
                    <Link
                      key={p}
                      href={buildHref({ page: String(p) })}
                      aria-label={`Go to page ${p}`}
                      aria-current={isCurrent ? "page" : undefined}
                      className={
                        isCurrent
                          ? "grid size-11 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                          : "grid size-11 place-items-center rounded-full border text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      }
                    >
                      {p}
                    </Link>
                  );
                })}
                <PageLink
                  href={hasNext ? buildHref({ page: String(page + 1) }) : undefined}
                  rel="next"
                  ariaLabel="Next page"
                >
                  Next →
                </PageLink>
              </nav>
            )}
          </>
        )}

        {/* ── Long-form description (normal title + rich-text body) ───── */}
        {collection.description && (
          <section
            aria-labelledby="collection-about-heading"
            className="mt-20 border-t border-border pt-12 lg:mt-24 lg:pt-14"
          >
            <div className="mx-auto max-w-3xl">
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
                <span aria-hidden className="h-px w-6 bg-primary/60" />
                About this edit
              </p>
              <h2
                id="collection-about-heading"
                className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {collection.title}
              </h2>
              <SafeHtml
                html={collection.description}
                className="prose-shop mt-5 text-muted-foreground"
              />
            </div>
          </section>
        )}

        {/* ── Related collections ─────────────────────────── */}
        {relatedCollections.length > 0 && (
          <section
            aria-labelledby="related-heading"
            className="mt-20 border-t border-border pt-12 lg:mt-24 lg:pt-14"
          >
            <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
                  <span aria-hidden className="h-px w-6 bg-primary/60" />
                  Keep exploring
                </p>
                <h2
                  id="related-heading"
                  className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Other edits
                </h2>
              </div>
              <Link
                href="/collections"
                className="inline-flex items-center gap-1.5 border-b border-foreground/40 pb-0.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                All collections
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </header>
            <ul
              role="list"
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
            >
              {relatedCollections.map((c) => (
                <li key={c.id}>
                  <CollectionCard collection={c} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

// ─── Pagination link ──────────────────────────────────────────────────────────

function PageLink({
  href,
  children,
  rel,
  ariaLabel,
}: {
  href?: string;
  children: React.ReactNode;
  rel?: "prev" | "next";
  ariaLabel?: string;
}) {
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className="rounded-full border border-input/50 bg-muted px-4 py-2 text-sm text-muted-foreground"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      rel={rel}
      aria-label={ariaLabel}
      className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mt-12 flex flex-col items-center gap-5 rounded-3xl border border-dashed border-border py-24 text-center">
      <span
        aria-hidden
        className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15"
      >
        <Sparkles className="size-7" />
      </span>
      <div role="status" aria-live="polite">
        <h2 className="text-xl font-medium tracking-tight">
          Nothing matches those filters
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Try clearing a filter, or browse other collections to keep exploring.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
        >
          Browse collections
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Shop all {brand.productNounPlural}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
