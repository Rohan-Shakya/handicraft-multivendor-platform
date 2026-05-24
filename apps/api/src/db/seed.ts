/**
 * Seed script — idempotent (safe to run multiple times).
 *
 * Usage:
 *   pnpm db:seed         Insert seed rows; existing rows are left alone.
 *   pnpm db:seed:wipe    TRUNCATE catalog tables first, then re-seed.
 *
 * Brand: Handicraft Ecommerce — hand-cast brass statues and deity idols from
 * the workshops of the Kathmandu Valley. Product imagery and dimensions are
 * sourced from axiakrafts.com (statue catalogue).
 *
 * Accounts created:
 *   Admin:     admin@handicraft.com           / admin123
 *   Vendor 1:  vendor1@patanbronze.com        / vendor123  (Patan Bronze Casters)
 *   Vendor 2:  vendor2@bhaktapurbrass.com     / vendor123  (Bhaktapur Brass Studio)
 *   Vendor 3:  vendor3@thamelspiritual.com    / vendor123  (Thamel Spiritual Arts)
 *   Customer:  customer@example.com           / customer123
 */

import { sql } from "drizzle-orm";
import { db } from "./index.js";
import {
  users,
  vendors,
  products,
  productImages,
  variants,
  inventoryItems,
  collections,
  collectionProducts,
  pages,
  blogs,
  blogPosts,
  customers,
  carts,
  cartItems,
  wishlistItems,
  orders,
  orderItems,
  payments,
  productReviews,
  vendorOrders,
  vendorMemberships,
  currencies,
  files,
  newsletterSubscribers,
  newsletterCampaigns,
  campaigns,
  discounts,
  discountCodes,
  facetFilters,
  customerSegments,
  commissionRules,
  giftCards,
} from "./schema/index.js";
import { hashPassword } from "../lib/password.js";

const ID = {
  adminUser:    "seed-user-0000-0000-0000-000000000001",
  vendorUser1:  "seed-user-0000-0000-0000-000000000002",
  vendorUser2:  "seed-user-0000-0000-0000-000000000003",
  vendorUser3:  "seed-user-0000-0000-0000-000000000004",
  customer1:    "seed-cust-0000-0000-0000-000000000001",

  vendor1: "seed-vndr-0000-0000-0000-000000000001",
  vendor2: "seed-vndr-0000-0000-0000-000000000002",
  vendor3: "seed-vndr-0000-0000-0000-000000000003",

  // 12 statue products
  p01: "seed-prod-0000-0000-0000-000000000001", // Buddha 17"
  p02: "seed-prod-0000-0000-0000-000000000002", // Shiva 10.5"
  p03: "seed-prod-0000-0000-0000-000000000003", // Krishna 11"
  p04: "seed-prod-0000-0000-0000-000000000004", // Hanuman 8"
  p05: "seed-prod-0000-0000-0000-000000000005", // Nepali Buddha 3.2"
  p06: "seed-prod-0000-0000-0000-000000000006", // Nepali Ganesh 5"
  p07: "seed-prod-0000-0000-0000-000000000007", // Nepali Laxmi 5"
  p08: "seed-prod-0000-0000-0000-000000000008", // Nepali Saraswati 6"
  p09: "seed-prod-0000-0000-0000-000000000009", // Ganesh-Laxmi-Saraswati Trio
  p10: "seed-prod-0000-0000-0000-000000000010", // Ram Darbar 3.4"
  p11: "seed-prod-0000-0000-0000-000000000011", // Panchayan Gods Set
  p12: "seed-prod-0000-0000-0000-000000000012", // Detailed Shiva 6.3"

  // Default variants (one per product)
  v01: "seed-vnt-0001-0000-0000-000000000001",
  v02: "seed-vnt-0002-0000-0000-000000000001",
  v03: "seed-vnt-0003-0000-0000-000000000001",
  v04: "seed-vnt-0004-0000-0000-000000000001",
  v05: "seed-vnt-0005-0000-0000-000000000001",
  v06: "seed-vnt-0006-0000-0000-000000000001",
  v07: "seed-vnt-0007-0000-0000-000000000001",
  v08: "seed-vnt-0008-0000-0000-000000000001",
  v09: "seed-vnt-0009-0000-0000-000000000001",
  v10: "seed-vnt-0010-0000-0000-000000000001",
  v11: "seed-vnt-0011-0000-0000-000000000001",
  v12: "seed-vnt-0012-0000-0000-000000000001",

  colFeatured:    "seed-col-0000-0000-0000-000000000001",
  colNewArrivals: "seed-col-0000-0000-0000-000000000002",
  colNepali:      "seed-col-0000-0000-0000-000000000003",

  membership1: "seed-vmem-000-0000-0000-000000000001",
  membership2: "seed-vmem-000-0000-0000-000000000002",
  membership3: "seed-vmem-000-0000-0000-000000000003",

  pageAbout:   "seed-page-000-0000-0000-000000000001",
  pagePrivacy: "seed-page-000-0000-0000-000000000002",
  blog1:       "seed-blog-000-0000-0000-000000000001",
  post1:       "seed-post-000-0000-0000-000000000001",
  post2:       "seed-post-000-0000-0000-000000000002",

  cart1:        "seed-cart-000-0000-0000-000000000001",
  cartItem1:    "seed-ci-0000-0000-0000-000000000001",
  order1:       "seed-ord-0000-0000-0000-000000000001",
  orderItem1:   "seed-oi-0000-0000-0000-000000000001",
  orderItem2:   "seed-oi-0000-0000-0000-000000000002",
  payment1:     "seed-pay-000-0000-0000-000000000001",

  // Draft order (admin-created, awaiting customer review)
  draftOrder:       "seed-ord-0000-0000-0000-000000000002",
  draftVendorOrder: "seed-vo-0000-0000-0000-000000000003",
  draftOrderItem:   "seed-oi-0000-0000-0000-000000000003",

  // Bulk-quote draft (customer-initiated from PDP)
  bulkOrder:       "seed-ord-0000-0000-0000-000000000003",
  bulkVendorOrder: "seed-vo-0000-0000-0000-000000000004",
  bulkOrderItem:   "seed-oi-0000-0000-0000-000000000004",

  vendorOrder1: "seed-vo-0000-0000-0000-000000000001",
  vendorOrder2: "seed-vo-0000-0000-0000-000000000002",

  wish1: "seed-wish-000-0000-0000-000000000001",
  wish2: "seed-wish-000-0000-0000-000000000002",

  review1: "seed-rev-0000-0000-0000-000000000001",
  review2: "seed-rev-0000-0000-0000-000000000002",
  review3: "seed-rev-0000-0000-0000-000000000003",
  review4: "seed-rev-0000-0000-0000-000000000004",

  // Marketing — campaigns + discounts
  campaign1:  "seed-cmp-000-0000-0000-000000000001", // Diwali Sale
  campaign2:  "seed-cmp-000-0000-0000-000000000002", // Spring Collection
  discount1:  "seed-disc-00-0000-0000-000000000001", // WELCOME10 (10% off, code)
  discount2:  "seed-disc-00-0000-0000-000000000002", // BUDDHA15 (15% off Buddha, code)
  discount3:  "seed-disc-00-0000-0000-000000000003", // FREESHIP (free shipping, code)
  discount4:  "seed-disc-00-0000-0000-000000000004", // DIWALI20 (campaign-linked, auto)
  discountCode1: "seed-dcd-000-0000-0000-000000000001",
  discountCode2: "seed-dcd-000-0000-0000-000000000002",
  discountCode3: "seed-dcd-000-0000-0000-000000000003",
  discountCode4: "seed-dcd-000-0000-0000-000000000004",

  // Newsletter
  nlCampaign1: "seed-nlc-000-0000-0000-000000000001",

  // Customer segments
  segmentVIP:    "seed-seg-000-0000-0000-000000000001",
  segmentNew:    "seed-seg-000-0000-0000-000000000002",

  // Commission
  commissionRuleDefault: "seed-com-000-0000-0000-000000000001",

  // Gift cards
  giftCard1: "seed-gc-000-0000-0000-000000000001",
  giftCard2: "seed-gc-000-0000-0000-000000000002",

  // Pages (additional)
  pageShipping: "seed-page-000-0000-0000-000000000003",
  pageReturns:  "seed-page-000-0000-0000-000000000004",
  pageContact:  "seed-page-000-0000-0000-000000000005",

  // Blog posts (additional)
  post3:       "seed-post-000-0000-0000-000000000003",
  post4:       "seed-post-000-0000-0000-000000000004",
} as const;

