import type { BlogPost } from "@repo/types";

/**
 * Wider blog-post shape than the shared `BlogPost` interface.
 *
 * The API surfaces `excerpt`, `imageAlt`, `featuredImageFileId`, and a resolved
 * `image` URL on listing endpoints. The shared types haven't caught up yet, so
 * we extend locally to keep the storefront strict.
 */
export type BlogPostFull = BlogPost & {
  excerpt?: string | null;
  imageAlt?: string | null;
  featuredImageFileId?: string | null;
  /** Pre-resolved image URL when the API has joined files. */
  image?: string | null;
  /** Optional structured author the API may return. */
  author?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  } | null;
};

/**
 * Single-post endpoint returns `{ article: BlogPost }`; listing returns the
 * post directly. This helper accepts either shape.
 */
export function unwrapPost<T extends BlogPostFull>(
  payload: unknown
): T | null {
  if (!payload || typeof payload !== "object") return null;
  if ("article" in payload && payload.article) {
    return payload.article as T;
  }
  if ("id" in payload && "handle" in payload) {
    return payload as T;
  }
  return null;
}

/**
 * Single-blog endpoint returns `{ blog: Blog }`; some other endpoints return
 * the blog directly. This helper accepts either shape.
 */
export function unwrapBlog<T extends { id: string; handle: string; title: string }>(
  payload: unknown
): T | null {
  if (!payload || typeof payload !== "object") return null;
  if ("blog" in payload && payload.blog) {
    return payload.blog as T;
  }
  if ("id" in payload && "handle" in payload) {
    return payload as T;
  }
  return null;
}

/** Pretty date formatter. Returns null on bad input so callers can branch. */
export function formatPostDate(
  date: Date | string | null | undefined,
  format: "short" | "long" = "long"
): string | null {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: format === "long" ? "long" : "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

/** Best-effort ISO datetime for `<time dateTime>`. */
export function isoDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    return new Date(date).toISOString();
  } catch {
    return "";
  }
}

/** Strip HTML tags down to plain text. Cheap, used for summaries + word-count. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reading time in minutes, calculated from the post's HTML body.
 * Uses a generous 200 wpm — adjust if your audience reads faster/slower.
 */
export function readingTime(html: string | null | undefined): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.round(words / 200));
}

const POST_COVER_BY_HANDLE: Record<string, string> = {
  "how-a-patan-bronze-is-cast":
    "https://images.unsplash.com/photo-1751979362679-8687eb4d9301",
  "choosing-your-first-deity-statue":
    "https://images.unsplash.com/photo-1772311292496-23b3cfe692bf",
  "caring-for-brass-a-5-minute-guide":
    "https://images.unsplash.com/photo-1771073387047-df16b4889412",
  "behind-the-scenes-at-bhaktapur":
    "https://images.unsplash.com/photo-1546006200-f8c574598b28",
};

export function postImage(
  post: BlogPostFull,
  size: "thumb" | "card" | "hero" = "card"
): string {
  if (post.image) return post.image;
  const dims =
    size === "thumb" ? "200/200" : size === "hero" ? "1600/900" : "1100/700";
  const [w, h] = dims.split("/");
  const curated = POST_COVER_BY_HANDLE[post.handle];
  if (curated) {
    return `${curated}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
  }
  return `https://picsum.photos/seed/handicrafts-nepal-post-${post.id}/${dims}`;
}

/** Excerpt with sensible fallback to body. */
export function postExcerpt(post: BlogPostFull, max = 220): string {
  if (post.excerpt && post.excerpt.trim()) return post.excerpt.trim();
  const text = stripHtml(post.body);
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

/** Title-case a hyphenated category handle ("vendor-stories" → "Vendor stories"). */
export function categoryLabel(handle: string): string {
  return handle
    .split("-")
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toUpperCase() + w.slice(1)
        : w.toLowerCase()
    )
    .join(" ");
}
