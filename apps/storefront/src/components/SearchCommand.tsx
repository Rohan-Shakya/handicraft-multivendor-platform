"use client";

/**
 * Top-anchored command-palette search.
 *
 * Design choices:
 *  - Drops from the top edge (not a centered modal) — matches the mental model
 *    of "pulling down a search drawer", Algolia DocSearch / Linear style.
 *  - Two-column layout on ≥ md: left rail = quick actions + recent/trending,
 *    right pane = live results. On mobile it stacks.
 *  - Data source is the regular products list endpoint (`/storefront/products
 *    ?search=`). This always works regardless of Meilisearch state, so a fresh
 *    template install has working search immediately.
 */

import {
  ArrowRight,
  Clock,
  Loader2,
  Package,
  Search,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";

import { track } from "@/hooks/useAnalytics";
import { useDebounce } from "@/hooks/useDebounce";
import { apiFetch } from "@/lib/api";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProductHit {
  id: string;
  title: string;
  handle: string;
  featuredImage?: { url: string; altText?: string } | null;
  lowestPrice?: number | null;
  currencyCode?: string | null;
  vendor?: { name: string; slug: string } | null;
}

interface VendorHit {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

interface CollectionHit {
  id: string;
  title: string;
  handle: string;
}

const RECENT_KEY = "search_recent";
const MAX_RECENT = 6;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function writeRecent(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [products, setProducts] = React.useState<ProductHit[]>([]);
  const [vendors, setVendors] = React.useState<VendorHit[]>([]);
  const [collections, setCollections] = React.useState<CollectionHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recent, setRecent] = React.useState<string[]>([]);
  const debounced = useDebounce(query, 180);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Focus input whenever panel opens; clear state on close.
  React.useEffect(() => {
    if (open) {
      setRecent(readRecent());
      // next tick so the portal is mounted
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setProducts([]);
      setVendors([]);
      setCollections([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Full collection list cached once — fetched on first open so we can
  // filter locally for the "Collections" result group without a round-trip
  // per keystroke. The backend listing endpoint ignores `?search=`.
  const [allCollections, setAllCollections] = React.useState<CollectionHit[] | null>(
    null
  );
  React.useEffect(() => {
    if (!open || allCollections) return;
    apiFetch<{ data: CollectionHit[] } | CollectionHit[]>(
      "/storefront/collections?limit=50"
    )
      .then((raw) =>
        setAllCollections(Array.isArray(raw) ? raw : raw.data ?? [])
      )
      .catch(() => setAllCollections([]));
  }, [open, allCollections]);

  // Live product results — driven by the relevance-weighted Postgres ILIKE
  // search at `/storefront/search`. Matches against title / description /
  // excerpt / brand / productType / tags / vendor name with a CASE-weighted
  // ORDER BY, then de-dupes vendors out of the hit list for the "Vendors"
  // section. The route caches by query for 60s.
  React.useEffect(() => {
    const q = debounced.trim();
    if (!q) {
      setProducts([]);
      setVendors([]);
      setCollections([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    apiFetch<{
      hits: Array<{
        id: string;
        title: string;
        handle: string;
        vendorName: string;
        vendorSlug: string;
        minPrice: number;
        featuredImage: string | null;
      }>;
    }>(`/storefront/search?q=${encodeURIComponent(q)}&limit=8`, {
      signal: ctrl.signal,
    })
      .then((res) => {
        const hits = res.hits ?? [];
        // Reshape into the legacy ProductHit form so existing render JSX
        // doesn't need to change.
        setProducts(
          hits.map((h) => ({
            id: h.id,
            title: h.title,
            handle: h.handle,
            featuredImage: h.featuredImage ? { url: h.featuredImage } : null,
            lowestPrice: h.minPrice ?? null,
            vendor: h.vendorSlug
              ? { name: h.vendorName, slug: h.vendorSlug }
              : null,
          }))
        );

        const seen = new Set<string>();
        const vs: VendorHit[] = [];
        for (const h of hits) {
          if (!h.vendorSlug) continue;
          const nameMatch = h.vendorName.toLowerCase().includes(q.toLowerCase());
          if (nameMatch && !seen.has(h.vendorSlug)) {
            seen.add(h.vendorSlug);
            vs.push({ id: h.vendorSlug, name: h.vendorName, slug: h.vendorSlug });
          }
        }
        setVendors(vs.slice(0, 4));
      })
      .catch(() => {
        setProducts([]);
        setVendors([]);
      })
      .finally(() => setLoading(false));

    // Collection filter runs locally against the cached list.
    const needle = q.toLowerCase();
    const matching =
      allCollections?.filter((c) =>
        c.title.toLowerCase().includes(needle)
      ) ?? [];
    setCollections(matching.slice(0, 4));

    return () => ctrl.abort();
  }, [debounced, allCollections]);

  const trending = [
    "Buddha",
    "Singing bowl",
    "Bronze",
    "Wood carving",
    "Hand-cast",
    "Tara",
  ];

  function submit(q: string) {
    const query = q.trim();
    if (!query) return;
    const next = [query, ...recent.filter((r) => r !== query)].slice(0, MAX_RECENT);
    writeRecent(next);
    setRecent(next);
    track("search", { search_term: query });
    router.push(`/products?q=${encodeURIComponent(query)}`);
    onOpenChange(false);
  }

  function removeRecent(term: string) {
    const next = recent.filter((r) => r !== term);
    writeRecent(next);
    setRecent(next);
  }

  const hasQuery = query.trim().length > 0;
  const hasResults =
    products.length > 0 || vendors.length > 0 || collections.length > 0;

  if (typeof document === "undefined") return null;
  if (!open) return null;

  // Render into a portal so the panel escapes any stacking context in the header.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close search"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-md animate-in fade-in-0 duration-200"
      />

      {/* Panel — anchored near the top */}
      <div
        className={cn(
          "relative mt-16 sm:mt-20 w-[min(100%,960px)] mx-4 h-fit max-h-[min(80vh,720px)]",
          "overflow-hidden rounded-lg border border-border/60 bg-card text-card-foreground shadow-2xl ring-1 ring-black/5",
          "animate-in slide-in-from-top-4 fade-in-0 duration-200 ease-out"
        )}
      >
        {/* Search input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(query);
          }}
          className="flex items-center gap-3 border-b px-5 py-4"
        >
          <Search className="size-5 text-muted-foreground shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            aria-label="Search products, vendors, and collections"
            className="flex-1 bg-transparent text-base sm:text-lg placeholder:text-muted-foreground/70 focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
            style={{ outline: "none" }}
          />
          {loading && (
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              aria-hidden
            />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear query"
              className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded border bg-muted/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
            ESC
          </kbd>
        </form>

        {/* Body */}
        <div className="grid max-h-[calc(min(80vh,720px)-130px)] grid-cols-1 overflow-hidden md:grid-cols-[240px_1fr]">
          {/* Left rail */}
          <aside className="hidden border-r bg-muted/30 md:flex md:flex-col">
            <nav className="flex-1 overflow-y-auto p-3">
              {recent.length > 0 && (
                <Section
                  title="Recent"
                  icon={<Clock className="size-3.5" aria-hidden />}
                >
                  <ul className="space-y-0.5">
                    {recent.map((r) => (
                      <li key={r} className="group flex items-center">
                        <button
                          type="button"
                          onClick={() => submit(r)}
                          className="flex-1 truncate rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                        >
                          {r}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${r}`}
                          onClick={() => removeRecent(r)}
                          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section
                title="Trending"
                icon={<TrendingUp className="size-3.5" aria-hidden />}
              >
                <div className="flex flex-wrap gap-1.5 px-1 py-1">
                  {trending.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => submit(t)}
                      className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Section>

              <Section
                title="Quick links"
                icon={<Sparkles className="size-3.5" aria-hidden />}
              >
                <ul className="space-y-0.5">
                  <QuickLink
                    href="/products"
                    label="All products"
                    onNavigate={() => onOpenChange(false)}
                  />
                  <QuickLink
                    href="/products?sort=created_at_desc"
                    label="New arrivals"
                    onNavigate={() => onOpenChange(false)}
                  />
                  <QuickLink
                    href="/products?onSale=1"
                    label="On sale"
                    onNavigate={() => onOpenChange(false)}
                  />
                  <QuickLink
                    href="/vendors"
                    label="Vendors"
                    onNavigate={() => onOpenChange(false)}
                  />
                </ul>
              </Section>
            </nav>
          </aside>

          {/* Right: results */}
          <div className="overflow-y-auto">
            {!hasQuery ? (
              <Introduction />
            ) : loading && !hasResults ? (
              <LoadingState />
            ) : !hasResults ? (
              <EmptyResults query={query} onSearchAnyway={() => submit(query)} />
            ) : (
              <div className="divide-y">
                {products.length > 0 && (
                  <ResultGroup
                    title="Products"
                    icon={<Package className="size-3.5" aria-hidden />}
                    count={products.length}
                    seeAllHref={`/products?q=${encodeURIComponent(query)}`}
                    onNavigate={() => onOpenChange(false)}
                  >
                    <ul className="grid gap-1 p-2 sm:grid-cols-2">
                      {products.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/products/${p.handle}`}
                            onClick={() => onOpenChange(false)}
                            className="group flex items-center gap-3.5 rounded-md p-2 transition-all hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <div className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/50">
                              {p.featuredImage?.url ? (
                                <Image
                                  src={p.featuredImage.url}
                                  alt={p.featuredImage.altText ?? p.title}
                                  fill
                                  sizes="48px"
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="size-4 text-muted-foreground/40" aria-hidden />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold leading-tight transition-colors group-hover:text-primary">
                                {p.title}
                              </p>
                              {p.lowestPrice != null && (
                                <p className="mt-0.5 text-xs font-medium tabular text-muted-foreground">
                                  {formatPrice(
                                    p.lowestPrice,
                                    p.currencyCode ?? getPlatformCurrency()
                                  )}
                                </p>
                              )}
                            </div>
                            <ArrowRight
                              className="size-4 shrink-0 text-muted-foreground/40 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                              aria-hidden
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </ResultGroup>
                )}

                {collections.length > 0 && (
                  <ResultGroup
                    title="Collections"
                    icon={<Tag className="size-3.5" aria-hidden />}
                    count={collections.length}
                  >
                    <ul className="flex flex-wrap gap-1.5 p-3">
                      {collections.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/collections/${c.handle}`}
                            onClick={() => onOpenChange(false)}
                            className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                          >
                            {c.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </ResultGroup>
                )}

                {vendors.length > 0 && (
                  <ResultGroup
                    title="Vendors"
                    icon={<Store className="size-3.5" aria-hidden />}
                    count={vendors.length}
                  >
                    <ul className="grid gap-1 p-2 sm:grid-cols-2">
                      {vendors.map((v) => (
                        <li key={v.id}>
                          <Link
                            href={`/${v.slug}`}
                            onClick={() => onOpenChange(false)}
                            className="group flex items-center gap-3 rounded-md p-2 transition-all hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-muted to-muted/40 ring-1 ring-border/60">
                              {v.logoUrl ? (
                                <Image
                                  src={v.logoUrl}
                                  alt={v.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {v.name.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                              {v.name}
                            </span>
                            <ArrowRight
                              className="ml-auto size-4 shrink-0 text-muted-foreground/40 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                              aria-hidden
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </ResultGroup>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              Press{" "}
              <kbd className="rounded border bg-background px-1">Enter</kbd> to
              search
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              <kbd className="rounded border bg-background px-1">Esc</kbd> to
              close
            </span>
          </div>
          <Link
            href="/products"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-1 font-medium hover:text-foreground"
          >
            Browse all products
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="flex items-center gap-1.5 px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function QuickLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-background"
      >
        <span>{label}</span>
        <ArrowRight
          className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </Link>
    </li>
  );
}

function ResultGroup({
  title,
  icon,
  count,
  children,
  seeAllHref,
  onNavigate,
}: {
  title: string;
  icon?: React.ReactNode;
  count: number;
  children: React.ReactNode;
  seeAllHref?: string;
  onNavigate?: () => void;
}) {
  return (
    <section>
      <header className="flex items-center justify-between px-4 pt-3 pb-1">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
          <span className="rounded-full bg-muted px-1.5 py-[1px] text-[10px] font-semibold text-foreground/80">
            {count}
          </span>
        </p>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            onClick={onNavigate}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            See all
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function Introduction() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center md:py-20">
      <div className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary">
        <Sparkles className="size-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold">Search across the marketplace</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Products, vendors, and collections — all in one place.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden /> Searching…
    </div>
  );
}

function EmptyResults({
  query,
  onSearchAnyway,
}: {
  query: string;
  onSearchAnyway: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-lg bg-muted">
        <Search className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold">
          No results for{" "}
          <span className="text-foreground">&ldquo;{query}&rdquo;</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try a shorter query, or search the full catalog.
        </p>
      </div>
      <button
        type="button"
        onClick={onSearchAnyway}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        Search all products
        <ArrowRight className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
