"use client";

import { ArrowRight, Mail, MessageCircle, Search, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { brand } from "@/config/brand";
import { FAQ_CATEGORIES,type FaqCategory } from "@/data/faq";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | string;

interface MatchedItem {
  category: FaqCategory;
  slug: string;
  question: string;
  answer: string;
}

/** Token-folding match: lowercase + strip diacritics + drop punctuation. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function highlight(haystack: string, needle: string): React.ReactNode {
  if (!needle.trim()) return haystack;
  const tokens = normalise(needle)
    .split(" ")
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return haystack;

  const re = new RegExp(`(${tokens.map(escapeReg).join("|")})`, "ig");
  const parts = haystack.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark
        key={i}
        className="bg-primary/15 text-foreground font-semibold rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function FaqPage() {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [openItem, setOpenItem] = React.useState<string | null>(null);

  // On mount, expand the question matching the URL hash so deep links work.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) setOpenItem(hash);
  }, []);

  const filtered = React.useMemo(() => {
    const q = normalise(query);
    const tokens = q.split(" ").filter((t) => t.length >= 2);

    return FAQ_CATEGORIES
      .filter((c) => category === "all" || c.slug === category)
      .map((c) => ({
        ...c,
        questions: c.questions.filter((item) => {
          if (tokens.length === 0) return true;
          const hay = normalise(`${item.question} ${item.answer}`);
          return tokens.every((t) => hay.includes(t));
        }),
      }))
      .filter((c) => c.questions.length > 0);
  }, [query, category]);

  const totalMatches = filtered.reduce(
    (s, c) => s + c.questions.length,
    0
  );

  // Flatten for the empty / search summary.
  const allMatches: MatchedItem[] = React.useMemo(
    () =>
      filtered.flatMap((c) =>
        c.questions.map((q) => ({
          category: c,
          slug: q.slug,
          question: q.question,
          answer: q.answer,
        }))
      ),
    [filtered]
  );

  const isSearching = query.trim().length > 0;
  const isFiltered = category !== "all";

  return (
    <>
      {/* ── Page header + search ────────────────────────────────── */}
      <section
        className="border-b"
        aria-labelledby="faq-heading"
      >
        <div className="mx-auto max-w-8xl px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pb-16 lg:pt-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              Help centre
            </p>
            <h1
              id="faq-heading"
              className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.01em] sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Frequently asked.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Quick answers to the questions our team gets most. Can&apos;t
              find what you&apos;re looking for?{" "}
              <Link
                href="/pages/contact"
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              >
                Get in touch
              </Link>
              .
            </p>
          </div>

          {/* Search */}
          <div className="mt-10 max-w-2xl">
            <label htmlFor="faq-search" className="sr-only">
              Search frequently asked questions
            </label>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="faq-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by keyword — e.g. shipping, returns, custom"
                autoComplete="off"
                className="w-full rounded-2xl border bg-card py-4 pl-14 pr-12 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
            {(isSearching || isFiltered) && (
              <p
                aria-live="polite"
                className="mt-3 text-xs text-muted-foreground"
              >
                {totalMatches}{" "}
                {totalMatches === 1 ? "result" : "results"}
                {isSearching && (
                  <>
                    {" "}for{" "}
                    <span className="font-medium text-foreground">
                      &ldquo;{query.trim()}&rdquo;
                    </span>
                  </>
                )}
                {isFiltered && (
                  <>
                    {" "}in{" "}
                    <span className="font-medium text-foreground">
                      {FAQ_CATEGORIES.find((c) => c.slug === category)?.label}
                    </span>
                  </>
                )}
                {(isSearching || isFiltered) && (
                  <>
                    {" — "}
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setCategory("all");
                      }}
                      className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                    >
                      reset
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Categories + FAQ accordion ──────────────────────────── */}
      <section className="py-16 lg:py-20" aria-label="FAQ list">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-14">
            {/* Categories nav */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Browse by topic
              </p>
              <nav aria-label="FAQ categories" className="mt-3">
                <ul className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:gap-1">
                  <li>
                    <CategoryButton
                      active={category === "all"}
                      onClick={() => setCategory("all")}
                    >
                      All questions
                    </CategoryButton>
                  </li>
                  {FAQ_CATEGORIES.map((c) => (
                    <li key={c.slug}>
                      <CategoryButton
                        active={category === c.slug}
                        onClick={() => setCategory(c.slug)}
                      >
                        {c.label}
                      </CategoryButton>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-10 hidden rounded-3xl border bg-card p-6 lg:block">
                <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <MessageCircle className="size-5" aria-hidden />
                </div>
                <h2
                  className="mt-4 text-lg font-medium tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Still stuck?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Our team replies within one business day.
                </p>
                <Link
                  href="/pages/contact"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-2 hover:text-primary"
                >
                  Contact us
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </aside>

            {/* Accordion */}
            <div>
              {filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
                  <h2
                    className="text-2xl font-medium tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    No matches.
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    We couldn&apos;t find an answer for that. Try a different
                    keyword, or write to us — a real human will reply.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setCategory("all");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
                    >
                      Clear filters
                    </button>
                    <Link
                      href="/pages/contact"
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Mail className="size-3.5" aria-hidden />
                      Contact us
                    </Link>
                  </div>
                </div>
              ) : isSearching ? (
                /* Search results — flat list, no category groupings. */
                <ul className="flex flex-col divide-y rounded-3xl border bg-card">
                  {allMatches.map((item) => (
                    <FaqRow
                      key={`${item.category.slug}-${item.slug}`}
                      slug={item.slug}
                      question={item.question}
                      answer={item.answer}
                      category={item.category.label}
                      query={query}
                      open={openItem === item.slug}
                      onToggle={(slug) =>
                        setOpenItem((prev) => (prev === slug ? null : slug))
                      }
                    />
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col gap-12">
                  {filtered.map((c) => (
                    <section
                      key={c.slug}
                      id={c.slug}
                      aria-labelledby={`faq-cat-${c.slug}`}
                    >
                      <header>
                        <h2
                          id={`faq-cat-${c.slug}`}
                          className="text-2xl font-medium tracking-tight sm:text-3xl"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {c.label}
                        </h2>
                        {c.description && (
                          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                            {c.description}
                          </p>
                        )}
                      </header>
                      <ul className="mt-5 flex flex-col divide-y rounded-3xl border bg-card">
                        {c.questions.map((q) => (
                          <FaqRow
                            key={q.slug}
                            slug={q.slug}
                            question={q.question}
                            answer={q.answer}
                            query=""
                            open={openItem === q.slug}
                            onToggle={(slug) =>
                              setOpenItem((prev) =>
                                prev === slug ? null : slug
                              )
                            }
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <section className="border-t bg-secondary/40 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Still have questions?
          </p>
          <h2
            className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            We&apos;d love to help.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Email, phone, or in-person at our {brand.contact.address.addressLocality.split(" am ")[0]} showroom — pick whichever
            feels easiest. Replies within one business day.
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

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex w-full shrink-0 items-center justify-start rounded-full px-4 py-2 text-left text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

interface FaqRowProps {
  slug: string;
  question: string;
  answer: string;
  category?: string;
  query: string;
  open: boolean;
  onToggle: (slug: string) => void;
}

function FaqRow({
  slug,
  question,
  answer,
  category,
  query,
  open,
  onToggle,
}: FaqRowProps) {
  const id = `faq-${slug}`;
  const panelId = `${id}-panel`;
  return (
    <li id={slug} className="scroll-mt-28">
      <h3>
        <button
          type="button"
          id={id}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            onToggle(slug);
            // Update URL hash without scrolling so the link is shareable.
            if (typeof window !== "undefined" && !open) {
              history.replaceState(null, "", `#${slug}`);
            }
          }}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring sm:px-7"
        >
          <span className="flex-1">
            {category && (
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {category}
              </span>
            )}
            <span
              className={cn(
                "block text-base font-medium tracking-tight sm:text-lg",
                category && "mt-1"
              )}
            >
              {highlight(question, query)}
            </span>
          </span>
          <span
            aria-hidden
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full border text-muted-foreground transition-colors",
              open && "border-primary bg-primary text-primary-foreground"
            )}
          >
            <span
              className={cn(
                "block text-base leading-none transition-transform",
                open && "rotate-45"
              )}
            >
              +
            </span>
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={id}
        hidden={!open}
        className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground sm:px-7 sm:text-base"
      >
        <p>{highlight(answer, query)}</p>
      </div>
    </li>
  );
}
