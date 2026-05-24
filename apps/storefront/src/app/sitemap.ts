import type { MetadataRoute } from "next";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type SitemapItem = MetadataRoute.Sitemap[number];

async function safeJson<T = { data: unknown[] }>(url: string): Promise<T> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return { data: [] } as unknown as T;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // The API caps `limit` per request at 100, so we paginate explicitly for
  // the product catalogue (which can exceed that cap). Other lists are
  // bounded by typical storefront sizes.
  async function fetchAllProducts() {
    const acc: Array<{ handle: string; updatedAt?: string }> = [];
    for (let pageNum = 1; pageNum <= 50; pageNum++) {
      const r = await safeJson<{
        data: Array<{ handle: string; updatedAt?: string }>;
        total?: number;
      }>(`${API}/storefront/products?limit=100&page=${pageNum}`);
      if (!r.data?.length) break;
      acc.push(...r.data);
      if (r.total != null && acc.length >= r.total) break;
    }
    return acc;
  }

  const [productsAll, collections, vendors, pages] = await Promise.all([
    fetchAllProducts(),
    safeJson<{ data: Array<{ handle: string; updatedAt?: string }> }>(
      `${API}/storefront/collections?limit=100`,
    ),
    safeJson<{ data: Array<{ slug: string; updatedAt?: string }> }>(
      `${API}/storefront/vendors?limit=100`,
    ),
    safeJson<{ data: Array<{ handle: string; updatedAt?: string }> }>(
      `${API}/storefront/pages?limit=100`,
    ),
  ]);

  const products = { data: productsAll };

  const urls: SitemapItem[] = [
    { url: SITE, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE}/collections`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE}/vendors`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE}/blogs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    // Hand-built static pages — make sure they're discoverable even if the
    // CMS pages list is empty.
    ...[
      "about",
      "contact",
      "faq",
      "terms",
      "privacy",
      "returns",
      "payment",
      "cookie-policy",
      "accessibility",
      "shipping",
    ].map<SitemapItem>((handle) => ({
      url: `${SITE}/pages/${handle}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];

  const lastMod = (raw: string | undefined): Date | undefined =>
    raw ? new Date(raw) : undefined;

  for (const p of products.data ?? []) {
    urls.push({
      url: `${SITE}/products/${p.handle}`,
      lastModified: lastMod(p.updatedAt) ?? now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const c of collections.data ?? []) {
    urls.push({
      url: `${SITE}/collections/${c.handle}`,
      lastModified: lastMod(c.updatedAt) ?? now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const v of vendors.data ?? []) {
    urls.push({
      url: `${SITE}/${v.slug}`,
      lastModified: lastMod(v.updatedAt) ?? now,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  for (const pg of pages.data ?? []) {
    urls.push({
      url: `${SITE}/pages/${pg.handle}`,
      lastModified: lastMod(pg.updatedAt) ?? now,
      changeFrequency: "monthly",
      priority: 0.4,
    });
  }

  // Currently-active sale campaigns. Only one is returned (the highest-priority
  // one for the homepage banner) — for richer campaign discovery the admin can
  // surface a list page later.
  const activeCampaign = await safeJson<{
    campaign: { handle: string; updatedAt?: string; endsAt?: string } | null;
  }>(`${API}/storefront/campaigns/active`);
  if (activeCampaign.campaign?.handle) {
    urls.push({
      url: `${SITE}/sale/${activeCampaign.campaign.handle}`,
      lastModified: lastMod(activeCampaign.campaign.updatedAt) ?? now,
      changeFrequency: "hourly",
      priority: 0.95,
    });
  }

  return urls;
}
