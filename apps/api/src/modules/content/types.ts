// ─── Pages ────────────────────────────────────────────────────────────────────

export interface CreatePageDto {
  title: string;
  handle: string;
  body?: string;
  status?: "published" | "draft";
  isVisible?: boolean;
  publishedAt?: string | null;

  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  seoCanonicalUrl?: string | null;
  ogImageFileId?: string | null;
}

export interface UpdatePageDto {
  title?: string;
  handle?: string;
  body?: string | null;
  status?: "published" | "draft";
  isVisible?: boolean;
  publishedAt?: string | null;

  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  seoCanonicalUrl?: string | null;
  ogImageFileId?: string | null;
}

// ─── Blogs ────────────────────────────────────────────────────────────────────

export interface CreateBlogDto {
  title: string;
  handle: string;
  description?: string | null;
  status?: "published" | "draft";
  commentStatus?: "enabled" | "moderated" | "disabled";
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface UpdateBlogDto {
  title?: string;
  handle?: string;
  description?: string | null;
  status?: "published" | "draft";
  commentStatus?: "enabled" | "moderated" | "disabled";
  seoTitle?: string | null;
  seoDescription?: string | null;
}

// ─── Blog Posts ───────────────────────────────────────────────────────────────

export interface CreateBlogPostDto {
  blogId: string;
  title: string;
  handle: string;
  body?: string;
  excerpt?: string | null;
  featuredImageFileId?: string | null;
  imageAlt?: string | null;
  status?: "published" | "draft";
  isVisible?: boolean;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string[];
}

export interface UpdateBlogPostDto {
  title?: string;
  handle?: string;
  body?: string | null;
  excerpt?: string | null;
  featuredImageFileId?: string | null;
  imageAlt?: string | null;
  blogId?: string;
  status?: "published" | "draft";
  isVisible?: boolean;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string[];
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface ContentFilters {
  status?: "published" | "draft";
  search?: string;
  page?: number;
  limit?: number;
}

export interface BlogPostFilters {
  blogId?: string;
  status?: "published" | "draft";
  search?: string;
  page?: number;
  limit?: number;
}
