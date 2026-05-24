"use client";

import * as React from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "rugs-nepal-cookie-consent";
type Consent = "accepted" | "rejected";

/**
 * GDPR-style cookie consent banner. Stays out of the way until the user has
 * made a choice, then is hidden on subsequent visits via localStorage.
 *
 * The "accepted" / "rejected" decision is exposed via the `getCookieConsent()`
 * helper so analytics components can opt in/out of tracking accordingly.
 *
 * Accessibility: rendered as a polite live region so screen readers announce
 * it after page content loads. Focusable buttons; Escape dismisses (counts as
 * "Reject" — fail-safe to user privacy).
 */
export function CookieConsent() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // Defer to avoid layout shift on first paint — render the banner only
    // after the page is settled.
    const id = window.setTimeout(() => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
      } catch {
        // localStorage unavailable (private mode) — show every time.
        setVisible(true);
      }
    }, 600);
    return () => clearTimeout(id);
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handle("rejected");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handle(value: Consent) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // best-effort
    }
    // Notify listeners (analytics components etc.).
    window.dispatchEvent(
      new CustomEvent("cookie-consent-change", { detail: value })
    );
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border bg-background/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:left-1/2 sm:bottom-6 sm:-translate-x-1/2 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex"
        >
          <Cookie className="size-5" />
        </span>
        <div className="flex-1 text-sm">
          <p className="font-semibold">We use cookies</p>
          <p className="mt-1 text-muted-foreground">
            We use essential cookies to make this site work, plus optional
            cookies for analytics and personalization. You can change your mind
            anytime in your account.{" "}
            <Link
              href="/pages/privacy-policy"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Read our privacy policy
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handle("accepted")}
              className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-xs font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              autoFocus
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => handle("rejected")}
              className="inline-flex h-10 items-center rounded-full border bg-background px-5 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Essential only
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handle("rejected")}
          aria-label="Dismiss — essential cookies only"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Read the customer's stored cookie-consent decision. Returns `null` if
 * they haven't decided yet. Safe to call from client components.
 */
export function getCookieConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}
