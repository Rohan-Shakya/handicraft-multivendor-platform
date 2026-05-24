/**
 * Policy + legal page content (Terms, Privacy, Returns, Payment).
 *
 * Edit copy here. Each section's slug is used for the in-page TOC anchor
 * and `#fragment` deep-links — keep slugs stable.
 *
 * The components render `body` as inline HTML so `<a>`, `<strong>`, `<ul>`
 * and `<li>` are allowed. Don't put untrusted user input here.
 */

import { brand } from "@/config/brand";

export type PolicyKind =
  | "terms"
  | "privacy"
  | "returns"
  | "payment"
  | "cookie-policy"
  | "accessibility"
  | "shipping";

export interface PolicySection {
  slug: string;
  title: string;
  /** HTML string. Keep tags simple — no scripts/inline styles. */
  body: string;
}

export interface PolicyContent {
  kind: PolicyKind;
  /** Pill eyebrow above the headline. */
  eyebrow: string;
  /** Big H1. */
  title: string;
  /** Short opening paragraph rendered under the headline. */
  intro: string;
  /** ISO date string — drives the "Last updated" line + dateModified JSON-LD. */
  lastUpdated: string;
  /** Effective date for the policy. */
  effectiveDate?: string;
  sections: PolicySection[];
  /** Schema.org `@type` to emit alongside generic WebPage. */
  schemaType?: "WebPage";
}

const COMPANY = brand.name;
const CONTACT_EMAIL = brand.contact.email;
const CITY = brand.contact.address.addressLocality;
const COUNTRY = brand.contact.address.countryName;

// ─── Terms of Service ──────────────────────────────────────────────────────

export const TERMS: PolicyContent = {
  kind: "terms",
  eyebrow: "Legal",
  title: "Terms of Service",
  intro: `These terms govern your use of ${COMPANY}. By placing an order or browsing the site you agree to them — please read carefully.`,
  lastUpdated: "2026-05-09",
  effectiveDate: "2026-05-09",
  schemaType: "WebPage",
  sections: [
    {
      slug: "acceptance",
      title: "Acceptance of terms",
      body: `<p>By accessing this site, creating an account, or placing an order you confirm that you are at least 18 years old and accept these Terms in full. If you do not agree, please do not use the site.</p>`,
    },
    {
      slug: "account",
      title: "Your account",
      body: `<p>You're responsible for keeping your login credentials confidential and for all activity under your account. If you believe your account has been compromised, contact us immediately at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
    },
    {
      slug: "orders-pricing",
      title: "Orders & pricing",
      body: `<p>Prices are shown in Nepali Rupees (NPR) by default with optional display in USD, EUR, GBP, AUD and INR via the currency switcher. Domestic prices include 13% VAT where applicable; international prices are exclusive of import duties payable on delivery in your country. We reserve the right to refuse or cancel any order, including in cases of suspected fraud, pricing errors, or stock unavailability. A confirmed order becomes a binding contract once we dispatch the goods.</p>`,
    },
    {
      slug: "shipping-delivery",
      title: "Shipping & delivery",
      body: `<p>We aim to dispatch in-stock items from our Kathmandu studio within one to two business days. Delivery times are estimates and not guaranteed. Risk of loss passes to you when the carrier delivers the package. International orders may incur customs duties payable on receipt — we provide all required export documentation (commercial invoice, certificate of origin) to ease clearance.</p>`,
    },
    {
      slug: "intellectual-property",
      title: "Intellectual property",
      body: `<p>All content on the site — photography, copy, logos, layouts, designs — is owned by ${COMPANY} or our partners and protected by copyright. Traditional Buddhist and Newari iconography remains part of Nepal's cultural and religious heritage; our specific renderings, photography and product descriptions may not be reproduced, distributed, or used to create derivative works without prior written permission.</p>`,
    },
    {
      slug: "user-content",
      title: "User-generated content",
      body: `<p>If you submit reviews, photos, or other content you grant us a non-exclusive, royalty-free, worldwide licence to use it on the site and in marketing. You confirm you have the right to grant this licence and that the content does not infringe third-party rights.</p>`,
    },
    {
      slug: "liability",
      title: "Limitation of liability",
      body: `<p>To the fullest extent permitted by law, ${COMPANY} is not liable for indirect, incidental, or consequential damages arising from your use of the site or products. Our total liability for any claim is capped at the amount you paid for the order in question. Nothing in these Terms limits liability that cannot lawfully be limited under the consumer protection laws of Nepal or your country of residence.</p>`,
    },
    {
      slug: "governing-law",
      title: "Governing law",
      body: `<p>These Terms are governed by the laws of ${COUNTRY}. Any dispute will be resolved in the competent courts of ${CITY}. Consumers retain their statutory rights under the Consumer Protection Act, 2075 (2018) of Nepal and any applicable mandatory consumer-protection law in their country of residence.</p>`,
    },
    {
      slug: "changes",
      title: "Changes to these terms",
      body: `<p>We may update these Terms from time to time. We'll post the new version here with an updated date. Continued use of the site after the change means you accept the revised Terms.</p>`,
    },
    {
      slug: "contact",
      title: "Contact",
      body: `<p>Questions? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> or use our <a href="/pages/contact">contact page</a>.</p>`,
    },
  ],
};

