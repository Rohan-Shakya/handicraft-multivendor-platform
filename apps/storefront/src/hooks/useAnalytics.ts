"use client";

import * as React from "react";

/**
 * Event names follow the GA4 recommended-events taxonomy so analytics
 * integrators can plug in a provider (GA4, Segment, Plausible, PostHog)
 * without renaming everything.
 */
export type AnalyticsEvent =
  | "page_view"
  | "view_item"
  | "view_item_list"
  | "select_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "view_cart"
  | "begin_checkout"
  | "add_shipping_info"
  | "add_payment_info"
  | "purchase"
  | "refund"
  | "add_to_wishlist"
  | "search"
  | "sign_up"
  | "login"
  | "share"
  | "view_promotion"
  | "select_promotion"
  | "newsletter_subscribe";

export type AnalyticsPayload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Thin analytics wrapper. By default it writes to `window.dataLayer` (GTM
 * convention) and to gtag if present — so GA4/GTM pick up events with zero
 * extra wiring. Override by swapping `track()` to call your own provider.
 */
export function track(event: AnalyticsEvent, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const entry = { event, ...payload, timestamp: Date.now() };
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(entry);

  if (typeof window.gtag === "function") {
    window.gtag("event", event, payload);
  }

  // Dev echo: `NEXT_PUBLIC_ANALYTICS_DEBUG=1` surfaces events in console.
  if (
    process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1" &&
    typeof console !== "undefined"
  ) {
     
    console.debug("[analytics]", event, payload);
  }
}

export function useAnalytics() {
  return React.useMemo(() => ({ track }), []);
}
