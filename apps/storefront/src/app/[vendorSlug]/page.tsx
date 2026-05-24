import { isReservedSlug } from "@repo/config";
import type { PaginatedResponse, Product, Vendor } from "@repo/types";
import {
  BadgeCheck,
  CalendarDays,
  Globe,
  Mail,
  Package,
  Store,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/ProductCard";
import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";
import { VENDOR_BANNER_BY_SLUG } from "@/lib/vendor-banner";

interface Props {
  params: Promise<{ vendorSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const PAGE_SIZE = 24;

// Vendor profile pages are stable — cache for 5 minutes.
export const revalidate = 300;

const GRADIENTS = [
  "from-violet-600 to-purple-600",
  "from-blue-600 to-cyan-600",
  "from-emerald-600 to-teal-600",
  "from-amber-600 to-orange-600",
  "from-rose-600 to-pink-600",
];

function vendorGradient(name: string) {
  const sum = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENTS[sum % GRADIENTS.length]!;
}

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatMemberSince(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vendorSlug } = await params;
  if (isReservedSlug(vendorSlug)) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const vendor = await apiFetch<Vendor>(
    `/storefront/vendors/${vendorSlug}`,
    { revalidate: 300, tags: [`vendor:${vendorSlug}`] }
  ).catch(() => null);
  if (!vendor) {
    return { title: "Vendor not found", robots: { index: false, follow: false } };
  }

  const title = vendor.seoTitle ?? `${vendor.name} — ${brand.shortName}`;
  const description =
    vendor.seoDescription ??
    vendor.bio ??
    `Shop products from ${vendor.name} on ${brand.shortName}.`;
  const canonical = `${SITE_URL}/${vendorSlug}`;
  const og = vendor.bannerUrl ?? vendor.logoUrl ?? undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      ...(og ? { images: [{ url: og, alt: vendor.name }] } : {}),
    },
    twitter: {
      title,
      description,
      card: og ? "summary_large_image" : "summary",
      ...(og ? { images: [og] } : {}),
    },
  };
}

type StorefrontProduct = Product & {
  featuredImage?: { url: string; altText?: string } | null;
  lowestPrice?: number | null;
};