// ─── Privacy Policy ────────────────────────────────────────────────────────

export const PRIVACY: PolicyContent = {
  kind: "privacy",
  eyebrow: "Privacy",
  title: "Privacy Policy",
  intro: `Your data, plainly explained. We collect only what we need to serve you well, never sell it, and you have the right to access or delete it at any time.`,
  lastUpdated: "2026-05-09",
  effectiveDate: "2026-05-09",
  schemaType: "WebPage",
  sections: [
    {
      slug: "what-we-collect",
      title: "What we collect",
      body: `<ul>
        <li><strong>You give us:</strong> name, email, phone, shipping &amp; billing address, and order history.</li>
        <li><strong>We collect automatically:</strong> device type, browser, anonymised IP, pages viewed, and basic analytics.</li>
        <li><strong>We never collect:</strong> full card numbers or wallet PINs — payment gateways (eSewa, Khalti, Fonepay, Stripe) tokenise these directly. We only see the last four digits or a masked reference.</li>
      </ul>`,
    },
    {
      slug: "how-we-use",
      title: "How we use your data",
      body: `<ul>
        <li>Fulfilling your orders, customer support, and warranty claims.</li>
        <li>Improving the site (anonymised analytics, A/B tests).</li>
        <li>Sending order updates — and, only if you opt in, marketing.</li>
        <li>Detecting and preventing fraud.</li>
      </ul>`,
    },
    {
      slug: "legal-basis",
      title: "Legal basis",
      body: `<p>We process your data under three legal bases recognised globally and aligned with Nepal's draft data protection framework: <strong>contract</strong> (to fulfil orders), <strong>legitimate interest</strong> (security, analytics, service quality), and <strong>consent</strong> (marketing, non-essential cookies — you can withdraw consent at any time). Customers in the EU/UK additionally benefit from the protections of the GDPR / UK GDPR.</p>`,
    },
    {
      slug: "cookies",
      title: "Cookies",
      body: `<p>Strictly-necessary cookies keep you logged in and your cart intact. Analytics cookies help us improve the site and only run after you opt in. You can manage your preferences in our cookie banner or your browser settings. Read our full <a href="/pages/cookie-policy">cookie policy</a> for details.</p>`,
    },
    {
      slug: "sharing",
      title: "Who we share with",
      body: `<ul>
        <li><strong>Payment processors</strong> — eSewa, Khalti, Fonepay, ConnectIPS, Stripe, PayPal — to take payment.</li>
        <li><strong>Carriers</strong> — Aramex, DHL, FedEx, and domestic logistics partners — to deliver your order.</li>
        <li><strong>Email service providers</strong> — to send order updates and (opt-in) newsletters.</li>
        <li><strong>Cloud hosting</strong> — for storage and site delivery, with data processing agreements in place.</li>
        <li><strong>Authorities</strong> — only when legally required by Nepali law or by a competent court order.</li>
      </ul>
      <p>We never sell your data.</p>`,
    },
    {
      slug: "your-rights",
      title: "Your rights",
      body: `<p>Whether you're in Nepal, the EU, the UK, or elsewhere, you can:</p>
      <ul>
        <li>Access the data we hold on you.</li>
        <li>Correct it if it's wrong.</li>
        <li>Delete it (subject to our legal obligations to keep order records for tax purposes).</li>
        <li>Export it in a portable format.</li>
        <li>Object to processing or withdraw consent.</li>
      </ul>
      <p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with your request — we'll respond within 30 days.</p>`,
    },
    {
      slug: "retention",
      title: "How long we keep data",
      body: `<p>Order data: 7 years (Nepal tax and accounting records under the Income Tax Act). Account data: until you delete your account. Marketing data: until you unsubscribe. Analytics: anonymised after 14 months.</p>`,
    },
    {
      slug: "children",
      title: "Children",
      body: `<p>Our service is not directed at children under 16. We don't knowingly collect data from anyone under that age. If you're a parent and believe we have, please contact us so we can delete it.</p>`,
    },
    {
      slug: "international-transfers",
      title: "International transfers",
      body: `<p>Some of our service providers (cloud hosting, email delivery, analytics) operate outside Nepal. When data is transferred we use Standard Contractual Clauses or equivalent contractual safeguards to ensure your data is protected to a standard at least as strong as Nepali law requires.</p>`,
    },
    {
      slug: "contact",
      title: "Contact us",
      body: `<p>Privacy questions or complaints? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. EU/UK residents may also lodge a complaint with their local data protection authority.</p>`,
    },
  ],
};

