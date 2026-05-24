import type {
  Blog,
  Collection,
  PaginatedResponse,
  Product,
  Vendor,
} from "@repo/types";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Gift,
  Headphones,
  Newspaper,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BlogPostCard } from "@/components/BlogPostCard";
import { type ActiveCampaign, CampaignBanner } from "@/components/CampaignBanner";
import { type HeroSlide,HomeHeroCarousel } from "@/components/HomeHeroCarousel";
import { HomepageNewsletterForm } from "@/components/HomepageNewsletterForm";
import { HorizontalRail } from "@/components/HorizontalRail";
import { PressTestimonialClient } from "@/components/PressTestimonialClient";
import { ProductCard } from "@/components/ProductCard";
import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";
import { type BlogPostFull,unwrapBlog } from "@/lib/blog";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} — ${brand.tagline}` },
  description: brand.tagline,
};

// Homepage data refreshes hourly — listings change but not on a per-second
// basis. Tags allow on-demand revalidation when a vendor publishes a product.
export const revalidate = 60;

type ProductWithDetails = Product & {
  featuredImage?: { url: string; altText?: string } | null;
  secondaryImage?: { url: string; altText?: string } | null;
  lowestPrice?: number | null;
  compareAtPrice?: number | null;
  defaultVariantId?: string | null;
  vendor?: { id: string; name: string; slug: string } | null;
};

type CollectionWithCount = Collection & {
  productCount?: number;
  image?: { url: string } | null;
};

type VendorBasic = Pick<Vendor, "id" | "name" | "slug" | "bio" | "logoUrl">;

// ─── Curated imagery ────────────────────────────────────────────────────────

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "new-collection",
    eyebrow: "New arrival",
    title: "Hand-cast with",
    emphasis: "devotion",
    titleAfter: ".",
    description:
      "Every sculpture carries the story of its foundry, lineage, and the masters who shaped it by hand.",
    cta: { label: "Shop the collection", href: "/products?sort=created_at_desc" },
    secondaryCta: { label: "Browse by tradition", href: "/collections" },
    image:
      "https://images.unsplash.com/photo-1613244773121-4952a9e3c06e?auto=format&fit=crop&w=2400&q=80",
  },
  {
    id: "atelier",
    eyebrow: "From the workshop",
    title: "The hands behind",
    emphasis: "every piece",
    titleAfter: ".",
    description:
      "Forged, hammered, and finished in Patan and Bhaktapur — each piece signed by the master artisan who made it.",
    cta: { label: "Meet our vendors", href: "/vendors" },
    secondaryCta: { label: "Read our story", href: "/pages/about" },
    image:
      "https://images.unsplash.com/photo-1686236589375-15fd83d4584e?auto=format&fit=crop&w=2400&q=80",
  },
  {
    id: "custom",
    eyebrow: "Custom commissions",
    title: "Your altar,",
    emphasis: "made to order",
    titleAfter: ".",
    description:
      "Bespoke statues, finishes, and ritual objects — cast or carved on request by master artisans.",
    cta: { label: "Start a commission", href: "/pages/contact" },
    secondaryCta: { label: "See past work", href: "/blogs" },
    image:
      "https://images.unsplash.com/photo-1618082645413-1a9a0a121e40?auto=format&fit=crop&w=2400&q=80",
  },
];

const TRUST_ITEMS = [
  { icon: Truck, label: "Free shipping over Rs 25,000" },
  { icon: RotateCcw, label: "14-day easy returns" },
  { icon: ShieldCheck, label: "Buyer protection" },
  { icon: Headphones, label: "Real human support" },
];

const NEWSLETTER_PERKS = [
  { icon: Sparkles, label: "Early access to drops" },
  { icon: Newspaper, label: "Stories from the workshop" },
  { icon: Gift, label: "Member-only offers" },
  { icon: CalendarDays, label: "Once a month, no more" },
];

const SHOP_BY_SIZE = [
  {
    label: "Shelf",
    sub: "Under 25 cm",
    href: "/products?size=S",
    image:
      "https://images.unsplash.com/photo-1767605533243-0f059f600e07?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Altar",
    sub: "25–45 cm",
    href: "/products?size=M",
    image:
      "https://images.unsplash.com/photo-1760256994268-ed4095fe5df5?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Statement",
    sub: "45–75 cm",
    href: "/products?size=L",
    image:
      "https://images.unsplash.com/photo-1544592218-b546f7b9ddb4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Monumental",
    sub: "75 cm +",
    href: "/products?size=XL",
    image:
      "https://images.unsplash.com/photo-1759367205561-62450bb66129?auto=format&fit=crop&w=1200&q=80",
  },
];

const COLLECTION_COVER_BY_HANDLE: Record<string, string> = {
  "featured-statues":
    "https://images.unsplash.com/photo-1771692820416-4b4634b82e9d?auto=format&fit=crop&w=1200&q=80",
  "traditional-nepali":
    "https://images.unsplash.com/flagged/photo-1576784865254-244acbfced40?auto=format&fit=crop&w=1200&q=80",
  "deity-sets":
    "https://images.unsplash.com/photo-1678593628844-6ea49dee8ce3?auto=format&fit=crop&w=1200&q=80",
};

const SOCIAL_IMAGES = [
  "https://images.unsplash.com/photo-1653246608458-c73f5f2fbe9f?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1698925436262-d4de6ef190c8?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1639744413266-59619fb07e59?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1575656944421-dc53b43c8c07?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1649876673831-02f0f94d7a7f?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1597228986273-33b60fe1fc88?auto=format&fit=crop&w=600&q=80",
];

const TESTIMONIALS = [
  {
    quote:
      "A serious source for hand-cast Himalayan sculpture that feels like heirlooms — minus the dealer-room hush.",
    source: "Architectural Digest",
  },
  {
    quote:
      "Provenance you can actually trace. Foundry to altar, with photographs and artisan names.",
    source: "Wallpaper*",
  },
  {
    quote:
      "Finally a marketplace that pays its artisans what the work is worth.",
    source: "World of Interiors",
  },
];

const FALLBACK_BLOG_HANDLES = ["journal", "vendor-stories", "guides", "news"];

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Fan out every homepage fetch in one Promise.allSettled — including the
  // journal lookups across known blog handles (previously a sequential `for`
  // loop that serialised up to 8 round-trips). Cached for 60s.
  const [
    featuredRaw,
    newArrivalsRaw,
    collectionsRaw,
    vendorsRaw,
    journalPerHandle,
    campaignRaw,
  ] = await Promise.allSettled([
    apiFetch<PaginatedResponse<ProductWithDetails>>(
      "/storefront/products?limit=8",
      { revalidate: 60, tags: ["home:featured"] }
    ),
    apiFetch<PaginatedResponse<ProductWithDetails>>(
      "/storefront/products?limit=4&sort=created_at_desc",
      { revalidate: 60, tags: ["home:new"] }
    ),
    apiFetch<PaginatedResponse<CollectionWithCount> | CollectionWithCount[]>(
      "/storefront/collections?limit=6",
      { revalidate: 300, tags: ["collections"] }
    ),
    apiFetch<PaginatedResponse<VendorBasic> | VendorBasic[]>(
      "/storefront/vendors?limit=3",
      { revalidate: 300, tags: ["vendors"] }
    ),
    // Parallel lookup across all journal handles; each combo of (blog meta,
    // 3 latest posts) fetched concurrently. The previous serial loop blocked
    // every homepage render on up to 8 round-trips, most returning 404.
    Promise.all(
      FALLBACK_BLOG_HANDLES.map(async (handle) => {
        const [blogMeta, posts] = await Promise.all([
          apiFetch<unknown>(`/storefront/blogs/${handle}`, {
            revalidate: 600,
          }).catch(() => null),
          apiFetch<PaginatedResponse<BlogPostFull>>(
            `/storefront/blogs/${handle}/posts?limit=3`,
            { revalidate: 300, tags: [`blog:${handle}:posts`] }
          ).catch(() => null),
        ]);
        const blog = unwrapBlog<Blog>(blogMeta);
        if (!blog || !posts?.data?.length) return [];
        return posts.data.map((p) => ({ ...p, blogHandle: handle }));
      })
    ),
    apiFetch<{ campaign: ActiveCampaign | null }>(
      "/storefront/campaigns/active",
      { revalidate: 60, tags: ["campaigns:active"] }
    ),
  ]);

  const featured =
    featuredRaw.status === "fulfilled" ? featuredRaw.value.data : [];
  const newArrivals =
    newArrivalsRaw.status === "fulfilled" ? newArrivalsRaw.value.data : [];

  const collectionsValue =
    collectionsRaw.status === "fulfilled" ? collectionsRaw.value : null;
  const collections: CollectionWithCount[] = collectionsValue
    ? Array.isArray(collectionsValue)
      ? collectionsValue
      : collectionsValue.data
    : [];

  const vendorsValue = vendorsRaw.status === "fulfilled" ? vendorsRaw.value : null;
  const vendors: VendorBasic[] = vendorsValue
    ? Array.isArray(vendorsValue)
      ? vendorsValue
      : vendorsValue.data
    : [];

  const latestPosts =
    journalPerHandle.status === "fulfilled"
      ? journalPerHandle.value.flat().slice(0, 3)
      : [];

  const activeCampaign =
    campaignRaw.status === "fulfilled" ? campaignRaw.value.campaign : null;

  return (
    <>
      {activeCampaign && (
        <div className="mx-auto max-w-8xl px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
          <CampaignBanner campaign={activeCampaign} surface="homepage" />
        </div>
      )}

      {/* ── Hero carousel ────────────────────────────────────────── */}
      <HomeHeroCarousel slides={HERO_SLIDES} />

      {/* ── Trust strip ─────────────────────────────────────────── */}
      <section
        aria-label="Customer guarantees"
        className="border-b bg-card"
      >
        <ul className="mx-auto grid max-w-8xl grid-cols-2 gap-px bg-border px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center justify-center gap-3 bg-card px-3 py-5 text-sm transition-colors hover:bg-secondary/40"
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                aria-hidden
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="font-medium tracking-tight">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Shop by collection (horizontal) ─────────────────────── */}
      {collections.length > 0 && (
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
            <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Curated edits
                </p>
                <h2
                  className="mt-2 text-4xl font-medium tracking-[-0.01em] sm:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Shop by collection
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

            <HorizontalRail
              ariaLabel="Featured collections"
              className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
            >
              {collections.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/collections/${c.handle}`}
                  className="group relative aspect-[4/5] w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl bg-muted sm:w-[46%] lg:w-[31.5%]"
                >
                  <Image
                    src={
                      COLLECTION_COVER_BY_HANDLE[c.handle] ??
                      c.image?.url ??
                      `https://loremflickr.com/900/1100/${encodeURIComponent(
                        c.handle.replace(/-/g, ",")
                      )}?lock=${300 + i}`
                    }
                    alt={c.title}
                    fill
                    sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 31vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-transparent to-transparent" />
                  <div className="absolute inset-x-6 bottom-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      {c.title}
                      <ArrowRight className="size-3" aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </HorizontalRail>
          </div>
        </section>
      )}

      {/* ── Best sellers ────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="border-t bg-secondary/30 py-20 lg:py-24">
          <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
            <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                  Best sellers
                </p>
                <h2
                  className="mt-2 text-4xl font-medium tracking-[-0.01em] sm:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  The classics
                </h2>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 border-b border-foreground/40 pb-0.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                Shop all {brand.productNounPlural}
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </header>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} list="home_featured" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Shop by size ────────────────────────────────────────── */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <header className="mb-10 max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Buying guide
            </p>
            <h2
              className="mt-2 text-4xl font-medium tracking-[-0.01em] sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Shop by size.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              The fastest way to narrow down — pick the space, pick the scale,
              pick the piece.
            </p>
          </header>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {SHOP_BY_SIZE.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className="group block overflow-hidden rounded-3xl bg-muted"
                >
                  <div className="relative aspect-[5/6]">
                    <Image
                      src={s.image}
                      alt={s.label}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
                    <div className="absolute inset-x-5 bottom-5 text-background">
                      <p
                        className="text-2xl font-medium tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {s.label}
                      </p>
                      <p className="text-xs text-background/80">{s.sub}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Editorial breakout (atelier story) ──────────────────── */}
      <section
        className="bg-cream py-20 lg:py-24"
        aria-labelledby="story-heading"
      >
        <div className="mx-auto grid max-w-8xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16 lg:px-8">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
            <Image
              src="https://images.unsplash.com/photo-1760894192884-37a7037200ba?auto=format&fit=crop&w=1400&q=80"
              alt={`${brand.shortName} artisan partners at the workshop`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream-foreground/70">
              Our craft
            </p>
            <h2
              id="story-heading"
              className="mt-3 text-4xl font-medium leading-[1.05] tracking-[-0.01em] text-cream-foreground sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Hand-made by people who care.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-cream-foreground/80">
              Every piece in our collection is sourced directly from the
              foundries and workshops where it was made. We pay fair wages, tell
              the artisan&apos;s story, and stand behind every piece for life.
            </p>
            <dl className="mt-8 grid max-w-md grid-cols-3 gap-6 border-t border-cream-foreground/10 pt-8">
              <Stat value="3" label="Workshops" />
              <Stat value="50+" label="Pieces" />
              <Stat value="100%" label="Fair-trade" />
            </dl>
            <Link
              href="/pages/about"
              className="mt-8 inline-flex w-fit items-center gap-1.5 border-b border-cream-foreground pb-0.5 text-sm font-semibold text-cream-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Read our story
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Designer spotlight ──────────────────────────────────── */}
      {vendors.length > 0 && (
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
            <header className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                The makers
              </p>
              <h2
                className="mt-3 text-4xl font-medium tracking-[-0.01em] sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Master artisans
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                Family workshops across Patan, Bhaktapur, and Thamel — each piece
                cast, hammered, and finished by the hands you see here.
              </p>
            </header>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {vendors.slice(0, 3).map((v, i) => (
                <Link
                  key={v.id}
                  href={`/${v.slug}`}
                  className="group block focus-visible:outline-none"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-muted">
                    <Image
                      src={
                        v.logoUrl ??
                        [
                          "https://images.unsplash.com/photo-1528717384022-f8d665c86909?auto=format&fit=crop&w=1100&q=80",
                          "https://images.unsplash.com/photo-1763475945300-02cf0355b078?auto=format&fit=crop&w=1100&q=80",
                          "https://images.unsplash.com/photo-1674481705500-ca0d71702534?auto=format&fit=crop&w=1100&q=80",
                        ][i % 3]
                      }
                      alt={v.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-3">
                    <div>
                      <h3
                        className="text-xl font-medium tracking-tight transition-colors group-hover:text-primary sm:text-2xl"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {v.name}
                      </h3>
                      {v.bio && (
                        <p className="mt-1.5 line-clamp-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                          {v.bio}
                        </p>
                      )}
                    </div>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowUpRight className="size-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── New arrivals ────────────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section className="border-t bg-secondary/30 py-20 lg:py-24">
          <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
            <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                  Just in
                </p>
                <h2
                  className="mt-2 text-4xl font-medium tracking-[-0.01em] sm:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  New arrivals
                </h2>
              </div>
              <Link
                href="/products?sort=created_at_desc"
                className="inline-flex items-center gap-1.5 border-b border-foreground/40 pb-0.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                See everything new
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </header>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {newArrivals.slice(0, 4).map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  list="home_new_arrivals"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Press marquee / testimonial slider ──────────────────── */}
      <section className="bg-foreground py-16 text-background lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-background/60">
            From the press
          </p>
          <PressTestimonial />
        </div>
      </section>

      {/* ── Journal teasers ─────────────────────────────────────── */}
      {latestPosts.length > 0 && (
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
            <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Editorial
                </p>
                <h2
                  className="mt-2 text-4xl font-medium tracking-[-0.01em] sm:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  From the journal
                </h2>
              </div>
              <Link
                href="/blogs"
                className="inline-flex items-center gap-1.5 border-b border-foreground/40 pb-0.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                All stories
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </header>
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
              {latestPosts.map((p) => (
                <BlogPostCard
                  key={p.id}
                  post={p}
                  blogHandle={p.blogHandle}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── #BrandHome social grid ──────────────────────────────── */}
      <section className="border-t bg-secondary/30 py-20 lg:py-24">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <header className="mb-10 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Share your setup
            </p>
            <h2
              className="mt-3 text-4xl font-medium tracking-[-0.01em] sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              #{brand.shortName.replace(/\s+/g, "")}Home
            </h2>
          </header>
          <ul
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6"
            aria-label={`Customer photos tagged #${brand.shortName.replace(/\s+/g, "")}Home`}
          >
            {SOCIAL_IMAGES.map((src, i) => (
              <li
                key={src}
                className={
                  i === 0 || i === 4
                    ? "relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted lg:col-span-2 lg:row-span-2 lg:aspect-square"
                    : "relative aspect-square overflow-hidden rounded-2xl bg-muted"
                }
              >
                <Image
                  src={src}
                  alt={`Handicraft sculpture styled in a customer's home — photo ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-transform duration-700 hover:scale-[1.05]"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Newsletter ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-cream pt-20 pb-12 lg:pt-28 lg:pb-16">
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

        <div className="relative mx-auto max-w-xl px-5 text-center sm:px-6 lg:max-w-2xl lg:px-8">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            <span aria-hidden className="h-px w-6 bg-primary/60" />
            The dispatch
            <span aria-hidden className="h-px w-6 bg-primary/60" />
          </p>
          <h2
            className="mt-5 text-4xl font-medium leading-[1.05] tracking-[-0.015em] sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Be the first{" "}
            <span className="italic text-primary">to know.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-cream-foreground/75 sm:text-base lg:mt-5 lg:max-w-lg lg:text-lg">
            Once a month, we share new arrivals, vendor stories from the
            workshop, and member-only offers. Slow, considered — never spammy.
          </p>

          <ul className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-x-5 gap-y-3 lg:mt-10 lg:max-w-xl lg:gap-x-7">
            {NEWSLETTER_PERKS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 whitespace-nowrap text-sm"
              >
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15"
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="font-medium tracking-tight text-foreground/90">
                  {label}
                </span>
              </li>
            ))}
          </ul>

          <div className="mx-auto mt-7 max-w-md lg:mt-9">
            <HomepageNewsletterForm />
          </div>

          <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt
        className="text-3xl font-medium tabular text-cream-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </dt>
      <dd className="mt-1 text-xs uppercase tracking-[0.18em] text-cream-foreground/60">
        {label}
      </dd>
    </div>
  );
}

/**
 * Auto-rotating press quotes. A small client island so the rest of the home
 * page stays a server component.
 */
function PressTestimonial() {
  return <PressTestimonialClient items={TESTIMONIALS} />;
}