export default async function VendorStorePage({ params, searchParams }: Props) {
  const { vendorSlug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  if (isReservedSlug(vendorSlug)) notFound();

  const vendor = await apiFetch<Vendor>(
    `/storefront/vendors/${vendorSlug}`,
    { revalidate: 300, tags: [`vendor:${vendorSlug}`] }
  ).catch(() => null);
  if (!vendor || vendor.status !== "active") notFound();

  // Server-side product fetch by vendorId — paginated.
  const productParams = new URLSearchParams();
  productParams.set("vendorId", vendor.id);
  productParams.set("limit", String(PAGE_SIZE));
  productParams.set("page", String(page));
  productParams.set("sort", "created_at_desc");

  const productResult = await apiFetch<PaginatedResponse<StorefrontProduct>>(
    `/storefront/products?${productParams.toString()}`,
    { revalidate: 60, tags: [`vendor:${vendor.id}:products`] }
  ).catch(() => null);

  const products = productResult?.data ?? [];
  const totalProducts = productResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const gradient = vendorGradient(vendor.name);
  const initials = getInitials(vendor.name);

  function buildHref(p: number): string {
    return p === 1 ? `/${vendorSlug}` : `/${vendorSlug}?page=${p}`;
  }

  // JSON-LD for the vendor as a Store/Organization
  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: vendor.name,
    url: `${SITE_URL}/${vendor.slug}`,
    ...(vendor.logoUrl ? { logo: vendor.logoUrl } : {}),
    ...(vendor.bannerUrl ? { image: vendor.bannerUrl } : {}),
    ...(vendor.bio ? { description: vendor.bio } : {}),
    ...(vendor.websiteUrl ? { sameAs: [vendor.websiteUrl] } : {}),
    ...(vendor.primaryEmail
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            email: vendor.primaryEmail,
            contactType: "customer support",
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Vendors",
        item: `${SITE_URL}/vendors`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: vendor.name,
        item: `${SITE_URL}/${vendor.slug}`,
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <header className="border-b">
        <div className="mx-auto max-w-8xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/vendors" className="hover:text-foreground">
                  Vendors
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-foreground" aria-current="page">
                {vendor.name}
              </li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <div
              className={`relative size-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br shadow-sm sm:size-24 ${gradient}`}
            >
              {vendor.logoUrl ? (
                <Image
                  src={vendor.logoUrl}
                  alt={`${vendor.name} logo`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white select-none">
                  {initials}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1
                className="truncate text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {vendor.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300">
                  <BadgeCheck className="size-3" aria-hidden />
                  Verified vendor
                </span>
                {totalProducts > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground/80 ring-1 ring-border">
                    <Package className="size-3" aria-hidden />
                    {totalProducts} product{totalProducts === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-8xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr] lg:gap-12">
          {/* ── Sidebar — vendor info ───────────────────────────────────── */}
          <aside aria-label="Vendor information" className="lg:sticky lg:top-24 lg:self-start">
            {vendor.bio && (
              <section aria-labelledby="about-heading">
                <h2
                  id="about-heading"
                  className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  About
                </h2>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {vendor.bio}
                </p>
              </section>
            )}

            <section aria-labelledby="details-heading" className="mt-6">
              <h2 id="details-heading" className="sr-only">
                Vendor details
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Store
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Store
                    </dt>
                    <dd>@{vendor.slug}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Member since
                    </dt>
                    <dd>{formatMemberSince(vendor.createdAt)}</dd>
                  </div>
                </div>

                {vendor.websiteUrl && (
                  <div className="flex items-start gap-2">
                    <Globe
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Website
                      </dt>
                      <dd>
                        <a
                          href={vendor.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-primary underline-offset-2 hover:underline"
                        >
                          {vendor.websiteUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {vendor.supportEmail && (
                  <div className="flex items-start gap-2">
                    <Mail
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Support
                      </dt>
                      <dd>
                        <a
                          href={`mailto:${vendor.supportEmail}`}
                          className="break-all text-primary underline-offset-2 hover:underline"
                        >
                          {vendor.supportEmail}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </section>
          </aside>

          {/* ── Products ─────────────────────────────────────────────────── */}
          <section aria-labelledby="products-heading">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="products-heading"
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Products by {vendor.name}
              </h2>
              {totalPages > 1 && (
                <p className="text-xs text-muted-foreground">
                  Page <strong className="text-foreground">{page}</strong> of{" "}
                  {totalPages}
                </p>
              )}
            </div>

            {products.length > 0 ? (
              <>
                <ul
                  role="list"
                  className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {products.map((product, i) => (
                    <li key={product.id}>
                      <ProductCard
                        product={product}
                        list="vendor_storefront"
                        priority={i < 4}
                      />
                    </li>
                  ))}
                </ul>

                {totalPages > 1 && (
                  <nav
                    aria-label="Pagination"
                    className="mt-12 flex items-center justify-center gap-1.5"
                  >
                    <PageLink
                      href={hasPrev ? buildHref(page - 1) : undefined}
                      rel="prev"
                      ariaLabel="Previous page"
                    >
                      ← Prev
                    </PageLink>
                    {Array.from(
                      { length: Math.min(5, totalPages) },
                      (_, i) => {
                        const p =
                          Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                        if (p < 1 || p > totalPages) return null;
                        const isCurrent = p === page;
                        return (
                          <Link
                            key={p}
                            href={buildHref(p)}
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
                      }
                    )}
                    <PageLink
                      href={hasNext ? buildHref(page + 1) : undefined}
                      rel="next"
                      ariaLabel="Next page"
                    >
                      Next →
                    </PageLink>
                  </nav>
                )}
              </>
            ) : (
              <div
                role="status"
                className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-secondary/30 py-16 text-center"
              >
                <Package
                  className="size-10 text-muted-foreground"
                  aria-hidden
                />
                <p className="font-medium text-muted-foreground">
                  No products yet
                </p>
                <p className="-mt-1 text-sm text-muted-foreground">
                  This vendor hasn&apos;t listed any products yet — check back
                  soon.
                </p>
                <Link
                  href="/vendors"
                  className="mt-2 inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Browse other vendors
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
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