// ─── Returns ───────────────────────────────────────────────────────────────

export const RETURNS: PolicyContent = {
  kind: "returns",
  eyebrow: "Care promise",
  title: "Returns & exchanges",
  intro: `Take it home, live with it, decide later. You have 30 days to return any unhandled ${brand.productNoun} — we'll cover return shipping inside Nepal.`,
  lastUpdated: "2026-05-09",
  schemaType: "WebPage",
  sections: [
    {
      slug: "return-window",
      title: "30-day return window",
      body: `<p>You have 30 days from delivery to start a return. The return doesn't need to be received within that window — just initiated. Custom commissions and consecrated statues are excluded; see "What can be returned" below.</p>`,
    },
    {
      slug: "eligibility",
      title: "What can be returned",
      body: `<ul>
        <li>${brand.productNoun
          .charAt(0)
          .toUpperCase() + brand.productNoun.slice(1)}s in original condition and original packaging.</li>
        <li>Lightly displayed is fine — we just ask you avoid handling damage, scratches on inlay, or chipped paint.</li>
      </ul>
      <p><strong>Final-sale exceptions:</strong> custom commissions, consecrated statues, and items marked "Final sale" cannot be returned because they're prepared specifically for you.</p>`,
    },
    {
      slug: "how-to-return",
      title: "How to start a return",
      body: `<ol>
        <li>Sign in and visit <a href="/customer/orders">your orders</a>.</li>
        <li>Open the order, tap <em>Return</em>, and pick a reason.</li>
        <li>For domestic returns we'll arrange a free pickup from your address. For international returns, we'll email you the return paperwork — you arrange a tracked, insured carrier.</li>
        <li>Ship it back. We'll email you the moment it's inspected at our Kathmandu studio.</li>
      </ol>`,
    },
    {
      slug: "refunds",
      title: "Refunds",
      body: `<p>Once your return clears inspection (usually 1–3 business days), we refund to the original payment method. eSewa, Khalti, Fonepay and bank refunds settle within 1–3 business days; card refunds typically appear in 5–10 business days depending on your issuing bank.</p>`,
    },
    {
      slug: "exchanges",
      title: "Exchanges",
      body: `<p>For an exchange, place a new order in parallel with your return — we'll fast-track the credit so you're not out of pocket for long. We can also hold the new piece until the original arrives back, on request.</p>`,
    },
    {
      slug: "damaged-or-wrong",
      title: "Damaged or incorrect orders",
      body: `<p>If your order arrives damaged or incorrect, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> within 48 hours of delivery with photos. We'll cover replacement shipping both ways and prioritise the resolution.</p>`,
    },
    {
      slug: "international",
      title: "International returns",
      body: `<p>Outside Nepal, you cover the return shipping label. We recommend an insured tracked service. Customs duties paid on the original order may be refundable from your local customs office — we'll provide the documentation you need to claim them back.</p>`,
    },
    {
      slug: "contact",
      title: "Need help with a return?",
      body: `<p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> or use our <a href="/pages/contact">contact page</a>. We aim to reply within one business day, Sunday to Friday.</p>`,
    },
  ],
};

// ─── Payment options ──────────────────────────────────────────────────────

