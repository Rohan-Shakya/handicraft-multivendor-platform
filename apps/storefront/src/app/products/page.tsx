import type { Collection, PaginatedResponse,Product, Vendor } from "@repo/types";
import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { type FilterConfig,ProductFilters } from "@/components/ProductFilters";
import { SortSelect, ViewToggle } from "@/components/SortSelect";
import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Cache rendered HTML for a minute — filter/sort permutations get their own
// cache entries since the URL search params are part of the key.
export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const sp = await searchParams;
  const baseTitle = sp.q
    ? `Results for "${sp.q}"`
    : `Shop ${brand.productNounPlural}`;
  const description = sp.q
    ? `Search results for "${sp.q}" — discover curated ${brand.productNounPlural} from independent ateliers.`
    : `Browse our full catalogue of ${brand.productNounPlural}. Filter by price, rating, availability, and more.`;
  const canonical = `${SITE_URL}/products`;
  return {
    title: baseTitle,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${baseTitle} — ${brand.shortName}`,
      description,
      url: canonical,
      siteName: brand.shortName,
    },
    twitter: {
      card: "summary",
      title: `${baseTitle} — ${brand.shortName}`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

type ProductWithDetails = Product & {
  featuredImage?: { url: string; altText?: string } | null;
  secondaryImage?: { url: string; altText?: string } | null;
  lowestPrice?: number | null;
  compareAtPrice?: number | null;
  currencyCode?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  defaultVariantId?: string | null;
  vendor?: { id: string; name: string; slug: string } | null;
  inStock?: boolean | null;
  swatches?: string[] | null;
};

type CollectionBasic = Pick<Collection, "id" | "title" | "handle"> & {
  productCount?: number;
};

type VendorBasic = Pick<Vendor, "id" | "name" | "slug">;

interface Props {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    view?: string;
    collection?: string;
    vendor?: string;
    tag?: string;
    priceMin?: string;
    priceMax?: string;
    rating?: string;
    inStock?: string;
    onSale?: string;
  }>;
}

function serializeMulti(value?: string) {
  return value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",")
    : undefined;
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = 24;

  const query = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (sp.q) query.set("search", sp.q);
  if (sp.sort) query.set("sort", sp.sort);
  const col = serializeMulti(sp.collection);
  if (col) query.set("collection", col);
  const ven = serializeMulti(sp.vendor);
  if (ven) query.set("vendor", ven);
  const tag = serializeMulti(sp.tag);
  if (tag) query.set("tag", tag);
  if (sp.priceMin) query.set("priceMin", sp.priceMin);
  if (sp.priceMax) query.set("priceMax", sp.priceMax);
  if (sp.rating) query.set("rating", sp.rating);
  if (sp.inStock === "1") query.set("inStock", "1");
  if (sp.onSale === "1") query.set("onSale", "1");

  const [
    productsResult,
    collectionsResult,
    vendorsResult,
    priceRangeResult,
    facetsResult,
  ] = await Promise.allSettled([
    apiFetch<PaginatedResponse<ProductWithDetails>>(
      `/storefront/products?${query.toString()}`,
      { revalidate: 60, tags: ["products:list"] }
    ),
    apiFetch<PaginatedResponse<CollectionBasic> | CollectionBasic[]>(
      "/storefront/collections?limit=30",
      { revalidate: 300, tags: ["collections"] }
    ),
    apiFetch<PaginatedResponse<VendorBasic> | VendorBasic[]>(
      "/storefront/vendors?limit=30",
      { revalidate: 300, tags: ["vendors"] }
    ),
    apiFetch<{ min: number; max: number }>(
      "/storefront/products/price-range",
      { revalidate: 300, tags: ["products:price-range"] }
    ),
    // Admin-managed filter definitions — tells us which filter sections to
    // render and in what order.
    apiFetch<
      Array<{
        key: string;
        label: string;
        sourceType: string;
        displayType: string;
      }>
    >("/storefront/facets", { revalidate: 600, tags: ["facets"] }),
  ]);

  const products =
    productsResult.status === "fulfilled"
      ? productsResult.value
      : { data: [], total: 0, page, limit };

  const collectionsRaw =
    collectionsResult.status === "fulfilled" ? collectionsResult.value : null;
  const collections: CollectionBasic[] = collectionsRaw
    ? Array.isArray(collectionsRaw)
      ? collectionsRaw
      : collectionsRaw.data
    : [];

  const vendorsRaw =
    vendorsResult.status === "fulfilled" ? vendorsResult.value : null;
  const vendors: VendorBasic[] = vendorsRaw
    ? Array.isArray(vendorsRaw)
      ? vendorsRaw
      : vendorsRaw.data
    : [];

  // Use the server-computed catalog range when available so the slider always
  // bounds the real data. Fallback to a sensible default if the request fails.
  const priceRange =
    priceRangeResult.status === "fulfilled"
      ? priceRangeResult.value
      : { min: 0, max: 1000 };

  // The admin-managed filter set drives which sections are rendered and in
  // what order. A filter that isn't present in `facets` is hidden.
  const facets = facetsResult.status === "fulfilled" ? facetsResult.value : [];
  const enabledSourceTypes = new Set(facets.map((f) => f.sourceType));
  // Preserve admin order by reading `facets` as authoritative.
  const order = facets.map((f) => f.sourceType);

  const filterConfig: FilterConfig = {
    // Only attach each section if the admin enabled a filter of that type.
    // Empty/undefined sections won't render in ProductFilters.
    collections: enabledSourceTypes.has("collection")
      ? collections.map((c) => ({
          value: c.handle,
          label: c.title,
          count: c.productCount,
        }))
      : undefined,
    vendors: enabledSourceTypes.has("vendor")
      ? vendors.map((v) => ({ value: v.slug, label: v.name }))
      : undefined,
    priceRange: enabledSourceTypes.has("variant_price")
      ? { min: priceRange.min, max: priceRange.max, currency: "NPR" }
      : undefined,
    showRating: enabledSourceTypes.has("rating"),
    showAvailability: enabledSourceTypes.has("availability"),
    order,
  };

  const totalPages = Math.ceil(products.total / limit);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const isListView = sp.view === "list";

  function buildHref(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v) params.set(k, v);
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return `/products${params.toString() ? `?${params.toString()}` : ""}`;
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Shop" },
  ];

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: sp.q ? `Search results for "${sp.q}"` : "Shop catalogue",
    numberOfItems: products.total,
    itemListElement: products.data.slice(0, 24).map((p, i) => ({
      "@type": "ListItem",
      position: (page - 1) * limit + i + 1,
      url: `${SITE_URL}/products/${p.handle}`,
      name: p.title,
    })),
  };

  return (
    <>
      {products.data.length > 0 && (
        <script
          type="application/ld+json"
          // Schema.org JSON-LD — safe because we control all values.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      {/* Cream page hero */}
      <section
        aria-labelledby="shop-heading"
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
          <Breadcrumbs items={breadcrumbs} />
          <div className="mt-5 max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
              <span aria-hidden className="h-px w-6 bg-primary/60" />
              Shop the catalogue
            </p>
            <h1
              id="shop-heading"
              className="mt-3 text-3xl font-medium leading-[1.05] tracking-[-0.015em] text-cream-foreground sm:text-4xl lg:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {sp.q ? (
                <>
                  Results for{" "}
                  <span className="italic text-primary">
                    &ldquo;{sp.q}&rdquo;
                  </span>
                </>
              ) : (
                <>
                  Every{" "}
                  <span className="italic text-primary">
                    {brand.productNoun}
                  </span>{" "}
                  in one place.
                </>
              )}
            </h1>
            {products.total > 0 && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-foreground/75 sm:text-base">
                {products.total.toLocaleString()} curated{" "}
                {products.total !== 1
                  ? brand.productNounPlural
                  : brand.productNoun}{" "}
                from independent ateliers — filter by region, technique, price,
                or rating to narrow your shortlist.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-8xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="min-w-0 flex-1">
          {/* Toolbar — Result count | ViewToggle Sort Filters
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
                  {products.total.toLocaleString()}
                </span>{" "}
                <span className="text-base text-muted-foreground sm:text-lg">
                  {products.total === 1
                    ? brand.productNoun
                    : brand.productNounPlural}
                </span>
              </p>
              {products.total > limit && (
                <>
                  <span
                    aria-hidden
                    className="hidden h-3.5 w-px bg-border sm:inline-block"
                  />
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    <span className="hidden sm:inline">Showing </span>
                    <span className="font-medium tabular text-foreground">
                      {Math.min(
                        (page - 1) * limit + 1,
                        products.total,
                      ).toLocaleString()}
                      –
                      {Math.min(
                        page * limit,
                        products.total,
                      ).toLocaleString()}
                    </span>
                  </p>
                </>
              )}
            </div>
            <p className="sr-only" aria-live="polite">
              Showing {Math.min((page - 1) * limit + 1, products.total).toLocaleString()}
              –{Math.min(page * limit, products.total).toLocaleString()} of{" "}
              {products.total.toLocaleString()}{" "}
              {products.total === 1 ? brand.productNoun : brand.productNounPlural}
            </p>
            <div className="flex items-center gap-2.5">
              <ViewToggle />
              <SortSelect size="lg" />
              <ProductFilters
                config={filterConfig}
                totalResults={products.total}
                drawerOnly
                drawerSide="right"
                triggerSize="lg"
                mobileFloating
              />
            </div>
          </div>

          {products.data.length > 0 ? (
            <>
              {isListView ? (
                <ul role="list" className="border-t">
                  {products.data.map((product, i) => (
                    <li key={product.id}>
                      <ProductCard
                        product={product}
                        list="product_listing"
                        view="list"
                        priority={i === 0}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <ul
                  role="list"
                  className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6"
                >
                  {products.data.map((product, i) => (
                    <li key={product.id}>
                      <ProductCard
                        product={product}
                        list="product_listing"
                        priority={i < 4}
                      />
                    </li>
                  ))}
                </ul>
              )}

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
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed py-20 text-center">
              <div className="grid size-20 place-items-center rounded-full bg-muted">
                <ShoppingBag className="size-8 text-muted-foreground" aria-hidden />
              </div>
              <div role="status" aria-live="polite">
                <h2 className="text-xl font-medium tracking-tight">No products match your filters</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try removing a filter or searching for something else.
                </p>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Clear all filters
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

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
