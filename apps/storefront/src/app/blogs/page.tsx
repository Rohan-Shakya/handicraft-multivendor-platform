import type { Blog, PaginatedResponse } from "@repo/types";
import { FileText, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

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

export const metadata: Metadata = {
  title: { absolute: `${brand.shortName} Journal — Stories, Guides & Vendor Spotlights` },
  description: `Buying guides, vendor profiles, care tips, and editor stories from the ${brand.shortName} team. Updated weekly.`,
  alternates: { canonical: "/blogs" },
  openGraph: {
    type: "website",
    title: `${brand.shortName} Journal`,
    description: `Stories, guides and vendor spotlights from the ${brand.shortName} editorial team.`,
    url: "/blogs",
    siteName: brand.shortName,
  },
};

const FALLBACK_BLOG_HANDLES = ["journal", "vendor-stories", "guides", "news"];

// Editorial content changes daily at most — cache for 5 minutes.
export const revalidate = 300;

interface PostWithSource extends BlogPostFull {
  blogHandle: string;
}

export default async function BlogsIndexPage() {
  // Parallel lookup across all blog handles — previously a serial `for` loop
  // that blocked every page render on up to 8 round-trips (most 404s).
  const perHandle = await Promise.all(
    FALLBACK_BLOG_HANDLES.map(async (handle) => {
      const [blogMeta, posts] = await Promise.all([
        apiFetch<unknown>(`/storefront/blogs/${handle}`, {
          revalidate: 600,
        }).catch(() => null),
        apiFetch<PaginatedResponse<BlogPostFull>>(
          `/storefront/blogs/${handle}/posts?limit=12`,
          { revalidate: 300, tags: [`blog:${handle}:posts`] }
        ).catch(() => null),
      ]);
      const blog = unwrapBlog<Blog>(blogMeta);
      if (!blog || !posts?.data?.length) return [];
      return posts.data.map((p) => ({ ...p, blogHandle: handle }));
    })
  );
  const collected: PostWithSource[] = perHandle.flat();

  // Sort newest first; published posts only.
  const allPosts = collected
    .filter((p) => p.publishedAt)
    .sort(
      (a, b) =>
        new Date(b.publishedAt as Date | string).getTime() -
        new Date(a.publishedAt as Date | string).getTime()
    );

  const featured = allPosts[0];
  const rest = allPosts.slice(1);

  // Category counts derived from what we found.
  const categoryCounts = new Map<string, number>();
  allPosts.forEach((p) => {
    categoryCounts.set(
      p.blogHandle,
      (categoryCounts.get(p.blogHandle) ?? 0) + 1
    );
  });
  const categories = Array.from(categoryCounts.entries()).map(
    ([handle, count]) => ({
      handle,
      label: categoryLabel(handle),
      count,
    })
  );

  // JSON-LD: Blog listing
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${brand.name} Journal`,
    url: "/blogs",
    blogPost: allPosts.slice(0, 8).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `/blogs/${p.blogHandle}/${p.handle}`,
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

      {/* ── Page header ─────────────────────────────────────────── */}
      <section className="border-b" aria-labelledby="blog-heading">
        <div className="mx-auto max-w-8xl px-4 pb-8 pt-10 sm:px-6 sm:pt-12 lg:px-8 lg:pb-10 lg:pt-14">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Journal" }]}
          />
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1
                id="blog-heading"
                className="text-3xl font-medium leading-[1.05] tracking-[-0.01em] sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Stories, slowly woven.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Buying guides, vendor profiles, and care tips from our editors.
              </p>
            </div>
            <p className="text-xs text-muted-foreground lg:text-right">
              {allPosts.length} {allPosts.length === 1 ? "story" : "stories"} ·
              new pieces weekly
            </p>
          </div>
        </div>
      </section>

      {allPosts.length === 0 ? (
        <main className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card py-16 text-center">
            <FileText
              className="size-10 text-muted-foreground"
              aria-hidden
            />
            <p className="text-base font-semibold">No stories yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              The team is busy crafting the first set together. Check back
              shortly.
            </p>
          </div>
        </main>
      ) : (
        <>
          {/* ── Featured ────────────────────────────────────────── */}
          {featured && (
            <section
              className="py-10 lg:py-12"
              aria-label="Featured story"
            >
              <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
                <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" aria-hidden />
                  Editor&apos;s pick
                </div>
                <BlogPostCard
                  post={featured}
                  blogHandle={featured.blogHandle}
                  variant="feature"
                  priority
                />
              </div>
            </section>
          )}

          {/* ── Category filter + grid ──────────────────────────── */}
          <section className="border-t bg-secondary/30 py-16 lg:py-20">
            <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
              <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    All stories
                  </p>
                  <h2
                    className="mt-2 text-3xl font-medium tracking-[-0.01em] sm:text-4xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Browse the journal
                  </h2>
                </div>
                {/* Category pills */}
                {categories.length > 1 && (
                  <nav aria-label="Browse by category">
                    <ul className="flex flex-wrap items-center gap-2">
                      {categories.map((c) => (
                        <li key={c.handle}>
                          <Link
                            href={`/blogs/${c.handle}`}
                            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-xs font-semibold tracking-tight transition-colors hover:border-primary hover:text-primary"
                          >
                            {c.label}
                            <span className="text-muted-foreground tabular">
                              {c.count}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </header>

              {rest.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
                  {rest.map((post) => (
                    <BlogPostCard
                      key={post.id}
                      post={post}
                      blogHandle={post.blogHandle}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  More stories coming soon.
                </p>
              )}
            </div>
          </section>

        </>
      )}
    </>
  );
}
