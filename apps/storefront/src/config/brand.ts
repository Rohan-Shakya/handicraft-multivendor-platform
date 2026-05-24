/**
 * Storefront brand config — mirrors `apps/admin/src/config/brand.ts`.
 * Single source of truth for sector-specific copy and naming.
 *
 * Swap by replacing the `brand` export at the bottom with one of the presets
 * (or your own). Every customer-facing string that's sector-aware reads from
 * here — never hard-code "Rugs Nepal" or rug-specific copy in components.
 */

export interface BrandConfig {
  /** Full marketplace name. */
  name: string;
  /** Compact name for header / nav. */
  shortName: string;
  /** Tagline shown on auth + footer. */
  tagline: string;
  /** Suffix for `<title>`. */
  titleSuffix: string;
  /** "rug" / "lipstick" / "piece" — singular, lower-case. */
  productNoun: string;
  /** Plural form. */
  productNounPlural: string;
  /**
   * Platform-default ISO 4217 currency. Used as a fallback when a record has
   * no currency set. Per-record currencies (product.currencyCode etc.) always
   * take precedence so multi-currency vendors render correctly.
   */
  currencyCode: string;
  /** Marketing hero copy (sector-tinted demo content). */
  hero: {
    eyebrow: string;
    title: string;
    description: string;
  };
  /** Empty-state copy. */
  emptyStates: {
    productsTitle: string;
    productsDescription: string;
    cartEmptyTitle: string;
    cartEmptyDescription: string;
    wishlistEmptyTitle: string;
    wishlistEmptyDescription: string;
    ordersTitle: string;
    ordersDescription: string;
  };
  /** Public contact + showroom details. Read by ContactPage and JSON-LD. */
  contact: {
    /** E.164-friendly format for `tel:` links. */
    phone: string;
    /** Localised phone display. */
    phoneDisplay: string;
    email: string;
    /** Hours, in {days, time} pairs. */
    hours: ReadonlyArray<{ days: string; time: string }>;
    /** Showroom postal address. Used for LocalBusiness JSON-LD. */
    address: {
      streetAddress: string;
      postalCode: string;
      addressLocality: string;
      addressRegion?: string;
      addressCountry: string; // ISO 3166-1 alpha-2 for schema.org
      countryName: string; // human-readable
      /** Used for Google Maps deep link. */
      mapsQuery: string;
    };
    /** Used in `mailto:` and SR text for emails. */
    supportHoursLabel: string;
  };
}

const NEPAL_CONTACT: BrandConfig["contact"] = {
  phone: "+97714444444",
  phoneDisplay: "+977 (0) 1 444 4444",
  email: "hello@himalayancrafts.np",
  hours: [
    { days: "Sunday — Friday", time: "10:00 — 19:00" },
    { days: "Saturday", time: "Closed" },
  ],
  address: {
    streetAddress: "Thamel Marg",
    postalCode: "44600",
    addressLocality: "Kathmandu",
    addressRegion: "Bagmati",
    addressCountry: "NP",
    countryName: "Nepal",
    mapsQuery: "Thamel Marg Kathmandu",
  },
  supportHoursLabel: "Replies within 1 business day",
};

const GENERIC_CONTACT: BrandConfig["contact"] = {
  phone: "+10000000000",
  phoneDisplay: "+1 (000) 000-0000",
  email: "hello@example.com",
  hours: [
    { days: "Monday — Friday", time: "09:00 — 18:00" },
    { days: "Saturday — Sunday", time: "Closed" },
  ],
  address: {
    streetAddress: "1 Market Street",
    postalCode: "00000",
    addressLocality: "City",
    addressCountry: "US",
    countryName: "United States",
    mapsQuery: "1 Market Street",
  },
  supportHoursLabel: "Replies within 1 business day",
};

const RUGS: BrandConfig = {
  name: "Rugs Nepal",
  shortName: "Rugs Nepal",
  tagline: "Hand-knotted Tibetan, Persian & Berber rugs from trusted ateliers.",
  titleSuffix: "Rugs Nepal",
  productNoun: "rug",
  productNounPlural: "rugs",
  currencyCode: "NPR",
  hero: {
    eyebrow: "New Arrival",
    title: "Discover Our New Collection",
    description:
      "Hand-knotted by master weavers — every piece tells the story of its origin, region, and the generations that shaped it.",
  },
  contact: NEPAL_CONTACT,
  emptyStates: {
    productsTitle: "No rugs yet",
    productsDescription: "Try a different filter or browse all collections.",
    cartEmptyTitle: "Your cart is empty",
    cartEmptyDescription: "Find a rug you'll love and bring it home.",
    wishlistEmptyTitle: "No saved rugs yet",
    wishlistEmptyDescription:
      "Tap the heart on any product to keep it for later.",
    ordersTitle: "No orders yet",
    ordersDescription: "Once you place an order, it'll appear here.",
  },
};

