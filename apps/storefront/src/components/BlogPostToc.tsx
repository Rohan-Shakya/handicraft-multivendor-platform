"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  /** Selector for the article body. Defaults to `[data-blog-body]`. */
  containerSelector?: string;
}

/**
 * Auto-generated table of contents.
 *
 * Walks the article body for `<h2>` and `<h3>` elements after render, gives
 * any heading without an `id` a slugified one so anchors work, then renders
 * a sticky sidebar list. An IntersectionObserver tracks the active heading.
 */
export function BlogPostToc({
  containerSelector = "[data-blog-body]",
}: Props) {
  const [headings, setHeadings] = React.useState<TocHeading[]>([]);
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.querySelector(containerSelector);
    if (!root) return;

    const used = new Set<string>();
    const collected: TocHeading[] = [];

    root.querySelectorAll("h2, h3").forEach((el) => {
      const text = el.textContent?.trim() ?? "";
      if (!text) return;
      let id = el.id;
      if (!id) {
        id = slugify(text);
        let n = 2;
        while (used.has(id)) id = `${slugify(text)}-${n++}`;
        el.id = id;
      }
      used.add(id);
      collected.push({
        id,
        text,
        level: (el.tagName === "H3" ? 3 : 2) as 2 | 3,
      });
    });

    setHeadings(collected);

    if (collected.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0];
        if (top?.target.id) setActiveId(top.target.id);
      },
      { rootMargin: "-20% 0% -65% 0%", threshold: 0 }
    );
    collected.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [containerSelector]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        On this page
      </p>
      <ul className="mt-3 flex flex-col gap-0.5 border-l pl-3">
        {headings.map((h) => (
          <li
            key={h.id}
            className={cn(h.level === 3 && "ml-3")}
          >
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? "true" : undefined}
              className={cn(
                "block py-1 text-sm leading-snug transition-colors",
                activeId === h.id
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
