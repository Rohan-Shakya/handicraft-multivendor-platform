/**
 * Nepal handicraft marketplace seed (NPR / Rs.) — sculpture & ritual focus.
 *
 *   • 1 super-admin (admin@admin.com / Admin@123)
 *   • 3 vendors: Patan Bronze Casters, Thamel Wood & Stone, Himalayan Singing Bowls
 *   • 10 collections covering the major sculpture + ritual taxonomy
 *   • ~30 products: Buddha & Bodhisattva statues, Hindu deities, wood carvings,
 *     stone sculptures, ritual masks, singing bowls, prayer wheels, vajras
 *   • Variants (height × finish) with per-size price banding + inventory
 *   • 4 images per product, 2 per vendor (logo + banner), 1 per collection
 *   • Curated reviews + facet filters
 *
 * Run with:
 *
 *     pnpm db:seed:real             # insert only (idempotent on conflict)
 *     WIPE_DB=1 pnpm db:seed:real   # TRUNCATE catalog tables first, then seed
 *     SKIP_R2=1 pnpm db:seed:real   # skip image download/upload (use direct URLs)
 *
 * Image pipeline: each unique source URL is downloaded once, uploaded to R2,
 * cached, and the resulting public R2 URL is what lands in the DB. Vendors,
 * collections, and products all flow through this pipeline so the admin can
 * manage every image (re-upload, delete, swap) via the Files manager.
 */

import { sql } from "drizzle-orm";
import { db } from "./index.js";
import {
  users,
  vendors,
  vendorMemberships,
  vendorAddresses,
  vendorKycs,
  vendorKycDocuments,
  customers,
  customerAddresses,
  products,
  productTags,
  productOptions,
  productOptionValues,
  productImages,
  variants,
  variantSelectedOptions,
  inventoryItems,
  collections,
  collectionProducts,
  productReviews,
  facetFilters,
  files,
  orders,
  orderItems,
  orderAddresses,
  vendorOrders,
  discounts,
  discountCodes,
  pages,
  blogs,
  blogPosts,
  newsletterSubscribers,
} from "./schema/index.js";
import { hashPassword } from "../lib/password.js";
import { validateEnv } from "../lib/env.js";
import { uploadToR2 } from "../lib/storage.js";
import {
  BLOG_BODIES,
  BLOG_COVER_ALT,
  BLOG_COVER_FILE_IDS,
} from "./seed-blog-bodies.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Stable ids — same key always produces same id for idempotent re-seeding. */
function id(kind: string, key: string): string {
  const safe = key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `seed-${kind}-${safe}`;
}

/** Convert USD-scale base price to NPR (Nepali Rupees). 1 USD ≈ 135 NPR; we
 *  round to the nearest Rs 50 for tidy retail numbers. */
const NPR_MULTIPLIER = 135;
const toNPR = (usd: number) => Math.round((usd * NPR_MULTIPLIER) / 50) * 50;
const cents = (rupees: number) => rupees.toFixed(2);

// ─── Image pipeline (download → upload to R2 → cache R2 URL) ────────────────

const SKIP_R2 = process.env.SKIP_R2 === "1";

/**
 * Pool of source URLs — sculpture / Buddhist art / Nepal-themed.
 *
 * Picsum seeds are used because they always 200 (deterministic, no 404 risk)
 * and give us stable demo imagery the admin can swap out for real product
 * photography via the Files manager.
 */
// Themed Flickr photos via loremflickr — `lock=N` makes each URL deterministic
// (same lock = same photo) and the comma-separated tags guarantee subject
// matter (buddha statues, bronze sculpture, singing bowls, etc.) rather than
// the random landscapes picsum returns.
const IMAGE_POOL: string[] = [
  "https://loremflickr.com/1600/1600/buddha,statue?lock=1",
  "https://loremflickr.com/1600/1600/buddha,bronze?lock=2",
  "https://loremflickr.com/1600/1600/buddha,sculpture?lock=3",
  "https://loremflickr.com/1600/1600/buddha,nepal?lock=4",
  "https://loremflickr.com/1600/1600/buddha,gold?lock=5",
  "https://loremflickr.com/1600/1600/tara,statue?lock=6",
  "https://loremflickr.com/1600/1600/bodhisattva,bronze?lock=7",
  "https://loremflickr.com/1600/1600/buddhist,sculpture?lock=8",
  "https://loremflickr.com/1600/1600/hindu,deity?lock=9",
  "https://loremflickr.com/1600/1600/durga,statue?lock=10",
  "https://loremflickr.com/1600/1600/ganesha,brass?lock=11",
  "https://loremflickr.com/1600/1600/shiva,nataraja?lock=12",
  "https://loremflickr.com/1600/1600/wood,carving,nepal?lock=13",
  "https://loremflickr.com/1600/1600/wood,carving,buddhist?lock=14",
  "https://loremflickr.com/1600/1600/wood,sculpture?lock=15",
  "https://loremflickr.com/1600/1600/stone,buddha?lock=16",
  "https://loremflickr.com/1600/1600/stone,sculpture,asia?lock=17",
  "https://loremflickr.com/1600/1600/marble,statue?lock=18",
  "https://loremflickr.com/1600/1600/mahakala,mask?lock=19",
  "https://loremflickr.com/1600/1600/tibetan,mask?lock=20",
  "https://loremflickr.com/1600/1600/nepali,mask?lock=21",
  "https://loremflickr.com/1600/1600/singing,bowl?lock=22",
  "https://loremflickr.com/1600/1600/tibetan,bowl?lock=23",
  "https://loremflickr.com/1600/1600/meditation,bowl?lock=24",
  "https://loremflickr.com/1600/1600/prayer,wheel?lock=25",
  "https://loremflickr.com/1600/1600/prayer,wheel,tibet?lock=26",
  "https://loremflickr.com/1600/1600/vajra,buddhist?lock=27",
  "https://loremflickr.com/1600/1600/buddhist,altar?lock=28",
  "https://loremflickr.com/1600/1600/nepali,workshop?lock=29",
  "https://loremflickr.com/1600/1600/kathmandu,craft?lock=30",
];

/** Picsum fallback — always 200s. Used if a source URL fails. */
function picsumUrl(seed: string, w = 1600, h = 1600): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

const _imageCache = new Map<string, { url: string; storageKey: string }>();

/** Download a source URL and upload the bytes to R2 at `storageKey`. */
async function uploadOne(
  storageKey: string,
  sourceUrl: string,
  contentType: string = "image/jpeg",
): Promise<{ url: string; storageKey: string }> {
  const cached = _imageCache.get(storageKey);
  if (cached) return cached;

  const sources = [sourceUrl, picsumUrl(storageKey)];

  if (SKIP_R2) {
    const out = { url: sources[0]!, storageKey };
    _imageCache.set(storageKey, out);
    return out;
  }

  let lastErr: unknown;
  for (const src of sources) {
    try {
      const res = await fetch(src, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get("content-type") ?? contentType;
      const out = await uploadToR2(storageKey, buf, ct, buf.byteLength);
      _imageCache.set(storageKey, out);
      return out;
    } catch (err) {
      lastErr = err;
    }
  }
  console.warn(`   ⚠️  image upload failed for ${storageKey} (${lastErr}); using direct URL`);
  const out = { url: sources[0]!, storageKey };
  _imageCache.set(storageKey, out);
  return out;
}

/** Pool of `{url, storageKey}` after prefetch. Use `img(seed)` to pick one. */
const POOL_IMAGES: Array<{ url: string; storageKey: string }> = [];

/** Download every IMAGE_POOL entry and upload it to R2 (parallel batches). */
async function prefetchPoolImages(): Promise<void> {
  POOL_IMAGES.length = 0;
  const BATCH = 6;
  for (let i = 0; i < IMAGE_POOL.length; i += BATCH) {
    const slice = IMAGE_POOL.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map((src, j) =>
        uploadOne(`seed/pool/craft-${String(i + j).padStart(2, "0")}.jpg`, src!),
      ),
    );
    POOL_IMAGES.push(...results);
    process.stdout.write(`     uploaded ${POOL_IMAGES.length}/${IMAGE_POOL.length}\r`);
  }
  process.stdout.write("\n");
}

/** Deterministic pool pick — same `seed` always returns the same image. */
function img(seed: string): string {
  if (POOL_IMAGES.length === 0) {
    throw new Error("Image pool not prefetched — call prefetchPoolImages() first");
  }
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return POOL_IMAGES[Math.abs(h) % POOL_IMAGES.length]!.url;
}

/** Same as `img()` but returns the storageKey instead of public URL. */
function imgKey(seed: string): string {
  if (POOL_IMAGES.length === 0) {
    throw new Error("Image pool not prefetched — call prefetchPoolImages() first");
  }
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return POOL_IMAGES[Math.abs(h) % POOL_IMAGES.length]!.storageKey;
}

// ─── Vendors ────────────────────────────────────────────────────────────────

type VendorStatus = "active" | "pending" | "suspended" | "rejected";
type VendorKycStatus = "pending" | "under_review" | "approved" | "rejected";