const CDN = "https://cdn2.blanxer.com/uploads/64214e1c9ab999772960ed69";

interface StatueSpec {
  productId: string;
  variantId: string;
  vendorId: string;
  title: string;
  handle: string;
  description: string;
  priceNpr: string;
  sku: string;
  images: string[]; // CDN filenames
  altText: string;
  /** On-hand units in the workshop. Large premium pieces are made-to-order
   * and ship in low quantities; smaller murtis are cast in batches. */
  stock: number;
}

const STATUES: StatueSpec[] = [
  {
    productId: ID.p01, variantId: ID.v01, vendorId: ID.vendor1,
    title: "Brass Buddha Statue 17 inch — Big Sculpture Idol",
    handle: "brass-buddha-statue-17-inch",
    description:
      "Hand-cast brass Buddha in sitting meditation pose, 17 inches tall — a great symbol of peace for meditation rooms, yoga studios, foyers and prayer halls. Lost-wax cast and hand-chased in Patan, finished by senior artisans. Height 44 cm, width 21 cm, weight 8.95 kg.",
    priceNpr: "45000.00", sku: "BUD-17-BR",
    images: ["product_image-buddhabigtry-2631.webp", "product_image-buddhabig2-2462.webp", "product_image-buddhabig3-1639.webp", "product_image-buddhabig1-5410.webp"],
    altText: "Brass Buddha statue 17 inch in meditation pose",
    stock: 3,
  },
  {
    productId: ID.p02, variantId: ID.v02, vendorId: ID.vendor1,
    title: "Brass Shiva Idol 10.5 inch — Home Decor Murti",
    handle: "brass-shiva-idol-10-5-inch",
    description:
      "Hand-cast brass Lord Shiva in the classic dhyana posture — 10.5 inches tall. A centerpiece for home temples, prayer halls and decorative mandirs. Length 8.6 inches, breadth 5.1 inches, height 10.5 inches, weight 3.7 kg. Pure brass.",
    priceNpr: "22500.00", sku: "SHV-10-BR",
    images: ["product_image-shivajibig-8198.webp", "product_image-shivajibig1-8718.webp", "product_image-shivajibig2-9507.webp"],
    altText: "Brass Lord Shiva idol 10.5 inch in meditation",
    stock: 5,
  },
  {
    productId: ID.p03, variantId: ID.v03, vendorId: ID.vendor1,
    title: "Brass Krishna Statue 11 inch — Big Idol Murti",
    handle: "brass-krishna-statue-11-inch",
    description:
      "Exquisite hand-cast brass Lord Krishna playing the flute — 11 inches tall. Where timeless art meets devotion. Height 28 cm, width 10 cm, weight 2.22 kg. Pure brass, lost-wax cast and hand-finished in Patan.",
    priceNpr: "18000.00", sku: "KRS-11-BR",
    images: ["product_image-krishnajibig-9175.webp", "product_image-krishnajibig1-1802.webp", "product_image-krishnajibig2-3718.webp", "product_image-krishnajibig3-5746.webp"],
    altText: "Brass Lord Krishna statue 11 inch with flute",
    stock: 6,
  },
  {
    productId: ID.p04, variantId: ID.v04, vendorId: ID.vendor1,
    title: "Brass Hanuman Murti 8 inch — Decorative Showpiece",
    handle: "brass-hanuman-murti-8-inch",
    description:
      "Pure brass Lord Hanuman, the god of strength and power — 8 inches tall, weight 2.07 kg. A symbol of pleasure, joy, wealth and good luck. Length 6 cm, breadth 6 cm, height 21 cm.",
    priceNpr: "14500.00", sku: "HNM-8-BR",
    images: ["product_image-brasshanumanjibig-4013.webp", "product_image-brasshanumanjibig1-9929.webp", "product_image-brasshanumanjibig2-4793.webp"],
    altText: "Brass Hanuman murti 8 inch standing pose",
    stock: 7,
  },
  {
    productId: ID.p05, variantId: ID.v05, vendorId: ID.vendor2,
    title: "Brass Nepali Buddha Murti 3.2 inch",
    handle: "brass-nepali-buddha-murti-3-2-inch",
    description:
      "A handcrafted Nepali brass Buddha — auspicious to keep at home, office, hotel, store, restaurant, gym or spa to spread positive energy. Ideally faces east. Length 3 cm, breadth 3 cm, height 8 cm, weight 0.16 kg.",
    priceNpr: "1800.00", sku: "NPL-BUD-3",
    images: ["product_image-buddhasmall2-2769.webp", "product_image-buddhasmalln-5664.webp", "product_image-buddhasmall1-0474.webp"],
    altText: "Nepali brass Buddha murti 3.2 inch small",
    stock: 24,
  },
  {
    productId: ID.p06, variantId: ID.v06, vendorId: ID.vendor2,
    title: "Brass Nepali Ganesh Murti Big 5 inch",
    handle: "brass-nepali-ganesh-murti-big-5-inch",
    description:
      "Pure brass Lord Ganesha in sitting pose — Ganesha represents joy and happiness, symbolic of prosperity and good health. Length 5 cm, breadth 5 cm, height 12 cm, weight 0.36 kg.",
    priceNpr: "3200.00", sku: "NPL-GNH-5",
    images: ["product_image-nepaliganeshbign-8512.webp", "product_image-nepaliganeshbig1-0933.webp", "product_image-nepaliganeshbig4try-6196.webp", "product_image-nepaliganeshbig3n-2025.webp"],
    altText: "Nepali brass Ganesh murti 5 inch big",
    stock: 18,
  },
  {
    productId: ID.p07, variantId: ID.v07, vendorId: ID.vendor2,
    title: "Brass Nepali Laxmi Murti 5 inch",
    handle: "brass-nepali-laxmi-murti-5-inch",
    description:
      "Brass idol of Goddess Lakshmi — the Hindu goddess of wealth, prosperity, light, wisdom, fortune and fertility. Suits home temples, office desks, home décor and car displays. Length 9 cm, breadth 9 cm, height 12 cm, weight 0.38 kg.",
    priceNpr: "3200.00", sku: "NPL-LXM-5",
    images: ["product_image-laxminepalibign-3238.webp", "product_image-laxminepalibig3-9785.webp", "product_image-laxminepalibig2-4618.webp", "product_image-laxminepalibig1n-1165.webp"],
    altText: "Nepali brass Laxmi murti 5 inch goddess of wealth",
    stock: 20,
  },
  {
    productId: ID.p08, variantId: ID.v08, vendorId: ID.vendor2,
    title: "Brass Nepali Saraswati Murti 6 inch",
    handle: "brass-nepali-saraswati-murti-6-inch",
    description:
      "Brass statue of Goddess Saraswati — embodying speech, wisdom and learning. Her four hands represent mind, intellect, alertness and ego; she holds sacred scriptures and a lotus in two hands while playing the veena with the other two. Length 9 cm, breadth 9 cm, height 13 cm, weight 0.43 kg.",
    priceNpr: "3800.00", sku: "NPL-SRW-6",
    images: ["product_image-saraswatinepalibign-5724.webp", "product_image-saraswatinepalibig1-8729.webp", "product_image-saraswatinepalibig2-4924.webp"],
    altText: "Nepali brass Saraswati murti 6 inch with veena",
    stock: 15,
  },
  {
    productId: ID.p09, variantId: ID.v09, vendorId: ID.vendor3,
    title: "Brass Ganesh Laxmi Saraswati Trio — 3 inch Sculpture Set",
    handle: "brass-ganesh-laxmi-saraswati-trio-3-inch",
    description:
      "Divine trio sculpture set — Ganesha, Lakshmi and Saraswati cast in pure brass, sized for home pooja. Length 4 cm, breadth 12 cm, height 7 cm, weight 0.46 kg.",
    priceNpr: "3500.00", sku: "TRIO-GLS-3",
    images: ["product_image-ganeshlaxmisaraswoti-1270.webp", "product_image-ganeshlaxmisaraswoti1-5974.webp", "product_image-ganeshlaxmisaraswoti2-0873.webp", "product_image-ganeshlaxmisaraswoti3-4460.webp"],
    altText: "Brass Ganesh Laxmi Saraswati trio sculpture set",
    stock: 12,
  },
  {
    productId: ID.p10, variantId: ID.v10, vendorId: ID.vendor3,
    title: "Brass Ram Darbar Idol 3.4 inch — Ram Sita Lakshman Hanuman",
    handle: "brass-ram-darbar-idol-3-4-inch",
    description:
      "Brass darbar (court) arrangement featuring Ram, Sita, Lakshman and Hanuman — perfect for home temples and prayer spaces. Length 3 cm, breadth 8.5 cm, height 8.5 cm, weight 0.28 kg.",
    priceNpr: "2800.00", sku: "RMD-3-BR",
    images: ["product_image-ramsitalaxman-8720.webp", "product_image-ramsitalaxman1-3892.webp", "product_image-ramsitalaxman2-4998.webp", "product_image-ramsitalaxman3-4922.webp"],
    altText: "Brass Ram Darbar idol with Ram Sita Lakshman Hanuman",
    stock: 14,
  },
  {
    productId: ID.p11, variantId: ID.v11, vendorId: ID.vendor3,
    title: "Brass Panchayan Gods Statue Set — Idols on Tray",
    handle: "brass-panchayan-gods-statue-set",
    description:
      "Five Hindu deities on a single brass tray — Durga, Ganesh, Shiva, Surya and Vishnu. Total set weight 1.67 kg. Tray 21×31 cm; deities range from 7 cm (Shiva) to 11.5 cm (Vishnu).",
    priceNpr: "12500.00", sku: "PNCH-SET",
    images: ["product_image-panchayangods1-1441.webp", "product_image-panchayangods-7182.webp", "product_image-panchayangods2-3964.webp"],
    altText: "Brass Panchayan five gods statue set on tray",
    stock: 4,
  },
  {
    productId: ID.p12, variantId: ID.v12, vendorId: ID.vendor3,
    title: "Brass Detailed Shiva Statue 6.3 inch",
    handle: "brass-detailed-shiva-statue-6-3-inch",
    description:
      "Finely detailed brass Lord Shiva — 6.3 inches tall, hand-chased finish. Length 8 cm, height 16 cm, weight 1.14 kg.",
    priceNpr: "8500.00", sku: "SHV-DTL-6",
    images: ["product_image-detailedshivajibig-4981.webp", "product_image-detailedshivajibig1-8042.webp", "product_image-detailedshivajibig2-0259.webp", "product_image-detailedshivajibig3-1256.webp"],
    altText: "Brass detailed Shiva statue 6.3 inch hand-chased",
    stock: 8,
  },
];

