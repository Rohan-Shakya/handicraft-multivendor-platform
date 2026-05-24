import type { AuthActor } from "@repo/types";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError } from "../../lib/errors.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import * as repo from "./repository.js";
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

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function listPages(actor: AuthActor, filters: ContentFilters) {
  assertPermission(actor, "page:manage:any");
  return repo.findPages(filters);
}

export async function getPage(actor: AuthActor, id: string) {
  assertPermission(actor, "page:manage:any");
  const page = await repo.findPageById(id);
  if (!page) throw new NotFoundError("Page not found");
  return page;
}

export async function createPage(actor: AuthActor, data: CreatePageDto) {
  assertPermission(actor, "page:manage:any");
  const existing = await repo.findPageByHandle(data.handle);
  if (existing) {
    throw Object.assign(new Error("Page handle already taken"), {
      statusCode: 409,
    });
  }
  const page = await repo.createPage(data, actor.id);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "page",
    entityId: page.id,
    action: "page.created",
    afterJson: page,
  });

  return page;
}

export async function updatePage(
  actor: AuthActor,
  id: string,
  data: UpdatePageDto
) {
  assertPermission(actor, "page:manage:any");

  // If handle is being changed, check uniqueness
  if (data.handle) {
    const existing = await repo.findPageByHandle(data.handle);
    if (existing && existing.id !== id) {
      throw Object.assign(new Error("Page handle already taken"), {
        statusCode: 409,
      });
    }
  }

  const before = await repo.findPageById(id);
  const page = await repo.updatePage(id, data, actor.id);
  if (!page) throw new NotFoundError("Page not found");

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "page",
    entityId: id,
    action: "page.updated",
    beforeJson: before,
    afterJson: page,
  });

  return page;
}

export async function deletePage(actor: AuthActor, id: string) {
  assertPermission(actor, "page:manage:any");
  const before = await repo.findPageById(id);
  const page = await repo.softDeletePage(id);
  if (!page) throw new NotFoundError("Page not found");

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "page",
    entityId: id,
    action: "page.deleted",
    beforeJson: before,
  });

  return page;
}

export async function getPublicPage(handle: string) {
  const page = await repo.findPageByHandle(handle);
  if (!page || page.status !== "published") {
    throw new NotFoundError("Page not found");
  }
  return page;
}

// ─── Blogs ────────────────────────────────────────────────────────────────────

export async function listBlogs(actor: AuthActor, filters: ContentFilters) {
  assertPermission(actor, "blog:manage:any");
  return repo.findBlogs(filters);
}

export async function getBlog(actor: AuthActor, id: string) {
  assertPermission(actor, "blog:manage:any");
  const blog = await repo.findBlogById(id);
  if (!blog) throw new NotFoundError("Blog not found");
  return blog;
}

export async function createBlog(actor: AuthActor, data: CreateBlogDto) {
  assertPermission(actor, "blog:manage:any");
  const existing = await repo.findBlogByHandle(data.handle);
  if (existing) {
    throw Object.assign(new Error("Blog handle already taken"), {
      statusCode: 409,
    });
  }
  const blog = await repo.createBlog(data, actor.id);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "blog",
    entityId: blog.id,
    action: "blog.created",
    afterJson: blog,
  });

  return blog;
}

export async function updateBlog(
  actor: AuthActor,
  id: string,
  data: UpdateBlogDto
) {
  assertPermission(actor, "blog:manage:any");

  if (data.handle) {
    const existing = await repo.findBlogByHandle(data.handle);
    if (existing && existing.id !== id) {
      throw Object.assign(new Error("Blog handle already taken"), {
        statusCode: 409,
      });
    }
  }

  const before = await repo.findBlogById(id);
  const blog = await repo.updateBlog(id, data, actor.id);
  if (!blog) throw new NotFoundError("Blog not found");

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "blog",
    entityId: id,
    action: "blog.updated",
    beforeJson: before,
    afterJson: blog,
  });

  return blog;
}

export async function deleteBlog(actor: AuthActor, id: string) {
  assertPermission(actor, "blog:manage:any");
  const before = await repo.findBlogById(id);
  const blog = await repo.softDeleteBlog(id);
  if (!blog) throw new NotFoundError("Blog not found");

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "blog",
    entityId: id,
    action: "blog.deleted",
    beforeJson: before,
  });

  return blog;
}

