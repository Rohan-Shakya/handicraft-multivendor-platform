import type { PaginatedResponse, Vendor } from "@repo/types";
import { ArrowRight, BadgeCheck, Search, Store, TrendingUp, Users, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { VendorCard } from "@/components/VendorCard";
import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";

interface SearchParams {
  q?: string;
  page?: string;
}

const PAGE_SIZE = 24;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Cache for 5 minutes. Admin edits propagate via the "vendors" cache tag — see
 * `revalidateTag("vendors")` in the admin vendor mutation handlers.
 */
export const revalidate = 300;

type VendorWithCount = Vendor & { productCount?: number };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const title = q
    ? `Vendor search: ${q} — ${brand.shortName}`
    : `Vendors — ${brand.shortName}`;
  const description = q
    ? `Browse ${brand.shortName} vendors matching “${q}”. Discover independent makers and ateliers.`
    : `Meet the independent makers, ateliers, and brands selling on ${brand.shortName}.`;
  const canonical = q
    ? `${SITE_URL}/vendors?q=${encodeURIComponent(q)}`
    : `${SITE_URL}/vendors`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: { title, description, card: "summary_large_image" },
  };
}

const VENDOR_FEATURES = [
  {
    icon: TrendingUp,
    title: "Reach more customers",
    description:
      "List your products in front of thousands of active shoppers looking for unique items.",
  },
  {
    icon: Users,
    title: "Build your community",
    description:
      "Create a branded storefront, grow a following, and engage directly with customers who love your work.",
  },
  {
    icon: BadgeCheck,
    title: "Trusted & supported",
    description:
      "Get tools, analytics, and dedicated seller support to run your business with confidence.",
  },
];

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("page", String(page));
  if (q) params.set("q", q);

  const result = await apiFetch<PaginatedResponse<VendorWithCount>>(
    `/storefront/vendors?${params.toString()}`,
    { revalidate: 300, tags: ["vendors"] }
  ).catch(() => null);

  const vendors = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function buildHref(overrides: Partial<SearchParams>): string {
    const next = new URLSearchParams();
    if (overrides.q ?? q) next.set("q", overrides.q ?? q);
    const p = overrides.page ?? String(page);
    if (p && p !== "1") next.set("page", p);
    const qs = next.toString();
    return qs ? `/vendors?${qs}` : "/vendors";
  }

  // JSON-LD: ItemList of vendors for the current page
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: q ? `Vendor search: ${q}` : `${brand.shortName} vendors`,
    numberOfItems: total,
    itemListElement: vendors.slice(0, 24).map((v, i) => ({
      "@type": "ListItem",
      position: (page - 1) * PAGE_SIZE + i + 1,
      item: {
        "@type": "Organization",
        name: v.name,
        url: `${SITE_URL}/${v.slug}`,
        ...(v.logoUrl ? { logo: v.logoUrl } : {}),
        ...(v.bio ? { description: v.bio } : {}),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="vendors-heading"
        className="relative overflow-hidden bg-cream"
      >
        <div className="absolute inset-0 -z-10 opacity-[0.035] [background-image:radial-gradient(circle_at_1px_1px,_currentColor_1px,_transparent_0)] [background-size:24px_24px] text-cream-foreground" />
        <div className="mx-auto max-w-8xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cream-foreground">
            <Store className="size-3" aria-hidden />
            Marketplace
          </span>
          <h1
            id="vendors-heading"
            className="mt-4 text-4xl font-bold tracking-tight text-cream-foreground sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Meet our vendors
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-cream-foreground/75 sm:text-lg">
            {brand.shortName} is home to ateliers and independent makers — every
            store has its own story to tell.
          </p>
          {total > 0 && !q && (
            <p
              className="mt-3 text-sm text-cream-foreground/60"
              aria-live="polite"
            >
              {total} active vendor{total === 1 ? "" : "s"} and counting
            </p>
          )}
        </div>
      </section>

      {/* ── Search + Grid ─────────────────────────────────────────────── */}
      <section
        aria-labelledby="vendor-list-heading"
        className="mx-auto max-w-8xl px-4 py-14 sm:px-6 lg:px-8"
      >
        <h2 id="vendor-list-heading" className="sr-only">
          Vendor directory
        </h2>

        {/* Search */}
        <form
          method="GET"
          action="/vendors"
          role="search"
          aria-label="Search vendors"
          className="mb-10 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center"
        >
          <label htmlFor="vendor-search" className="sr-only">
            Search by store name, handle, or description
          </label>
          <div className="relative flex-1 sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="vendor-search"
              name="q"
              type="search"
              defaultValue={q}
              autoComplete="off"
              placeholder="Search by name, handle, or description…"
              className="h-11 w-full rounded-full border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Search
          </button>
          {q && (
            <Link
              href="/vendors"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Clear search"
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </Link>
          )}
        </form>

        {/* Result summary — visible & live for screen readers */}
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {q ? (
              total > 0 ? (
                <>
                  Showing <strong className="text-foreground">{vendors.length}</strong> of{" "}
                  <strong className="text-foreground">{total}</strong> result
                  {total === 1 ? "" : "s"} for{" "}
                  <strong className="text-foreground">&ldquo;{q}&rdquo;</strong>
                </>
              ) : (
                <>
                  No vendors match{" "}
                  <strong className="text-foreground">&ldquo;{q}&rdquo;</strong>
                </>
              )
            ) : total > 0 ? (
              <>
                <strong className="text-foreground">{total}</strong> vendor
                {total === 1 ? "" : "s"}
              </>
            ) : null}
          </p>
          {totalPages > 1 && (
            <p className="text-xs text-muted-foreground">
              Page <strong className="text-foreground">{page}</strong> of{" "}
              {totalPages}
            </p>
          )}
        </div>

        {/* Grid */}
        {vendors.length > 0 ? (
          <ul
            role="list"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {vendors.map((vendor) => (
              <li key={vendor.id} className="contents">
                <VendorCard vendor={vendor} />
              </li>
            ))}
          </ul>
        ) : (
          <div
            role="status"
            className="flex flex-col items-center gap-4 rounded-3xl border border-dashed py-20 text-center"
          >
            <div className="grid size-20 place-items-center rounded-full bg-muted">
              <Store className="size-8 text-muted-foreground" aria-hidden />
            </div>
            <div>
              <h3 className="text-xl font-medium tracking-tight">
                {q ? "No matching vendors" : "No vendors listed yet"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {q
                  ? "Try a different search term, or browse the full directory."
                  : "Check back soon — new makers join all the time."}
              </p>
            </div>
            {q ? (
              <Link
                href="/vendors"
                className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Browse all vendors
              </Link>
            ) : (
              <Link
                href="/products"
                className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Browse all products
              </Link>
            )}
          </div>
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
                      : "grid size-11 place-items-center rounded-full border text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
      </section>

      {/* ── Why sell here ─────────────────────────────────────────────── */}
      <section
        aria-labelledby="why-sell-heading"
        className="bg-muted/40 py-14"
      >
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              For sellers
            </span>
            <h2
              id="why-sell-heading"
              className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Why sell on {brand.shortName}?
            </h2>
          </div>
          <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {VENDOR_FEATURES.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center shadow-sm"
              >
                <div className="rounded-2xl bg-primary/10 p-4 text-primary">
                  <Icon className="size-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-base font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Apply CTA ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-8xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Ready to open your store?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Join independent vendors already selling on {brand.shortName}. Set up
          your store in minutes.
        </p>
        <Link
          href="/sell"
          className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Apply to become a vendor
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
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
      className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}
