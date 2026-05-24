import type { FastifyInstance } from "fastify";
import * as ctrl from "./controller.js";
import * as service from "./service.js";

export async function contentRoutes(app: FastifyInstance) {
  // Admin — Pages
  app.get("/admin/pages", { preHandler: [app.authenticate] }, ctrl.listPages);
  app.get("/admin/pages/:id", { preHandler: [app.authenticate] }, ctrl.getPage);
  app.post("/admin/pages", { preHandler: [app.authenticate] }, ctrl.createPage);
  app.patch("/admin/pages/:id", { preHandler: [app.authenticate] }, ctrl.updatePage);
  app.delete("/admin/pages/:id", { preHandler: [app.authenticate] }, ctrl.deletePage);

  // Admin — Blogs
  app.get("/admin/blogs", { preHandler: [app.authenticate] }, ctrl.listBlogs);
  app.get("/admin/blogs/:id", { preHandler: [app.authenticate] }, ctrl.getBlog);
  app.post("/admin/blogs", { preHandler: [app.authenticate] }, ctrl.createBlog);
  app.patch("/admin/blogs/:id", { preHandler: [app.authenticate] }, ctrl.updateBlog);
  app.delete("/admin/blogs/:id", { preHandler: [app.authenticate] }, ctrl.deleteBlog);

  // Admin — Blog Posts
  app.get("/admin/blog-posts", { preHandler: [app.authenticate] }, ctrl.listBlogPosts);
  app.get("/admin/blog-posts/:id", { preHandler: [app.authenticate] }, ctrl.getBlogPost);
  app.post("/admin/blog-posts", { preHandler: [app.authenticate] }, ctrl.createBlogPost);
  app.patch("/admin/blog-posts/:id", { preHandler: [app.authenticate] }, ctrl.updateBlogPost);
  app.delete("/admin/blog-posts/:id", { preHandler: [app.authenticate] }, ctrl.deleteBlogPost);

  // Admin — Tags
  app.get("/admin/blog-tags", { preHandler: [app.authenticate] }, ctrl.listTags);

  // Storefront — public pages (Shopify-style JSON)
  app.get("/storefront/pages/:handle", async (req: any, reply) => {
    const page = await service.getPublicPage(req.params.handle);
    return reply.send({ page });
  });

  // Storefront — pages JSON (alternative .json route)
  app.get("/storefront/pages/:handle.json", async (req: any, reply) => {
    const handle = req.params.handle.replace(/\.json$/, "");
    const page = await service.getPublicPage(handle);
    return reply.send({ page });
  });

  // Storefront — public blogs
  app.get("/storefront/blogs/:handle", async (req: any, reply) => {
    const blog = await service.getPublicBlog(req.params.handle);
    return reply.send({ blog });
  });

  app.get("/storefront/blogs/:handle/posts", async (req: any, reply) => {
    const posts = await service.getPublicBlogPosts(req.params.handle);
    return reply.send(posts);
  });

  app.get(
    "/storefront/blogs/:blogHandle/posts/:postHandle",
    async (req: any, reply) => {
      const post = await service.getPublicBlogPost(
        req.params.blogHandle,
        req.params.postHandle
      );
      return reply.send({ article: post });
    }
  );
}
