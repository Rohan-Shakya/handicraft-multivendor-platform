import "./globals.css";

import type { Collection, PaginatedResponse, Vendor } from "@repo/types";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { type ReactNode,Suspense } from "react";

import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { Footer } from "@/components/Footer";
import { Header,type HeaderNavData } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PwaRegister } from "@/components/PwaRegister";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";
import { CookieConsent } from "@/components/CookieConsent";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { brand } from "@/config/brand";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { apiFetch } from "@/lib/api";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Fraunces — refined editorial serif for big display copy. Variable axes give us
// optical-sized warmth at large weights without loading a separate face.
const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const SITE_NAME = brand.shortName;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.titleSuffix}`,
  },
  description: brand.tagline,
  applicationName: SITE_NAME,
  keywords: [
    "marketplace",
    "ecommerce",
    "multi-vendor",
    brand.productNounPlural,
    SITE_NAME,
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: brand.name,
    description: brand.tagline,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Manifest is generated dynamically by app/manifest.ts → /manifest.webmanifest.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1f1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

/**
 * Fetch the bits the header mega-menu needs. Failures degrade gracefully —
 * the menu just renders without the rich preview cards.
 */
async function fetchHeaderNav(): Promise<HeaderNavData> {
  // Header nav is the same for every visitor and rarely changes — cache for
  // 5 minutes so the root layout doesn't refetch on every navigation.
  const [collectionsRaw, vendorsRaw] = await Promise.allSettled([
    apiFetch<PaginatedResponse<Collection> | Collection[]>(
      "/storefront/collections?limit=8",
      { revalidate: 300, tags: ["nav:collections"] }
    ),
    apiFetch<PaginatedResponse<Vendor> | Vendor[]>(
      "/storefront/vendors?limit=4",
      { revalidate: 300, tags: ["nav:vendors"] }
    ),
  ]);

  function toArray<T>(
    r: PromiseSettledResult<PaginatedResponse<T> | T[]>
  ): T[] {
    if (r.status !== "fulfilled" || !r.value) return [];
    return Array.isArray(r.value) ? r.value : r.value.data;
  }

  return {
    collections: toArray(collectionsRaw).map((c) => ({
      id: c.id,
      title: c.title,
      handle: c.handle,
      image: (c as Collection & { image?: { url?: string } | null })?.image
        ?.url,
    })),
    vendors: toArray(vendorsRaw).map((v) => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
    })),
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const navData = await fetchHeaderNav();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${displayFont.variable} font-sans antialiased min-h-screen flex flex-col bg-background text-foreground`}
      >
        {/* Skip link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Skip to main content
        </a>

        <CurrencyProvider>
          <AuthProvider>
            <WishlistProvider>
              <CartProvider>
                <TooltipProvider delayDuration={300}>
                  {/*
                    vaul-drawer-wrapper enables the bottom-drawer page-scale
                    effect on mobile. MobileBottomNav and Toaster live outside
                    the wrapper so their `position: fixed` keeps working
                    (transforms create a new stacking context).
                  */}
                  <div
                    data-vaul-drawer-wrapper=""
                    className="flex flex-1 flex-col bg-background"
                  >
                    <Header nav={navData} />
                    <main
                      id="main-content"
                      className="flex-1 pb-20 md:pb-0"
                    >
                      {children}
                    </main>
                    <Footer />
                  </div>
                  <MobileBottomNav />
                  <Toaster />
                  <ConfirmDialogHost />
                  <PwaRegister />
                  <CookieConsent />
                  <Suspense fallback={null}>
                    <AnalyticsProvider />
                  </Suspense>
                </TooltipProvider>
              </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
