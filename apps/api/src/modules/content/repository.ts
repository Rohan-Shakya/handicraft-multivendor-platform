import { eq, and, sql, isNull, desc, ilike, or, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  pages,
  blogs,
  blogPosts,
  blogTags,
  blogPostTags,
  files,
} from "../../db/schema/index.js";
import { users } from "../../db/schema/index.js";

/** Drizzle aliases used to resolve cover-image URLs in post queries. */
const featuredFile = {
  url: files.url,
  altText: files.altText,
};
import type {
  CreatePageDto,
  UpdatePageDto,
  CreateBlogDto,
  UpdateBlogDto,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  ContentFilters,
  BlogPostFilters,
} from "./types.js";

function generateId() {
  return crypto.randomUUID();
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function findPages(filters: ContentFilters) {
  const { page = 1, limit = 20, status, search } = filters;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [isNull(pages.deletedAt)];
  if (status) conditions.push(eq(pages.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(pages.title, `%${escapeLike(search)}%`),
        ilike(pages.handle, `%${escapeLike(search)}%`)
      )!
    );
  }

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(pages)
      .where(where)
      .orderBy(desc(pages.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(pages).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function findPageById(id: string) {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), isNull(pages.deletedAt)));
  return page ?? null;
}

export async function findPageByHandle(handle: string) {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.handle, handle), isNull(pages.deletedAt)));
  return page ?? null;
}

export async function createPage(data: CreatePageDto, actorId?: string) {
  const now = new Date();
  const isVisible = data.isVisible ?? data.status === "published";

  const [page] = await db
    .insert(pages)
    .values({
      id: generateId(),
      title: data.title,
      handle: data.handle,
      body: data.body,
      status: isVisible ? "published" : "draft",
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoKeywords: data.seoKeywords,
      seoCanonicalUrl: data.seoCanonicalUrl,
      ogImageFileId: data.ogImageFileId,
      publishedAt: isVisible
        ? data.publishedAt
          ? new Date(data.publishedAt)
          : now
        : null,
      createdBy: actorId,
      updatedBy: actorId,
    })
    .returning();
  return page!;
}

export async function updatePage(
  id: string,
  data: UpdatePageDto,
  actorId?: string
) {
  const setData: Record<string, unknown> = { updatedAt: new Date() };
  if (actorId) setData.updatedBy = actorId;

  if (data.title !== undefined) setData.title = data.title;
  if (data.handle !== undefined) setData.handle = data.handle;
  if (data.body !== undefined) setData.body = data.body;
  if (data.seoTitle !== undefined) setData.seoTitle = data.seoTitle;
  if (data.seoDescription !== undefined)
    setData.seoDescription = data.seoDescription;
  if (data.seoKeywords !== undefined) setData.seoKeywords = data.seoKeywords;
  if (data.seoCanonicalUrl !== undefined)
    setData.seoCanonicalUrl = data.seoCanonicalUrl;
  if (data.ogImageFileId !== undefined)
    setData.ogImageFileId = data.ogImageFileId;

  // Visibility logic: isVisible drives status + publishedAt
  if (data.isVisible !== undefined) {
    if (data.isVisible) {
      setData.status = "published";
      setData.publishedAt =
        data.publishedAt != null ? new Date(data.publishedAt) : new Date();
    } else {
      setData.status = "draft";
      setData.publishedAt = null;
    }
  } else if (data.status !== undefined) {
    setData.status = data.status;
    if (data.status === "published" && data.publishedAt !== undefined) {
      setData.publishedAt =
        data.publishedAt != null ? new Date(data.publishedAt) : new Date();
    }
  }

  const [page] = await db
    .update(pages)
    .set(setData)
    .where(and(eq(pages.id, id), isNull(pages.deletedAt)))
    .returning();
  return page ?? null;
}

export async function softDeletePage(id: string) {
  const [page] = await db
    .update(pages)
    .set({ deletedAt: new Date(), status: "archived", updatedAt: new Date() })
    .where(and(eq(pages.id, id), isNull(pages.deletedAt)))
    .returning();
  return page ?? null;
}

// ─── Blogs ────────────────────────────────────────────────────────────────────

