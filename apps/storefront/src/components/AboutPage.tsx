import { ArrowRight, ArrowUpRight, Mail, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { brand } from "@/config/brand";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2000&q=80";

const STORY_IMAGE =
  "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1400&q=80";

const ATELIER_IMAGES = [
  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=900&q=80",
];

const VALUES = [
  {
    title: "Hand-cast, hand-carved, never machine-made",
    body: "Every sculpture in our collection is made by hand — lost-wax cast in brass and bronze, or carved from wood and stone. We source directly from the workshops where each piece is created, with full provenance.",
  },
  {
    title: "Fair-trade, fair-wage",
    body: "We pay our artisan workshops 30–60% above the Nepali living wage and visit each one personally several times a year. Sourcing relationships are decade-long, not transactional.",
  },
  {
    title: "Built to outlast trends",
    body: "A well-cast bronze becomes an heirloom. We sell pieces designed to last hundreds of years — with care advice and restoration partners in every region we ship to.",
  },
] as const;

const STATS = [
  { value: "30+", label: "Workshop partners" },
  { value: "4", label: "Craft traditions" },
  { value: "100%", label: "Fair-trade" },
  { value: "Lifetime", label: "Restoration support" },
] as const;

const ATELIERS = [
  {
    region: "Patan",
    country: "Nepal",
    note: "Lost-wax bronze and brass casters — Shakya families since the Malla dynasty.",
  },
  {
    region: "Bhaktapur",
    country: "Nepal",
    note: "Newari woodcarvers — sal and walnut, mandalas and ankhi-jhyal panels.",
  },
  {
    region: "Thamel",
    country: "Nepal",
    note: "Ritual mask carvers — Mahakala, Bhairab, Indra Jatra festival masks.",
  },
  {
    region: "Boudha",
    country: "Nepal",
    note: "Seven-metal singing bowls and engraved prayer wheels.",
  },
  {
    region: "Patan stoneyards",
    country: "Nepal",
    note: "Hand-carved black stone Buddhas and Tara figures.",
  },
  {
    region: "Bhaktapur stoneyards",
    country: "Nepal",
    note: "Marble Ganeshas and outdoor stone sculpture.",
  },
] as const;

export function AboutPage() {
  return (
    <>
      {/* JSON-LD: AboutPage + Organization snippet */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "AboutPage",
                name: `About ${brand.name}`,
                url: "/pages/about",
              },
              {
                "@type": "Organization",
                name: brand.name,
                description: brand.tagline,
                url: process.env.NEXT_PUBLIC_SITE_URL ?? "/",
                email: brand.contact.email,
                telephone: brand.contact.phone,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: brand.contact.address.streetAddress,
                  postalCode: brand.contact.address.postalCode,
                  addressLocality: brand.contact.address.addressLocality,
                  addressRegion: brand.contact.address.addressRegion,
                  addressCountry: brand.contact.address.addressCountry,
                },
              },
            ],
          }),
        }}
      />

      {/* ── Header ────────────────────────────────────────────────── */}
      <section className="border-b" aria-labelledby="about-heading">
        <div className="mx-auto max-w-8xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-12 lg:pt-16">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "About" }]}
          />
          <div className="mt-6 max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              About {brand.shortName}
            </p>
            <h1
              id="about-heading"
              className="mt-5 text-4xl font-medium leading-[1.05] tracking-[-0.01em] sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Hand-cast by people who care.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {brand.shortName} is a marketplace for hand-cast Buddhist and
              Hindu sculptures, Newari wood carvings, ritual masks, and
              singing bowls from the workshops of the Kathmandu Valley. We
              work directly with master artisans — paying fair wages, vetting
              provenance, and shipping with care.
            </p>
          </div>
        </div>
      </section>

      {/* ── Hero image ────────────────────────────────────────────── */}
      <section aria-hidden="true" className="pt-10 lg:pt-12">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="relative aspect-[16/7] overflow-hidden rounded-3xl bg-muted">
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1280px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Story ─────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-24" aria-labelledby="story-heading">
        <div className="mx-auto grid max-w-8xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16 lg:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Our story
            </p>
            <h2
              id="story-heading"
              className="mt-3 text-4xl font-medium tracking-[-0.01em] sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              We started with one question.
            </h2>
          </div>
          <div className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            <p>
              Why are heirloom Buddhist and Hindu sculptures so hard to buy
              well? In 2015 our founder spent six months travelling between
              the bronze foundries of Patan and the woodcarving sheds of
              Bhaktapur, and came back with a clear answer — most of the
              supply chain is opaque, artisans are paid the least, and the
              best pieces never make it to honest retail.
            </p>
            <p className="mt-4">
              We started {brand.shortName} to fix that. Direct relationships
              with named workshops, photographs from the bench, fair-wage
              guarantees, and a 30-day return policy that actually works —
              because we believe in the piece we sold you.
            </p>
            <p className="mt-4">
              A decade in, we partner with workshops across the Kathmandu
              Valley and ship to 40+ countries. Every piece is hand-finished.
              Every relationship is decade-long.
            </p>
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────── */}
      <section
        className="border-t bg-secondary/30 py-20 lg:py-24"
        aria-labelledby="values-heading"
      >
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <header className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              What we stand for
            </p>
            <h2
              id="values-heading"
              className="mt-3 text-3xl font-medium tracking-[-0.01em] sm:text-4xl lg:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Three principles, no compromise.
            </h2>
          </header>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {VALUES.map((v, i) => (
              <article
                key={v.title}
                className="rounded-3xl border bg-card p-7"
              >
                <p className="text-sm font-semibold tabular text-primary">
                  0{i + 1}
                </p>
                <h3
                  className="mt-3 text-xl font-medium tracking-tight sm:text-2xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {v.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {v.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats / Image breakout ────────────────────────────────── */}
      <section className="py-20 lg:py-24" aria-label="Key numbers">
        <div className="mx-auto grid max-w-8xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:px-8">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted lg:order-last">
            <Image
              src={STORY_IMAGE}
              alt={`${brand.shortName} workshop partners`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              By the numbers
            </p>
            <h2
              className="mt-3 text-4xl font-medium tracking-[-0.01em] sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Built on trust.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              We&apos;re proud of these numbers — and even prouder of the
              relationships and stories behind them.
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 border-t pt-10 sm:max-w-md">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt
                    className="text-4xl font-medium tracking-tight sm:text-5xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.value}
                  </dt>
                  <dd className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Atelier directory ────────────────────────────────────── */}
      <section
        className="border-t bg-cream py-20 lg:py-24"
        aria-labelledby="ateliers-heading"
      >
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cream-foreground/70">
                Where we source
              </p>
              <h2
                id="ateliers-heading"
                className="mt-3 text-4xl font-medium leading-tight tracking-[-0.01em] text-cream-foreground sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Four crafts, one valley.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-cream-foreground/80">
                A short tour of the places our artisan partners live and work.
              </p>
              <Link
                href="/vendors"
                className="mt-6 inline-flex items-center gap-1.5 border-b border-cream-foreground/40 pb-0.5 text-sm font-semibold text-cream-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Meet our vendors
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ATELIERS.map((a) => (
                <li
                  key={a.region}
                  className="rounded-2xl border border-cream-foreground/10 bg-card/60 p-5 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <p
                      className="text-base font-medium tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {a.region}
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cream-foreground/60">
                      {a.country}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-cream-foreground/75">
                    {a.note}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Atelier image strip */}
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {ATELIER_IMAGES.map((src, i) => (
              <div
                key={src}
                className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted"
              >
                <Image
                  src={src}
                  alt={`${brand.shortName} workshop ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quote / Press ─────────────────────────────────────────── */}
      <section className="bg-foreground py-20 text-background lg:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-background/60">
            From the press
          </p>
          <blockquote
            className="mt-6 text-2xl font-medium italic leading-snug tracking-[-0.01em] sm:text-3xl lg:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            &ldquo;A serious source for hand-cast Himalayan sculpture that
            feels like heirlooms — minus the dealer-room hush.&rdquo;
          </blockquote>
          <p className="mt-6 text-xs uppercase tracking-[0.22em] text-background/60">
            — Architectural Digest
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="border-t bg-secondary/30 py-20 lg:py-24">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="rounded-3xl border bg-card p-8 lg:p-10">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="size-5" aria-hidden />
              </div>
              <h2
                className="mt-5 text-2xl font-medium tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Visit our showroom
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Browse 200+ sculptures in person at{" "}
                {brand.contact.address.streetAddress},{" "}
                {brand.contact.address.addressLocality.split(" am ")[0]}.
                Walk-ins welcome.
              </p>
              <Link
                href="/pages/contact"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-background transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Plan a visit
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <div className="rounded-3xl border bg-card p-8 lg:p-10">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Mail className="size-5" aria-hidden />
              </div>
              <h2
                className="mt-5 text-2xl font-medium tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Talk to a human
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Sourcing a custom commission, after a specific region, or just
                stuck on size? Our team replies within one business day.
              </p>
              <Link
                href="/pages/contact"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get in touch
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
