import type { FastifyInstance } from "fastify";
import * as ctrl from "./controller.js";
import * as service from "./service.js";
import { publicVendorFiltersSchema } from "./schema.js";

export async function vendorRoutes(app: FastifyInstance) {
  // Admin — manage vendors
  app.get("/admin/vendors", { preHandler: [app.authenticate] }, ctrl.listVendors);
  app.get("/admin/vendors/:id", { preHandler: [app.authenticate] }, ctrl.getVendor as any);
  app.post("/admin/vendors", { preHandler: [app.authenticate] }, ctrl.createVendor);
  app.patch("/admin/vendors/:id", { preHandler: [app.authenticate] }, ctrl.updateVendor as any);
  app.patch("/admin/vendors/:id/status", { preHandler: [app.authenticate] }, ctrl.setVendorStatus as any);
  app.delete("/admin/vendors/:id", { preHandler: [app.authenticate] }, ctrl.deleteVendor as any);

  // Vendor — get own profile
  app.get("/vendor/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.actor?.vendorId) {
      return reply.status(403).send({ message: "Vendor context required" });
    }
    const vendor = await service.getVendorByIdPublic(req.actor.vendorId);
    return reply.send(vendor);
  });

  // Vendor — update own landing page
  app.patch("/vendor/me/page", { preHandler: [app.authenticate] }, ctrl.updateVendorPage);

  // Storefront — public vendor directory (search + paginate, active only)
  app.get("/storefront/vendors", async (req, reply) => {
    const parsed = publicVendorFiltersSchema.parse(req.query);
    const search = parsed.q ?? parsed.search;
    return reply.send(
      await service.listPublicVendors({
        page: parsed.page,
        limit: parsed.limit,
        search,
      })
    );
  });

  // Storefront — public vendor landing page
  app.get("/storefront/vendors/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const vendor = await service.getVendorBySlug(slug);
    return reply.send(vendor);
  });
}