export async function findBlogs(filters: ContentFilters) {
  const { page = 1, limit = 20, status, search } = filters;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [isNull(blogs.deletedAt)];
  if (status) conditions.push(eq(blogs.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(blogs.title, `%${escapeLike(search)}%`),
        ilike(blogs.handle, `%${escapeLike(search)}%`)
      )!
    );
  }

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(blogs)
      .where(where)
      .orderBy(desc(blogs.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(blogs).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function findBlogById(id: string) {
  const [blog] = await db
    .select()
    .from(blogs)
    .where(and(eq(blogs.id, id), isNull(blogs.deletedAt)));
  return blog ?? null;
}

export async function findBlogByHandle(handle: string) {
  const [blog] = await db
    .select()
    .from(blogs)
    .where(and(eq(blogs.handle, handle), isNull(blogs.deletedAt)));
  return blog ?? null;
}

export async function createBlog(data: CreateBlogDto, actorId?: string) {
  const [blog] = await db
    .insert(blogs)
    .values({
      id: generateId(),
      title: data.title,
      handle: data.handle,
      description: data.description,
      status: data.status ?? "draft",
      commentStatus: data.commentStatus ?? "enabled",
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      createdBy: actorId,
      updatedBy: actorId,
    })
    .returning();
  return blog!;
}

export async function updateBlog(
  id: string,
  data: UpdateBlogDto,
  actorId?: string
) {
  const setData: Record<string, unknown> = { updatedAt: new Date() };
  if (actorId) setData.updatedBy = actorId;
  if (data.title !== undefined) setData.title = data.title;
  if (data.handle !== undefined) setData.handle = data.handle;
  if (data.description !== undefined) setData.description = data.description;
  if (data.status !== undefined) setData.status = data.status;
  if (data.commentStatus !== undefined) setData.commentStatus = data.commentStatus;
  if (data.seoTitle !== undefined) setData.seoTitle = data.seoTitle;
  if (data.seoDescription !== undefined) setData.seoDescription = data.seoDescription;

  const [blog] = await db
    .update(blogs)
    .set(setData)
    .where(and(eq(blogs.id, id), isNull(blogs.deletedAt)))
    .returning();
  return blog ?? null;
}

export async function softDeleteBlog(id: string) {
  const [blog] = await db
    .update(blogs)
    .set({ deletedAt: new Date(), status: "archived", updatedAt: new Date() })
    .where(and(eq(blogs.id, id), isNull(blogs.deletedAt)))
    .returning();
  return blog ?? null;
}

// ─── Blog Posts ───────────────────────────────────────────────────────────────

export async function findBlogPosts(filters: BlogPostFilters) {
  const { page = 1, limit = 20, status, blogId, search } = filters;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [isNull(blogPosts.deletedAt)];
  if (blogId) conditions.push(eq(blogPosts.blogId, blogId));
  if (status) conditions.push(eq(blogPosts.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(blogPosts.title, `%${escapeLike(search)}%`),
        ilike(blogPosts.handle, `%${escapeLike(search)}%`)
      )!
    );
  }

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: blogPosts.id,
        blogId: blogPosts.blogId,
        authorId: blogPosts.authorId,
        title: blogPosts.title,
        handle: blogPosts.handle,
        body: blogPosts.body,
        excerpt: blogPosts.excerpt,
        status: blogPosts.status,
        featuredImageFileId: blogPosts.featuredImageFileId,
        imageAlt: blogPosts.imageAlt,
        // Resolved cover-image URL from the joined `files` table — frontend
        // uses this directly so `postImage()` doesn't have to fall back to
        // picsum placeholders for posts that have a real image.
        image: featuredFile.url,
        imageAltFromFile: featuredFile.altText,
        seoTitle: blogPosts.seoTitle,
        seoDescription: blogPosts.seoDescription,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
        updatedAt: blogPosts.updatedAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        blogTitle: blogs.title,
      })
      .from(blogPosts)
      .leftJoin(users, eq(blogPosts.authorId, users.id))
      .leftJoin(blogs, eq(blogPosts.blogId, blogs.id))
      .leftJoin(files, eq(blogPosts.featuredImageFileId, files.id))
      .where(where)
      .orderBy(desc(blogPosts.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function findBlogPostById(id: string) {
  const [post] = await db
    .select({
      id: blogPosts.id,
      blogId: blogPosts.blogId,
      authorId: blogPosts.authorId,
      title: blogPosts.title,
      handle: blogPosts.handle,
      body: blogPosts.body,
      excerpt: blogPosts.excerpt,
      status: blogPosts.status,
      featuredImageFileId: blogPosts.featuredImageFileId,
      imageAlt: blogPosts.imageAlt,
      image: featuredFile.url,
      imageAltFromFile: featuredFile.altText,
      seoTitle: blogPosts.seoTitle,
      seoDescription: blogPosts.seoDescription,
      seoCanonicalUrl: blogPosts.seoCanonicalUrl,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
      updatedAt: blogPosts.updatedAt,
      createdBy: blogPosts.createdBy,
      updatedBy: blogPosts.updatedBy,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      blogTitle: blogs.title,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .leftJoin(blogs, eq(blogPosts.blogId, blogs.id))
    .leftJoin(files, eq(blogPosts.featuredImageFileId, files.id))
    .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)));
  return post ?? null;
}

export async function findBlogPostByHandle(blogId: string, handle: string) {
  const [post] = await db
    .select({
      id: blogPosts.id,
      blogId: blogPosts.blogId,
      authorId: blogPosts.authorId,
      title: blogPosts.title,
      handle: blogPosts.handle,
      body: blogPosts.body,
      excerpt: blogPosts.excerpt,
      status: blogPosts.status,
      featuredImageFileId: blogPosts.featuredImageFileId,
      imageAlt: blogPosts.imageAlt,
      image: featuredFile.url,
      imageAltFromFile: featuredFile.altText,
      seoTitle: blogPosts.seoTitle,
      seoDescription: blogPosts.seoDescription,
      seoCanonicalUrl: blogPosts.seoCanonicalUrl,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
      updatedAt: blogPosts.updatedAt,
      createdBy: blogPosts.createdBy,
      updatedBy: blogPosts.updatedBy,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      blogTitle: blogs.title,
      deletedAt: blogPosts.deletedAt,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .leftJoin(blogs, eq(blogPosts.blogId, blogs.id))
    .leftJoin(files, eq(blogPosts.featuredImageFileId, files.id))
    .where(
      and(
        eq(blogPosts.blogId, blogId),
        eq(blogPosts.handle, handle),
        isNull(blogPosts.deletedAt)
      )
    );
  return post ?? null;
}

export async function createBlogPost(
  data: CreateBlogPostDto,
  actorId?: string
) {
  const now = new Date();
  const isVisible = data.isVisible ?? data.status === "published";

  const [post] = await db
    .insert(blogPosts)
    .values({
      id: generateId(),
      blogId: data.blogId,
      authorId: actorId,
      title: data.title,
      handle: data.handle,
      body: data.body,
      excerpt: data.excerpt,
      featuredImageFileId: data.featuredImageFileId,
      imageAlt: data.imageAlt,
      status: isVisible ? "published" : "draft",
      publishedAt: isVisible
        ? data.publishedAt
          ? new Date(data.publishedAt)
          : now
        : null,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      createdBy: actorId,
      updatedBy: actorId,
    })
    .returning();
  return post!;
}

export async function updateBlogPost(
  id: string,
  data: UpdateBlogPostDto,
  actorId?: string
) {
  const setData: Record<string, unknown> = { updatedAt: new Date() };
  if (actorId) setData.updatedBy = actorId;
  if (data.title !== undefined) setData.title = data.title;
  if (data.handle !== undefined) setData.handle = data.handle;
  if (data.body !== undefined) setData.body = data.body;
  if (data.excerpt !== undefined) setData.excerpt = data.excerpt;
  if (data.featuredImageFileId !== undefined)
    setData.featuredImageFileId = data.featuredImageFileId;
  if (data.imageAlt !== undefined) setData.imageAlt = data.imageAlt;
  if (data.blogId !== undefined) setData.blogId = data.blogId;
  if (data.seoTitle !== undefined) setData.seoTitle = data.seoTitle;
  if (data.seoDescription !== undefined)
    setData.seoDescription = data.seoDescription;

  // Visibility logic
  if (data.isVisible !== undefined) {
    if (data.isVisible) {
      setData.status = "published";
      setData.publishedAt =
        data.publishedAt != null ? new Date(data.publishedAt) : new Date();
    } else {
      setData.status = "draft";
      setData.publishedAt = null;
    }
  } else if (data.status !== undefined) {
    setData.status = data.status;
    if (data.status === "published" && data.publishedAt !== undefined) {
      setData.publishedAt =
        data.publishedAt != null ? new Date(data.publishedAt) : new Date();
    }
  }

  const [post] = await db
    .update(blogPosts)
    .set(setData)
    .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)))
    .returning();
  return post ?? null;
}