export const PAYMENT: PolicyContent = {
  kind: "payment",
  eyebrow: "How to pay",
  title: "Payment options",
  intro: `Pay how you want — Nepali wallets, cards, bank transfer, or Cash on Delivery. Every transaction is encrypted end-to-end and tokenised by the payment gateway.`,
  lastUpdated: "2026-05-09",
  schemaType: "WebPage",
  sections: [
    {
      slug: "accepted-methods",
      title: "Accepted payment methods",
      body: `<ul>
        <li><strong>Nepali wallets:</strong> eSewa, Khalti, Fonepay (instant settlement).</li>
        <li><strong>Bank transfer:</strong> ConnectIPS for domestic NPR transfers. SWIFT for international trade orders.</li>
        <li><strong>Cards:</strong> Visa, Mastercard, American Express via secure gateway.</li>
        <li><strong>International wallets:</strong> Stripe (Apple Pay, Google Pay), PayPal.</li>
        <li><strong>Cash on Delivery (COD):</strong> available across Kathmandu Valley and most of Nepal for orders up to Rs 50,000.</li>
      </ul>`,
    },
    {
      slug: "currency",
      title: "Currency",
      body: `<p>Prices are shown in Nepali Rupees (NPR) by default, with a header switcher for USD, EUR, GBP, AUD and INR. Charges are billed in the currency you see at checkout. Your bank may apply a small currency-conversion fee if your card is in a different currency — that's between you and your bank, we don't add a markup.</p>`,
    },
    {
      slug: "security",
      title: "Security",
      body: `<p>Payment details never touch our servers. They're tokenised by the gateway (eSewa, Khalti, Fonepay, Stripe) over a fully encrypted TLS 1.3 connection. We follow PCI-DSS best practice on the card path and use Nepal Rastra Bank–approved processors for domestic wallet transactions. 3-D Secure (Verified by Visa, Mastercard SecureCode) is supported on every card transaction that requires it.</p>`,
    },
    {
      slug: "when-charged",
      title: "When you're charged",
      body: `<p>Wallet payments (eSewa, Khalti, Fonepay) settle the moment you confirm. Cards are authorised at the moment you place the order and captured when we dispatch. Cash on Delivery is collected by the courier at your door — please have the exact amount ready, or use a wallet QR with the rider.</p>`,
    },
    {
      slug: "failed-payments",
      title: "Failed payments",
      body: `<p>If a payment fails we'll email you with a retry link. After 3 failed attempts the order is automatically cancelled and any reserved stock is released. Your bank or wallet may show a temporary authorisation hold — that drops off within 5–10 business days.</p>`,
    },
    {
      slug: "cod",
      title: "Cash on Delivery",
      body: `<p>COD is free for orders inside Kathmandu Valley and Rs 200 for the rest of Nepal. Orders above Rs 50,000 require partial advance via wallet or bank transfer to lock the price and reserve casting time. Refused COD parcels are charged a Rs 500 return-logistics fee.</p>`,
    },
    {
      slug: "gift-cards",
      title: "Gift cards",
      body: `<p>Gift cards can be applied alongside any other payment method at checkout. They never expire and unused balances stay on the card. Available in NPR, USD, EUR, GBP and AUD.</p>`,
    },
    {
      slug: "vat-invoices",
      title: "VAT &amp; invoices",
      body: `<p>Domestic Nepal orders include 13% VAT where applicable. A full PAN-VAT invoice is emailed with every order — also available in <a href="/customer/orders">your account</a>. Registered businesses can supply their PAN/VAT number at checkout to receive a B2B-compliant invoice.</p>`,
    },
    {
      slug: "contact",
      title: "Payment issue?",
      body: `<p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with your order number and we'll resolve it the same day.</p>`,
    },
  ],
};

// ─── Cookie Policy ─────────────────────────────────────────────────────────

