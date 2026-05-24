import { useEffect } from "react";

/**
 * Warn the user before they leave a page with unsaved form changes.
 *
 * Wires the browser's native `beforeunload` handler so navigating away,
 * refreshing, or closing the tab triggers a confirmation prompt.
 *
 * Usage:
 * ```tsx
 * useUnsavedChanges(formIsDirty);
 * ```
 *
 * NOTE: This only covers hard navigations (refresh, close, external links).
 * In-app route changes via React Router need a separate `useBlocker` or
 * confirmation dialog — consumers can layer that on top.
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      // Modern browsers ignore the custom string, but the prompt still shows
      // when `preventDefault` is called. Keep the message for legacy browsers.
      event.preventDefault();
      event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