interface VendorSpec {
  slug: string;
  name: string;
  legalName: string;
  bio: string;
  email: string;
  ownerFirstName: string;
  ownerLastName: string;
  countryCode: string;
  currencyCode: string;
  websiteUrl: string;
  primaryPhone: string;
  vatNumber: string;
  taxId: string;
  registrationNumber: string;
  /** Marketplace commission, basis points (1000 = 10%). */
  commissionBps: number;
  status: VendorStatus;
  kycStatus: VendorKycStatus;
  reason?: string;
  address: {
    line1: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
}

const VENDORS: VendorSpec[] = [
  {
    slug: "patan-bronze-casters",
    name: "Patan Bronze Casters",
    legalName: "Patan Bronze Casters Pvt. Ltd.",
    bio: "Lost-wax bronze and brass statues from a fourth-generation family of Shakya casters in Patan. Buddha, Bodhisattva and Hindu deity sculptures, cast and finished by hand using techniques unchanged since the Malla dynasty.",
    email: "owner@patan-bronze.com.np",
    ownerFirstName: "Rajan",
    ownerLastName: "Shakya",
    countryCode: "NP",
    currencyCode: "NPR",
    websiteUrl: "https://patan-bronze.example.np",
    primaryPhone: "+977 1 5547890",
    vatNumber: "",
    taxId: "PAN 701234567",
    registrationNumber: "OCR-LTP-074-075-11223",
    commissionBps: 1200, // 12%
    status: "active",
    kycStatus: "approved",
    address: {
      line1: "Sundhara Marg, Mangal Bazaar",
      city: "Lalitpur",
      province: "Bagmati",
      postalCode: "44700",
      country: "Nepal",
    },
  },
  {
    slug: "thamel-wood-stone",
    name: "Thamel Wood & Stone",
    legalName: "Thamel Wood & Stone Crafts Pvt. Ltd.",
    bio: "Newari wood carvings, black-stone sculptures and ritual masks from artisans in Bhaktapur and Thamel. Sal wood window panels, mandala plaques, festival masks, and serene stone Buddha heads.",
    email: "owner@thamel-wood-stone.com.np",
    ownerFirstName: "Manish",
    ownerLastName: "Maharjan",
    countryCode: "NP",
    currencyCode: "NPR",
    websiteUrl: "https://thamel-wood-stone.example.np",
    primaryPhone: "+977 1 4710456",
    vatNumber: "",
    taxId: "PAN 702345678",
    registrationNumber: "OCR-KTM-076-077-22334",
    commissionBps: 1500, // 15%
    status: "active",
    kycStatus: "approved",
    address: {
      line1: "Chhetrapati, Ward 17",
      city: "Kathmandu",
      province: "Bagmati",
      postalCode: "44600",
      country: "Nepal",
    },
  },
  {
    slug: "himalayan-bowls",
    name: "Himalayan Singing Bowls",
    legalName: "Himalayan Singing Bowls Pvt. Ltd.",
    bio: "Hand-hammered seven-metal singing bowls, prayer wheels and ritual objects from a Boudhanath workshop of master metalsmiths. Full-moon antiques, healing sets, vajras and bells for meditation and sound therapy.",
    email: "owner@himalayan-bowls.com.np",
    ownerFirstName: "Tashi",
    ownerLastName: "Lama",
    countryCode: "NP",
    currencyCode: "NPR",
    websiteUrl: "https://himalayan-bowls.example.np",
    primaryPhone: "+977 1 4480789",
    vatNumber: "",
    taxId: "PAN 703456789",
    registrationNumber: "OCR-KTM-075-076-33445",
    commissionBps: 1500, // 15%
    status: "active",
    kycStatus: "approved",
    address: {
      line1: "Boudha Sadak, Ward 6",
      city: "Kathmandu",
      province: "Bagmati",
      postalCode: "44600",
      country: "Nepal",
    },
  },
];

// ─── Collections ────────────────────────────────────────────────────────────

interface CollectionSpec {
  handle: string;
  title: string;
  description: string;
  vendorSlug: string;
}

const COLLECTIONS: CollectionSpec[] = [
  {
    handle: "buddha-statues",
    title: "Buddha Statues",
    description:
      "Shakyamuni, Amitabha, Medicine and Maitreya Buddhas — lost-wax cast in brass and bronze, finished with stone inlay or gold plate. Hand-detailed by Shakya master casters in Patan.",
    vendorSlug: "patan-bronze-casters",
  },
  {
    handle: "bodhisattvas",
    title: "Bodhisattvas",
    description:
      "Green Tara, White Tara, Manjushri and four-armed Avalokiteshvara — the compassionate awakened beings of Vajrayana iconography, cast in brass with stone inlay accents.",
    vendorSlug: "patan-bronze-casters",
  },
  {
    handle: "hindu-deities",
    title: "Hindu Deities",
    description:
      "Ganesha, Shiva, Vishnu, Durga and Hanuman — hand-cast brass and bronze deities sized for home altars, temples and gardens.",
    vendorSlug: "patan-bronze-casters",
  },
  {
    handle: "home-altar",
    title: "Home Altar",
    description:
      "Pocket-sized statues and mini sculptures designed for personal altars, travel shrines and gift-giving. Cast in brass with detailed finishes.",
    vendorSlug: "patan-bronze-casters",
  },
  {
    handle: "wood-carvings",
    title: "Newari Wood Carvings",
    description:
      "Hand-carved sal-wood Buddha figures, mandala wall plaques and Newari window-frame panels — the centuries-old joinery and chisel work of Bhaktapur and Patan.",
    vendorSlug: "thamel-wood-stone",
  },
  {
    handle: "stone-sculptures",
    title: "Stone Sculptures",
    description:
      "Black-stone Buddha heads, marble Ganeshas and stone Tara figures, hand-carved by sculptors in the Patan and Bhaktapur stoneyards.",
    vendorSlug: "thamel-wood-stone",
  },
  {
    handle: "ritual-masks",
    title: "Ritual Masks",
    description:
      "Mahakala, Bhairab and Newari festival masks — wrathful protectors and dance characters carved in wood, painted and lacquered for puja and display.",
    vendorSlug: "thamel-wood-stone",
  },
  {
    handle: "singing-bowls",
    title: "Singing Bowls",
    description:
      "Hand-hammered seven-metal Tibetan singing bowls — antique, full-moon and healing-set varieties for meditation, sound therapy and the home.",
    vendorSlug: "himalayan-bowls",
  },
  {
    handle: "prayer-wheels",
    title: "Prayer Wheels",
    description:
      "Handheld, tabletop and wall-mounted prayer wheels engraved with the Om Mani Padme Hum mantra. Brass, copper and silver with hand-scrolled mantra inserts.",
    vendorSlug: "himalayan-bowls",
  },
  {
    handle: "ritual-objects",
    title: "Ritual Objects",
    description:
      "Vajras (dorje), bells, malas and the daily ritual implements of Vajrayana practice — cast and finished by hand for monasteries and home altars alike.",
    vendorSlug: "himalayan-bowls",
  },
];

// ─── Products ───────────────────────────────────────────────────────────────

type PieceSize = "S" | "M" | "L" | "XL";
type PieceFinish =
  | "AntiqueBronze"
  | "PolishedBrass"
  | "Oxidized"
  | "GoldPlated"
  | "StoneInlay"
  | "Natural"
  | "Painted"
  | "Lacquered"
  | "CopperBrass"
  | "SilverPlated";

/** Friendly human label shown in the storefront option picker. */
const SIZE_LABEL: Record<PieceSize, string> = {
  S: "Small (4–6 in)",
  M: "Medium (8–10 in)",
  L: "Large (12–16 in)",
  XL: "Extra Large (18–24 in)",
};

const FINISH_LABEL: Record<PieceFinish, string> = {
  AntiqueBronze: "Antique Bronze",
  PolishedBrass: "Polished Brass",
  Oxidized: "Oxidized",
  GoldPlated: "Gold Plated",
  StoneInlay: "Stone Inlay",
  Natural: "Natural",
  Painted: "Hand-Painted",
  Lacquered: "Lacquered",
  CopperBrass: "Copper & Brass",
  SilverPlated: "Silver Plated",
};

const SIZE_PRICE_MULTIPLIER: Record<PieceSize, number> = {
  S: 0.55,
  M: 1,
  L: 1.7,
  XL: 2.6,
};

interface ProductSpec {
  handle: string;
  title: string;
  excerpt: string;
  description: string;
  vendorSlug: string;
  origin: string;
  /** Base price in USD-equivalent at the "M" size. Converted to NPR at insert. */
  basePrice: number;
  compareAtPrice?: number;
  material:
    | "Brass"
    | "Bronze"
    | "Copper"
    | "MixedMetal"
    | "Wood"
    | "Stone"
    | "Marble"
    | "Resin"
    | "Crystal";
  style:
    | "Buddha"
    | "Bodhisattva"
    | "Deity"
    | "Animal"
    | "Mask"
    | "SingingBowl"
    | "PrayerWheel"
    | "Ritual"
    | "Decor"
    | "Carving";
  craft:
    | "LostWax"
    | "HandHammered"
    | "WoodCarved"
    | "StoneCarved"
    | "Painted";
  brand?: string;
  sizes: PieceSize[];
  finishes: PieceFinish[];
  imageCount: number;
  tags: string[];
  collections: string[];
}

const PRODUCTS: ProductSpec[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // Patan Bronze Casters — Buddhas, Bodhisattvas, Hindu deities (14 products)
  // ───────────────────────────────────────────────────────────────────────────
  {
    handle: "shakyamuni-buddha-stone-inlay",
    title: "Shakyamuni Buddha Brass Statue, Stone Inlay",
    excerpt: "Earth-touching Shakyamuni in lost-wax brass with semi-precious stone inlay.",
    description:
      "Shakyamuni Buddha in the bhumisparsha (earth-touching) mudra — the moment of enlightenment under the bodhi tree. Lost-wax cast in brass by Shakya master casters in Patan, hand-detailed and inlaid with turquoise, coral and lapis lazuli on the robe hems and lotus throne. Each statue is finished by a single artisan over 6–8 weeks. Cold-gold paint on the face is applied by a traditional thanka painter and re-applied at puja consecration.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 320,
    compareAtPrice: 380,
    material: "Brass",
    style: "Buddha",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S", "M", "L", "XL"],
    finishes: ["StoneInlay", "AntiqueBronze", "GoldPlated"],
    imageCount: 4,
    tags: ["buddha", "shakyamuni", "bhumisparsha", "brass", "stone-inlay", "patan", "lost-wax"],
    collections: ["buddha-statues"],
  },
  {
    handle: "amitabha-buddha-bronze",
    title: "Amitabha Buddha Bronze Statue",
    excerpt: "Amitabha in the dhyana (meditation) mudra — bronze, with optional gold plate.",
    description:
      "Amitabha, the Buddha of Infinite Light, seated in dhyana mudra with the alms bowl resting in his lap. Cast in bronze using the lost-wax technique, finished antique-bronze or gold-plated by request. The crown chakra and ushnisha are detailed by hand using fine engraving tools — every detail is the work of a single artisan from start to finish.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 285,
    material: "Bronze",
    style: "Buddha",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S", "M", "L"],
    finishes: ["AntiqueBronze", "GoldPlated", "PolishedBrass"],
    imageCount: 4,
    tags: ["buddha", "amitabha", "bronze", "dhyana", "meditation", "patan"],
    collections: ["buddha-statues"],
  },
  {
    handle: "medicine-buddha-gold-plated",
    title: "Medicine Buddha Gold-Plated Statue",
    excerpt: "Bhaisajyaguru holding the myrobalan plant — fully fire-gilded.",
    description:
      "Medicine Buddha (Bhaisajyaguru) holding the myrobalan plant in his right hand and the alms bowl in his left. The body is brass, fire-gilded with 24k gold leaf in the traditional mercury-amalgam technique used by Newari smiths since the 14th century. The face is hand-painted by a thanka artist. A devotional and altar piece for healing practice.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 540,
    compareAtPrice: 680,
    material: "Brass",
    style: "Buddha",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["M", "L", "XL"],
    finishes: ["GoldPlated", "StoneInlay"],
    imageCount: 4,
    tags: ["buddha", "medicine-buddha", "bhaisajyaguru", "gold-plated", "fire-gilded", "healing"],
    collections: ["buddha-statues"],
  },
  {
    handle: "maitreya-future-buddha",
    title: "Maitreya Future Buddha Brass Statue",
    excerpt: "The next Buddha seated in the European posture — brass, optional stone inlay.",
    description:
      "Maitreya, the Buddha to come, seated in the European-style pralambapadasana posture with both feet on the ground — the iconography of one already preparing to descend. Brass cast by lost-wax, hand-engraved robe pleats, optional stone inlay on the throne. A favourite altar piece in Tibetan and Newari Buddhist households.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 295,
    material: "Brass",
    style: "Buddha",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S", "M", "L"],
    finishes: ["AntiqueBronze", "StoneInlay", "PolishedBrass"],
    imageCount: 4,
    tags: ["buddha", "maitreya", "future-buddha", "brass", "patan"],
    collections: ["buddha-statues"],
  },
  {
    handle: "green-tara-stone-inlay",
    title: "Green Tara Brass Statue, Stone Inlay",
    excerpt: "The swift compassionate Tara in lalitasana posture — turquoise and coral inlay.",
    description:
      "Green Tara, the female Bodhisattva of swift compassion, seated in lalitasana with her right foot extended ready to step forward and protect. Lost-wax cast in brass, with turquoise on the diadem and coral on the lotus seat. Open right hand in the varada (boon-granting) mudra; left hand at the heart holding a blue lotus.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 310,
    material: "Brass",
    style: "Bodhisattva",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S", "M", "L"],
    finishes: ["StoneInlay", "AntiqueBronze", "GoldPlated"],
    imageCount: 4,
    tags: ["bodhisattva", "tara", "green-tara", "brass", "stone-inlay", "compassion"],
    collections: ["bodhisattvas"],
  },
  {
    handle: "white-tara-bronze",
    title: "White Tara Bronze Statue",
    excerpt: "Seven-eyed White Tara seated in vajrasana — bronze with optional silver plate.",
    description:
      "White Tara, the long-life Bodhisattva, with seven eyes (one on each palm and sole, plus the third eye) symbolising her compassionate awareness reaching everywhere at once. Seated in full vajrasana posture, right hand in varada mudra, left hand holding the long-life utpala. Bronze with antique or silver-plated finish.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 280,
    material: "Bronze",
    style: "Bodhisattva",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S", "M", "L"],
    finishes: ["AntiqueBronze", "SilverPlated"],
    imageCount: 4,
    tags: ["bodhisattva", "white-tara", "long-life", "bronze", "seven-eyes"],
    collections: ["bodhisattvas"],
  },
  {
    handle: "manjushri-bodhisattva",
    title: "Manjushri Bodhisattva of Wisdom",
    excerpt: "Sword-and-text iconography — Manjushri cutting through delusion.",
    description:
      "Manjushri, the Bodhisattva of Wisdom, with the flaming sword raised in the right hand to cut through ignorance and the Prajnaparamita sutra resting on a lotus at the left shoulder. Cast in brass with engraved jewellery and crown, available with stone inlay or gold plate. A favourite of scholars, students and practitioners.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 295,
    material: "Brass",
    style: "Bodhisattva",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S", "M", "L"],
    finishes: ["StoneInlay", "GoldPlated", "AntiqueBronze"],
    imageCount: 4,
    tags: ["bodhisattva", "manjushri", "wisdom", "brass", "sword"],
    collections: ["bodhisattvas"],
  },
  {
    handle: "avalokiteshvara-four-armed",
    title: "Avalokiteshvara Four-Armed Statue",
    excerpt: "Chenrezig with four arms — the wish-fulfilling jewel of compassion.",
    description:
      "Four-armed Avalokiteshvara (Chenrezig in Tibetan), the embodiment of compassion. Two upper hands hold the rosary and lotus; two lower hands clasp the wish-fulfilling jewel at the heart. Lost-wax brass with detailed engraving on the robes and crown. A central altar piece in Tibetan Buddhist homes and the patron deity of Tibet.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 320,
    material: "Brass",
    style: "Bodhisattva",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S", "M", "L", "XL"],
    finishes: ["AntiqueBronze", "GoldPlated", "StoneInlay"],
    imageCount: 4,
    tags: ["bodhisattva", "avalokiteshvara", "chenrezig", "compassion", "tibetan"],
    collections: ["bodhisattvas"],
  },
  {
    handle: "ganesha-brass-statue",
    title: "Ganesha Brass Statue",
    excerpt: "The remover of obstacles, dancing on his mouse — Patan lost-wax brass.",
    description:
      "Ganesha, son of Shiva and Parvati, the remover of obstacles and patron of new beginnings. Dancing on his vahana (the mouse Mushaka), with modaka sweet in one of his four hands. Lost-wax brass with hand-engraved jewellery and crown, finished antique or polished. A favourite for home shrines and shop openings across Nepal and India.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 245,
    material: "Brass",
    style: "Deity",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S", "M", "L", "XL"],
    finishes: ["AntiqueBronze", "PolishedBrass", "GoldPlated"],
    imageCount: 4,
    tags: ["hindu", "ganesha", "remover-of-obstacles", "brass", "patan"],
    collections: ["hindu-deities"],
  },
  {
    handle: "nataraja-dancing-shiva",
    title: "Dancing Shiva (Nataraja) Brass",
    excerpt: "The cosmic dance — Shiva as the Lord of Dance.",
    description:
      "Nataraja — Shiva as the Lord of Dance, performing the Ananda Tandava (dance of bliss) inside the cosmic ring of fire. The drum of creation in the upper right hand, the flame of destruction in the upper left, the lower right in abhaya (fearlessness) mudra, the lower left pointing to the raised foot of liberation. Lost-wax brass, hand-detailed.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 425,
    compareAtPrice: 520,
    material: "Brass",
    style: "Deity",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["M", "L", "XL"],
    finishes: ["AntiqueBronze", "GoldPlated"],
    imageCount: 4,
    tags: ["hindu", "shiva", "nataraja", "dancing-shiva", "brass"],
    collections: ["hindu-deities"],
  },
  {
    handle: "durga-mahishasura-mardini",
    title: "Goddess Durga Brass Statue",
    excerpt: "Mahishasura Mardini — the slayer of the buffalo demon.",
    description:
      "Durga in her form as Mahishasura Mardini, slayer of the buffalo demon. Eight-armed (or ten in larger sizes), each hand carrying a weapon from the gods. Mounted on her lion vahana. Lost-wax brass cast in Patan, finished antique-bronze or with selective stone inlay on the crown and shield.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 380,
    material: "Brass",
    style: "Deity",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["M", "L", "XL"],
    finishes: ["AntiqueBronze", "StoneInlay"],
    imageCount: 4,
    tags: ["hindu", "durga", "mahishasura", "brass", "goddess"],
    collections: ["hindu-deities"],
  },
  {
    handle: "vishnu-reclining-bronze",
    title: "Vishnu Reclining (Anantashayana) Bronze",
    excerpt: "Vishnu in cosmic sleep on the serpent Shesha — bronze.",
    description:
      "Vishnu reclining on the seven-headed cosmic serpent Shesha, floating on the ocean of milk between creation and dissolution — the iconography of Anantashayana. Bronze, cast in two parts (deity + serpent) and joined by the artisan after polishing. A meditation piece for the home shrine.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 360,
    material: "Bronze",
    style: "Deity",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["M", "L"],
    finishes: ["AntiqueBronze", "PolishedBrass"],
    imageCount: 4,
    tags: ["hindu", "vishnu", "anantashayana", "bronze", "serpent"],
    collections: ["hindu-deities"],
  },
  {
    handle: "hanuman-brass-statue",
    title: "Hanuman Brass Statue",
    excerpt: "The monkey-god — bearing the Sanjeevani mountain.",
    description:
      "Hanuman in flight, carrying the Sanjeevani mountain to save Lakshmana — the iconic scene from the Ramayana. Right hand raised in protection, gada (mace) at the side. Lost-wax brass, antique or polished finish. Favoured for entrance shrines, doorways and the gym.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 230,
    material: "Brass",
    style: "Deity",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S", "M", "L"],
    finishes: ["AntiqueBronze", "PolishedBrass", "GoldPlated"],
    imageCount: 4,
    tags: ["hindu", "hanuman", "ramayana", "brass"],
    collections: ["hindu-deities"],
  },
  {
    handle: "mini-pocket-buddha-set",
    title: "Mini Pocket Buddha Statue Set",
    excerpt: "Travel-shrine sized brass Buddhas — 2 inches tall.",
    description:
      "A set of three pocket-sized brass Buddha statues for travel shrines, gifts, or the corner of an altar. Each Buddha is around 2 inches tall, cast and finished by hand, comes in a velvet pouch with a small wooden lotus base. Choose Shakyamuni, Amitabha or Medicine Buddha — or the set of all three.",
    vendorSlug: "patan-bronze-casters",
    origin: "NP",
    basePrice: 55,
    material: "Brass",
    style: "Buddha",
    craft: "LostWax",
    brand: "Patan Bronze Casters",
    sizes: ["S"],
    finishes: ["AntiqueBronze", "PolishedBrass", "GoldPlated"],
    imageCount: 4,
    tags: ["buddha", "mini", "pocket", "travel", "gift", "brass"],
    collections: ["home-altar", "buddha-statues"],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Thamel Wood & Stone — wood carvings, stone, ritual masks (10 products)
  // ───────────────────────────────────────────────────────────────────────────
  {
    handle: "sal-wood-buddha-carving",
    title: "Carved Sal Wood Buddha",
    excerpt: "Hand-carved sal-wood Buddha in dhyana mudra.",
    description:
      "Shakyamuni Buddha seated in dhyana mudra, hand-carved from a single block of sal wood by Newari woodcarvers in Bhaktapur. The grain runs vertically through the body and head, giving each piece a unique pattern. Natural beeswax finish brings out the warm honey tones of the wood without a glossy varnish layer.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 195,
    material: "Wood",
    style: "Buddha",
    craft: "WoodCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["S", "M", "L"],
    finishes: ["Natural", "Lacquered"],
    imageCount: 4,
    tags: ["buddha", "sal-wood", "wood-carving", "bhaktapur", "newari"],
    collections: ["wood-carvings", "buddha-statues"],
  },
  {
    handle: "newari-window-panel",
    title: "Newari Window Frame Panel",
    excerpt: "Latticework wood panel — the iconic Newari ankhi-jhyal.",
    description:
      "A scaled-down Newari ankhi-jhyal window panel, hand-carved in sal wood by Bhaktapur craftsmen. The same joinery and chisel techniques used for Patan Durbar Square and Krishna Mandir — interlocking lattice, peacock spandrels, and a central Bhairab mask. Mountable as wall art or a freestanding screen.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 380,
    material: "Wood",
    style: "Carving",
    craft: "WoodCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["M", "L", "XL"],
    finishes: ["Natural", "Lacquered"],
    imageCount: 4,
    tags: ["wood-carving", "newari", "ankhi-jhyal", "window", "bhaktapur"],
    collections: ["wood-carvings"],
  },
  {
    handle: "wooden-mandala-plaque",
    title: "Carved Wooden Mandala Wall Plaque",
    excerpt: "Tibetan mandala carved in walnut — wall-mountable medallion.",
    description:
      "A Vajrayana mandala carved in walnut, with the central deity surrounded by the four directional gateways and outer rings of vajras and lotuses. Hand-finished, mountable on a wall with the included brass hook. A meditation aid and a striking piece of carved geometry.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 220,
    compareAtPrice: 280,
    material: "Wood",
    style: "Carving",
    craft: "WoodCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["M", "L"],
    finishes: ["Natural", "Lacquered"],
    imageCount: 4,
    tags: ["mandala", "wood-carving", "walnut", "wall-art", "tibetan"],
    collections: ["wood-carvings"],
  },
  {
    handle: "black-stone-buddha-head",
    title: "Black Stone Buddha Head",
    excerpt: "Serene Buddha head carved from a single block of black stone.",
    description:
      "A Buddha head — the canonical Pala-period iconography of half-closed eyes, ushnisha topknot, and elongated earlobes — carved from a single block of Nepali black stone by sculptors in the Patan stoneyards. Naturally polished surface, no chemical sealants. A presence piece for a console, mantel, or garden plinth.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 285,
    material: "Stone",
    style: "Buddha",
    craft: "StoneCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["M", "L", "XL"],
    finishes: ["Natural"],
    imageCount: 4,
    tags: ["buddha", "stone-carving", "black-stone", "buddha-head", "patan"],
    collections: ["stone-sculptures", "buddha-statues"],
  },
  {
    handle: "black-stone-tara",
    title: "Black Stone Tara Figure",
    excerpt: "Green Tara carved in black stone — outdoor-safe.",
    description:
      "Green Tara in lalitasana, carved from a single block of black stone. Suitable for both indoor display and protected outdoor placement (covered terrace, garden niche). The hardness of black stone takes the chisel cleanly and weathers gracefully over decades.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 320,
    material: "Stone",
    style: "Bodhisattva",
    craft: "StoneCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["M", "L"],
    finishes: ["Natural"],
    imageCount: 4,
    tags: ["tara", "stone-carving", "black-stone", "bodhisattva"],
    collections: ["stone-sculptures", "bodhisattvas"],
  },
  {
    handle: "marble-ganesha",
    title: "Marble Ganesha",
    excerpt: "Carved Indian-marble Ganesha for the home altar.",
    description:
      "A seated Ganesha hand-carved in Makrana-style marble, with hand-painted accent on the dhoti and crown. Indoor only — marble is porous and water-sensitive. The marble takes paint vibrantly, which is why we offer this piece in both natural-white and traditional polychrome.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 260,
    material: "Marble",
    style: "Deity",
    craft: "StoneCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["S", "M", "L"],
    finishes: ["Natural", "Painted"],
    imageCount: 4,
    tags: ["hindu", "ganesha", "marble", "stone-carving", "altar"],
    collections: ["stone-sculptures", "hindu-deities"],
  },
  {
    handle: "mahakala-mask",
    title: "Mahakala Wrathful Deity Mask",
    excerpt: "The wrathful protector — hand-carved, painted and lacquered.",
    description:
      "Mahakala, the wrathful protector deity, in his six-armed form. Carved from a single block of Nepali wood, painted in five-element polychrome (red, blue, white, gold, black) and finished with traditional Nepalese lacquer. Wall-mountable for puja shrines or as protector iconography over a doorway.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 180,
    material: "Wood",
    style: "Mask",
    craft: "WoodCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["M", "L"],
    finishes: ["Painted", "Lacquered"],
    imageCount: 4,
    tags: ["mask", "mahakala", "wrathful", "protector", "wood-carving"],
    collections: ["ritual-masks"],
  },
  {
    handle: "bhairab-festival-mask",
    title: "Bhairab Festival Mask",
    excerpt: "The terrifying form of Shiva — Indra Jatra mask.",
    description:
      "Bhairab — Shiva in his fierce manifestation — carved and painted in the style worn for Indra Jatra in Kathmandu Durbar Square. Bulging eyes, protruding fangs, garland of skulls. Carved in a single block of jackfruit wood, hand-painted, and finished with a final lacquer coat. Comes with a brass hanging chain.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 165,
    material: "Wood",
    style: "Mask",
    craft: "WoodCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["M", "L"],
    finishes: ["Painted", "Lacquered"],
    imageCount: 4,
    tags: ["mask", "bhairab", "shiva", "indra-jatra", "newari"],
    collections: ["ritual-masks"],
  },
  {
    handle: "lakhe-dance-mask",
    title: "Newari Lakhe Dance Mask",
    excerpt: "The red-faced dancing demon of Kathmandu festivals.",
    description:
      "Lakhe — the iconic red-faced, shaggy-maned dancing demon who roams the streets of Kathmandu during the Indra Jatra festival. Carved by Newari mask-makers from jackfruit wood, painted in vermilion and gold, with a real horsehair mane. Wall-mountable, with the option to add the full festival costume on request.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 145,
    material: "Wood",
    style: "Mask",
    craft: "WoodCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["M", "L"],
    finishes: ["Painted"],
    imageCount: 4,
    tags: ["mask", "lakhe", "newari", "festival", "kathmandu"],
    collections: ["ritual-masks"],
  },
  {
    handle: "carved-lotus-bowl",
    title: "Carved Wooden Lotus Bowl",
    excerpt: "An offering bowl carved as an open lotus — sal wood.",
    description:
      "A puja offering bowl carved from a single block of sal wood, opened to resemble a lotus in full bloom. Used for water offerings, flower petals, or simply as a decorative dish. Naturally finished with beeswax — food-safe with care, but best reserved for dry offerings.",
    vendorSlug: "thamel-wood-stone",
    origin: "NP",
    basePrice: 60,
    material: "Wood",
    style: "Ritual",
    craft: "WoodCarved",
    brand: "Thamel Wood & Stone",
    sizes: ["S", "M"],
    finishes: ["Natural"],
    imageCount: 4,
    tags: ["wood-carving", "lotus", "bowl", "offering", "altar"],
    collections: ["home-altar", "wood-carvings"],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Himalayan Singing Bowls — singing bowls, prayer wheels, ritual (6 products)
  // ───────────────────────────────────────────────────────────────────────────
  {
    handle: "antique-singing-bowl",
    title: "Hand-Hammered Antique Singing Bowl",
    excerpt: "Seven-metal singing bowl, hand-hammered in the Himalayan tradition.",
    description:
      "A singing bowl hammered from a seven-metal alloy (gold, silver, copper, iron, tin, lead, mercury — the traditional saptaloha of the Himalayan smiths). Hammer-marked exterior, smooth interior. Comes with a hand-stitched cushion and a hardwood mallet. Each bowl is tuned to a specific note — A, C, F or G — corresponding to chakras and meditation traditions.",
    vendorSlug: "himalayan-bowls",
    origin: "NP",
    basePrice: 95,
    material: "MixedMetal",
    style: "SingingBowl",
    craft: "HandHammered",
    brand: "Himalayan Singing Bowls",
    sizes: ["S", "M", "L", "XL"],
    finishes: ["AntiqueBronze", "PolishedBrass", "CopperBrass"],
    imageCount: 4,
    tags: ["singing-bowl", "seven-metal", "meditation", "sound-healing", "boudha"],
    collections: ["singing-bowls"],
  },
  {
    handle: "healing-bowl-set",
    title: "Seven-Metal Healing Singing Bowl Set",
    excerpt: "Seven bowls tuned to the seven chakras — a complete sound-healing kit.",
    description:
      "A set of seven hand-hammered singing bowls, each tuned to a different chakra note (root through crown). Comes in a fitted wooden carrying case with seven mallets and seven cushions. Used by sound-healing practitioners; also a striking display piece in a meditation room. Each bowl is signed by the lead smith.",
    vendorSlug: "himalayan-bowls",
    origin: "NP",
    basePrice: 420,
    compareAtPrice: 540,
    material: "MixedMetal",
    style: "SingingBowl",
    craft: "HandHammered",
    brand: "Himalayan Singing Bowls",
    sizes: ["M"],
    finishes: ["AntiqueBronze", "PolishedBrass"],
    imageCount: 4,
    tags: ["singing-bowl", "chakra", "set", "sound-healing", "meditation"],
    collections: ["singing-bowls"],
  },
  {
    handle: "full-moon-bowl",
    title: "Full Moon Singing Bowl",
    excerpt: "Hammered on the night of a full moon — collector's grade.",
    description:
      "A traditional Himalayan full-moon bowl — hammered by senior smiths only on the night of a full moon, when the metal is said to be most receptive. Each bowl carries a hand-inscribed lunar date on the base. Antique-finished, deeper resonance and longer sustain than standard bowls. Limited production; we receive about twenty bowls a year.",
    vendorSlug: "himalayan-bowls",
    origin: "NP",
    basePrice: 240,
    material: "MixedMetal",
    style: "SingingBowl",
    craft: "HandHammered",
    brand: "Himalayan Singing Bowls",
    sizes: ["M", "L"],
    finishes: ["AntiqueBronze"],
    imageCount: 4,
    tags: ["singing-bowl", "full-moon", "antique", "collector", "limited"],
    collections: ["singing-bowls"],
  },
  {
    handle: "handheld-prayer-wheel",
    title: "Handheld Prayer Wheel",
    excerpt: "Spinning prayer wheel for personal practice — Om Mani Padme Hum.",
    description:
      "A handheld prayer wheel — the iconic spinning cylinder engraved with the six-syllable mantra Om Mani Padme Hum, holding a hand-printed paper scroll of the mantra inside. Spin clockwise during walking meditation, mantra recitation or as a meditation in itself. Brass body, hand-engraved exterior, with a polished wood handle.",
    vendorSlug: "himalayan-bowls",
    origin: "NP",
    basePrice: 65,
    material: "Brass",
    style: "PrayerWheel",
    craft: "HandHammered",
    brand: "Himalayan Singing Bowls",
    sizes: ["S", "M"],
    finishes: ["PolishedBrass", "AntiqueBronze", "CopperBrass"],
    imageCount: 4,
    tags: ["prayer-wheel", "mani", "tibetan", "handheld", "brass"],
    collections: ["prayer-wheels"],
  },
  {
    handle: "tabletop-prayer-wheel",
    title: "Tabletop Prayer Wheel with Mani Mantra",
    excerpt: "Desk-sized prayer wheel — engraved brass with mantra scroll.",
    description:
      "A tabletop prayer wheel sized for a desk, altar or window sill. The brass body is hand-engraved with the Om Mani Padme Hum mantra on the exterior; the interior contains a tightly-wound mantra scroll. Spin clockwise — each rotation is considered equivalent to reciting the mantras held inside. Cedar wood base, brass cap, free-spinning cylinder.",
    vendorSlug: "himalayan-bowls",
    origin: "NP",
    basePrice: 145,
    material: "Brass",
    style: "PrayerWheel",
    craft: "HandHammered",
    brand: "Himalayan Singing Bowls",
    sizes: ["M", "L"],
    finishes: ["PolishedBrass", "AntiqueBronze", "SilverPlated"],
    imageCount: 4,
    tags: ["prayer-wheel", "tabletop", "mani", "brass", "altar"],
    collections: ["prayer-wheels"],
  },
  {
    handle: "vajra-bell-ritual-set",
    title: "Vajra & Bell Ritual Set (Dorje)",
    excerpt: "The diamond thunderbolt and bell — paired ritual implements.",
    description:
      "The vajra (Tibetan: dorje, the diamond thunderbolt) and ghanta (the ritual bell) — the two essential implements of Vajrayana Buddhist practice, representing skilful means and wisdom held together. Lost-wax cast in bronze and brass, hand-engraved exterior, with a separate wooden display stand. The bell sustains for over twenty seconds when struck.",
    vendorSlug: "himalayan-bowls",
    origin: "NP",
    basePrice: 180,
    material: "Bronze",
    style: "Ritual",
    craft: "LostWax",
    brand: "Himalayan Singing Bowls",
    sizes: ["M", "L"],
    finishes: ["AntiqueBronze", "GoldPlated"],
    imageCount: 4,
    tags: ["vajra", "dorje", "bell", "ritual", "vajrayana"],
    collections: ["ritual-objects"],
  },
];

// ─── Reviews ────────────────────────────────────────────────────────────────

interface ReviewSpec {
  productHandle: string;
  rating: number;
  title: string;
  body: string;
  author: string;
}

const REVIEWS: ReviewSpec[] = [
  { productHandle: "shakyamuni-buddha-stone-inlay", rating: 5, title: "Heirloom-quality casting",          body: "The stone inlay work on the lotus throne is exquisite. Face was repainted at our local monastery without issue. Anchors our shrine room beautifully.",      author: "Anita Shrestha" },
  { productHandle: "amitabha-buddha-bronze",        rating: 5, title: "Calming presence",                    body: "We sit with this Amitabha every morning. The bronze patina is warm and the dhyana posture is so still. Worth every rupee.",                                  author: "Priya Thapa" },
  { productHandle: "medicine-buddha-gold-plated",   rating: 5, title: "Stunning gilding",                    body: "The fire-gilding is incredible — looks deeper and warmer than any modern plating. Took 3 weeks to arrive (worth the wait).",                                      author: "Rajesh Bhattarai" },
  { productHandle: "green-tara-stone-inlay",        rating: 5, title: "The turquoise is gorgeous",           body: "The stone inlay catches the light beautifully. Tara's posture is so ready-to-help. Couldn't be happier.",                                                       author: "Sushma Rai" },
  { productHandle: "manjushri-bodhisattva",         rating: 4, title: "Beautiful detail",                    body: "The sword and book detail is sharp and clean. Subtracted one star because the antique finish was a bit darker than the photo suggested.",                          author: "Bikram Gurung" },
  { productHandle: "avalokiteshvara-four-armed",    rating: 5, title: "Our family Chenrezig",                body: "Four-armed Avalokiteshvara is the patron of our line. The casting is sharp, the proportions are correct, and the gold plating is even.",                       author: "Sanjana Maharjan" },
  { productHandle: "ganesha-brass-statue",          rating: 5, title: "Perfect for our new shop",            body: "Bought this for our store opening puja. Excellent weight to the brass and Ganesha is dancing exactly as he should. Polished finish for the long term.",      author: "Anjali Karki" },
  { productHandle: "nataraja-dancing-shiva",        rating: 5, title: "Museum quality",                       body: "We've been collecting Naatraja sculptures for years; this Patan piece holds up next to gallery pieces. The ring of fire detail is unbelievable.",                author: "Deepak Pradhan" },
  { productHandle: "durga-mahishasura-mardini",     rating: 5, title: "Spectacular for Dashain",              body: "Bought this in time for Dashain. The lion vahana detail and Durga's weapons are sharply cast. Excellent piece.",                                                  author: "Sandeep Tamang" },
  { productHandle: "sal-wood-buddha-carving",       rating: 5, title: "The grain is beautiful",               body: "The honey tones of the sal wood are so warm. Bigger than I expected — pleasantly so. Sits perfectly on our living-room mantel.",                                 author: "Manisha Poudel" },
  { productHandle: "black-stone-buddha-head",       rating: 5, title: "Serene presence piece",                body: "Got the medium for our entryway console. The black stone is gorgeous against the white wall. Heavy, well-packed, arrived without a scratch.",                  author: "Sabita Joshi" },
  { productHandle: "mahakala-mask",                 rating: 4, title: "Striking — bigger than expected",     body: "The Mahakala mask is fierce in the best way. Just check dimensions — it's larger than I imagined. Painting is crisp.",                                            author: "Nabin Adhikari" },
  { productHandle: "bhairab-festival-mask",         rating: 5, title: "Festival-quality work",                body: "This is the same quality as the masks used in Indra Jatra. Sat over our front door now — feels very protective.",                                                author: "Pratima Shrestha" },
  { productHandle: "antique-singing-bowl",          rating: 5, title: "Beautiful sustain",                    body: "The bowl rings on and on. Tuned to F (heart chakra) — perfect for my yoga studio. The cushion and mallet are lovely too.",                                       author: "Roshan Khatri" },
  { productHandle: "healing-bowl-set",              rating: 5, title: "Worth the investment for healers",    body: "I'm a sound therapist and the chakra-tuning is accurate. The wooden case keeps everything safe between sessions. Excellent.",                                       author: "Sabita Joshi" },
  { productHandle: "tabletop-prayer-wheel",         rating: 5, title: "Spins smoothly",                       body: "On my desk and I spin it whenever I'm on a long call. The engraving on the brass is sharp and the cedar base looks great.",                                       author: "Anita Shrestha" },
  { productHandle: "vajra-bell-ritual-set",         rating: 5, title: "The bell sings",                       body: "The sustain on the bell is over 20 seconds. Vajra is heavy and balanced. A complete ritual set, beautifully presented.",                                          author: "Deepak Pradhan" },
];

// ─── Wipe (when WIPE_DB=1) ──────────────────────────────────────────────────

/**
 * Truncate everything this seed touches in FK-safe order.
 */
async function wipe() {
  console.log("⚠️  WIPE_DB=1 — truncating catalog tables…");
  await db.execute(sql`
    TRUNCATE TABLE
      newsletter_subscribers,
      blog_post_tags,
      blog_posts,
      blog_tags,
      blogs,
      pages,
      discount_codes,
      discount_redemptions,
      discount_vendor_targets,
      cart_applied_discounts,
      order_applied_discounts,
      vendor_order_applied_discounts,
      discounts,
      order_items,
      order_addresses,
      vendor_orders,
      orders,
      product_reviews,
      collection_products,
      variant_selected_options,
      product_option_values,
      product_options,
      inventory_items,
      variants,
      product_images,
      product_tags,
      products,
      collections,
      vendor_kyc_documents,
      vendor_kycs,
      vendor_addresses,
      vendor_memberships,
      customer_addresses,
      customer_tags,
      customers,
      vendors,
      files,
      facet_filters
    RESTART IDENTITY CASCADE;
  `);
  await db.execute(sql`DELETE FROM users WHERE id LIKE 'seed-%';`);
  console.log("   …truncated.");
}

// ─── Seed (insert all) ──────────────────────────────────────────────────────

async function seed() {
  console.log("🪔 Seeding Himalayan Crafts marketplace (sculptures & ritual objects)…");

  validateEnv();

  console.log("  uploading image pool to R2…");
  await prefetchPoolImages();

  const adminEmail = "admin@admin.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123";
  const vendorPassword = process.env.VENDOR_PASSWORD ?? "Vendor@123";

  const adminHash = await hashPassword(adminPassword);
  const vendorHash = await hashPassword(vendorPassword);

  const adminId = id("user", "admin");

  // ── 1. Vendors + users + memberships ──────────────────────────────────
  console.log("  vendors + users + memberships…");
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  await db
    .insert(vendors)
    .values(
      VENDORS.map((v) => ({
        id: id("vndr", v.slug),
        name: v.name,
        legalName: v.legalName,
        slug: v.slug,
        status: v.status,
        bio: v.bio,
        primaryEmail: v.email,
        supportEmail: v.email,
        billingEmail: v.email,
        primaryPhone: v.primaryPhone,
        websiteUrl: v.websiteUrl,
        logoUrl: img(`${v.slug}-logo`),
        bannerUrl: img(`${v.slug}-banner`),
        countryCode: v.countryCode,
        currencyCode: v.currencyCode,
        timezone: "Asia/Kathmandu",
        vatNumber: v.vatNumber || null,
        taxId: v.taxId,
        registrationNumber: v.registrationNumber,
        commissionBps: v.commissionBps,
        seoTitle: `${v.name} | Hand-cast Himalayan sculptures`,
        seoDescription: v.bio.slice(0, 155),
        approvedAt: v.status === "active" ? daysAgo(180) : null,
        suspendedAt: v.status === "suspended" ? daysAgo(7) : null,
        suspensionReason: v.status === "suspended" ? v.reason ?? null : null,
        rejectedAt: v.status === "rejected" ? daysAgo(3) : null,
        rejectionReason: v.status === "rejected" ? v.reason ?? null : null,
        onboardingCompletedAt: v.status === "active" ? daysAgo(180) : null,
      }))
    )
    .onConflictDoNothing();

  await db
    .insert(users)
    .values([
      {
        id: adminId,
        email: adminEmail,
        passwordHash: adminHash,
        platformRole: "super_admin",
        firstName: "Platform",
        lastName: "Admin",
        isActive: true,
      },
      ...VENDORS.map((v) => ({
        id: id("user", v.slug),
        email: v.email,
        passwordHash: vendorHash,
        firstName: v.ownerFirstName,
        lastName: v.ownerLastName,
        isActive: true,
      })),
    ])
    .onConflictDoNothing();

  await db
    .insert(vendorMemberships)
    .values(
      VENDORS.map((v) => ({
        id: id("vmem", v.slug),
        userId: id("user", v.slug),
        vendorId: id("vndr", v.slug),
        role: "owner" as const,
        status: "active" as const,
      }))
    )
    .onConflictDoNothing();

  // ── 2. Collections ────────────────────────────────────────────────────
  console.log("  collections…");
  await db
    .insert(collections)
    .values(
      COLLECTIONS.map((c) => ({
        id: id("col", c.handle),
        vendorId: id("vndr", c.vendorSlug),
        title: c.title,
        handle: c.handle,
        description: c.description,
        status: "active" as const,
      }))
    )
    .onConflictDoNothing();

  // ── 3. Products ───────────────────────────────────────────────────────
  console.log(`  products (${PRODUCTS.length})…`);
  await db
    .insert(products)
    .values(
      PRODUCTS.map((p) => ({
        id: id("prod", p.handle),
        vendorId: id("vndr", p.vendorSlug),
        title: p.title,
        handle: p.handle,
        excerpt: p.excerpt,
        description: p.description,
        status: "active" as const,
        productType: `Handicraft / ${p.style}`,
        brand: p.brand ?? null,
        seoTitle: `${p.title} | Himalayan Crafts Nepal`,
        seoDescription: p.excerpt,
        publishedAt: new Date(),
      }))
    )
    .onConflictDoNothing();

  const tagRows = PRODUCTS.flatMap((p) =>
    [
      p.material.toLowerCase(),
      p.style.toLowerCase(),
      `craft-${p.craft.toLowerCase()}`,
      `origin-${p.origin.toLowerCase()}`,
      ...p.tags,
    ]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((tag) => ({ productId: id("prod", p.handle), tag }))
  );
  await db.insert(productTags).values(tagRows).onConflictDoNothing();

  // ── 4. Product images ─────────────────────────────────────────────────
  console.log("  product images…");
  const imageRows = PRODUCTS.flatMap((p) =>
    Array.from({ length: p.imageCount }, (_, i) => ({
      id: id("img", `${p.handle}-${i}`),
      productId: id("prod", p.handle),
      url: img(`prod-${p.handle}-${i}`),
      altText: `${p.title} — view ${i + 1}`,
      position: i,
      isFeatured: i === 0,
    }))
  );
  await db.insert(productImages).values(imageRows).onConflictDoNothing();

  // ── 5. Options + option values ────────────────────────────────────────
  console.log("  options + option values…");
  const optionRows: Array<typeof productOptions.$inferInsert> = [];
  const optionValueRows: Array<typeof productOptionValues.$inferInsert> = [];

  for (const p of PRODUCTS) {
    const sizeOptionId = id("opt", `${p.handle}-size`);
    const finishOptionId = id("opt", `${p.handle}-finish`);

    if (p.sizes.length > 1) {
      optionRows.push({
        id: sizeOptionId,
        productId: id("prod", p.handle),
        name: "Size",
        position: 0,
      });
      p.sizes.forEach((size, i) => {
        optionValueRows.push({
          id: id("ov", `${p.handle}-size-${size}`),
          optionId: sizeOptionId,
          value: SIZE_LABEL[size],
          position: i,
        });
      });
    }
    if (p.finishes.length > 1) {
      optionRows.push({
        id: finishOptionId,
        productId: id("prod", p.handle),
        name: "Finish",
        position: 1,
      });
      p.finishes.forEach((finish, i) => {
        optionValueRows.push({
          id: id("ov", `${p.handle}-finish-${finish}`),
          optionId: finishOptionId,
          value: FINISH_LABEL[finish],
          position: i,
        });
      });
    }
  }
  await db.insert(productOptions).values(optionRows).onConflictDoNothing();
  await db
    .insert(productOptionValues)
    .values(optionValueRows)
    .onConflictDoNothing();

  // ── 6. Variants + selected options + inventory ───────────────────────
  console.log("  variants + inventory…");
  const variantRows: Array<typeof variants.$inferInsert> = [];
  const variantOptionRows: Array<typeof variantSelectedOptions.$inferInsert> = [];
  const inventoryRows: Array<typeof inventoryItems.$inferInsert> = [];

  for (const p of PRODUCTS) {
    const productId = id("prod", p.handle);
    const vendorId = id("vndr", p.vendorSlug);

    const combos = p.sizes.flatMap((size) =>
      p.finishes.map((finish) => ({ size, finish }))
    );

    combos.forEach((combo, i) => {
      const sizeKey = combo.size;
      const finishKey = combo.finish;
      const variantId = id("vnt", `${p.handle}-${sizeKey}-${finishKey}`);
      const sku = `HC-${p.handle.toUpperCase()}-${sizeKey}-${finishKey.slice(0, 5).toUpperCase()}`;
      const variantPrice = toNPR(p.basePrice * SIZE_PRICE_MULTIPLIER[combo.size]);
      const variantCompareAt = p.compareAtPrice
        ? toNPR(p.compareAtPrice * SIZE_PRICE_MULTIPLIER[combo.size])
        : null;

      // Sculptures are heavy; rough kg estimate scales with size.
      const weightKg =
        combo.size === "S" ? 0.8 : combo.size === "M" ? 2.5 : combo.size === "L" ? 5.5 : 11.0;

      variantRows.push({
        id: variantId,
        vendorId,
        productId,
        sku,
        price: cents(variantPrice),
        compareAtPrice: variantCompareAt ? cents(variantCompareAt) : null,
        position: i,
        requiresShipping: true,
        inventoryTracked: true,
        inventoryPolicy: "deny",
        weightValue: weightKg.toFixed(3),
        weightUnit: "kg",
      });

      if (p.sizes.length > 1) {
        variantOptionRows.push({
          variantId,
          optionId: id("opt", `${p.handle}-size`),
          optionValueId: id("ov", `${p.handle}-size-${combo.size}`),
        });
      }
      if (p.finishes.length > 1) {
        variantOptionRows.push({
          variantId,
          optionId: id("opt", `${p.handle}-finish`),
          optionValueId: id("ov", `${p.handle}-finish-${combo.finish}`),
        });
      }

      inventoryRows.push({
        id: id("inv", `${p.handle}-${sizeKey}-${finishKey}`),
        vendorId,
        variantId,
        tracked: true,
        availableQuantity: 2 + Math.floor(Math.random() * 10),
        reservedQuantity: 0,
        incomingQuantity: 0,
        reorderThreshold: 2,
        allowBackorder: false,
      });
    });
  }
  await db.insert(variants).values(variantRows).onConflictDoNothing();
  await db
    .insert(variantSelectedOptions)
    .values(variantOptionRows)
    .onConflictDoNothing();
  await db.insert(inventoryItems).values(inventoryRows).onConflictDoNothing();

  // ── 7. Collection products ───────────────────────────────────────────
  console.log("  collection products…");
  const colProductRows = PRODUCTS.flatMap((p) =>
    p.collections.map((ch, i) => ({
      collectionId: id("col", ch),
      productId: id("prod", p.handle),
      position: i,
    }))
  );
  await db
    .insert(collectionProducts)
    .values(colProductRows)
    .onConflictDoNothing();

  // ── 8. Reviews ───────────────────────────────────────────────────────
  console.log(`  reviews (${REVIEWS.length})…`);
  await db
    .insert(productReviews)
    .values(
      REVIEWS.map((r, i) => {
        const product = PRODUCTS.find((p) => p.handle === r.productHandle);
        if (!product) {
          throw new Error(`Review references unknown product: ${r.productHandle}`);
        }
        return {
          id: id("rev", `${r.productHandle}-${i}`),
          vendorId: id("vndr", product.vendorSlug),
          productId: id("prod", r.productHandle),
          rating: r.rating,
          title: r.title,
          body: r.body,
          authorName: r.author,
          status: "published" as const,
          publishedAt: new Date(),
          verifiedPurchase: true,
        };
      })
    )
    .onConflictDoNothing();

  // ── 9. Default facet filters ─────────────────────────────────────────
  console.log("  facet filters…");
  await db
    .insert(facetFilters)
    .values([
      { id: id("ff", "price"), key: "price", label: "Price", sourceType: "variant_price", displayType: "slider", position: 0, enabled: true },
      { id: id("ff", "collection"), key: "collection", label: "Collection", sourceType: "collection", displayType: "checkbox", position: 1, enabled: true },
      { id: id("ff", "vendor"), key: "vendor", label: "Vendor", sourceType: "vendor", displayType: "checkbox", position: 2, enabled: true },
      { id: id("ff", "tag"), key: "tag", label: "Style / Material", sourceType: "tag", displayType: "checkbox", position: 3, enabled: true },
      { id: id("ff", "rating"), key: "rating", label: "Rating", sourceType: "rating", displayType: "radio", position: 4, enabled: true },
      { id: id("ff", "availability"), key: "availability", label: "Availability", sourceType: "availability", displayType: "toggle", position: 5, enabled: true },
    ])
    .onConflictDoNothing();

  // ── 10. Files ────────────────────────────────────────────────────────
  console.log("  files…");
  type FileRow = typeof files.$inferInsert;
  const fileRows: FileRow[] = [];

  for (let i = 0; i < POOL_IMAGES.length; i++) {
    const pool = POOL_IMAGES[i]!;
    fileRows.push({
      id: id("file", `pool-${i}`),
      scope: "platform",
      vendorId: null,
      kind: "image",
      originalName: `craft-${String(i).padStart(2, "0")}.jpg`,
      fileName: `craft-${String(i).padStart(2, "0")}.jpg`,
      mimeType: "image/jpeg",
      extension: "jpg",
      storageKey: pool.storageKey,
      url: pool.url,
      altText: `Handicraft / sculpture reference photo ${i + 1}`,
      sizeBytes: 320_000,
      width: 1600,
      height: 1600,
    });
  }

  for (const v of VENDORS) {
    const vendorId = id("vndr", v.slug);
    const kycDocTypes: Array<{ type: string; ext: string; size: number }> = [
      { type: "registration", ext: "pdf", size: 220_000 },
      { type: "tax", ext: "pdf", size: 145_000 },
      { type: "identity", ext: "pdf", size: 320_000 },
    ];
    for (const d of kycDocTypes) {
      fileRows.push({
        id: id("file", `${v.slug}-kyc-${d.type}`),
        scope: "vendor",
        vendorId,
        kind: "document",
        originalName: `${v.slug}-${d.type}.${d.ext}`,
        fileName: `${v.slug}-${d.type}.${d.ext}`,
        mimeType: "application/pdf",
        extension: d.ext,
        storageKey: `vendors/${v.slug}/kyc/${d.type}.${d.ext}`,
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        altText: `${v.name} — ${d.type} document`,
        sizeBytes: d.size,
      });
    }
  }

  await db.insert(files).values(fileRows).onConflictDoNothing();

  const blogPoolFileId = (key: string) => {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    return id("file", `pool-${Math.abs(h) % POOL_IMAGES.length}`);
  };

  // ── 11. Vendor addresses ─────────────────────────────────────────────
  console.log("  vendor addresses…");
  await db
    .insert(vendorAddresses)
    .values(
      VENDORS.map((v) => ({
        id: id("vaddr", v.slug),
        vendorId: id("vndr", v.slug),
        type: "business" as const,
        address1: v.address.line1,
        city: v.address.city,
        province: v.address.province,
        country: v.address.country,
        countryCode: v.countryCode,
        zip: v.address.postalCode,
        isDefault: true,
      }))
    )
    .onConflictDoNothing();

  // ── 12. Vendor KYC submissions + documents ───────────────────────────
  console.log("  vendor KYC + documents…");
  await db
    .insert(vendorKycs)
    .values(
      VENDORS.map((v) => {
        const submitted = v.kycStatus !== "pending";
        const reviewed = v.kycStatus === "approved" || v.kycStatus === "rejected";
        return {
          id: id("kyc", v.slug),
          vendorId: id("vndr", v.slug),
          status: v.kycStatus,
          submittedAt: submitted ? daysAgo(45) : null,
          reviewedAt: reviewed ? daysAgo(40) : null,
          reviewedBy: reviewed ? adminId : null,
          rejectionReason: v.kycStatus === "rejected" ? v.reason ?? null : null,
        };
      })
    )
    .onConflictDoNothing();

  type KycDocRow = typeof vendorKycDocuments.$inferInsert;
  const kycDocRows: KycDocRow[] = [];
  for (const v of VENDORS) {
    const kycId = id("kyc", v.slug);
    kycDocRows.push(
      {
        id: id("kycd", `${v.slug}-registration`),
        vendorKycId: kycId,
        documentType: "registration_certificate" as const,
        fileId: id("file", `${v.slug}-kyc-registration`),
        note: "Business registration certificate",
      },
      {
        id: id("kycd", `${v.slug}-tax`),
        vendorKycId: kycId,
        documentType: "tax_document" as const,
        fileId: id("file", `${v.slug}-kyc-tax`),
        note: "Tax registration",
      },
      {
        id: id("kycd", `${v.slug}-identity`),
        vendorKycId: kycId,
        documentType: "owner_identity" as const,
        fileId: id("file", `${v.slug}-kyc-identity`),
        note: "Owner ID",
      },
    );
  }
  await db.insert(vendorKycDocuments).values(kycDocRows).onConflictDoNothing();

  // ── 13. Customers ────────────────────────────────────────────────────
  console.log("  customers (10)…");
  const customerHash = await hashPassword(process.env.CUSTOMER_PASSWORD ?? "Customer@12345");
  interface CustomerSpec {
    key: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    totalOrders: number;
    totalSpent: string;
    daysAgoLastOrder: number | null;
    emailMarketingSubscribed: boolean;
  }
  const CUSTOMERS: CustomerSpec[] = [
    { key: "anita-shrestha",  firstName: "Anita",   lastName: "Shrestha",  email: "anita.shrestha@example.com",  phone: "+977 9841234567", totalOrders: 4, totalSpent: "210850.00", daysAgoLastOrder: 12, emailMarketingSubscribed: true  },
    { key: "rajesh-bhattarai",firstName: "Rajesh",  lastName: "Bhattarai", email: "rajesh.bh@example.com",       phone: "+977 9851234567", totalOrders: 2, totalSpent: "98730.00",  daysAgoLastOrder: 28, emailMarketingSubscribed: true  },
    { key: "priya-thapa",     firstName: "Priya",   lastName: "Thapa",     email: "priya.thapa@example.com",     phone: "+977 9802345678", totalOrders: 1, totalSpent: "38400.00",  daysAgoLastOrder: 8,  emailMarketingSubscribed: false },
    { key: "bikram-gurung",   firstName: "Bikram",  lastName: "Gurung",    email: "bikram.gurung@example.com",   phone: "+977 9818765432", totalOrders: 3, totalSpent: "127950.00", daysAgoLastOrder: 41, emailMarketingSubscribed: true  },
    { key: "sushma-rai",      firstName: "Sushma",  lastName: "Rai",       email: "sushma.rai@example.com",      phone: "+977 9861123456", totalOrders: 1, totalSpent: "32600.00",  daysAgoLastOrder: 4,  emailMarketingSubscribed: true  },
    { key: "deepak-pradhan",  firstName: "Deepak",  lastName: "Pradhan",   email: "deepak.pradhan@example.com",  phone: "+977 9849876543", totalOrders: 2, totalSpent: "176290.00", daysAgoLastOrder: 60, emailMarketingSubscribed: true  },
    { key: "anjali-karki",    firstName: "Anjali",  lastName: "Karki",     email: "anjali.karki@example.com",    phone: "+977 9807654321", totalOrders: 1, totalSpent: "33500.00",  daysAgoLastOrder: 18, emailMarketingSubscribed: false },
    { key: "sandeep-tamang",  firstName: "Sandeep", lastName: "Tamang",    email: "sandeep.t@example.com",       phone: "+977 9803456789", totalOrders: 1, totalSpent: "13050.00",  daysAgoLastOrder: 70, emailMarketingSubscribed: true  },
    { key: "manisha-poudel",  firstName: "Manisha", lastName: "Poudel",    email: "manisha.poudel@example.com",  phone: "+977 9852345678", totalOrders: 0, totalSpent: "0.00",      daysAgoLastOrder: null, emailMarketingSubscribed: true  },
    { key: "nabin-adhikari",  firstName: "Nabin",   lastName: "Adhikari",  email: "nabin.adhikari@example.com",  phone: "+977 9817654321", totalOrders: 0, totalSpent: "0.00",      daysAgoLastOrder: null, emailMarketingSubscribed: false },
  ];
  await db
    .insert(customers)
    .values(
      CUSTOMERS.map((c) => ({
        id: id("cust", c.key),
        email: c.email.toLowerCase(),
        passwordHash: customerHash,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        state: "enabled" as const,
        emailVerifiedAt: daysAgo(180),
        lastLoginAt: c.daysAgoLastOrder !== null ? daysAgo(c.daysAgoLastOrder) : daysAgo(90),
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
        lastOrderAt: c.daysAgoLastOrder !== null ? daysAgo(c.daysAgoLastOrder) : null,
        emailMarketingSubscribed: c.emailMarketingSubscribed,
        emailMarketingUpdatedAt: c.emailMarketingSubscribed ? daysAgo(180) : null,
      }))
    )
    .onConflictDoNothing();

  console.log("  customer addresses…");
  interface CustomerAddressSpec {
    customerKey: string;
    line1: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    countryCode: string;
  }
  const CUSTOMER_ADDRESSES: CustomerAddressSpec[] = [
    { customerKey: "anita-shrestha",  line1: "Naxal Bhagawati Marg, Ward 1",     city: "Kathmandu",  province: "Bagmati",   postalCode: "44600", country: "Nepal", countryCode: "NP" },
    { customerKey: "rajesh-bhattarai",line1: "Sankhamul Marg, Ward 10",          city: "Lalitpur",   province: "Bagmati",   postalCode: "44700", country: "Nepal", countryCode: "NP" },
    { customerKey: "priya-thapa",     line1: "Suryabinayak, Ward 4",             city: "Bhaktapur",  province: "Bagmati",   postalCode: "44800", country: "Nepal", countryCode: "NP" },
    { customerKey: "bikram-gurung",   line1: "Lakeside-6, Phewa Marg",           city: "Pokhara",    province: "Gandaki",   postalCode: "33700", country: "Nepal", countryCode: "NP" },
    { customerKey: "sushma-rai",      line1: "Main Road, Ward 12",               city: "Biratnagar", province: "Koshi",     postalCode: "56613", country: "Nepal", countryCode: "NP" },
    { customerKey: "deepak-pradhan",  line1: "Putalisadak Chowk, Ward 28",       city: "Kathmandu",  province: "Bagmati",   postalCode: "44600", country: "Nepal", countryCode: "NP" },
    { customerKey: "anjali-karki",    line1: "Bagbazar, Ward 31",                city: "Kathmandu",  province: "Bagmati",   postalCode: "44600", country: "Nepal", countryCode: "NP" },
  ];
  await db
    .insert(customerAddresses)
    .values(
      CUSTOMER_ADDRESSES.map((a) => {
        const cust = CUSTOMERS.find((c) => c.key === a.customerKey)!;
        return {
          id: id("caddr", a.customerKey),
          customerId: id("cust", a.customerKey),
          firstName: cust.firstName,
          lastName: cust.lastName,
          phone: cust.phone,
          address1: a.line1,
          city: a.city,
          province: a.province,
          country: a.country,
          countryCode: a.countryCode,
          zip: a.postalCode,
          isDefaultShipping: true,
          isDefaultBilling: true,
        };
      })
    )
    .onConflictDoNothing();

  // ── 14. Discounts + codes ────────────────────────────────────────────
  console.log("  discounts + codes (8)…");
  interface DiscountSpec {
    key: string;
    title: string;
    description: string;
    scope: "platform" | "vendor";
    vendorSlug?: string;
    type: "percentage" | "fixed_amount" | "free_shipping";
    value: string;
    targetType: "order" | "shipping";
    code: string;
    status: "active" | "draft" | "archived";
    minimumSubtotal?: string;
    usageLimit?: number;
    oncePerCustomer?: boolean;
    firstOrderOnly?: boolean;
    daysAgoStart: number;
    daysAgoEnd: number | null;
  }
  const DISCOUNTS: DiscountSpec[] = [
    { key: "welcome10",   title: "Welcome 10% off",                       description: "First-purchase discount for new customers.",                                  scope: "platform",                                  type: "percentage",    value: "10.00",   targetType: "order",    code: "WELCOME10",  status: "active",   firstOrderOnly: true,                                                   daysAgoStart: 365, daysAgoEnd: null },
    { key: "freeship",    title: "Free shipping over Rs 25,000",          description: "Free standard shipping inside Nepal when subtotal exceeds Rs 25,000.",          scope: "platform",                                  type: "free_shipping", value: "0.00",    targetType: "shipping", code: "FREESHIP",   status: "active",   minimumSubtotal: "25000.00",                                            daysAgoStart: 180, daysAgoEnd: null },
    { key: "buddha20",    title: "20% off Buddha Statues",                description: "Limited-time discount on the Buddha Statues collection.",                       scope: "platform",                                  type: "percentage",    value: "20.00",   targetType: "order",    code: "BUDDHA20",   status: "active",                                                                           daysAgoStart: 30,  daysAgoEnd: -30  },
    { key: "festival15",  title: "Festival season 15%",                   description: "Festival-only promotion. Activates next month.",                                 scope: "platform",                                  type: "percentage",    value: "15.00",   targetType: "order",    code: "FESTIVAL15", status: "draft",                                                                            daysAgoStart: -14, daysAgoEnd: -45  },
    { key: "vipfixed5000",title: "Rs 5,000 off VIP first order",          description: "Fixed-amount discount for invited VIP collectors.",                              scope: "platform",                                  type: "fixed_amount",  value: "5000.00", targetType: "order",    code: "VIP5000",    status: "active",   minimumSubtotal: "30000.00", oncePerCustomer: true, firstOrderOnly: true,    daysAgoStart: 60,  daysAgoEnd: null },
    { key: "patan15",     title: "Patan Bronze 15% summer",               description: "Vendor-specific 15% off all Patan Bronze Casters pieces.",                       scope: "vendor", vendorSlug: "patan-bronze-casters", type: "percentage",    value: "15.00",   targetType: "order",    code: "PATAN15",    status: "active",                                                                           daysAgoStart: 7,   daysAgoEnd: -21  },
    { key: "altar2500",   title: "Rs 2,500 off when you spend Rs 50,000", description: "Altar-builder bundle discount on larger orders.",                                scope: "platform",                                  type: "fixed_amount",  value: "2500.00", targetType: "order",    code: "ALTAR2500",  status: "active",   minimumSubtotal: "50000.00",                                            daysAgoStart: 21,  daysAgoEnd: null },
    { key: "dashain24",   title: "Dashain Sale 2024 (expired)",            description: "Last year's Dashain festival promotion.",                                       scope: "platform",                                  type: "percentage",    value: "20.00",   targetType: "order",    code: "DASHAIN24",  status: "archived",                                                                         daysAgoStart: 365, daysAgoEnd: 250  },
  ];
  await db
    .insert(discounts)
    .values(
      DISCOUNTS.map((d) => ({
        id: id("disc", d.key),
        scope: d.scope,
        vendorId: d.vendorSlug ? id("vndr", d.vendorSlug) : null,
        title: d.title,
        description: d.description,
        status: d.status,
        type: d.type,
        targetType: d.targetType,
        value: d.value,
        minimumSubtotal: d.minimumSubtotal ?? null,
        usageLimit: d.usageLimit ?? null,
        oncePerCustomer: d.oncePerCustomer ?? false,
        firstOrderOnly: d.firstOrderOnly ?? false,
        startsAt: daysAgo(d.daysAgoStart),
        endsAt: d.daysAgoEnd === null ? null : daysAgo(d.daysAgoEnd),
        createdByUserId: adminId,
      }))
    )
    .onConflictDoNothing();
  await db
    .insert(discountCodes)
    .values(
      DISCOUNTS.map((d) => ({
        id: id("dc", d.key),
        discountId: id("disc", d.key),
        code: d.code,
        status: d.status === "active" ? ("active" as const) : d.status === "draft" ? ("active" as const) : ("disabled" as const),
        startsAt: daysAgo(d.daysAgoStart),
        endsAt: d.daysAgoEnd === null ? null : daysAgo(d.daysAgoEnd),
      }))
    )
    .onConflictDoNothing();

  // ── 15. Orders + line items + addresses + vendor splits ──────────────
  console.log("  orders (5)…");
  interface OrderSpec {
    key: string;
    customerKey: string;
    daysAgo: number;
    status: "open" | "completed" | "cancelled";
    paymentStatus: "pending" | "paid" | "refunded";
    fulfillmentStatus: "unfulfilled" | "fulfilled" | "partially_fulfilled";
    deliveryStatus: "not_shipped" | "in_transit" | "delivered";
    shippingPrice: number;
    items: Array<{ productHandle: string; vendorSlug: string; size: PieceSize; finish: PieceFinish; quantity: number; unitPrice: number; title: string }>;
    address: { line1: string; city: string; province: string; postalCode: string; country: string; countryCode: string };
  }
  // Order item unitPrice values are in NPR (already converted from the
  // catalog USD numbers by `toNPR()` so they match what the variant rows
  // actually charge).
  const ORDERS: OrderSpec[] = [
    {
      key: "ord-001", customerKey: "anita-shrestha", daysAgo: 4,
      status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled", deliveryStatus: "delivered", shippingPrice: 800,
      items: [
        { productHandle: "shakyamuni-buddha-stone-inlay", vendorSlug: "patan-bronze-casters", size: "M", finish: "StoneInlay", quantity: 1, unitPrice: toNPR(320), title: "Shakyamuni Buddha Brass Statue, Stone Inlay" },
      ],
      address: { line1: "Naxal Bhagawati Marg, Ward 1", city: "Kathmandu", province: "Bagmati", postalCode: "44600", country: "Nepal", countryCode: "NP" },
    },
    {
      key: "ord-002", customerKey: "rajesh-bhattarai", daysAgo: 12,
      status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled", deliveryStatus: "delivered", shippingPrice: 1200,
      items: [
        { productHandle: "antique-singing-bowl", vendorSlug: "himalayan-bowls",  size: "M", finish: "AntiqueBronze", quantity: 1, unitPrice: toNPR(95),  title: "Hand-Hammered Antique Singing Bowl" },
        { productHandle: "tabletop-prayer-wheel", vendorSlug: "himalayan-bowls", size: "M", finish: "PolishedBrass", quantity: 1, unitPrice: toNPR(145), title: "Tabletop Prayer Wheel with Mani Mantra" },
      ],
      address: { line1: "Sankhamul Marg, Ward 10", city: "Lalitpur", province: "Bagmati", postalCode: "44700", country: "Nepal", countryCode: "NP" },
    },
    {
      key: "ord-003", customerKey: "priya-thapa", daysAgo: 8,
      status: "open", paymentStatus: "paid", fulfillmentStatus: "partially_fulfilled", deliveryStatus: "in_transit", shippingPrice: 1000,
      items: [
        { productHandle: "green-tara-stone-inlay", vendorSlug: "patan-bronze-casters", size: "M", finish: "StoneInlay", quantity: 1, unitPrice: toNPR(310), title: "Green Tara Brass Statue, Stone Inlay" },
        { productHandle: "mahakala-mask",          vendorSlug: "thamel-wood-stone",    size: "M", finish: "Painted",    quantity: 1, unitPrice: toNPR(180), title: "Mahakala Wrathful Deity Mask" },
      ],
      address: { line1: "Suryabinayak, Ward 4", city: "Bhaktapur", province: "Bagmati", postalCode: "44800", country: "Nepal", countryCode: "NP" },
    },
    {
      key: "ord-004", customerKey: "bikram-gurung", daysAgo: 21,
      status: "open", paymentStatus: "pending", fulfillmentStatus: "unfulfilled", deliveryStatus: "not_shipped", shippingPrice: 900,
      items: [
        { productHandle: "nataraja-dancing-shiva", vendorSlug: "patan-bronze-casters", size: "L", finish: "AntiqueBronze", quantity: 1, unitPrice: toNPR(425 * 1.7), title: "Dancing Shiva (Nataraja) Brass" },
      ],
      address: { line1: "Lakeside-6, Phewa Marg", city: "Pokhara", province: "Gandaki", postalCode: "33700", country: "Nepal", countryCode: "NP" },
    },
    {
      key: "ord-005", customerKey: "sushma-rai", daysAgo: 4,
      status: "cancelled", paymentStatus: "refunded", fulfillmentStatus: "unfulfilled", deliveryStatus: "not_shipped", shippingPrice: 0,
      items: [
        { productHandle: "ganesha-brass-statue", vendorSlug: "patan-bronze-casters", size: "M", finish: "PolishedBrass", quantity: 1, unitPrice: toNPR(245), title: "Ganesha Brass Statue" },
      ],
      address: { line1: "Main Road, Ward 12", city: "Biratnagar", province: "Koshi", postalCode: "56613", country: "Nepal", countryCode: "NP" },
    },
  ];

  type OrderRow = typeof orders.$inferInsert;
  type VendorOrderRow = typeof vendorOrders.$inferInsert;
  type OrderItemRow = typeof orderItems.$inferInsert;
  type OrderAddressRow = typeof orderAddresses.$inferInsert;
  const orderRows: OrderRow[] = [];
  const vendorOrderRows: VendorOrderRow[] = [];
  const orderItemRows: OrderItemRow[] = [];
  const orderAddressRows: OrderAddressRow[] = [];

  let orderCounter = 1001;
  for (const o of ORDERS) {
    const orderId = id("order", o.key);
    const cust = CUSTOMERS.find((c) => c.key === o.customerKey)!;
    const subtotal = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const total = subtotal + o.shippingPrice;
    const placedAt = daysAgo(o.daysAgo);

    orderRows.push({
      id: orderId,
      cartId: null,
      customerId: id("cust", cust.key),
      orderNumber: `HC-${orderCounter}`,
      status: o.status,
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      deliveryStatus: o.deliveryStatus,
      currencyCode: "NPR",
      customerEmail: cust.email.toLowerCase(),
      customerFirstName: cust.firstName,
      customerLastName: cust.lastName,
      customerPhone: cust.phone,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      subtotalPrice: subtotal.toFixed(2),
      shippingPrice: o.shippingPrice.toFixed(2),
      totalPrice: total.toFixed(2),
      totalPaid:
        o.paymentStatus === "paid" || o.paymentStatus === "refunded"
          ? total.toFixed(2)
          : "0.00",
      totalRefunded: o.paymentStatus === "refunded" ? total.toFixed(2) : "0.00",
      placedAt,
      paidAt: o.paymentStatus === "paid" ? placedAt : null,
      cancelledAt: o.status === "cancelled" ? placedAt : null,
      completedAt: o.status === "completed" ? new Date(placedAt.getTime() + 5 * 86_400_000) : null,
    });

    const byVendor = new Map<string, typeof o.items>();
    for (const item of o.items) {
      const list = byVendor.get(item.vendorSlug) ?? [];
      list.push(item);
      byVendor.set(item.vendorSlug, list);
    }

    let voCounter = 1;
    for (const [vendorSlug, items_] of byVendor) {
      const voId = id("vorder", `${o.key}-${vendorSlug}`);
      const voSubtotal = items_.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      vendorOrderRows.push({
        id: voId,
        orderId,
        vendorId: id("vndr", vendorSlug),
        vendorOrderNumber: `${o.key.toUpperCase()}-${voCounter}`,
        status: o.status,
        paymentStatus: o.paymentStatus,
        fulfillmentStatus: o.fulfillmentStatus,
        deliveryStatus: o.deliveryStatus,
        currencyCode: "NPR",
        itemCount: items_.reduce((s, i) => s + i.quantity, 0),
        subtotalPrice: voSubtotal.toFixed(2),
        totalPrice: voSubtotal.toFixed(2),
        totalPaid:
          o.paymentStatus === "paid" || o.paymentStatus === "refunded"
            ? voSubtotal.toFixed(2)
            : "0.00",
        placedAt,
      });
      voCounter++;

      for (let i = 0; i < items_.length; i++) {
        const item = items_[i]!;
        orderItemRows.push({
          id: id("oitem", `${o.key}-${vendorSlug}-${i}`),
          orderId,
          vendorOrderId: voId,
          vendorId: id("vndr", vendorSlug),
          productId: id("prod", item.productHandle),
          variantId: id("vnt", `${item.productHandle}-${item.size}-${item.finish}`),
          title: item.title,
          variantTitle: `${SIZE_LABEL[item.size]} / ${FINISH_LABEL[item.finish]}`,
          sku: `HC-${item.productHandle.slice(0, 8).toUpperCase()}-${item.size}-${item.finish.slice(0, 5).toUpperCase()}`,
          quantity: item.quantity,
          fulfilledQuantity: o.fulfillmentStatus === "fulfilled" ? item.quantity : o.fulfillmentStatus === "partially_fulfilled" ? Math.floor(item.quantity / 2) : 0,
          unitPrice: item.unitPrice.toFixed(2),
          lineSubtotal: (item.unitPrice * item.quantity).toFixed(2),
          totalPrice: (item.unitPrice * item.quantity).toFixed(2),
          status: o.status === "cancelled" ? ("cancelled" as const) : ("open" as const),
        });
      }
    }

    orderAddressRows.push(
      {
        id: id("oaddr", `${o.key}-shipping`),
        orderId,
        type: "shipping" as const,
        firstName: cust.firstName,
        lastName: cust.lastName,
        phone: cust.phone,
        address1: o.address.line1,
        city: o.address.city,
        province: o.address.province,
        country: o.address.country,
        countryCode: o.address.countryCode,
        zip: o.address.postalCode,
      },
      {
        id: id("oaddr", `${o.key}-billing`),
        orderId,
        type: "billing" as const,
        firstName: cust.firstName,
        lastName: cust.lastName,
        phone: cust.phone,
        address1: o.address.line1,
        city: o.address.city,
        province: o.address.province,
        country: o.address.country,
        countryCode: o.address.countryCode,
        zip: o.address.postalCode,
      },
    );

    orderCounter++;
  }

  await db.insert(orders).values(orderRows).onConflictDoNothing();
  await db.insert(vendorOrders).values(vendorOrderRows).onConflictDoNothing();
  await db.insert(orderItems).values(orderItemRows).onConflictDoNothing();
  await db.insert(orderAddresses).values(orderAddressRows).onConflictDoNothing();

  // ── 16. Pages ────────────────────────────────────────────────────────
  const pageSeed = [
    {
      key: "about",
      title: "About Himalayan Crafts",
      handle: "about",
      body: "<h2>Hand-cast in Patan, hand-carved in Bhaktapur</h2><p>Himalayan Crafts is a marketplace for sculptures and ritual objects from the workshops of the Kathmandu Valley — Patan bronze casters, Bhaktapur woodcarvers, and Boudha metalsmiths. We work directly with the artisans, pay fair wages, and ship worldwide.</p>",
      seoTitle: "About Himalayan Crafts — Nepali Sculpture & Ritual Object Marketplace",
      seoDescription:
        "Himalayan Crafts works directly with sculpture and ritual-object artisans across the Kathmandu Valley. Fair-trade sourcing, traceable provenance, and a 30-day return promise.",
      seoKeywords:
        "Buddha statue, Tara statue, bronze sculpture, singing bowl, prayer wheel, Patan, Bhaktapur, Kathmandu, Nepal, handicraft",
    },
    {
      key: "contact",
      title: "Contact us",
      handle: "contact",
      body: "<h2>Get in touch</h2><p>Questions about a sculpture, sizing for your altar, or commissions? We're here.</p>",
      seoTitle: "Contact Himalayan Crafts — Kathmandu Showroom & Support",
      seoDescription:
        "Speak to a human at Himalayan Crafts. Call, email, or visit our Kathmandu showroom. Custom commissions welcome — replies within 1 business day.",
      seoKeywords: "contact, Himalayan Crafts, Kathmandu showroom, support, custom statue commission",
    },
    {
      key: "faq",
      title: "Help Centre",
      handle: "faq",
      body: "",
      seoTitle: "Himalayan Crafts Help Centre — FAQ, Shipping & Returns",
      seoDescription:
        "Answers about Buddha statues, singing bowls, shipping from Kathmandu, returns, care, custom orders, and payments at Himalayan Crafts.",
      seoKeywords: "FAQ, help, statue care, shipping, returns, custom orders",
    },
    {
      key: "terms",
      title: "Terms of Service",
      handle: "terms",
      body: "",
      seoTitle: "Himalayan Crafts Terms of Service",
      seoDescription:
        "The terms governing your use of Himalayan Crafts — orders, pricing, shipping, returns, IP, and liability. Plain language, last reviewed annually.",
      seoKeywords: "terms of service, terms and conditions, legal, Himalayan Crafts",
    },
    {
      key: "privacy",
      title: "Privacy Policy",
      handle: "privacy",
      body: "",
      seoTitle: "Himalayan Crafts Privacy Policy — How We Handle Your Data",
      seoDescription:
        "What Himalayan Crafts collects, why, and your rights to access, correct, or delete it. Aligned with Nepal's data-protection framework and GDPR.",
      seoKeywords: "privacy policy, data protection, GDPR, Nepal data law",
    },
    {
      key: "returns",
      title: "Returns & Exchanges",
      handle: "returns",
      body: "",
      seoTitle: "Himalayan Crafts Returns & Exchanges — 30-Day Easy Returns",
      seoDescription:
        "30 days to return any sculpture or ritual object. Free domestic return pickup inside Nepal, fast refunds, plus rules for damaged orders and international returns.",
      seoKeywords: "returns, exchanges, refunds, 30 day returns, statue return policy",
    },
    {
      key: "payment",
      title: "Payment Options",
      handle: "payment",
      body: "",
      seoTitle: "Himalayan Crafts Payment — eSewa, Khalti, Fonepay & Cards",
      seoDescription:
        "eSewa, Khalti, Fonepay, ConnectIPS, all major cards, Stripe, PayPal, and Cash on Delivery across Nepal. Every transaction tokenised and encrypted.",
      seoKeywords: "payment options, eSewa, Khalti, Fonepay, ConnectIPS, COD, cash on delivery",
    },
    {
      key: "cookie-policy",
      title: "Cookie Policy",
      handle: "cookie-policy",
      body: "",
      seoTitle: "Himalayan Crafts Cookie Policy",
      seoDescription:
        "Every cookie Himalayan Crafts sets, in plain English: strictly necessary, analytics, and marketing. Switch any of them off in one click.",
      seoKeywords: "cookies, cookie policy, GDPR cookies, opt out",
    },
    {
      key: "accessibility",
      title: "Accessibility Statement",
      handle: "accessibility",
      body: "",
      seoTitle: "Himalayan Crafts Accessibility Statement — WCAG 2.1 AA",
      seoDescription:
        "Himalayan Crafts aims for WCAG 2.1 Level AA across the storefront. What we already do, known issues, and how to give us feedback.",
      seoKeywords: "accessibility, WCAG, a11y, screen reader, keyboard navigation",
    },
    {
      key: "shipping",
      title: "Shipping",
      handle: "shipping",
      body: "",
      seoTitle: "Himalayan Crafts Shipping — Kathmandu to 60+ Countries",
      seoDescription:
        "Free domestic shipping above Rs 25,000, COD across Nepal, DHL/FedEx Express worldwide. Transit times, customs, and packaging explained.",
      seoKeywords: "shipping, delivery, DHL, FedEx, customs, Kathmandu Valley, free shipping",
    },
  ] as const;

  console.log(`  pages (${pageSeed.length})…`);
  await db
    .insert(pages)
    .values(
      pageSeed.map((p) => ({
        id: id("page", p.key),
        title: p.title,
        handle: p.handle,
        body: p.body,
        status: "published" as const,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        seoKeywords: p.seoKeywords,
        publishedAt: daysAgo(120),
        createdBy: adminId,
      }))
    )
    .onConflictDoNothing();

  // ── 17. Blogs + posts ────────────────────────────────────────────────
  console.log("  blogs + posts (8)…");
  await db
    .insert(blogs)
    .values({
      id: id("blog", "himalayan-journal"),
      title: "Himalayan Crafts Journal",
      handle: "journal",
      description:
        "Stories from the foundries of Patan and the woodcarving sheds of Bhaktapur — Buddhist iconography, lost-wax casting, and how to live with a sacred sculpture.",
      status: "published" as const,
      commentStatus: "enabled" as const,
      seoTitle: "Himalayan Crafts Journal — Sculpture stories, iconography & care",
      publishedAt: daysAgo(180),
      createdBy: adminId,
    })
    .onConflictDoNothing();

  interface BlogPostSpec {
    key: keyof typeof BLOG_BODIES;
    title: string;
    handle: string;
    excerpt: string;
    body: string;
    coverFileKey: string;
    coverFileId?: string;
    imageAlt?: string;
    daysAgo: number;
  }
  const POSTS: BlogPostSpec[] = [
    {
      key: "iconography-guide",
      title: "Reading a Buddha statue: posture, mudra, and iconography",
      handle: "reading-a-buddha-statue",
      excerpt:
        "Bhumisparsha, dhyana, abhaya, varada — how to read the hands, posture and attributes of a Buddha or Bodhisattva before you buy.",
      body: BLOG_BODIES["iconography-guide"],
      coverFileKey: "iconography-guide",
      coverFileId: BLOG_COVER_FILE_IDS["iconography-guide"],
      imageAlt: BLOG_COVER_ALT["iconography-guide"],
      daysAgo: 7,
    },
    {
      key: "statue-care-101",
      title: "Statue care 101: keep brass, bronze and wood for a hundred years",
      handle: "statue-care-101",
      excerpt:
        "Polishing brass without stripping the patina, sealing wood, dusting mantra scrolls — the routines that keep a sculpture beautiful for generations.",
      body: BLOG_BODIES["statue-care-101"],
      coverFileKey: "statue-care-101",
      coverFileId: BLOG_COVER_FILE_IDS["statue-care-101"],
      imageAlt: BLOG_COVER_ALT["statue-care-101"],
      daysAgo: 21,
    },
    {
      key: "patan-lost-wax",
      title: "Lost-wax in Patan: 1,500 years of bronze casting",
      handle: "lost-wax-in-patan",
      excerpt:
        "How the Shakya casters of Patan turn beeswax models into bronze Buddhas using a technique unchanged since the Licchavi dynasty.",
      body: BLOG_BODIES["patan-lost-wax"],
      coverFileKey: "patan-lost-wax",
      coverFileId: BLOG_COVER_FILE_IDS["patan-lost-wax"],
      imageAlt: BLOG_COVER_ALT["patan-lost-wax"],
      daysAgo: 35,
    },
    {
      key: "sustainable-sourcing",
      title: "How we source: fair-wage artisans, traceable craft",
      handle: "how-we-source",
      excerpt:
        "Direct trade with Patan, Bhaktapur and Boudha workshops, written wage agreements, and a paper trail on every sculpture.",
      body: BLOG_BODIES["sustainable-sourcing"],
      coverFileKey: "sustainable-sourcing",
      coverFileId: BLOG_COVER_FILE_IDS["sustainable-sourcing"],
      imageAlt: BLOG_COVER_ALT["sustainable-sourcing"],
      daysAgo: 56,
    },
    {
      key: "finishes-guide",
      title: "Antique, oxidized, polished, gilt: choosing a finish",
      handle: "choosing-a-finish",
      excerpt:
        "How the four canonical finishes change the feel of the same casting — when to choose patina, when to choose polish, when to gild.",
      body: BLOG_BODIES["finishes-guide"],
      coverFileKey: "finishes-guide",
      coverFileId: BLOG_COVER_FILE_IDS["finishes-guide"],
      imageAlt: BLOG_COVER_ALT["finishes-guide"],
      daysAgo: 90,
    },
    {
      key: "altar-size-guide",
      title: "Sizing the statue for your altar",
      handle: "sizing-your-statue",
      excerpt:
        "Small altar, mantel, family shrine, monastery — the rule-of-thumb sizes that always look right.",
      body: BLOG_BODIES["altar-size-guide"],
      coverFileKey: "altar-size-guide",
      coverFileId: BLOG_COVER_FILE_IDS["altar-size-guide"],
      imageAlt: BLOG_COVER_ALT["altar-size-guide"],
      daysAgo: 110,
    },
    {
      key: "stone-inlay",
      title: "Stone inlay: the turquoise, coral and lapis behind every statue",
      handle: "stone-inlay-explained",
      excerpt:
        "Why traditional statues are set with turquoise and coral — and what to expect from a stone-inlay piece over the decades.",
      body: BLOG_BODIES["stone-inlay"],
      coverFileKey: "stone-inlay",
      coverFileId: BLOG_COVER_FILE_IDS["stone-inlay"],
      imageAlt: BLOG_COVER_ALT["stone-inlay"],
      daysAgo: 140,
    },
    {
      key: "shipping-from-nepal",
      title: "Shipping a sculpture from Kathmandu to your door",
      handle: "shipping-from-kathmandu",
      excerpt:
        "Export documentation, DHL air freight, customs duties for fragile sculpture — what to expect when ordering from Nepal.",
      body: BLOG_BODIES["shipping-from-nepal"],
      coverFileKey: "shipping-from-nepal",
      coverFileId: BLOG_COVER_FILE_IDS["shipping-from-nepal"],
      imageAlt: BLOG_COVER_ALT["shipping-from-nepal"],
      daysAgo: 160,
    },
  ];
  await db
    .insert(blogPosts)
    .values(
      POSTS.map((p) => ({
        id: id("post", p.key),
        blogId: id("blog", "himalayan-journal"),
        title: p.title,
        handle: p.handle,
        excerpt: p.excerpt,
        body: p.body,
        status: "published" as const,
        featuredImageFileId: p.coverFileId ?? blogPoolFileId(p.coverFileKey),
        imageAlt: p.imageAlt ?? p.title,
        seoTitle: `${p.title} — Himalayan Crafts Journal`,
        seoDescription: p.excerpt,
        publishedAt: daysAgo(p.daysAgo),
        authorId: adminId,
        createdBy: adminId,
      }))
    )
    .onConflictDoNothing();

  // ── 18. Newsletter subscribers ───────────────────────────────────────
  console.log("  newsletter subscribers (8)…");
  const NEWSLETTER_EMAILS = [
    "anita.shrestha@example.com",
    "rajesh.bh@example.com",
    "deepak.pradhan@example.com",
    "manisha.poudel@example.com",
    "interior.studio.np@example.com",
    "ramesh.lama@example.com",
    "priti.regmi@example.com",
    "samir.dhakal@example.com",
  ];
  await db
    .insert(newsletterSubscribers)
    .values(
      NEWSLETTER_EMAILS.map((email, i) => ({
        id: id("nl", `${i}`).slice(0, 36),
        email: email.toLowerCase(),
        subscribedAt: daysAgo(60 - i * 5),
      }))
    )
    .onConflictDoNothing();

  console.log("\n✅ Real seed complete.\n");
  console.log(`   ${VENDORS.length} vendors · ${COLLECTIONS.length} collections · ${PRODUCTS.length} products · ${variantRows.length} variants · ${REVIEWS.length} reviews`);
  console.log(`   ${CUSTOMERS.length} customers · ${ORDERS.length} orders · ${DISCOUNTS.length} discounts · ${POSTS.length} blog posts · ${fileRows.length} files\n`);
  console.log("Sign in:");
  console.log(`   Admin:    ${adminEmail.padEnd(36)} / ${adminPassword}`);
  for (const v of VENDORS) {
    console.log(`   Vendor:   ${v.email.padEnd(36)} / ${vendorPassword}   (${v.name})`);
  }
  console.log("");
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.WIPE_DB === "1") {
    await wipe();
  }
  await seed();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
