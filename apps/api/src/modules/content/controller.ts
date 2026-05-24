import type { FastifyReply } from "fastify";
import * as service from "./service.js";
import {
  createPageSchema,
  updatePageSchema,
  createBlogSchema,
  updateBlogSchema,
  createBlogPostSchema,
  updateBlogPostSchema,
  contentFiltersSchema,
  blogPostFiltersSchema,
} from "./schema.js";

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function listPages(req: any, reply: FastifyReply) {
  const filters = contentFiltersSchema.parse(req.query);
  const result = await service.listPages(req.actor, filters);
  return reply.send(result);
}

export async function getPage(req: any, reply: FastifyReply) {
  const page = await service.getPage(req.actor, req.params.id);
  return reply.send(page);
}

export async function createPage(req: any, reply: FastifyReply) {
  const body = createPageSchema.parse(req.body);
  const page = await service.createPage(req.actor, body);
  return reply.status(201).send(page);
}

export async function updatePage(req: any, reply: FastifyReply) {
  const body = updatePageSchema.parse(req.body);
  const page = await service.updatePage(req.actor, req.params.id, body);
  return reply.send(page);
}

export async function deletePage(req: any, reply: FastifyReply) {
  const page = await service.deletePage(req.actor, req.params.id);
  return reply.send(page);
}

// ─── Blogs ────────────────────────────────────────────────────────────────────

export async function listBlogs(req: any, reply: FastifyReply) {
  const filters = contentFiltersSchema.parse(req.query);
  const result = await service.listBlogs(req.actor, filters);
  return reply.send(result);
}

export async function getBlog(req: any, reply: FastifyReply) {
  const blog = await service.getBlog(req.actor, req.params.id);
  return reply.send(blog);
}

export async function createBlog(req: any, reply: FastifyReply) {
  const body = createBlogSchema.parse(req.body);
  const blog = await service.createBlog(req.actor, body);
  return reply.status(201).send(blog);
}

export async function updateBlog(req: any, reply: FastifyReply) {
  const body = updateBlogSchema.parse(req.body);
  const blog = await service.updateBlog(req.actor, req.params.id, body);
  return reply.send(blog);
}

export async function deleteBlog(req: any, reply: FastifyReply) {
  const blog = await service.deleteBlog(req.actor, req.params.id);
  return reply.send(blog);
}

// ─── Blog Posts ───────────────────────────────────────────────────────────────

export async function listBlogPosts(req: any, reply: FastifyReply) {
  const filters = blogPostFiltersSchema.parse(req.query);
  const result = await service.listBlogPosts(req.actor, filters);
  return reply.send(result);
}

export async function getBlogPost(req: any, reply: FastifyReply) {
  const post = await service.getBlogPost(req.actor, req.params.id);
  return reply.send(post);
}

export async function createBlogPost(req: any, reply: FastifyReply) {
  const body = createBlogPostSchema.parse(req.body);
  const post = await service.createBlogPost(req.actor, body);
  return reply.status(201).send(post);
}

export async function updateBlogPost(req: any, reply: FastifyReply) {
  const body = updateBlogPostSchema.parse(req.body);
  const post = await service.updateBlogPost(req.actor, req.params.id, body);
  return reply.send(post);
}

export async function deleteBlogPost(req: any, reply: FastifyReply) {
  const post = await service.deleteBlogPost(req.actor, req.params.id);
  return reply.send(post);
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function listTags(req: any, reply: FastifyReply) {
  const tags = await service.listTags(req.actor);
  return reply.send(tags);
}
