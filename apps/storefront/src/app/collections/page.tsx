import type { Collection, PaginatedResponse } from "@repo/types";
import { ArrowUpRight, Compass, Layers, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionCard } from "@/components/CollectionCard";
import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const PAGE_TITLE = "Collections";
const PAGE_DESCRIPTION = `Curated edits of ${brand.productNounPlural} from ${brand.shortName} — explore themed groupings hand-picked by our atelier.`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/collections` },
  openGraph: {
    title: `${PAGE_TITLE} — ${brand.shortName}`,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/collections`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} — ${brand.shortName}`,
    description: PAGE_DESCRIPTION,
  },
};

type CollectionWithCount = Collection & {
  productCount?: number;
  image?: { url: string; altText?: string | null } | null;
};

const HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: "Hand-curated",
    body: "Every edit is hand-assembled by our team — no algorithmic shuffling.",
  },
  {
    icon: Compass,
    title: "Region & story",
    body: "Browse by origin, technique, mood, or use case. Pick your way in.",
  },
  {
    icon: Layers,
    title: "Cross-vendor",
    body: "Collections span our full vendor list, so you discover lesser-known ateliers.",
  },
];

// Collection list is the same for every visitor — cache for 5 minutes.
export const revalidate = 300;

export default async function CollectionsPage() {
  type CollectionsResponse =
    | PaginatedResponse<CollectionWithCount>
    | CollectionWithCount[];

  const raw = await apiFetch<CollectionsResponse>(
    "/storefront/collections",
    { revalidate: 300, tags: ["collections"] }
  ).catch(() => null);

  const collections: CollectionWithCount[] = raw
    ? Array.isArray(raw)
      ? raw
      : raw.data
    : [];

  const [feature, ...rest] = collections;
  const total = collections.length;

  // ── JSON-LD: CollectionPage + ItemList of collections ──────────────────────
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/collections`,
    isPartOf: {
      "@type": "WebSite",
      name: brand.name,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: collections.map((c, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${SITE_URL}/collections/${c.handle}`,
        name: c.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify handles encoding; safe.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        aria-labelledby="collections-heading"
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
            items={[{ label: "Home", href: "/" }, { label: "Collections" }]}
          />

          <div className="mt-5 max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
              <span aria-hidden className="h-px w-6 bg-primary/60" />
              Curated edits
            </p>
            <h1
              id="collections-heading"
              className="mt-3 text-3xl font-medium leading-[1.05] tracking-[-0.015em] text-cream-foreground sm:text-4xl lg:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Collections{" "}
              <span className="italic text-primary">worth keeping.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-foreground/75 sm:text-base">
              {total > 0 ? (
                <>
                  {total} themed edit{total === 1 ? "" : "s"} of{" "}
                  {brand.productNounPlural}, built around place, palette, and
                  use — so you can shortlist a room without scrolling the whole
                  catalogue.
                </>
              ) : (
                <>
                  Themed edits of {brand.productNounPlural} — built around
                  place, palette, and use, so you can shortlist a room without
                  scrolling the whole catalogue.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-8xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {collections.length > 0 ? (
          <>
            {/* Featured (first) collection — large editorial card */}
            {feature && (
              <section
                aria-label={`Featured collection — ${feature.title}`}
                className="mb-14 lg:mb-20"
              >
                <FeaturedCollection collection={feature} />
              </section>
            )}

            {/* Rest of collections — uniform grid */}
            {rest.length > 0 && (
              <section aria-label="All collections">
                <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      Browse all
                    </p>
                    <h2
                      className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Every edit
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rest.length} more{" "}
                    {rest.length === 1 ? "collection" : "collections"}
                  </p>
                </header>

                <ul
                  role="list"
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
                >
                  {rest.map((collection) => (
                    <li key={collection.id}>
                      <CollectionCard collection={collection} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Highlights / value props strip ── */}
            <section
              aria-label="Why our collections work"
              className="mt-20 border-t border-border pt-12 lg:mt-24 lg:pt-14"
            >
              <ul
                role="list"
                className="grid gap-8 sm:grid-cols-3 sm:gap-10"
              >
                {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex flex-col">
                    <span
                      aria-hidden
                      className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15"
                    >
                      <Icon className="size-5" />
                    </span>
                    <h3
                      className="mt-5 text-lg font-medium tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </>
  );
}

// ─── Featured (first) collection ──────────────────────────────────────────────

function FeaturedCollection({
  collection,
}: {
  collection: CollectionWithCount;
}) {
  const fallback = `https://loremflickr.com/2000/1100/${encodeURIComponent(
    collection.handle.replace(/-/g, ",")
  )}?lock=${collection.handle.length * 7}`;
  const src = collection.image?.url ?? fallback;
  const alt =
    collection.image?.altText ??
    `${collection.title} — featured collection cover`;
  const count = collection.productCount;

  return (
    <Link
      href={`/collections/${collection.handle}`}
      aria-label={`View the ${collection.title} collection${
        count != null ? ` — ${count} ${count === 1 ? "item" : "items"}` : ""
      }`}
      className="group relative block overflow-hidden rounded-3xl bg-muted ring-1 ring-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-[16/10] sm:aspect-[21/9]">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1280px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-tr from-foreground/75 via-foreground/30 to-transparent"
        />
        <span
          className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-background/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground shadow-sm backdrop-blur-sm"
          aria-hidden
        >
          <span className="size-1.5 rounded-full bg-primary" />
          Featured edit
        </span>

        <div className="absolute inset-x-5 bottom-5 flex flex-wrap items-end justify-between gap-4 text-background sm:inset-x-8 sm:bottom-8">
          <div className="max-w-2xl">
            <h2
              className="text-3xl font-medium leading-[1.1] tracking-[-0.01em] sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {collection.title}
            </h2>
            {collection.description && (
              <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-relaxed text-background/85 sm:text-base">
                {collection.description}
              </p>
            )}
            {count != null && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-background/80">
                {count} {count === 1 ? "piece" : "pieces"}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-transform group-hover:translate-x-0.5 sm:px-6 sm:py-3">
            Shop the edit
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-border py-24 text-center">
      <span
        aria-hidden
        className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15"
      >
        <Layers className="size-7" />
      </span>
      <div role="status" aria-live="polite">
        <h2 className="text-xl font-medium tracking-tight">
          No collections yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Collections are being curated. In the meantime, you can browse the
          full catalogue of {brand.productNounPlural}.
        </p>
      </div>
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Browse all {brand.productNounPlural}
        <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