async function seed() {
  console.log("🪔 Seeding Handicraft Ecommerce — brass statue marketplace…");

  const adminHash    = await hashPassword("admin123");
  const vendorHash   = await hashPassword("vendor123");
  const customerHash = await hashPassword("customer123");

  console.log("  vendors…");
  await db.insert(vendors).values([
    { id: ID.vendor1, name: "Patan Bronze Casters",    slug: "patan-bronze-casters",    status: "active", currencyCode: "NPR", countryCode: "NP", bio: "Fifteen-generation family workshop in Patan's Mangal Bazaar — lost-wax brass deity statues and large sculptures, hand-chased by master artisans." },
    { id: ID.vendor2, name: "Bhaktapur Brass Studio",  slug: "bhaktapur-brass-studio",  status: "active", currencyCode: "NPR", countryCode: "NP", bio: "Newari brass workers from Bhaktapur — traditional Nepali deity murtis sized for home temples and personal altars. Every piece is hand-finished." },
    { id: ID.vendor3, name: "Thamel Spiritual Arts",   slug: "thamel-spiritual-arts",   status: "active", currencyCode: "NPR", countryCode: "NP", bio: "Thamel-based studio specialising in deity sets, panchayan arrangements and detailed brass sculptures for puja, temple and gifting." },
  ]).onConflictDoNothing();

  console.log("  users…");
  await db.insert(users).values([
    { id: ID.adminUser,   email: "admin@handicraft.com",         passwordHash: adminHash, platformRole: "super_admin" },
    { id: ID.vendorUser1, email: "vendor1@patanbronze.com",      passwordHash: vendorHash },
    { id: ID.vendorUser2, email: "vendor2@bhaktapurbrass.com",   passwordHash: vendorHash },
    { id: ID.vendorUser3, email: "vendor3@thamelspiritual.com",  passwordHash: vendorHash },
  ]).onConflictDoNothing();

  console.log("  vendor memberships…");
  await db.insert(vendorMemberships).values([
    { id: ID.membership1, userId: ID.vendorUser1, vendorId: ID.vendor1, role: "owner", status: "active" },
    { id: ID.membership2, userId: ID.vendorUser2, vendorId: ID.vendor2, role: "owner", status: "active" },
    { id: ID.membership3, userId: ID.vendorUser3, vendorId: ID.vendor3, role: "owner", status: "active" },
  ]).onConflictDoNothing();

  console.log("  customers…");
  await db.insert(customers).values([
    { id: ID.customer1, email: "customer@example.com", passwordHash: customerHash, firstName: "Aarav", lastName: "Sharma", phone: "+977-1-555-0100" },
  ]).onConflictDoNothing();

  console.log("  products…");
  await db.insert(products).values(
    STATUES.map((s) => ({
      id: s.productId,
      vendorId: s.vendorId,
      title: s.title,
      handle: s.handle,
      status: "active" as const,
      description: s.description,
      seoTitle: `${s.title} | Handicraft Ecommerce`,
    }))
  ).onConflictDoNothing();

  console.log("  product images…");
  const imageRows = STATUES.flatMap((s) =>
    s.images.map((file, idx) => ({
      id: `seed-img-${s.productId.slice(-12)}-${String(idx).padStart(2, "0")}`,
      productId: s.productId,
      url: `${CDN}/${file}`,
      altText: s.altText,
      position: idx,
      isFeatured: idx === 0,
    }))
  );
  await db.insert(productImages).values(imageRows).onConflictDoNothing();

  console.log("  variants…");
  await db.insert(variants).values(
    STATUES.map((s, idx) => ({
      id: s.variantId,
      vendorId: s.vendorId,
      productId: s.productId,
      sku: s.sku,
      price: s.priceNpr,
      position: idx,
    }))
  ).onConflictDoNothing();

  console.log("  inventory…");
  await db.insert(inventoryItems).values(
    STATUES.map((s, idx) => ({
      id: `seed-inv-0000-0000-0000-${String(idx + 1).padStart(12, "0")}`,
      vendorId: s.vendorId,
      variantId: s.variantId,
      tracked: true,
      availableQuantity: s.stock,
      reservedQuantity: 0,
      incomingQuantity: 0,
      reorderThreshold: 2,
      allowBackorder: false,
    }))
  ).onConflictDoNothing();

  console.log("  collections…");
  await db.insert(collections).values([
    { id: ID.colFeatured,    vendorId: ID.vendor1, title: "Featured Statues",     handle: "featured-statues",  status: "active", description: "Premium hand-cast brass statues — large pieces from Patan's master casters." },
    { id: ID.colNewArrivals, vendorId: ID.vendor3, title: "Deity Sets",           handle: "deity-sets",         status: "active", description: "Trios, Panchayan and Darbar arrangements — multi-deity sets for home temples." },
    { id: ID.colNepali,      vendorId: ID.vendor2, title: "Traditional Nepali",   handle: "traditional-nepali", status: "active", description: "Compact Nepali-style brass murtis crafted in Bhaktapur — sized for everyday puja." },
  ]).onConflictDoNothing();

  const existingColProducts = await db.select().from(collectionProducts);
  const existingSet = new Set(existingColProducts.map((r) => `${r.collectionId}:${r.productId}`));
  const colProductsToInsert = [
    { collectionId: ID.colFeatured,    productId: ID.p01, position: 0 },
    { collectionId: ID.colFeatured,    productId: ID.p02, position: 1 },
    { collectionId: ID.colFeatured,    productId: ID.p03, position: 2 },
    { collectionId: ID.colFeatured,    productId: ID.p04, position: 3 },
    { collectionId: ID.colNewArrivals, productId: ID.p09, position: 0 },
    { collectionId: ID.colNewArrivals, productId: ID.p10, position: 1 },
    { collectionId: ID.colNewArrivals, productId: ID.p11, position: 2 },
    { collectionId: ID.colNewArrivals, productId: ID.p12, position: 3 },
    { collectionId: ID.colNepali,      productId: ID.p05, position: 0 },
    { collectionId: ID.colNepali,      productId: ID.p06, position: 1 },
    { collectionId: ID.colNepali,      productId: ID.p07, position: 2 },
    { collectionId: ID.colNepali,      productId: ID.p08, position: 3 },
  ].filter((r) => !existingSet.has(`${r.collectionId}:${r.productId}`));
  if (colProductsToInsert.length > 0) {
    await db.insert(collectionProducts).values(colProductsToInsert);
  }

  console.log("  pages & blogs…");
  await db.insert(pages).values([
    { id: ID.pageAbout,    title: "About Handicraft Ecommerce", handle: "about-us",       status: "published", body: "<h1>Hand-cast in the Kathmandu Valley</h1><p>A marketplace for hand-cast brass statues and deity idols from three workshops: Patan Bronze Casters for large lost-wax pieces, Bhaktapur Brass Studio for traditional Nepali murtis, and Thamel Spiritual Arts for deity sets. Fair wages, traceable provenance, 30-day return promise.</p>" },
    { id: ID.pagePrivacy,  title: "Privacy Policy",             handle: "privacy-policy", status: "published", body: "<h1>Privacy Policy</h1><p>We collect only what we need to ship your piece and follow up about your order. Aligned with Nepal's data-protection framework and GDPR.</p>" },
    { id: ID.pageShipping, title: "Shipping & Delivery",        handle: "shipping",       status: "published", body: "<h1>Shipping & Delivery</h1><p>Domestic Nepal (Kathmandu Valley): 1-2 business days. Outside the valley: 3-5 days. International (DHL Express): 5-9 business days. Large statues (over 5kg) ship double-boxed with custom crating and tracked end-to-end. Cash on delivery available within Nepal.</p>" },
    { id: ID.pageReturns,  title: "Returns & Refunds",          handle: "returns",        status: "published", body: "<h1>Returns & Refunds</h1><p>30-day return window from the date of delivery. Statues must be returned in original packaging, with the workshop provenance card. Refunds are issued via the original payment method within 7 business days of receipt. Bulk-quote orders are final sale unless damaged in transit.</p>" },
    { id: ID.pageContact,  title: "Contact Us",                 handle: "contact",        status: "published", body: "<h1>Contact Us</h1><p>Sales & general queries: <a href=\"mailto:hello@handicraft.com\">hello@handicraft.com</a><br/>Bulk & corporate orders: <a href=\"mailto:bulk@handicraft.com\">bulk@handicraft.com</a><br/>Press & media: <a href=\"mailto:press@handicraft.com\">press@handicraft.com</a></p><p>Office hours: Sun-Fri 10:00-18:00 (NPT). Closed Saturdays and major Nepali public holidays.</p>" },
  ]).onConflictDoNothing();

  await db.insert(blogs).values([
    { id: ID.blog1, title: "The Workshop Journal", handle: "journal", status: "published" },
  ]).onConflictDoNothing();

  await db.insert(blogPosts).values([
    { id: ID.post1, blogId: ID.blog1, title: "How a Patan bronze is cast",         handle: "how-a-patan-bronze-is-cast",       status: "published", publishedAt: new Date("2026-04-01"), body: "<p>Lost-wax casting, step by step — from the clay model to the final chase. Photos from the Mangal Bazaar workshop.</p>", seoTitle: "How a Patan bronze is cast | The Workshop Journal" },
    { id: ID.post2, blogId: ID.blog1, title: "Choosing your first deity statue",   handle: "choosing-your-first-deity-statue", status: "published", publishedAt: new Date("2026-02-15"), body: "<p>Mudra, posture, deity, workshop — the four things to look for, and why a written provenance card matters more than the price tag.</p>", seoTitle: "Choosing your first deity statue | The Workshop Journal" },
    { id: ID.post3, blogId: ID.blog1, title: "Caring for brass: a 5-minute guide", handle: "caring-for-brass-a-5-minute-guide", status: "published", publishedAt: new Date("2026-03-10"), body: "<p>Brass develops a patina over time — that's not damage, it's character. A soft dry cloth weekly, a lemon-and-salt rub once a year, no chemical cleaners. Your statue will outlast you.</p>", seoTitle: "Caring for brass: a 5-minute guide | The Workshop Journal" },
    { id: ID.post4, blogId: ID.blog1, title: "Behind the scenes at Bhaktapur",     handle: "behind-the-scenes-at-bhaktapur",   status: "published", publishedAt: new Date("2026-05-08"), body: "<p>Four generations of Newari brass workers, one workshop, 200 murtis a month. We sat down with the senior smith for an hour. Edited transcript and photos inside.</p>", seoTitle: "Behind the scenes at Bhaktapur | The Workshop Journal" },
  ]).onConflictDoNothing();

  // ─── Files (platform assets + per-vendor logos) ──────────────────────────
  console.log("  files…");
  const fileRows = [
    { id: "seed-file-000-0000-0000-000000000001", scope: "platform" as const, vendorId: null,        kind: "image" as const, originalName: "logo.svg",                 fileName: "logo.svg",                 mimeType: "image/svg+xml", extension: "svg", storageKey: "platform/logo.svg",                 url: "https://picsum.photos/seed/handicraft-logo/200/200",        altText: "Handicraft logo",                sizeBytes: 4823,  uploadedBy: ID.adminUser },
    { id: "seed-file-000-0000-0000-000000000002", scope: "platform" as const, vendorId: null,        kind: "image" as const, originalName: "homepage-hero.webp",       fileName: "homepage-hero.webp",       mimeType: "image/webp",    extension: "webp", storageKey: "platform/homepage-hero.webp",       url: "https://picsum.photos/seed/handicraft-hero/1600/900",      altText: "Homepage hero — brass statues",  sizeBytes: 184502, width: 1600, height: 900, uploadedBy: ID.adminUser },
    { id: "seed-file-000-0000-0000-000000000003", scope: "platform" as const, vendorId: null,        kind: "document" as const, originalName: "shipping-policy.pdf",   fileName: "shipping-policy.pdf",      mimeType: "application/pdf", extension: "pdf", storageKey: "platform/shipping-policy.pdf",      url: "https://picsum.photos/seed/policy-doc/600/800",            altText: "Shipping policy PDF",            sizeBytes: 42118, uploadedBy: ID.adminUser },
    { id: "seed-file-000-0000-0000-000000000004", scope: "vendor" as const,   vendorId: ID.vendor1,  kind: "image" as const, originalName: "patan-storefront.jpg",     fileName: "patan-storefront.jpg",     mimeType: "image/jpeg",    extension: "jpg",  storageKey: "vendors/patan/storefront.jpg",      url: "https://picsum.photos/seed/patan-storefront/1200/630",     altText: "Patan Bronze workshop storefront", sizeBytes: 96243, width: 1200, height: 630, uploadedBy: ID.vendorUser1 },
    { id: "seed-file-000-0000-0000-000000000005", scope: "vendor" as const,   vendorId: ID.vendor1,  kind: "image" as const, originalName: "patan-logo.png",           fileName: "patan-logo.png",           mimeType: "image/png",     extension: "png",  storageKey: "vendors/patan/logo.png",            url: "https://picsum.photos/seed/patan-logo/300/300",            altText: "Patan Bronze Casters logo",      sizeBytes: 8421, width: 300, height: 300, uploadedBy: ID.vendorUser1 },
    { id: "seed-file-000-0000-0000-000000000006", scope: "vendor" as const,   vendorId: ID.vendor2,  kind: "image" as const, originalName: "bhaktapur-workshop.jpg",   fileName: "bhaktapur-workshop.jpg",   mimeType: "image/jpeg",    extension: "jpg",  storageKey: "vendors/bhaktapur/workshop.jpg",    url: "https://picsum.photos/seed/bhaktapur-workshop/1200/630",   altText: "Bhaktapur Brass workshop floor", sizeBytes: 102311, width: 1200, height: 630, uploadedBy: ID.vendorUser2 },
    { id: "seed-file-000-0000-0000-000000000007", scope: "vendor" as const,   vendorId: ID.vendor3,  kind: "image" as const, originalName: "thamel-collage.webp",      fileName: "thamel-collage.webp",      mimeType: "image/webp",    extension: "webp", storageKey: "vendors/thamel/collage.webp",       url: "https://picsum.photos/seed/thamel-collage/1200/630",       altText: "Thamel Spiritual Arts collage",  sizeBytes: 71225, width: 1200, height: 630, uploadedBy: ID.vendorUser3 },
    { id: "seed-file-000-0000-0000-000000000008", scope: "vendor" as const,   vendorId: ID.vendor1,  kind: "video" as const, originalName: "patan-casting.mp4",        fileName: "patan-casting.mp4",        mimeType: "video/mp4",     extension: "mp4",  storageKey: "vendors/patan/casting-process.mp4", url: "https://picsum.photos/seed/patan-video/640/360",           altText: "Lost-wax casting process",       sizeBytes: 4218034, durationSeconds: "127.50", uploadedBy: ID.vendorUser1 },
  ];
  await db.insert(files).values(fileRows).onConflictDoNothing();

  // ─── Marketing campaigns (homepage banners + landing pages) ──────────────
  console.log("  campaigns…");
  await db.insert(campaigns).values([
    {
      id: ID.campaign1, handle: "diwali-sale-2026", title: "Diwali Sale 2026",
      headline: "Up to 20% off festive idols",
      description: "Ganesh, Laxmi, Saraswati and Panchayan sets at a Diwali discount — through the end of November.",
      heroImageUrl: "https://picsum.photos/seed/diwali-hero/1600/600",
      ctaText: "Shop the sale", ctaUrl: "/sale/diwali-sale-2026",
      priority: 10, status: "active",
      startsAt: new Date("2026-10-20"), endsAt: new Date("2026-11-30"),
      accentColor: "#b8860b", backgroundColor: "#fff7e6",
      createdByUserId: ID.adminUser,
    },
    {
      id: ID.campaign2, handle: "spring-collection-2026", title: "Spring Collection",
      headline: "New castings from the Kathmandu Valley",
      description: "Fresh from the workshop — Buddha, Shiva and Krishna pieces unveiled for spring.",
      heroImageUrl: "https://picsum.photos/seed/spring-hero/1600/600",
      ctaText: "Browse new arrivals", ctaUrl: "/collections/featured-statues",
      priority: 50, status: "ended",
      startsAt: new Date("2026-03-01"), endsAt: new Date("2026-04-15"),
      accentColor: "#2d6a4f", backgroundColor: "#e9f5db",
      createdByUserId: ID.adminUser,
    },
  ]).onConflictDoNothing();

  // ─── Discounts + discount codes ──────────────────────────────────────────
  console.log("  discounts…");
  await db.insert(discounts).values([
    { id: ID.discount1, scope: "platform", title: "10% off first order",        description: "Welcome discount for new customers. One-time use, code required.", status: "active", type: "percentage",    method: "code",      targetType: "order",    value: "10.00", minimumSubtotal: "2000.00", usageLimit: 500, oncePerCustomer: true,  firstOrderOnly: true,  startsAt: new Date("2026-01-01"), endsAt: new Date("2026-12-31"), createdByUserId: ID.adminUser },
    { id: ID.discount2, scope: "platform", title: "15% off Buddha statues",     description: "Targeted discount on selected Buddha pieces — code required.",     status: "active", type: "percentage",    method: "code",      targetType: "order",    value: "15.00", minimumSubtotal: "5000.00", usageLimit: 200, oncePerCustomer: false, firstOrderOnly: false, startsAt: new Date("2026-04-01"), endsAt: new Date("2026-09-30"), createdByUserId: ID.adminUser },
    { id: ID.discount3, scope: "platform", title: "Free shipping over NPR 5000", description: "Free domestic shipping on orders above NPR 5,000 — code required.", status: "active", type: "free_shipping", method: "code",      targetType: "shipping", value: "0.00",  minimumSubtotal: "5000.00", usageLimit: null, oncePerCustomer: false, firstOrderOnly: false, startsAt: new Date("2026-01-01"), endsAt: new Date("2027-01-01"), createdByUserId: ID.adminUser },
    { id: ID.discount4, scope: "platform", title: "Diwali Sale — 20% auto",     description: "Automatic platform-wide discount during the Diwali Sale 2026.",   status: "active", type: "percentage",    method: "automatic", targetType: "order",    value: "20.00", minimumSubtotal: null,      usageLimit: null, oncePerCustomer: false, firstOrderOnly: false, startsAt: new Date("2026-10-20"), endsAt: new Date("2026-11-30"), campaignId: ID.campaign1, createdByUserId: ID.adminUser },
  ]).onConflictDoNothing();

  await db.insert(discountCodes).values([
    { id: ID.discountCode1, discountId: ID.discount1, code: "WELCOME10", status: "active", usageLimit: 500, usageCount: 0 },
    { id: ID.discountCode2, discountId: ID.discount2, code: "BUDDHA15",  status: "active", usageLimit: 200, usageCount: 0 },
    { id: ID.discountCode3, discountId: ID.discount3, code: "FREESHIP",  status: "active", usageLimit: null, usageCount: 0 },
    { id: ID.discountCode4, discountId: ID.discount4, code: "DIWALI20",  status: "active", usageLimit: null, usageCount: 0 },
  ]).onConflictDoNothing();

  // ─── Facet filters (storefront filter sidebar) ───────────────────────────
  console.log("  facet filters…");
  await db.insert(facetFilters).values([
    { id: "seed-fct-000-0000-0000-000000000001", vendorId: null, key: "price",         label: "Price",        sourceType: "variant_price", displayType: "slider",   config: { min: 1000, max: 50000, step: 500, currency: "NPR" }, position: 0, enabled: true,  createdBy: ID.adminUser, updatedBy: ID.adminUser },
    { id: "seed-fct-000-0000-0000-000000000002", vendorId: null, key: "vendor",        label: "Vendor",       sourceType: "vendor",        displayType: "checkbox", config: { maxVisible: 5 },                                       position: 1, enabled: true,  createdBy: ID.adminUser, updatedBy: ID.adminUser },
    { id: "seed-fct-000-0000-0000-000000000003", vendorId: null, key: "availability",  label: "Availability", sourceType: "availability",  displayType: "toggle",   config: { inStock: true, onSale: true },                         position: 2, enabled: true,  createdBy: ID.adminUser, updatedBy: ID.adminUser },
    { id: "seed-fct-000-0000-0000-000000000004", vendorId: null, key: "rating",        label: "Rating",       sourceType: "rating",        displayType: "radio",    config: { thresholds: [4, 3, 2] },                               position: 3, enabled: true,  createdBy: ID.adminUser, updatedBy: ID.adminUser },
    { id: "seed-fct-000-0000-0000-000000000005", vendorId: null, key: "collection",    label: "Collection",   sourceType: "collection",    displayType: "checkbox", config: { maxVisible: 6 },                                       position: 4, enabled: true,  createdBy: ID.adminUser, updatedBy: ID.adminUser },
    { id: "seed-fct-000-0000-0000-000000000006", vendorId: null, key: "tag",           label: "Tag",          sourceType: "tag",           displayType: "checkbox", config: { maxVisible: 8 },                                       position: 5, enabled: false, createdBy: ID.adminUser, updatedBy: ID.adminUser },
  ]).onConflictDoNothing();

  // ─── Customer segments ───────────────────────────────────────────────────
  console.log("  customer segments…");
  await db.insert(customerSegments).values([
    { id: ID.segmentVIP, name: "VIP Customers",     slug: "vip-customers",      type: "manual",  status: "active" },
    { id: ID.segmentNew, name: "New This Quarter",  slug: "new-this-quarter",   type: "dynamic", status: "active" },
  ]).onConflictDoNothing();

  // ─── Newsletter subscribers + a campaign ─────────────────────────────────
  console.log("  newsletter…");
  await db.insert(newsletterSubscribers).values([
    { id: "seed-nls-000-0000-0000-000000000001", email: "customer@example.com",     subscribedAt: new Date("2026-01-15") },
    { id: "seed-nls-000-0000-0000-000000000002", email: "anita.gurung@example.np",  subscribedAt: new Date("2026-02-03") },
    { id: "seed-nls-000-0000-0000-000000000003", email: "bishal.maharjan@example.np", subscribedAt: new Date("2026-02-19") },
    { id: "seed-nls-000-0000-0000-000000000004", email: "claire.delaney@example.com", subscribedAt: new Date("2026-03-08") },
    { id: "seed-nls-000-0000-0000-000000000005", email: "ravi.thapa@example.np",    subscribedAt: new Date("2026-04-22") },
  ]).onConflictDoNothing();

  await db.insert(newsletterCampaigns).values([
    {
      id: ID.nlCampaign1,
      subject: "Diwali 2026 — 20% off festive idols",
      bodyHtml: "<h1>Diwali Sale 2026</h1><p>For the festival of lights, 20% off all our Ganesh, Laxmi and Saraswati pieces. Use code <strong>DIWALI20</strong> at checkout, or it'll apply automatically when you visit the sale page.</p><p><a href=\"https://example.com/sale/diwali-sale-2026\">Shop the sale →</a></p>",
      bodyText: "Diwali Sale 2026 — 20% off all Ganesh, Laxmi and Saraswati pieces. Use code DIWALI20.",
      segmentId: null, recipientCount: 5,
      sentAt: new Date("2026-10-19"),
      sentByUserId: ID.adminUser,
    },
  ]).onConflictDoNothing();

  // ─── Commission rules (platform default) ─────────────────────────────────
  console.log("  commission rules…");
  await db.insert(commissionRules).values([
    {
      id: ID.commissionRuleDefault, name: "Platform default commission",
      scope: "default", vendorId: null, status: "active",
      type: "bps", value: "1200", // 12% in basis points
      currencyCode: "NPR", appliesToShipping: false,
      startsAt: new Date("2026-01-01"), endsAt: null,
    },
  ]).onConflictDoNothing();

  // ─── Gift cards ──────────────────────────────────────────────────────────
  console.log("  gift cards…");
  await db.insert(giftCards).values([
    { id: ID.giftCard1, code: "GIFT-2026-DASHAIN-AAAA", initialBalance: 500000, currentBalance: 500000, currencyCode: "NPR", status: "active",   customerId: ID.customer1, issuedByUserId: ID.adminUser, note: "Dashain promo — handed to top-10 customers", expiresAt: new Date("2027-12-31") },
    { id: ID.giftCard2, code: "GIFT-2026-WELCOME-BBBB", initialBalance: 200000, currentBalance: 200000, currencyCode: "NPR", status: "disabled", customerId: null,         issuedByUserId: ID.adminUser, note: "Held in reserve for support escalations",     expiresAt: new Date("2028-06-30") },
  ]).onConflictDoNothing();

  console.log("  cart & wishlist…");
  await db.insert(carts).values([
    { id: ID.cart1, customerId: ID.customer1 },
  ]).onConflictDoNothing();

  await db.insert(cartItems).values([
    { id: ID.cartItem1, cartId: ID.cart1, vendorId: ID.vendor2, productId: ID.p06, variantId: ID.v06, title: STATUES[5].title, sku: STATUES[5].sku, unitPrice: STATUES[5].priceNpr, quantity: 1, lineSubtotal: STATUES[5].priceNpr, lineTotal: STATUES[5].priceNpr },
  ]).onConflictDoNothing();

  const existingWishes = await db.select().from(wishlistItems);
  const existingWishSet = new Set(existingWishes.map((r) => `${r.customerId}:${r.productId}`));
  const wishesToInsert = [
    { id: ID.wish1, customerId: ID.customer1, productId: ID.p01 },
    { id: ID.wish2, customerId: ID.customer1, productId: ID.p09 },
  ].filter((r) => !existingWishSet.has(`${r.customerId}:${r.productId}`));
  if (wishesToInsert.length > 0) {
    await db.insert(wishlistItems).values(wishesToInsert);
  }

  console.log("  orders…");
  // ─── Completed order — paid via Cash on Delivery ──────────────────────────
  // 1× Brass Krishna 11" (vendor1, NPR 18,000) + 1× Detailed Shiva 6.3" (vendor3, NPR 8,500) = 26,500
  await db.insert(orders).values([
    {
      id: ID.order1, orderNumber: "ORD-SEED-0001", customerId: ID.customer1,
      status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled",
      currencyCode: "NPR", channel: "storefront",
      itemCount: 2, subtotalPrice: "26500.00", shippingPrice: "0.00", totalPrice: "26500.00",
      totalPaid: "26500.00",
      paidAt: new Date("2026-04-12"),
      completedAt: new Date("2026-04-15"),
    },
  ]).onConflictDoNothing();

  await db.insert(vendorOrders).values([
    { id: ID.vendorOrder1, orderId: ID.order1, vendorId: ID.vendor1, vendorOrderNumber: "VO-SEED-0001", status: "completed", subtotalPrice: "18000.00", totalPrice: "18000.00", itemCount: 1 },
    { id: ID.vendorOrder2, orderId: ID.order1, vendorId: ID.vendor3, vendorOrderNumber: "VO-SEED-0002", status: "completed", subtotalPrice: "8500.00",  totalPrice: "8500.00",  itemCount: 1 },
  ]).onConflictDoNothing();

  await db.insert(orderItems).values([
    { id: ID.orderItem1, orderId: ID.order1, vendorOrderId: ID.vendorOrder1, vendorId: ID.vendor1, productId: ID.p03, variantId: ID.v03, title: STATUES[2].title,  sku: STATUES[2].sku,  quantity: 1, unitPrice: STATUES[2].priceNpr,  lineSubtotal: STATUES[2].priceNpr,  totalPrice: STATUES[2].priceNpr,  status: "fulfilled" },
    { id: ID.orderItem2, orderId: ID.order1, vendorOrderId: ID.vendorOrder2, vendorId: ID.vendor3, productId: ID.p12, variantId: ID.v12, title: STATUES[11].title, sku: STATUES[11].sku, quantity: 1, unitPrice: STATUES[11].priceNpr, lineSubtotal: STATUES[11].priceNpr, totalPrice: STATUES[11].priceNpr, status: "fulfilled" },
  ]).onConflictDoNothing();

  // Payment record — Cash on Delivery, captured on receipt.
  await db.insert(payments).values([
    {
      id: ID.payment1, orderId: ID.order1, customerId: ID.customer1,
      provider: "cod", providerPaymentId: `cod-${ID.order1}`,
      currencyCode: "NPR", status: "captured",
      amountAuthorized: "26500.00", amountCaptured: "26500.00", amountRefunded: "0",
      isTest: false,
    },
  ]).onConflictDoNothing();

  // ─── Admin-created draft order ────────────────────────────────────────────
  // Sample draft an admin built for a returning customer — line items priced,
  // awaiting invoice send. Payment method on the invoice will be COD.
  await db.insert(orders).values([
    {
      id: ID.draftOrder, orderNumber: "DRAFT-SEED-0001", customerId: ID.customer1,
      status: "draft", paymentStatus: "pending", fulfillmentStatus: "unfulfilled",
      currencyCode: "NPR", channel: "admin",
      itemCount: 2, subtotalPrice: "36000.00", shippingPrice: "0.00", totalPrice: "36000.00",
      note: "Draft for VIP customer — invoice to be sent. Preferred payment: cash on delivery.",
      tags: ["draft", "cod"],
    },
  ]).onConflictDoNothing();

  await db.insert(vendorOrders).values([
    { id: ID.draftVendorOrder, orderId: ID.draftOrder, vendorId: ID.vendor1, vendorOrderNumber: "VO-DRAFT-0001", status: "draft", subtotalPrice: "36000.00", totalPrice: "36000.00", itemCount: 2 },
  ]).onConflictDoNothing();

  await db.insert(orderItems).values([
    { id: ID.draftOrderItem, orderId: ID.draftOrder, vendorOrderId: ID.draftVendorOrder, vendorId: ID.vendor1, productId: ID.p02, variantId: ID.v02, title: STATUES[1].title, sku: STATUES[1].sku, quantity: 2, unitPrice: "18000.00", lineSubtotal: "36000.00", totalPrice: "36000.00", status: "open" },
  ]).onConflictDoNothing();

  // ─── Customer-initiated bulk quote (draft order) ──────────────────────────
  // Generated when the customer hit "Request bulk quote" on a PDP — seller
  // will renegotiate price + shipping in admin and send the invoice.
  // 50× Nepali Buddha 3.2" at seeded unit price = NPR 90,000 (pre-negotiation).
  await db.insert(orders).values([
    {
      id: ID.bulkOrder, orderNumber: "BULK-SEED-0001", customerId: ID.customer1,
      status: "draft", paymentStatus: "pending", fulfillmentStatus: "unfulfilled",
      currencyCode: "NPR", channel: "quote",
      itemCount: 50, subtotalPrice: "90000.00", shippingPrice: "0.00", totalPrice: "90000.00",
      note: "Bulk quote request — 50 units.\n\nHello, we run a yoga retreat in Pokhara and would like a wholesale quote for 50 of these Nepali Buddha murtis to gift to our guests in 2026. Cash on delivery preferred. Please advise on lead time.",
      tags: ["bulk-quote", "wholesale", "cod"],
    },
  ]).onConflictDoNothing();

  await db.insert(vendorOrders).values([
    { id: ID.bulkVendorOrder, orderId: ID.bulkOrder, vendorId: ID.vendor2, vendorOrderNumber: "VO-BULK-0001", status: "draft", subtotalPrice: "90000.00", totalPrice: "90000.00", itemCount: 50 },
  ]).onConflictDoNothing();

  await db.insert(orderItems).values([
    { id: ID.bulkOrderItem, orderId: ID.bulkOrder, vendorOrderId: ID.bulkVendorOrder, vendorId: ID.vendor2, productId: ID.p05, variantId: ID.v05, title: STATUES[4].title, sku: STATUES[4].sku, quantity: 50, unitPrice: STATUES[4].priceNpr, lineSubtotal: "90000.00", totalPrice: "90000.00", status: "open" },
  ]).onConflictDoNothing();

  console.log("  reviews…");
  await db.insert(productReviews).values([
    { id: ID.review1, vendorId: ID.vendor1, productId: ID.p03, customerId: ID.customer1, rating: 5, title: "Stunning casting, true to tradition",  body: "The chasing on the flute and Krishna's robes is extraordinary. Arrived double-boxed with the workshop card. Worth every rupee.", status: "published" },
    { id: ID.review2, vendorId: ID.vendor3, productId: ID.p12, customerId: ID.customer1, rating: 4, title: "Beautiful detail, careful packaging",   body: "Hand-chased detail is gorgeous and weight feels solid. Shipping took a little longer than expected but the piece is perfect.",   status: "published" },
    { id: ID.review3, vendorId: ID.vendor2, productId: ID.p06, customerId: ID.customer1, rating: 5, title: "Perfect for my home altar",             body: "Just the right size — sits beautifully on my altar shelf. The brass has a lovely warm tone in candlelight.",                  status: "published" },
    { id: ID.review4, vendorId: ID.vendor3, productId: ID.p09, customerId: ID.customer1, rating: 4, title: "Lovely trio, slightly smaller than expected", body: "The set is gorgeous and well-balanced. Just be aware these are pooja-room sized — closer to 3 inches each, not larger.",   status: "pending" },
  ]).onConflictDoNothing();

  console.log("✅ Seed complete!");
  console.log("");
  console.log("  Admin:     admin@handicraft.com         / admin123");
  console.log("  Vendor 1:  vendor1@patanbronze.com      / vendor123  (Patan Bronze Casters)");
  console.log("  Vendor 2:  vendor2@bhaktapurbrass.com   / vendor123  (Bhaktapur Brass Studio)");
  console.log("  Vendor 3:  vendor3@thamelspiritual.com  / vendor123  (Thamel Spiritual Arts)");
  console.log("  Customer:  customer@example.com        / customer123");

  console.log("\nSeeding currencies...");
  const currencyData = [
    { code: "NPR", name: "Nepalese Rupee", symbol: "Rs.", decimalPlaces: 2, exchangeRate: "1.00000000", isBase: true,  isActive: true },
    { code: "USD", name: "US Dollar",      symbol: "$",   decimalPlaces: 2, exchangeRate: "0.00750000", isBase: false, isActive: true },
    { code: "INR", name: "Indian Rupee",   symbol: "₹",   decimalPlaces: 2, exchangeRate: "0.62500000", isBase: false, isActive: true },
    { code: "EUR", name: "Euro",           symbol: "€",   decimalPlaces: 2, exchangeRate: "0.00690000", isBase: false, isActive: true },
    { code: "GBP", name: "British Pound",  symbol: "£",   decimalPlaces: 2, exchangeRate: "0.00590000", isBase: false, isActive: true },
  ];
  for (const c of currencyData) {
    await db.insert(currencies).values(c).onConflictDoNothing();
  }
  console.log("  Currencies seeded: NPR (base), USD, INR, EUR, GBP");

  process.exit(0);
}

async function wipe() {
  console.log("⚠️  WIPE_DB=1 — truncating seed tables…");
  await db.execute(sql`
    TRUNCATE TABLE
      product_reviews,
      wishlist_items,
      payments,
      order_items,
      vendor_orders,
      orders,
      cart_items,
      carts,
      discount_codes,
      discounts,
      campaigns,
      facet_filters,
      newsletter_campaigns,
      newsletter_subscribers,
      gift_cards,
      commission_rules,
      customer_segments,
      files,
      collection_products,
      collections,
      blog_posts,
      blogs,
      pages,
      variant_selected_options,
      product_option_values,
      product_options,
      inventory_reservations,
      inventory_items,
      variants,
      product_images,
      products,
      vendor_memberships,
      customers,
      vendors
    RESTART IDENTITY CASCADE;
  `);
  await db.execute(sql`DELETE FROM users WHERE id LIKE 'seed-%';`);
  console.log("   …truncated.");
}

async function main() {
  if (process.env.WIPE_DB === "1") {
    await wipe();
  }
  await seed();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
