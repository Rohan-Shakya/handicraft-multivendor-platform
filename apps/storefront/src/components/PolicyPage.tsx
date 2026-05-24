"use client";

import { ArrowRight, Mail, Printer } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SafeHtml } from "@/components/SafeHtml";
import { brand } from "@/config/brand";
import type { PolicyContent } from "@/data/policies";
import { cn } from "@/lib/utils";

interface Props {
  policy: PolicyContent;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function PolicyPage({ policy }: Props) {
  const [activeSlug, setActiveSlug] = React.useState<string>(
    policy.sections[0]?.slug ?? ""
  );
  const headingRefs = React.useRef<Record<string, HTMLHeadingElement | null>>(
    {}
  );

  // Track which section is in the viewport so the TOC can highlight it.
  // We use IntersectionObserver against each section's heading so the active
  // pill follows scroll position smoothly.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const headings = Object.values(headingRefs.current).filter(
      (h): h is HTMLHeadingElement => h != null
    );
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost intersecting heading.
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0];
        if (top?.target instanceof HTMLElement) {
          const slug = top.target.dataset.slug;
          if (slug) setActiveSlug(slug);
        }
      },
      // Trigger once a heading is within the upper third of the viewport.
      { rootMargin: "-20% 0% -65% 0%", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [policy.sections]);

  function onPrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────── */}
      <section className="border-b" aria-labelledby="policy-heading">
        <div className="mx-auto max-w-8xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-12 lg:pt-20">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: policy.title },
            ]}
          />
          <div className="mt-6 max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              {policy.eyebrow}
            </p>
            <h1
              id="policy-heading"
              className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.01em] sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {policy.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {policy.intro}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <p>
                <span className="text-foreground/70">Last updated:</span>{" "}
                <time dateTime={policy.lastUpdated} className="font-medium text-foreground">
                  {formatDate(policy.lastUpdated)}
                </time>
              </p>
              {policy.effectiveDate && (
                <p>
                  <span className="text-foreground/70">Effective:</span>{" "}
                  <time
                    dateTime={policy.effectiveDate}
                    className="font-medium text-foreground"
                  >
                    {formatDate(policy.effectiveDate)}
                  </time>
                </p>
              )}
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-2 hover:underline print:hidden"
              >
                <Printer className="size-3.5" aria-hidden /> Print
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOC + body ───────────────────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-14">
            {/* Sticky TOC */}
            <aside className="lg:sticky lg:top-28 lg:self-start print:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                On this page
              </p>
              <nav aria-label="Section navigation" className="mt-3">
                <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
                  {policy.sections.map((s) => (
                    <li key={s.slug}>
                      <a
                        href={`#${s.slug}`}
                        aria-current={activeSlug === s.slug ? "true" : undefined}
                        className={cn(
                          "inline-flex w-full shrink-0 items-center justify-start rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                          activeSlug === s.slug
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Body */}
            <article
              className="max-w-2xl"
              aria-labelledby="policy-heading"
            >
              {policy.sections.map((s, i) => (
                <section
                  key={s.slug}
                  id={s.slug}
                  aria-labelledby={`policy-h-${s.slug}`}
                  className={cn(
                    "scroll-mt-28",
                    i > 0 && "mt-12 border-t pt-12"
                  )}
                >
                  <h2
                    id={`policy-h-${s.slug}`}
                    ref={(el) => {
                      headingRefs.current[s.slug] = el;
                    }}
                    data-slug={s.slug}
                    className="text-2xl font-medium tracking-tight sm:text-3xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.title}
                  </h2>
                  <SafeHtml
                    html={s.body}
                    className="prose-shop mt-4 text-foreground"
                  />
                </section>
              ))}
            </article>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <section className="border-t bg-secondary/40 py-16 print:hidden">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Need a hand?
          </p>
          <h2
            className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Real humans, ready to help.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Anything in this document unclear? Email or write to us and we&apos;ll
            walk through it with you. {brand.contact.supportHoursLabel}.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/pages/contact"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Contact us
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a
              href={`mailto:${brand.contact.email}`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-accent"
            >
              <Mail className="size-3.5" aria-hidden />
              {brand.contact.email}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
