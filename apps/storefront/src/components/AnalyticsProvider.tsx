"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import * as React from "react";

import { track } from "@/hooks/useAnalytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Drops-in Google Analytics (GA4) via the official gtag snippet when
 * NEXT_PUBLIC_GA_ID is configured, and fires a `page_view` on every Next.js
 * navigation. Without `NEXT_PUBLIC_GA_ID` set, we still push events to
 * `window.dataLayer` so you can wire up GTM / another provider.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    const path = qs ? `${pathname}?${qs}` : pathname;
    track("page_view", { path });
  }, [pathname, searchParams]);

  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