export async function getPublicBlog(handle: string) {
  const blog = await repo.findBlogByHandle(handle);
  if (!blog || blog.status !== "published") {
    throw new NotFoundError("Blog not found");
  }
  return blog;
}

// ─── Blog Posts ───────────────────────────────────────────────────────────────

export async function listBlogPosts(
  actor: AuthActor,
  filters: BlogPostFilters
) {
  assertPermission(actor, "blog:manage:any");
  return repo.findBlogPosts(filters);
}

export async function getBlogPost(actor: AuthActor, id: string) {
  assertPermission(actor, "blog:manage:any");
  const post = await repo.findBlogPostById(id);
  if (!post) throw new NotFoundError("Blog post not found");

  // Also load tags
  const tags = await repo.getPostTags(id);
  return { ...post, tags };
}

export async function createBlogPost(
  actor: AuthActor,
  data: CreateBlogPostDto
) {
  assertPermission(actor, "blog:manage:any");

  // Check blog exists
  const blog = await repo.findBlogById(data.blogId);
  if (!blog) throw new NotFoundError("Blog not found");

  // Check handle uniqueness within blog
  const existing = await repo.findBlogPostByHandle(data.blogId, data.handle);
  if (existing) {
    throw Object.assign(new Error("Post handle already taken in this blog"), {
      statusCode: 409,
    });
  }

  const post = await repo.createBlogPost(data, actor.id);

  // Handle tags
  if (data.tags && data.tags.length > 0) {
    const tagIds = await repo.findOrCreateTags(data.tags);
    await repo.syncPostTags(post.id, tagIds);
  }

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "blog_post",
    entityId: post.id,
    action: "blog_post.created",
    afterJson: post,
  });

  return post;
}

export async function updateBlogPost(
  actor: AuthActor,
  id: string,
  data: UpdateBlogPostDto
) {
  assertPermission(actor, "blog:manage:any");

  // Check handle uniqueness if changing
  if (data.handle) {
    const currentPost = await repo.findBlogPostById(id);
    if (!currentPost) throw new NotFoundError("Blog post not found");

    const blogId = data.blogId ?? currentPost.blogId;
    const existing = await repo.findBlogPostByHandle(blogId, data.handle);
    if (existing && existing.id !== id) {
      throw Object.assign(new Error("Post handle already taken in this blog"), {
        statusCode: 409,
      });
    }
  }

  const before = await repo.findBlogPostById(id);
  const post = await repo.updateBlogPost(id, data, actor.id);
  if (!post) throw new NotFoundError("Blog post not found");

  // Sync tags if provided
  if (data.tags !== undefined) {
    const tagIds =
      data.tags.length > 0 ? await repo.findOrCreateTags(data.tags) : [];
    await repo.syncPostTags(id, tagIds);
  }

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "blog_post",
    entityId: id,
    action: "blog_post.updated",
    beforeJson: before,
    afterJson: post,
  });

  return post;
}

export async function deleteBlogPost(actor: AuthActor, id: string) {
  assertPermission(actor, "blog:manage:any");
  const before = await repo.findBlogPostById(id);
  const post = await repo.softDeleteBlogPost(id);
  if (!post) throw new NotFoundError("Blog post not found");

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "blog_post",
    entityId: id,
    action: "blog_post.deleted",
    beforeJson: before,
  });

  return post;
}

export async function getPublicBlogPosts(blogHandle: string) {
  const blog = await repo.findBlogByHandle(blogHandle);
  if (!blog || blog.status !== "published") {
    throw new NotFoundError("Blog not found");
  }
  return repo.findBlogPosts({
    blogId: blog.id,
    status: "published",
    page: 1,
    limit: 100,
  });
}

export async function getPublicBlogPost(
  blogHandle: string,
  postHandle: string
) {
  const blog = await repo.findBlogByHandle(blogHandle);
  if (!blog || blog.status !== "published") {
    throw new NotFoundError("Blog not found");
  }
  const post = await repo.findBlogPostByHandle(blog.id, postHandle);
  if (!post || post.status !== "published") {
    throw new NotFoundError("Blog post not found");
  }
  return post;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function listTags(actor: AuthActor) {
  assertPermission(actor, "blog:manage:any");
  return repo.getAllTags();
}
