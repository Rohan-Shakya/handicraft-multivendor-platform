import { useEffect } from "react";

const SUFFIX = "Admin";

/**
 * Sets `document.title` to `${title} · Admin` for the lifetime of the
 * component, then restores the previous title on unmount. Drop into any
 * page-level component so screen readers announce the route correctly when
 * navigating — without this, every page is announced as just "Admin".
 *
 * Pass `null`/`undefined` to skip (e.g. while data is loading).
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${SUFFIX}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
