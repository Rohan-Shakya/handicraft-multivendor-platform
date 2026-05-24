import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { brand } from "@/config/brand";

interface RecentPost {
  id: string;
  handle: string;
  title: string;
  blogHandle: string;
  publishedAt?: Date | string | null;
  image?: string | null;
}

interface Category {
  handle: string;
  title: string;
  count?: number;
}

interface Props {
  recentPosts?: RecentPost[];
  categories?: Category[];
  query?: string;
}

function formatShortDate(date: Date | string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BlogSidebar({
  recentPosts = [],
  categories = [],
  query = "",
}: Props) {
  return (
    <aside className="flex flex-col gap-10">
      {/* Search */}
      <div>
        <form
          action="/search"
          method="get"
          role="search"
          className="relative"
        >
          <Search
            className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search…"
            aria-label="Search the site"
            className="w-full rounded-2xl border border-border bg-card py-3 pl-4 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3
            className="mb-4 text-base font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Categories
          </h3>
          <ul className="flex flex-col gap-3 text-sm">
            {categories.map((c) => (
              <li
                key={c.handle}
                className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0"
              >
                <Link
                  href={`/blogs/${c.handle}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.title}
                </Link>
                {typeof c.count === "number" && (
                  <span className="text-xs text-muted-foreground tabular">
                    {c.count}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <div>
          <h3
            className="mb-4 text-base font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Recent Posts
          </h3>
          <ul className="flex flex-col gap-4">
            {recentPosts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blogs/${post.blogHandle}/${post.handle}`}
                  className="group flex items-start gap-3"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={
                        post.image ??
                        `https://picsum.photos/seed/handicrafts-nepal-blog-${post.id}/200/200`
                      }
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                      {post.title}
                    </p>
                    {post.publishedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatShortDate(post.publishedAt)}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Brand pill */}
      <div className="rounded-3xl bg-cream p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream-foreground/60">
          Newsletter
        </p>
        <p
          className="mt-2 text-base font-semibold tracking-tight text-cream-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Stories from {brand.shortName}, in your inbox.
        </p>
        <Link
          href="#newsletter"
          className="mt-3 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          Subscribe →
        </Link>
      </div>
    </aside>
  );
}
