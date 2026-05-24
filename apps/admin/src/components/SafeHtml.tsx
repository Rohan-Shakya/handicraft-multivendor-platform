import DOMPurify, { type Config } from "dompurify";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SafeHtmlProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Untrusted HTML — will be sanitized before render. */
  html: string;
}

// Conservative allow-list: rich-text editor output we expect, nothing
// scriptable. We strip <script>, <style>, <iframe>, <object>, all `on*`
// handlers, `javascript:` URLs, and SVG (which can carry script).
const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS: [
    "p", "br", "hr", "div", "span",
    "strong", "em", "u", "s", "code", "pre", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  ALLOWED_ATTR: ["href", "title", "alt", "src", "target", "rel", "class"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "svg", "math"],
  FORBID_ATTR: ["style"],
  // Return a string (not TrustedHTML), so callers can post-process.
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Renders untrusted HTML safely. Use this anywhere a vendor or staff member's
 * rich-text input would otherwise hit `dangerouslySetInnerHTML`.
 *
 * Defense in depth — we also enforce CSP at the nginx layer.
 */
export function SafeHtml({ html, className, ...rest }: SafeHtmlProps) {
  const clean = useMemo(() => {
    const sanitized = DOMPurify.sanitize(html ?? "", PURIFY_CONFIG) as string;
    // Force external anchors to open isolated (no referrer/opener leakage,
    // no SEO juice transfer). DOM-walked rather than regex-rewritten because
    // a regex pass produces invalid markup when the source already has
    // target/rel set — we'd end up with two of each attribute and undefined
    // browser behavior.
    if (typeof window === "undefined") return sanitized;
    const doc = new DOMParser().parseFromString(sanitized, "text/html");
    doc.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") ?? "";
      if (/^https?:\/\//i.test(href)) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer nofollow");
      }
    });
    return doc.body.innerHTML;
  }, [html]);

  return (
    <div
      {...rest}
      className={cn(className)}
      // eslint-disable-next-line react/no-danger -- sanitized above
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