const BEAUTY: BrandConfig = {
  name: "Glow Beauty Marketplace",
  shortName: "Glow",
  tagline: "Indie skincare, makeup & fragrance from independent makers.",
  titleSuffix: "Glow",
  productNoun: "product",
  productNounPlural: "products",
  currencyCode: "USD",
  hero: {
    eyebrow: "New Drop",
    title: "Discover Your Glow",
    description:
      "Curated indie beauty — clean ingredients, tested formulas, and brands you'll actually love.",
  },
  contact: GENERIC_CONTACT,
  emptyStates: {
    productsTitle: "No products yet",
    productsDescription: "Try a different filter or browse all categories.",
    cartEmptyTitle: "Your cart is empty",
    cartEmptyDescription: "Find a product you'll love.",
    wishlistEmptyTitle: "No saved products yet",
    wishlistEmptyDescription: "Tap the heart on any product to save it.",
    ordersTitle: "No orders yet",
    ordersDescription: "Once you place an order, it'll appear here.",
  },
};

const HANDICRAFTS: BrandConfig = {
  name: "Himalayan Crafts",
  shortName: "Himalayan Crafts",
  tagline: "Hand-cast bronze statues, wood carvings & singing bowls from Nepali artisans.",
  titleSuffix: "Himalayan Crafts",
  productNoun: "piece",
  productNounPlural: "pieces",
  currencyCode: "NPR",
  hero: {
    eyebrow: "New Arrivals",
    title: "Sacred sculptures, hand-cast in Nepal",
    description:
      "Buddha and Bodhisattva statues, deity bronzes, singing bowls and ritual objects — made the slow way in the workshops of Patan and the Kathmandu Valley.",
  },
  contact: NEPAL_CONTACT,
  emptyStates: {
    productsTitle: "No pieces yet",
    productsDescription: "Try a different filter or browse all collections.",
    cartEmptyTitle: "Your cart is empty",
    cartEmptyDescription: "Find a piece that speaks to you.",
    wishlistEmptyTitle: "No saved pieces yet",
    wishlistEmptyDescription: "Tap the heart on any piece to save it.",
    ordersTitle: "No orders yet",
    ordersDescription: "Once you place an order, it'll appear here.",
  },
};

const FASHION: BrandConfig = {
  name: "Atelier Fashion",
  shortName: "Atelier",
  tagline: "Independent fashion labels & sustainable apparel.",
  titleSuffix: "Atelier",
  productNoun: "garment",
  productNounPlural: "garments",
  currencyCode: "USD",
  hero: {
    eyebrow: "Season Edit",
    title: "Discover the new season",
    description:
      "Sustainable, considered fashion from independent designers around the world.",
  },
  contact: GENERIC_CONTACT,
  emptyStates: {
    productsTitle: "No garments yet",
    productsDescription: "Try a different filter or browse all categories.",
    cartEmptyTitle: "Your cart is empty",
    cartEmptyDescription: "Find a garment you'll love.",
    wishlistEmptyTitle: "No saved garments yet",
    wishlistEmptyDescription: "Tap the heart on any garment to save it.",
    ordersTitle: "No orders yet",
    ordersDescription: "Once you place an order, it'll appear here.",
  },
};

const GENERIC: BrandConfig = {
  name: "Marketplace",
  shortName: "Marketplace",
  tagline: "Multi-vendor commerce platform.",
  titleSuffix: "Marketplace",
  productNoun: "product",
  productNounPlural: "products",
  currencyCode: "USD",
  hero: {
    eyebrow: "New Arrival",
    title: "Discover Our New Collection",
    description:
      "Curated products from independent vendors — quality goods, made with care.",
  },
  contact: GENERIC_CONTACT,
  emptyStates: {
    productsTitle: "No products yet",
    productsDescription: "Try a different filter or browse all categories.",
    cartEmptyTitle: "Your cart is empty",
    cartEmptyDescription: "Find a product you'll love.",
    wishlistEmptyTitle: "No saved products yet",
    wishlistEmptyDescription: "Tap the heart on any product to save it.",
    ordersTitle: "No orders yet",
    ordersDescription: "Once you place an order, it'll appear here.",
  },
};

export const PRESETS = { RUGS, BEAUTY, HANDICRAFTS, FASHION, GENERIC } as const;

export const brand: BrandConfig = HANDICRAFTS;
