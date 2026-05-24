// Reserved top-level slugs — vendor slugs must not conflict with these
export const RESERVED_SLUGS = [
  "products",
  "collections",
  "pages",
  "blogs",
  "customer",
  "cart",
  "wishlist",
  "api",
  "admin",
  "vendor",
  "auth",
  "search",
  "sell",
  "vendors",
  "checkout",
  "orders",
  "payment-failed",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
] as const;

export type ReservedSlug = (typeof RESERVED_SLUGS)[number];

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug);
}

// Default pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Review settings
export const MAX_REVIEW_RATING = 5;
export const MIN_REVIEW_RATING = 1;
