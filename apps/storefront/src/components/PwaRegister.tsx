"use client";

import { Download, RefreshCw, X } from "lucide-react";
import * as React from "react";

import { brand } from "@/config/brand";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

/**
 * Registers the service worker and exposes two small UI affordances:
 *
 *   1. **Update banner** — shown when a new SW has installed and is waiting.
 *      Clicking "Refresh" triggers `SKIP_WAITING` so the new SW activates.
 *   2. **Install banner** — shown if the browser fires `beforeinstallprompt`
 *      (Chrome/Edge/Android). Tap-to-install with a dismissible chip.
 *
 * Renders nothing on the server and bails out entirely on http (the SW only
 * registers over https; localhost is treated as secure by browsers).
 */
export function PwaRegister() {
  const [updateAvailable, setUpdateAvailable] = React.useState<ServiceWorker | null>(
    null
  );
  const [installEvent, setInstallEvent] = React.useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installDismissed, setInstallDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }

    let cancelled = false;

    const handleWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) setUpdateAvailable(reg.waiting);
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (cancelled) return;
        handleWaiting(reg);
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(installing);
            }
          });
        });
      })
      .catch(() => {
        /* swallow — SW failures shouldn't break the page */
      });

    // When a new SW takes control, reload once so the page picks up the
    // fresh assets. The flag prevents an infinite reload loop.
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  // Capture beforeinstallprompt so we can render our own install chip.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const acceptUpdate = React.useCallback(() => {
    if (!updateAvailable) return;
    updateAvailable.postMessage("SKIP_WAITING");
  }, [updateAvailable]);

  const acceptInstall = React.useCallback(async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } finally {
      setInstallEvent(null);
    }
  }, [installEvent]);

  const showInstall =
    !!installEvent &&
    !installDismissed &&
    !updateAvailable; // never show both at once

  return (
    <>
      {updateAvailable && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur md:bottom-5"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <RefreshCw className="size-3.5" aria-hidden />
          </span>
          <p className="flex-1 text-xs leading-tight">
            <strong className="font-semibold">A new version is ready.</strong>
            <span className="ml-1 text-muted-foreground">Reload to use it.</span>
          </p>
          <button
            type="button"
            onClick={acceptUpdate}
            className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Refresh
          </button>
        </div>
      )}

      {showInstall && (
        <div
          role="dialog"
          aria-label={`Install ${brand.shortName} as an app`}
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur md:bottom-5"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Download className="size-3.5" aria-hidden />
          </span>
          <p className="flex-1 text-xs leading-tight">
            <strong className="font-semibold">Install {brand.shortName}.</strong>
            <span className="ml-1 text-muted-foreground">
              Faster checkout, works offline.
            </span>
          </p>
          <button
            type="button"
            onClick={acceptInstall}
            className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Install
          </button>
          <button
            type="button"
            aria-label="Dismiss install prompt"
            onClick={() => setInstallDismissed(true)}
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
