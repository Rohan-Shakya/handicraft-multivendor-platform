"use client";

import DOMPurify from "isomorphic-dompurify";

interface SafeHtmlProps {
  html: string | null | undefined;
  className?: string;
  as?: "div" | "article" | "section";
}

/**
 * Render admin-authored HTML (blog/page/collection bodies) with DOMPurify
 * sanitization. Strips `<script>`, event handlers, javascript:/data: URIs and
 * other XSS vectors. Use anywhere user-controlled HTML is rendered — never
 * `dangerouslySetInnerHTML` with raw content.
 */
export function SafeHtml({ html, className, as = "div" }: SafeHtmlProps) {
  if (!html) return null;
  const Tag = as as "div";
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    // Allow common rich-text content tags; explicitly forbid <iframe> / <script>
    // / <style> to keep the surface small.
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus"],
  });
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
