import type { BlogPost, PaginatedResponse } from "@repo/types";
import { ArrowLeft, ArrowRight,Clock } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogPostCard } from "@/components/BlogPostCard";
import { BlogShareBar } from "@/components/BlogShareBar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SafeHtml } from "@/components/SafeHtml";
import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";
import {
  type BlogPostFull,
  categoryLabel,
  formatPostDate,
  isoDate,
  postExcerpt,
  postImage,
  readingTime,
  unwrapPost,
} from "@/lib/blog";

interface Props {
  params: Promise<{ handle: string; postHandle: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchPost(
  blogHandle: string,
  postHandle: string
): Promise<BlogPostFull | null> {
  // Endpoint may return either `BlogPost` directly or `{ article: BlogPost }`.
  const direct = await apiFetch<unknown>(
    `/storefront/blogs/${blogHandle}/posts/${postHandle}`
  ).catch(() => null);
  const unwrapped = unwrapPost<BlogPostFull>(direct);
  if (unwrapped) return unwrapped;

  // Fallback: walk the listing.
  const listing = await apiFetch<PaginatedResponse<BlogPostFull>>(
    `/storefront/blogs/${blogHandle}/posts`
  ).catch(() => null);
  return listing?.data.find((p) => p.handle === postHandle) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, postHandle } = await params;
  const post = await fetchPost(handle, postHandle);
  if (!post) return { title: "Post not found" };

  const url = `/blogs/${handle}/${postHandle}`;
  const title = post.seoTitle ?? `${post.title} — ${brand.shortName} Journal`;
  const description = post.seoDescription ?? postExcerpt(post, 155);
  const ogImage = postImage(post, "hero");

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: brand.shortName,
      images: [{ url: ogImage, width: 1600, height: 900, alt: post.imageAlt ?? post.title }],
      publishedTime: isoDate(post.publishedAt) || undefined,
      modifiedTime: isoDate(post.updatedAt) || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogPostDetailPage({ params }: Props) {
  const { handle, postHandle } = await params;
  const post = await fetchPost(handle, postHandle);
  if (!post) notFound();

  const otherPosts = await apiFetch<PaginatedResponse<BlogPostFull>>(
    `/storefront/blogs/${handle}/posts?limit=10`
  ).catch(() => null);

  const list = (otherPosts?.data ?? []).filter((p) => p.id !== post.id);
  const related = list.slice(0, 3);

  // Prev / next chronological neighbours (newest at index 0).
  const sorted = [...(otherPosts?.data ?? [])]
    .filter((p): p is BlogPost & BlogPostFull => Boolean(p))
    .sort(
      (a, b) =>
        new Date(b.publishedAt as Date | string).getTime() -
        new Date(a.publishedAt as Date | string).getTime()
    );
  const idx = sorted.findIndex((p) => p.id === post.id);
  const prev = idx > 0 ? sorted[idx - 1] : null; // newer
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null; // older

  const date = formatPostDate(post.publishedAt ?? post.createdAt, "long");
  const minutes = readingTime(post.body);
  const heroImage = postImage(post, "hero");
  const url = `${SITE_URL}/blogs/${handle}/${postHandle}`;

  // JSON-LD: Article + BreadcrumbList
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: postExcerpt(post, 200),
    image: [heroImage],
    datePublished: isoDate(post.publishedAt),
    dateModified: isoDate(post.updatedAt),
    author: { "@type": "Organization", name: brand.name },
    publisher: { "@type": "Organization", name: brand.name },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: categoryLabel(handle),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "Journal", item: "/blogs" },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `/blogs/${handle}/${postHandle}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([articleJsonLd, breadcrumbJsonLd]),
        }}
      />

      {/* ── Light header ────────────────────────────────────────── */}
      <section className="border-b" aria-labelledby="post-heading">
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-12 lg:pt-16">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Journal", href: "/blogs" },
              { label: post.title },
            ]}
          />
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <Link
              href={`/blogs/${handle}`}
              className="rounded-full border bg-card px-3.5 py-1 text-primary transition-colors hover:border-primary"
            >
              {categoryLabel(handle)}
            </Link>
            {date && (
              <>
                <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
                <time
                  dateTime={isoDate(post.publishedAt ?? post.createdAt)}
                  className="font-medium normal-case tracking-normal"
                >
                  {date}
                </time>
              </>
            )}
            <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
            <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal">
              <Clock className="size-3" aria-hidden />
              {minutes} min read
            </span>
          </div>
          <h1
            id="post-heading"
            className="mt-5 text-4xl font-medium leading-[1.05] tracking-[-0.01em] sm:text-5xl lg:text-[3.5rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {post.title}
          </h1>
          {(post.excerpt || post.seoDescription) && (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {post.excerpt ?? post.seoDescription}
            </p>
          )}
        </div>
      </section>

      {/* ── Featured image (clean, no overlay) ──────────────────── */}
      <section aria-hidden="true" className="pt-10 lg:pt-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-muted">
            <Image
              src={heroImage}
              alt={post.imageAlt ?? post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Body — full-width within reading max ───────────────── */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <article>
            <SafeHtml
              html={post.body}
              className="prose-shop prose-lg"
            />

            {/* Share at the end of content */}
            <div className="mt-14 border-t pt-8">
              <BlogShareBar title={post.title} url={url} />
            </div>

            {/* Prev / next */}
            {(prev || next) && (
              <nav
                aria-label="More posts in this journal"
                className="mt-10 grid gap-4 border-t pt-10 sm:grid-cols-2"
              >
                {prev ? (
                  <Link
                    href={`/blogs/${handle}/${prev.handle}`}
                    className="group flex flex-col gap-2 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-soft)]"
                  >
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      <ArrowLeft className="size-3" aria-hidden />
                      Newer
                    </span>
                    <span
                      className="text-base font-medium leading-snug tracking-tight transition-colors group-hover:text-primary"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {prev.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
                {next ? (
                  <Link
                    href={`/blogs/${handle}/${next.handle}`}
                    className="group flex flex-col items-end gap-2 rounded-2xl border bg-card p-5 text-right transition-shadow hover:shadow-[var(--shadow-soft)] sm:col-start-2"
                  >
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Older
                      <ArrowRight className="size-3" aria-hidden />
                    </span>
                    <span
                      className="text-base font-medium leading-snug tracking-tight transition-colors group-hover:text-primary"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {next.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
              </nav>
            )}
          </article>
        </div>
      </section>

      {/* ── Related ─────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="border-t bg-secondary/30 py-16 lg:py-20">
          <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
            <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Keep reading
                </p>
                <h2
                  className="mt-2 text-3xl font-medium tracking-[-0.01em] sm:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  More from the journal
                </h2>
              </div>
              <Link
                href="/blogs"
                className="inline-flex items-center gap-1.5 border-b border-foreground/40 pb-0.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                All stories
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </header>
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogPostCard
                  key={p.id}
                  post={p}
                  blogHandle={handle}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
