/**
 * FAQ source of truth.
 *
 * Edit copy here. Categories and questions are surfaced 1:1 in the FAQ UI
 * and emitted as `FAQPage` JSON-LD on render.
 *
 * Each question has a stable `slug` used for `#anchor` deep-links — keep it
 * URL-safe and don't rename existing slugs lightly.
 */

export interface FaqItem {
  slug: string;
  question: string;
  /** Plain-text answer. Use markdown-ish only if you also render it. */
  answer: string;
}

export interface FaqCategory {
  /** URL-safe slug used for category filter routing. */
  slug: string;
  /** Short label shown in the filter pills. */
  label: string;
  /** Longer description used as section subtitle. */
  description?: string;
  questions: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    slug: "orders-shipping",
    label: "Orders & shipping",
    description:
      "How quickly we dispatch from Kathmandu, how sculptures travel, and what to expect at delivery.",
    questions: [
      {
        slug: "how-long-does-shipping-take",
        question: "How long does shipping take?",
        answer:
          "Within Nepal we dispatch from Kathmandu in 1–2 business days. Kathmandu Valley deliveries arrive within 24–48 hours; Pokhara, Chitwan and other major cities take 3–5 business days. International orders ship by DHL or FedEx Express and reach most destinations in 5–10 business days, fully tracked door-to-door.",
      },
      {
        slug: "do-you-ship-internationally",
        question: "Do you ship internationally?",
        answer:
          "Yes — we ship sculptures and ritual objects to 60+ countries. Customs duties and import taxes vary by destination and are payable on delivery; we provide all the export paperwork (invoice, certificate of origin, cultural-property declaration) so customs clearance is smooth.",
      },
      {
        slug: "is-shipping-free",
        question: "Is shipping free?",
        answer:
          "Domestic shipping inside Nepal is free on orders above Rs 25,000. International shipping starts at Rs 4,500 for small pieces and scales with weight (statues are dense — a 12-inch bronze typically ships for Rs 12,000–18,000 to Europe or the USA). Express options are always available at checkout.",
      },
      {
        slug: "can-i-change-or-cancel-an-order",
        question: "Can I change or cancel an order after I've placed it?",
        answer:
          "Reach out within 4 hours of ordering and we'll do our best to update it before dispatch. Once a piece has shipped you'll need to use the returns flow.",
      },
      {
        slug: "do-you-offer-cod",
        question: "Do you offer Cash on Delivery (COD)?",
        answer:
          "Yes — COD is available across Kathmandu, Lalitpur, Bhaktapur and most of Nepal for orders up to Rs 50,000. Larger orders need partial advance via eSewa, Khalti, Fonepay or bank transfer to lock the price and reserve casting time.",
      },
    ],
  },
  {
    slug: "returns-exchanges",
    label: "Returns & exchanges",
    description:
      "30 days to live with the piece, decide later. Here's how it works.",
    questions: [
      {
        slug: "can-i-return-a-piece-if-it-doesnt-fit",
        question: "Can I return a sculpture if it doesn't fit my altar?",
        answer:
          "Yes — 30 days from delivery, in original packaging. We refund or exchange any in-stock piece. Inside Nepal we cover return shipping; for international returns you cover the return label and we recommend a tracked, insured carrier.",
      },
      {
        slug: "how-long-do-refunds-take",
        question: "How long do refunds take?",
        answer:
          "We refund as soon as the piece clears our incoming inspection — usually within 3 business days of arrival at our Kathmandu studio. Refunds to Nepali wallets (eSewa, Khalti, Fonepay) and bank accounts settle in 1–3 business days. Card refunds (Visa, Mastercard) typically take 5–10 business days to appear on your statement.",
      },
      {
        slug: "can-i-exchange-instead-of-returning",
        question: "Can I exchange for a different piece?",
        answer:
          "Of course — start a return and place a new order in parallel. We'll fast-track the inspection so the credit is back with you within a week, and we hold your new piece in dispatch until you confirm.",
      },
      {
        slug: "what-cannot-be-returned",
        question: "Are there pieces that can't be returned?",
        answer:
          "Custom commissions, consecrated statues (where the eyes have been opened by a lama or priest at your request), and items marked \"Final sale\" can't be returned because they're prepared specifically for you. We share progress photos at every stage of a custom commission so there are no surprises.",
      },
    ],
  },
  {
    slug: "care-cleaning",
    label: "Care & cleaning",
    description: "Keep your sculpture looking heirloom-good for decades.",
    questions: [
      {
        slug: "how-do-i-clean-a-brass-statue",
        question: "How do I clean a brass or bronze statue?",
        answer:
          "Dust weekly with a soft cotton cloth. Do not use commercial brass polish — it strips the patina and the wax sealant in one pass. For unlacquered pieces, an occasional wipe with a cloth lightly oiled in coconut or sesame oil keeps the surface healthy. For antique-finished bronze, dust only — don't try to polish the patina back to shiny.",
      },
      {
        slug: "are-statues-pet-friendly",
        question: "Are your sculptures pet-friendly?",
        answer:
          "Brass and bronze statues are weighty enough to resist a curious cat, but always place fragile inlay pieces above paw-height. Stone-inlay statues should be kept away from rough handling — turquoise and coral can pop loose if knocked hard. Wood masks are best wall-mounted out of reach.",
      },
      {
        slug: "stone-inlay-care",
        question: "How do I care for a stone-inlay piece?",
        answer:
          "Dry brushing only — never wet cleaning. The turquoise, coral and lapis are held in place with shellac (lac), and water softens the bond. Avoid placing near radiators, direct afternoon sun, or fireplaces — heat softens the lac. If a stone falls out, keep it: a Patan-trained inlay artist can reset it cleanly with fresh lac. Don't glue it yourself.",
      },
      {
        slug: "wood-care",
        question: "How do I care for carved wooden pieces?",
        answer:
          "Dust weekly with a soft brush. Re-wax every 6 months with pure beeswax (no commercial polish): apply thinly, leave for an hour, buff out. Avoid direct sun and central heating — both dry the wood and open cracks. Indoor humidity 40–60% is ideal. Never wash with water; wood absorbs moisture and warps.",
      },
    ],
  },
  {
    slug: "craft-iconography",
    label: "Craft & iconography",
    description: "How our sculptures are made — materials, techniques, and the artisans behind them.",
    questions: [
      {
        slug: "where-are-statues-made",
        question: "Where are your sculptures made?",
        answer:
          "All our sculptures are hand-made in Nepal — primarily in Patan (Lalitpur) for bronze and brass castings, Bhaktapur and Thamel for woodcarvings and ritual masks, and Boudhanath for singing bowls and prayer wheels. Each piece carries a label noting the workshop and lead artisan.",
      },
      {
        slug: "what-is-lost-wax-casting",
        question: "What does \"lost-wax casting\" mean?",
        answer:
          "Lost-wax (cire perdue) is the traditional Newari technique used in Patan since the 5th century. The artisan sculpts the statue in beeswax, encases it in clay, heats the mould so the wax melts out, then pours in molten bronze or brass. After cooling, the clay is broken away, the casting is hand-chased (engraved with fine detail), polished, and gilt or stone-set. A 12-inch Buddha takes 8–10 weeks; a fire-gilded 18-inch piece can take 6 months.",
      },
      {
        slug: "what-materials-do-you-use",
        question: "What materials do you use?",
        answer:
          "Brass (copper-zinc alloy) is the most common for Buddha and Hindu deity statues. Bronze (copper-tin) is harder, takes finer detail, and develops a richer patina. Seven-metal alloy (saptaloha — copper, silver, gold, iron, tin, lead, mercury in trace amounts) is used for singing bowls and ritually significant pieces. Wood pieces are typically sal, jackfruit or walnut. Stone pieces use Nepali black stone or imported marble.",
      },
      {
        slug: "fair-wage-certification",
        question: "Are your artisans paid fairly?",
        answer:
          "Yes. Every vendor on Himalayan Crafts has signed a written wage agreement with their artisans, paying 30–60% above the Nepali living wage (currently NPR 17,300/month for a 48-hour week). Senior chasers and inlay artists earn 3× that. No children under 16 in production; workshops are ventilated, lit and safety-equipped. We visit every workshop personally and publish our supplier code on the About page.",
      },
    ],
  },
  {
    slug: "custom-trade",
    label: "Custom & trade",
    description:
      "Bespoke commissions and trade pricing for designers, monasteries, and dharma centres.",
    questions: [
      {
        slug: "do-you-do-custom-commissions",
        question: "Do you do custom statues?",
        answer:
          "Yes — most of our atelier partners cast and carve to commission. Email us the deity, size, finish, and any iconographic preferences (specific mudras, attributes, stone inlay choices) and we'll come back with options, lead times, and pricing — usually within 48 hours. Typical lead time for a custom 12-inch bronze deity with stone inlay is 10–14 weeks; a 24-inch fire-gilded commission is 6–9 months.",
      },
      {
        slug: "is-there-a-trade-program",
        question: "Is there a trade program?",
        answer:
          "Yes — interior designers, monasteries, dharma centres and museum buyers get tiered pricing, dedicated support, and access to one-of-a-kind pieces before they go live. Apply through our trade form and we'll review your portfolio or institutional credentials within a week.",
      },
      {
        slug: "consecration",
        question: "Do you offer consecration?",
        answer:
          "Yes — for devotional use, statues can be consecrated by a qualified lama or Newari priest before shipping. The ritual involves filling the statue's hollow interior with mantras and sacred substances, painting the eyes (chyo-cha), and a final puja. Mention this at checkout and we'll arrange it for an additional fee.",
      },
    ],
  },
  {
    slug: "account-payments",
    label: "Account & payments",
    description:
      "Sign-in, payments, gift cards, and how your data is handled.",
    questions: [
      {
        slug: "what-payment-methods-do-you-accept",
        question: "What payment methods do you accept?",
        answer:
          "Inside Nepal: eSewa, Khalti, Fonepay, ConnectIPS, all major bank cards, and Cash on Delivery (orders up to Rs 50,000). Internationally: Visa, Mastercard, American Express, Stripe, PayPal, and SWIFT bank transfer for trade orders. All transactions are processed over an encrypted connection.",
      },
      {
        slug: "is-my-payment-information-secure",
        question: "Is my payment information secure?",
        answer:
          "Yes. Card details and wallet credentials never touch our servers — they're tokenised by the payment gateway over a fully encrypted (TLS 1.3) connection. We follow PCI-DSS best practice and run regular third-party security audits.",
      },
      {
        slug: "do-you-sell-gift-cards",
        question: "Do you sell gift cards?",
        answer:
          "Yes, in any denomination from Rs 2,500 upwards. Gift cards are delivered by email instantly, never expire, and can be applied to any sculpture, ritual object or custom commission in the shop.",
      },
      {
        slug: "currency-conversion",
        question: "Can I pay in my own currency?",
        answer:
          "Prices are listed in NPR by default, with a currency switcher in the header for USD, EUR, GBP, AUD and INR. We charge in your selected currency at the daily mid-market rate. Your bank may add a small conversion fee — that's between you and your bank, we don't add a markup.",
      },
    ],
  },
];
