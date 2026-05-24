/**
 * Single source of truth for sector-specific copy and naming.
 *
 * Swap to a different sector by replacing the `brand` export at the bottom
 * with one of the predefined configs (or your own). Everything that is
 * sector-aware in the admin UI reads from here.
 *
 * Examples in this file: rugs (default), beauty, handicrafts, fashion, generic.
 */

export interface BrandConfig {
  /** Full marketplace name (e.g. "Rugs Nepal Marketplace"). */
  name: string;
  /** Compact name shown in sidebar / nav (e.g. "Rugs Nepal"). */
  shortName: string;
  /** One-line marketplace pitch — shown on auth pages. */
  tagline: string;
  /** Document title suffix (e.g. "Rugs Nepal · Admin"). */
  titleSuffix: string;
  /** Product noun, lower-case, singular ("rug" / "lipstick" / "piece"). */
  productNoun: string;
  /** Product noun plural ("rugs" / "lipsticks" / "pieces"). */
  productNounPlural: string;
  /**
   * Platform-default ISO 4217 currency. Used by analytics/dashboard rollups
   * and as a fallback when a record has no currency. Per-record currencies
   * (order.currencyCode, payment.currencyCode, vendor.currencyCode, etc.)
   * always take precedence so multi-currency stores render correctly.
   */
  currencyCode: string;
  /**
   * ISO 3166-1 alpha-2 country code for the platform's home market. Surfaced
   * as the default Country-of-origin placeholder on the product/variant forms.
   */
  countryCode: string;

  /** Empty-state copy. Replace per sector for sharper microcopy. */
  emptyStates: {
    productsTitle: string;
    productsDescription: string;
    ordersTitle: string;
    ordersDescription: string;
    topProductsTitle: string;
    topProductsDescription: string;
  };

  /** Form placeholders surfaced inside Product/Catalog forms. */
  placeholders: {
    productTitle: string;
    productHandle: string;
    /** Shown in the Product type input (e.g. "Sculpture, Wood carving, Singing bowl..."). */
    productType: string;
    /** Shown in the Brand input. For artisan marketplaces, the brand is the
     *  workshop or atelier name. For consumer-electronics it's "Nike, Apple…". */
    brand: string;
  };
}

// ─── Sector presets ─────────────────────────────────────────────────────────

const RUGS: BrandConfig = {
  name: "Rugs Nepal",
  shortName: "Rugs Nepal",
  tagline: "Hand-knotted Tibetan, Persian & Berber rugs marketplace",
  titleSuffix: "Rugs Nepal",
  productNoun: "rug",
  productNounPlural: "rugs",
  currencyCode: "NPR",
  countryCode: "NP",
  emptyStates: {
    productsTitle: "No rugs yet",
    productsDescription: "Add your first rug to start building the catalog.",
    ordersTitle: "No orders yet",
    ordersDescription: "Orders will appear here once customers start purchasing.",
    topProductsTitle: "No bestsellers yet",
    topProductsDescription: "Once customers buy, your bestselling rugs will rank here.",
  },
  placeholders: {
    productTitle: "Tabriz Medallion Hand-Knotted",
    productHandle: "tabriz-medallion-handknotted",
    productType: "Tibetan rug, Persian rug, Berber rug...",
    brand: "Workshop or atelier name...",
  },
};

const BEAUTY: BrandConfig = {
  name: "Glow Beauty Marketplace",
  shortName: "Glow",
  tagline: "Indie skincare, makeup & fragrance from independent makers",
  titleSuffix: "Glow",
  productNoun: "product",
  productNounPlural: "products",
  currencyCode: "USD",
  countryCode: "US",
  emptyStates: {
    productsTitle: "No products yet",
    productsDescription: "Add your first SKU to start building the catalog.",
    ordersTitle: "No orders yet",
    ordersDescription: "Orders will appear here once customers start shopping.",
    topProductsTitle: "No bestsellers yet",
    topProductsDescription: "Bestselling products will rank here once orders flow in.",
  },
  placeholders: {
    productTitle: "Rosehip & Vitamin C Serum 30ml",
    productHandle: "rosehip-vitamin-c-serum-30ml",
    productType: "Serum, Lipstick, Fragrance...",
    brand: "Glossier, Drunk Elephant, Fenty...",
  },
};

const HANDICRAFTS: BrandConfig = {
  name: "Handicraft Ecommerce",
  shortName: "Handicraft",
  tagline: "Hand-cast brass statues & deity idols from Nepali artisans",
  titleSuffix: "Handicraft",
  productNoun: "piece",
  productNounPlural: "pieces",
  currencyCode: "NPR",
  countryCode: "NP",
  emptyStates: {
    productsTitle: "No pieces yet",
    productsDescription: "Add your first piece to start building the catalog.",
    ordersTitle: "No orders yet",
    ordersDescription: "Orders will appear here once collectors start buying.",
    topProductsTitle: "No bestsellers yet",
    topProductsDescription: "Bestselling pieces will rank here once orders flow in.",
  },
  placeholders: {
    productTitle: "Shakyamuni Buddha Brass Statue, Stone Inlay 8\"",
    productHandle: "shakyamuni-buddha-brass-stone-inlay-8in",
    productType: "Sculpture, Wood carving, Singing bowl, Prayer wheel...",
    brand: "Workshop name (e.g. Patan Bronze Casters)...",
  },
};

const FASHION: BrandConfig = {
  name: "Atelier Fashion",
  shortName: "Atelier",
  tagline: "Independent fashion labels & sustainable apparel",
  titleSuffix: "Atelier",
  productNoun: "garment",
  productNounPlural: "garments",
  currencyCode: "USD",
  countryCode: "US",
  emptyStates: {
    productsTitle: "No garments yet",
    productsDescription: "Add your first garment to start building the catalog.",
    ordersTitle: "No orders yet",
    ordersDescription: "Orders will appear here once customers start shopping.",
    topProductsTitle: "No bestsellers yet",
    topProductsDescription: "Bestselling garments will rank here once orders flow in.",
  },
  placeholders: {
    productTitle: "Linen Wide-Leg Trouser, Sand",
    productHandle: "linen-wide-leg-trouser-sand",
    productType: "Trouser, Dress, Outerwear, Knitwear...",
    brand: "Atelier or label name...",
  },
};

const GENERIC: BrandConfig = {
  name: "Marketplace",
  shortName: "Marketplace",
  tagline: "Multi-vendor commerce platform",
  titleSuffix: "Admin",
  productNoun: "product",
  productNounPlural: "products",
  currencyCode: "USD",
  countryCode: "US",
  emptyStates: {
    productsTitle: "No products yet",
    productsDescription: "Add your first product to start building the catalog.",
    ordersTitle: "No orders yet",
    ordersDescription: "Orders will appear here once customers start purchasing.",
    topProductsTitle: "No bestsellers yet",
    topProductsDescription: "Bestselling products will rank here once orders flow in.",
  },
  placeholders: {
    productTitle: "Sample product",
    productHandle: "sample-product",
    productType: "Product category...",
    brand: "Brand name...",
  },
};

export const PRESETS = { RUGS, BEAUTY, HANDICRAFTS, FASHION, GENERIC } as const;

// ─── Active brand ───────────────────────────────────────────────────────────

/**
 * Active brand. Swap this single export to retheme the admin for a different
 * sector — every consumer reads from `brand`, no other code changes needed.
 */
export const brand: BrandConfig = HANDICRAFTS;