export const COOKIE_POLICY: PolicyContent = {
  kind: "cookie-policy",
  eyebrow: "Cookies",
  title: "Cookie policy",
  intro: `Plain English on what cookies we use, why, and how to switch them off. We only set non-essential cookies after you opt in.`,
  lastUpdated: "2026-05-09",
  schemaType: "WebPage",
  sections: [
    {
      slug: "what-is-a-cookie",
      title: "What is a cookie?",
      body: `<p>A cookie is a small text file your browser stores when you visit a website. Some cookies are <em>strictly necessary</em> — without them, signing in, the cart, or the checkout would not work. Others are optional and only run after you opt in.</p>`,
    },
    {
      slug: "categories",
      title: "Categories of cookies we use",
      body: `<ul>
        <li><strong>Strictly necessary</strong> — session, authentication, CSRF, cart contents, and preferences. Cannot be turned off; the site won't function without them.</li>
        <li><strong>Performance &amp; analytics (opt-in)</strong> — anonymised page views, errors, and load times so we can improve the site. We use a privacy-respecting analytics provider; no individual tracking, no advertising IDs.</li>
        <li><strong>Marketing (opt-in)</strong> — only set if you opt in to marketing emails or click through from a partner campaign. We use them to attribute orders so we can pay our partners fairly.</li>
      </ul>`,
    },
    {
      slug: "manage-preferences",
      title: "Manage your preferences",
      body: `<p>You can change your choices any time via the cookie banner footer link, or wipe cookies entirely from your browser settings. Disabling strictly-necessary cookies will sign you out and empty your cart.</p>`,
    },
    {
      slug: "third-parties",
      title: "Third-party cookies",
      body: `<ul>
        <li>Payment gateways (eSewa, Khalti, Fonepay, Stripe) set cookies during checkout to detect fraud and complete payment authentication. These are essential.</li>
        <li>Embedded videos or social embeds, where used, may set their own cookies — we lazy-load these and only on user interaction.</li>
      </ul>`,
    },
    {
      slug: "contact",
      title: "Contact",
      body: `<p>Cookie questions? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
    },
  ],
};

// ─── Accessibility Statement ───────────────────────────────────────────────

export const ACCESSIBILITY: PolicyContent = {
  kind: "accessibility",
  eyebrow: "Accessibility",
  title: "Accessibility statement",
  intro: `${COMPANY} is committed to making our site usable for everyone, including people who use assistive technology. Here's where we stand and how to reach us if something doesn't work.`,
  lastUpdated: "2026-05-09",
  schemaType: "WebPage",
  sections: [
    {
      slug: "our-commitment",
      title: "Our commitment",
      body: `<p>We aim to conform with <strong>WCAG 2.1 Level AA</strong> across the storefront. Accessibility is treated as a baseline quality bar, not a side feature, and is reviewed at every design and engineering change.</p>`,
    },
    {
      slug: "what-we-do",
      title: "What we do today",
      body: `<ul>
        <li>Semantic HTML landmarks (header, nav, main, footer) on every page.</li>
        <li>Visible keyboard focus on every interactive element.</li>
        <li>Skip-to-main link for keyboard and screen-reader users.</li>
        <li>Alt text on every product image and text alternatives for decorative imagery.</li>
        <li>Form fields paired with explicit labels and helpful error messages announced to screen readers.</li>
        <li>Colour contrast checked against WCAG AA targets in light and dark modes.</li>
        <li>Reduced-motion support — animations are minimised when your OS is set to "reduce motion".</li>
        <li>The site is fully responsive and works with browser zoom up to 400%.</li>
      </ul>`,
    },
    {
      slug: "known-issues",
      title: "Known issues",
      body: `<p>Some legacy sculpture photos uploaded by partner workshops may have shorter alt text than we would write today; we are progressively backfilling these with full iconographic descriptions (deity, mudra, posture, attributes). PDF documents (invoices, provenance certificates) are not always tagged for screen readers — email us and we'll send a plain-text equivalent.</p>`,
    },
    {
      slug: "feedback",
      title: "Feedback",
      body: `<p>If you encounter a barrier on the site or need an alternative format, please email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with the URL and a short description. We aim to respond within two business days and to fix critical issues within ten.</p>`,
    },
    {
      slug: "assistive-tech",
      title: "Tested with",
      body: `<p>The site has been tested with the latest stable versions of: Chrome, Firefox, Safari, Edge; VoiceOver on macOS and iOS; NVDA on Windows; TalkBack on Android; and keyboard-only navigation.</p>`,
    },
  ],
};

// ─── Shipping Policy ───────────────────────────────────────────────────────