export async function softDeleteBlogPost(id: string) {
  const [post] = await db
    .update(blogPosts)
    .set({ deletedAt: new Date(), status: "archived", updatedAt: new Date() })
    .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)))
    .returning();
  return post ?? null;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

function toTagHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function findOrCreateTags(names: string[]): Promise<string[]> {
  const tagIds: string[] = [];

  for (const name of names) {
    const handle = toTagHandle(name);
    if (!handle) continue;

    // Try find existing
    const [existing] = await db
      .select()
      .from(blogTags)
      .where(and(eq(blogTags.handle, handle), isNull(blogTags.deletedAt)));

    if (existing) {
      tagIds.push(existing.id);
    } else {
      const id = generateId();
      await db.insert(blogTags).values({ id, name: name.trim(), handle });
      tagIds.push(id);
    }
  }

  return tagIds;
}

export async function syncPostTags(postId: string, tagIds: string[]) {
  // Delete existing tag associations
  await db.delete(blogPostTags).where(eq(blogPostTags.blogPostId, postId));

  // Insert new associations
  if (tagIds.length > 0) {
    await db.insert(blogPostTags).values(
      tagIds.map((tagId) => ({ blogPostId: postId, tagId }))
    );
  }
}

export async function getPostTags(postId: string) {
  const rows = await db
    .select({
      id: blogTags.id,
      name: blogTags.name,
      handle: blogTags.handle,
    })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.blogPostId, postId));
  return rows;
}

export async function getAllTags() {
  return db
    .select()
    .from(blogTags)
    .where(isNull(blogTags.deletedAt))
    .orderBy(blogTags.name);
}
