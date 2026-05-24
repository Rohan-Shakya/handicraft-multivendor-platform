import { Search as SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: `Search — ${brand.shortName}` };

interface SearchHit {
  id: string;
  title: string;
  handle: string;
  excerpt: string;
  vendorName: string;
  vendorSlug: string;
  minPrice: number;
  maxPrice: number;
  featuredImage: string | null;
  tags: string[];
  inStock: boolean;
}

interface SearchResult {
  hits: SearchHit[];
  totalHits: number;
  facets?: Record<string, Record<string, number>>;
  page: number;
  limit: number;
}

interface Props {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    brand?: string;
    vendor?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  let results: SearchResult = { hits: [], totalHits: 0, page: 1, limit: 20 };

  if (q.trim()) {
    const query = new URLSearchParams({ q, page: String(page), limit: "24" });
    if (params.sort) query.set("sort", params.sort);
    if (params.brand) query.set("brand", params.brand);
    if (params.vendor) query.set("vendor", params.vendor);
    if (params.minPrice) query.set("minPrice", params.minPrice);
    if (params.maxPrice) query.set("maxPrice", params.maxPrice);

    try {
      results = await apiFetch<SearchResult>(`/storefront/search?${query.toString()}`);
    } catch {
      // Search unavailable — show empty
    }
  }

  const totalPages = Math.ceil(results.totalHits / 24);

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {q ? `Results for "${q}"` : "Search"}
        </h1>
        {q && (
          <p className="mt-2 text-muted-foreground">
            {results.totalHits} product{results.totalHits !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {/* Search form */}
      <form action="/search" method="GET" className="mb-8">
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search products, brands, vendors..."
            className="w-full rounded-lg border bg-background py-3 pl-10 pr-4 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </form>

      {/* Facets sidebar + results */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Facets */}
        {results.facets && Object.keys(results.facets).length > 0 && (
          <aside className="space-y-6">
            {Object.entries(results.facets).map(([facetName, values]) => (
              <div key={facetName}>
                <h3 className="text-sm font-semibold capitalize mb-2">{facetName}</h3>
                <ul className="space-y-1">
                  {Object.entries(values)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([value, count]) => (
                      <li key={value}>
                        <Link
                          href={`/search?q=${encodeURIComponent(q)}&${facetName.toLowerCase()}=${encodeURIComponent(value)}`}
                          className="text-sm text-muted-foreground hover:text-foreground flex justify-between"
                        >
                          <span>{value}</span>
                          <span className="text-xs">({count})</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </aside>
        )}

        {/* Results grid */}
        <div>
          {results.hits.length === 0 && q ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <SearchIcon className="size-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No results found</h2>
              <p className="text-muted-foreground max-w-md">
                Try a different search term or browse our categories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.hits.map((hit) => (
                <Link key={hit.id} href={`/products/${hit.handle}`} className="group">
                  <div className="relative aspect-square rounded-lg bg-muted overflow-hidden mb-2">
                    {hit.featuredImage ? (
                      <Image
                        src={hit.featuredImage}
                        alt={hit.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {hit.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{hit.vendorName}</p>
                  <p className="text-sm font-semibold mt-1">
                    {hit.minPrice === hit.maxPrice
                      ? formatPrice(hit.minPrice)
                      : `${formatPrice(hit.minPrice)} – ${formatPrice(hit.maxPrice)}`}
                  </p>
                  {!hit.inStock && (
                    <span className="text-xs text-destructive">Out of stock</span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-muted"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