export const SHIPPING: PolicyContent = {
  kind: "shipping",
  eyebrow: "Delivery",
  title: "Shipping policy",
  intro: `Where we ship, how long it takes, and what to expect at delivery — from our Kathmandu workshops to your door.`,
  lastUpdated: "2026-05-09",
  schemaType: "WebPage",
  sections: [
    {
      slug: "domestic-nepal",
      title: "Inside Nepal",
      body: `<ul>
        <li><strong>Kathmandu Valley</strong> (Kathmandu, Lalitpur, Bhaktapur) — free same-day or next-day delivery on most orders.</li>
        <li><strong>Pokhara, Chitwan, Biratnagar, Birgunj, Butwal, Nepalgunj, Dharan</strong> — 3–5 business days via partner courier.</li>
        <li><strong>Other districts</strong> — 5–8 business days. Remote hill regions may take longer; we'll let you know if so.</li>
        <li><strong>Cash on Delivery</strong> available across most of Nepal for orders up to Rs 50,000.</li>
        <li><strong>Free shipping threshold</strong>: orders above Rs 25,000 ship free domestically.</li>
      </ul>`,
    },
    {
      slug: "international",
      title: "International shipping",
      body: `<p>We ship sculptures and ritual objects to 60+ countries via DHL Express and FedEx International Priority. Typical transit times from Kathmandu:</p>
      <ul>
        <li><strong>India, Bhutan, Bangladesh</strong>: 3–5 business days.</li>
        <li><strong>Europe (UK, Germany, France, Netherlands, Italy, Spain)</strong>: 5–7 business days.</li>
        <li><strong>USA &amp; Canada</strong>: 5–8 business days.</li>
        <li><strong>Australia &amp; New Zealand</strong>: 6–9 business days.</li>
        <li><strong>Middle East &amp; rest of world</strong>: 5–10 business days.</li>
      </ul>
      <p>Every shipment is fully tracked and insured for the declared value of the piece. We email you the tracking link the moment your sculpture leaves the workshop.</p>`,
    },
    {
      slug: "duties-taxes",
      title: "Customs duties &amp; taxes",
      body: `<p>International prices are exclusive of import duties and taxes payable in your country. Bronze and brass devotional sculptures are typically:</p>
      <ul>
        <li><strong>EU</strong>: most pieces are duty-free under cultural-item categories; VAT/GST applies at delivery.</li>
        <li><strong>UK</strong>: low duty rate plus VAT at delivery.</li>
        <li><strong>USA</strong>: ~3% duty under HTS 8306.29 (statuettes of base metal); no federal sales tax (state tax varies).</li>
        <li><strong>Australia</strong>: GST applies; sculptures over AUD 1,000 may incur additional duty.</li>
      </ul>
      <p>We provide a commercial invoice, certificate of origin, cultural-property declaration, and the correct HS code (8306.29 for metal statues; 4421 for wood carvings) on every export so customs clearance is fast.</p>`,
    },
    {
      slug: "packaging",
      title: "Packaging",
      body: `<p>Every sculpture is double-boxed — wrapped in acid-free tissue and foam, then placed in a fitted inner carton with custom polyfoam inserts cut to the piece's contours, then placed inside an outer carton with 5cm of cushioning on every side. Stone-inlay pieces get extra protection around the inlay zones. Large commissions ship in wooden crates with shock-absorbing inserts. We use recycled and recyclable materials wherever the carrier permits.</p>`,
    },
    {
      slug: "delivery-day",
      title: "On the day",
      body: `<p>Couriers will call before delivery for large sculptures (XL size, above 18 in / 45 cm). For Kathmandu Valley deliveries we offer free white-glove unboxing and altar placement on request.</p>`,
    },
    {
      slug: "missed-deliveries",
      title: "Missed or undelivered parcels",
      body: `<p>If you miss the courier, they'll attempt delivery up to three times before holding the parcel for collection at the local depot. International parcels held longer than 14 days may be returned to us at the customer's expense.</p>`,
    },
    {
      slug: "contact",
      title: "Need help with a delivery?",
      body: `<p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with your order number — we track every shipment ourselves and can usually resolve issues the same day.</p>`,
    },
  ],
};

export const POLICIES: Record<PolicyKind, PolicyContent> = {
  terms: TERMS,
  privacy: PRIVACY,
  returns: RETURNS,
  payment: PAYMENT,
  "cookie-policy": COOKIE_POLICY,
  accessibility: ACCESSIBILITY,
  shipping: SHIPPING,
};
