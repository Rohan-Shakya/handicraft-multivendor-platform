import type { Blog, PaginatedResponse } from "@repo/types";
import { ArrowRight,FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogPostCard } from "@/components/BlogPostCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { brand } from "@/config/brand";
import { apiFetch } from "@/lib/api";
import {
  type BlogPostFull,
  categoryLabel,
  isoDate,
  unwrapBlog,
} from "@/lib/blog";

interface Props {
  params: Promise<{ handle: string }>;
}

// Cache blog listings for 5 minutes.
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const raw = await apiFetch<unknown>(`/storefront/blogs/${handle}`, {
    revalidate: 600,
    tags: [`blog:${handle}`],
  }).catch(() => null);
  const blog = unwrapBlog<Blog>(raw);
  if (!blog) return { title: "Blog not found" };
  const label = categoryLabel(handle);
  return {
    title: { absolute: `${label} — ${brand.shortName} Journal` },
    description: `${label} stories, guides, and editor picks from the ${brand.shortName} team.`,
    alternates: { canonical: `/blogs/${handle}` },
    openGraph: {
      type: "website",
      title: `${label} — ${brand.shortName} Journal`,
      description: `${label} stories from ${brand.shortName}.`,
      url: `/blogs/${handle}`,
      siteName: brand.shortName,
    },
  };
}

export default async function BlogListingPage({ params }: Props) {
  const { handle } = await params;

  const [blogRaw, postsResult] = await Promise.all([
    apiFetch<unknown>(`/storefront/blogs/${handle}`, {
      revalidate: 600,
      tags: [`blog:${handle}`],
    }).catch(() => null),
    apiFetch<PaginatedResponse<BlogPostFull>>(
      `/storefront/blogs/${handle}/posts?limit=24`,
      { revalidate: 300, tags: [`blog:${handle}:posts`] }
    ).catch(() => null),
  ]);

  const blog = unwrapBlog<Blog>(blogRaw);
  if (!blog) notFound();

  const posts = (postsResult?.data ?? [])
    .filter((p) => p.publishedAt)
    .sort(
      (a, b) =>
        new Date(b.publishedAt as Date | string).getTime() -
        new Date(a.publishedAt as Date | string).getTime()
    );

  const featured = posts[0];
  const rest = posts.slice(1);
  const label = categoryLabel(handle);

  // JSON-LD Blog
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${label} — ${brand.name} Journal`,
    url: `/blogs/${handle}`,
    blogPost: posts.slice(0, 8).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `/blogs/${handle}/${p.handle}`,
      datePublished: isoDate(p.publishedAt),
      author: { "@type": "Organization", name: brand.name },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="border-b" aria-labelledby="blog-cat-heading">
        <div className="mx-auto max-w-8xl px-4 pb-14 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pb-16 lg:pt-24">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Journal", href: "/blogs" },
              { label },
            ]}
          />
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                Section
              </p>
              <h1
                id="blog-cat-heading"
                className="mt-4 text-5xl font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {blog.title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {posts.length === 0
                  ? "Stories arriving soon — check back shortly."
                  : `${posts.length} ${posts.length === 1 ? "story" : "stories"} from our editors. Latest first.`}
              </p>
            </div>
            <Link
              href="/blogs"
              className="inline-flex w-fit items-center gap-1.5 border-b border-foreground/40 pb-0.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
            >
              All sections
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {posts.length === 0 ? (
        <main className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card py-16 text-center">
            <FileText className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-base font-semibold">No stories yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              We&apos;re working on it — new pieces land most weeks.
            </p>
          </div>
        </main>
      ) : (
        <>
          {featured && (
            <section className="py-16 lg:py-20">
              <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
                <BlogPostCard
                  post={featured}
                  blogHandle={handle}
                  variant="feature"
                  priority
                />
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className="border-t bg-secondary/30 py-16 lg:py-20">
              <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
                <header className="mb-10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    More from {label.toLowerCase()}
                  </p>
                  <h2
                    className="mt-2 text-3xl font-medium tracking-[-0.01em] sm:text-4xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Recent stories
                  </h2>
                </header>
                <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
                  {rest.map((p) => (
                    <BlogPostCard key={p.id} post={p} blogHandle={handle} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
