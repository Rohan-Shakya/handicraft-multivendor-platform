import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/BrandMark";
import { brand } from "@/config/brand";

import { NewsletterForm } from "./NewsletterForm";

// ─── Inline social icons ────────────────────────────────────────────────────

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.928-1.956 1.879v2.254h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  );
}
function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

// ─── Static content ─────────────────────────────────────────────────────────

const SOCIAL = [
  { label: "Instagram", href: "https://instagram.com", Icon: InstagramIcon },
  { label: "Pinterest", href: "https://pinterest.com", Icon: PinterestIcon },
  { label: "Facebook", href: "https://facebook.com", Icon: FacebookIcon },
  { label: "X (Twitter)", href: "https://twitter.com", Icon: TwitterIcon },
] as const;

const SHOP_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/products", label: "All products" },
  { href: "/products?sort=created_at_desc", label: "New arrivals" },
  { href: "/products?onSale=1", label: "On sale" },
  { href: "/collections", label: "Collections" },
  { href: "/vendors", label: "Vendors" },
];

const HELP_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/pages/faq", label: "Help centre" },
  { href: "/pages/contact", label: "Contact us" },
  { href: "/pages/returns", label: "Returns" },
  { href: "/pages/payment", label: "Payment options" },
];

const COMPANY_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/blogs", label: "Journal" },
  { href: "/vendors", label: "Become a seller" },
  { href: "/customer/gift-cards", label: "Gift cards" },
  { href: "/pages/about", label: "About" },
];

const LEGAL_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/pages/terms", label: "Terms" },
  { href: "/pages/privacy", label: "Privacy" },
  { href: "/pages/cookie-policy", label: "Cookies" },
  { href: "/pages/accessibility", label: "Accessibility" },
  { href: "/pages/shipping", label: "Shipping" },
];

// ─── Footer ─────────────────────────────────────────────────────────────────

export function Footer() {
  const year = new Date().getFullYear();

  // Organization JSON-LD: appears on every page so Google has consistent
  // brand metadata + sameAs (verified social profiles) site-wide.
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "/",
    logo: "/icon.svg",
    sameAs: SOCIAL.map((s) => s.href),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: brand.contact.phone,
      email: brand.contact.email,
      contactType: "Customer support",
      availableLanguage: ["en", "ne"],
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: brand.contact.address.streetAddress,
      postalCode: brand.contact.address.postalCode,
      addressLocality: brand.contact.address.addressLocality,
      addressRegion: brand.contact.address.addressRegion,
      addressCountry: brand.contact.address.addressCountry,
    },
  };

  return (
    <footer aria-labelledby="footer-heading" className="border-t bg-secondary/30">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
        {/* Top: brand + 3 link columns + newsletter */}
        <div className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.9fr))_minmax(0,1.4fr)] lg:gap-10">
          {/* Brand block */}
          <FooterBrand />

          <FooterColumn title="Shop" links={SHOP_LINKS} />
          <FooterColumn title="Help" links={HELP_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />

          {/* Newsletter */}
          <FooterNewsletter />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start gap-3 border-t py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {year} {brand.name}. All rights reserved.
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs"
          >
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function FooterBrand() {
  return (
    <div>
      <Link
        href="/"
        aria-label={`${brand.shortName} home`}
        className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandMark size="md" />
      </Link>
      <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {brand.tagline}
      </p>
      <ul className="mt-6 flex items-center gap-2.5">
        {SOCIAL.map(({ label, href, Icon }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} (opens in new tab)`}
              className="grid size-9 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Icon className="size-3.5" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterNewsletter() {
  return (
    <div>
      <FooterColumnHeading>Newsletter</FooterColumnHeading>
      <NewsletterForm />
      <p className="mt-3 text-xs text-muted-foreground">
        By subscribing you agree to our{" "}
        <Link
          href="/pages/privacy"
          className="underline underline-offset-2 hover:text-foreground"
        >
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <nav aria-label={title}>
      <FooterColumnHeading>{title}</FooterColumnHeading>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="rounded-sm text-sm text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterColumnHeading({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-foreground"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {children}
    </h3>
  );
}
