import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { files } from "./files";

export const contentStatusEnum = pgEnum("content_status", ["draft", "published", "archived"]);

export const blogCommentStatusEnum = pgEnum("blog_comment_status", [
  "disabled",
  "moderated",
  "enabled",
]);

export const pages = pgTable(
  "pages",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    handle: text("handle").notNull(),
    body: text("body"),
    status: contentStatusEnum("status").notNull().default("draft"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    /**
     * Comma-separated SEO keywords. Modern search engines mostly ignore this
     * field, but it's still consumed by Bing/Yandex/internal site search and
     * is convenient for admins to record term lists per page.
     */
    seoKeywords: text("seo_keywords"),
    seoCanonicalUrl: text("seo_canonical_url"),
    /** Optional OG / Twitter card image. References `files.id`. */
    ogImageFileId: text("og_image_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("pages_handle_unique")
      .on(t.handle)
      .where(sql`${t.deletedAt} IS NULL`),
    index("pages_status_idx").on(t.status),
    index("pages_published_at_idx").on(t.publishedAt),
    index("pages_deleted_at_idx").on(t.deletedAt),
    check("pages_handle_lowercase_chk", sql`${t.handle} = lower(${t.handle})`),
  ]
);

export const blogs = pgTable(
  "blogs",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    handle: text("handle").notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    description: text("description"),
    commentStatus: blogCommentStatusEnum("comment_status").notNull().default("enabled"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoCanonicalUrl: text("seo_canonical_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("blogs_handle_unique")
      .on(t.handle)
      .where(sql`${t.deletedAt} IS NULL`),
    index("blogs_status_idx").on(t.status),
    index("blogs_published_at_idx").on(t.publishedAt),
    index("blogs_deleted_at_idx").on(t.deletedAt),
    check("blogs_handle_lowercase_chk", sql`${t.handle} = lower(${t.handle})`),
  ]
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: text("id").primaryKey(),
    blogId: text("blog_id")
      .notNull()
      .references(() => blogs.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    handle: text("handle").notNull(),
    body: text("body"),
    excerpt: text("excerpt"),
    status: contentStatusEnum("status").notNull().default("draft"),
    featuredImageFileId: text("featured_image_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    imageAlt: text("image_alt"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoCanonicalUrl: text("seo_canonical_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("blog_posts_blog_handle_unique")
      .on(t.blogId, t.handle)
      .where(sql`${t.deletedAt} IS NULL`),
    index("blog_posts_blog_id_idx").on(t.blogId),
    index("blog_posts_author_id_idx").on(t.authorId),
    index("blog_posts_status_idx").on(t.status),
    index("blog_posts_published_at_idx").on(t.publishedAt),
    index("blog_posts_featured_image_file_id_idx").on(t.featuredImageFileId),
    index("blog_posts_deleted_at_idx").on(t.deletedAt),
    check("blog_posts_handle_lowercase_chk", sql`${t.handle} = lower(${t.handle})`),
  ]
);

export const blogTags = pgTable(
  "blog_tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("blog_tags_handle_unique")
      .on(t.handle)
      .where(sql`${t.deletedAt} IS NULL`),
    index("blog_tags_deleted_at_idx").on(t.deletedAt),
    check("blog_tags_handle_lowercase_chk", sql`${t.handle} = lower(${t.handle})`),
  ]
);

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    blogPostId: text("blog_post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => blogTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.blogPostId, t.tagId], name: "blog_post_tags_pk" }),
    index("blog_post_tags_blog_post_id_idx").on(t.blogPostId),
    index("blog_post_tags_tag_id_idx").on(t.tagId),
  ]
);
