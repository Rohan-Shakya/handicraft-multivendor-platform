import type { FastifyInstance } from "fastify";
import * as service from "./service.js";
import {
  createProductSchema,
  adminCreateProductSchema,
  updateProductSchema,
  createOptionSchema,
  createVariantSchema,
  updateVariantSchema,
  productFiltersSchema,
} from "./schema.js";
import { z } from "zod";

const createImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().optional(),
  position: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
});

const updateImageSchema = z.object({
  url: z.string().url().optional(),
  altText: z.string().optional().nullable(),
  position: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
});

const createVariantImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().optional(),
  position: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
});

const updateVariantImageSchema = z.object({
  url: z.string().url().optional(),
  altText: z.string().optional().nullable(),
  position: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
});

export async function productRoutes(app: FastifyInstance) {
  // ── Admin ────────────────────────────────────────────────────────────────
  app.get("/admin/products", { preHandler: [app.authenticate] }, async (req, reply) => {
    const filters = productFiltersSchema.parse(req.query);
    return reply.send(await service.listProducts(req.actor, filters));
  });

  app.get("/admin/products/:id", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.getProductById(req.actor, req.params.id));
  });

  // Admin can create a product for any vendor
  app.post("/admin/products", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = adminCreateProductSchema.parse(req.body);
    return reply.status(201).send(await service.adminCreateProduct(req.actor, body));
  });

  // Admin can update any product
  app.patch("/admin/products/:id", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = updateProductSchema.parse(req.body);
    return reply.send(await service.updateProduct(req.actor, req.params.id, body as any));
  });

  app.get("/admin/products/:id/collections", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.getProductCollections(req.actor, req.params.id));
  });

  // Admin sub-resource routes (mirror vendor routes for admin access)
  app.get("/admin/products/:id/options", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listOptions(req.actor, req.params.id));
  });
  app.post("/admin/products/:id/options", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = createOptionSchema.parse(req.body);
    return reply.status(201).send(await service.createOption(req.actor, req.params.id, body));
  });
  app.get("/admin/products/:id/variants", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listVariants(req.actor, req.params.id));
  });
  app.post("/admin/products/:id/variants", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = createVariantSchema.parse(req.body);
    return reply.status(201).send(await service.createVariant(req.actor, req.params.id, body));
  });
  app.get("/admin/variants/:variantId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.getVariantById(req.actor, req.params.variantId));
  });
  app.patch("/admin/variants/:variantId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = updateVariantSchema.parse(req.body);
    return reply.send(await service.updateVariant(req.actor, req.params.variantId, body as any));
  });
  app.delete("/admin/variants/:variantId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.archiveVariant(req.actor, req.params.variantId));
  });
  app.get("/admin/products/:id/images", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listImages(req.actor, req.params.id));
  });
  app.post("/admin/products/:id/images", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = createImageSchema.parse(req.body);
    return reply.status(201).send(await service.addImage(req.actor, req.params.id, body));
  });
  app.patch("/admin/products/:id/images/:imageId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = updateImageSchema.parse(req.body);
    return reply.send(await service.updateImage(req.actor, req.params.id, req.params.imageId, body as any));
  });
  app.delete("/admin/products/:id/images/:imageId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.deleteImage(req.actor, req.params.id, req.params.imageId));
  });
  app.get("/admin/products/:id/tags", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listTags(req.actor, req.params.id));
  });
  app.post("/admin/products/:id/tags", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = z.object({ tags: z.array(z.string().min(1)).min(1) }).parse(req.body);
    return reply.status(201).send(await service.addTags(req.actor, req.params.id, body.tags));
  });
  app.delete("/admin/products/:id/tags/:tag", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.removeTag(req.actor, req.params.id, req.params.tag));
  });

  // Admin variant images
  app.get("/admin/variants/:variantId/images", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listVariantImages(req.actor, req.params.variantId));
  });
  app.post("/admin/variants/:variantId/images", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = createVariantImageSchema.parse(req.body);
    return reply.status(201).send(await service.addVariantImage(req.actor, req.params.variantId, body));
  });
  app.patch("/admin/variants/:variantId/images/:imageId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = updateVariantImageSchema.parse(req.body);
    return reply.send(await service.updateVariantImage(req.actor, req.params.variantId, req.params.imageId, body as any));
  });
  app.delete("/admin/variants/:variantId/images/:imageId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.deleteVariantImage(req.actor, req.params.variantId, req.params.imageId));
  });

  // ── Vendor ───────────────────────────────────────────────────────────────
  app.get("/vendor/products", { preHandler: [app.authenticate] }, async (req, reply) => {
    const filters = productFiltersSchema.parse(req.query);
    return reply.send(await service.listProducts(req.actor, filters));
  });

  app.get("/vendor/products/:id", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.getProductById(req.actor, req.params.id));
  });

  app.post("/vendor/products", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = createProductSchema.parse(req.body);
    return reply.status(201).send(await service.createProduct(req.actor, body));
  });

  app.patch("/vendor/products/:id", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = updateProductSchema.parse(req.body);
    return reply.send(await service.updateProduct(req.actor, req.params.id, body as any));
  });

  // Archive (soft-delete) — preserves order history
  app.delete("/vendor/products/:id", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.archiveProduct(req.actor, req.params.id));
  });

  // Admin can also archive
  app.delete("/admin/products/:id", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.archiveProduct(req.actor, req.params.id));
  });

  // Options
  app.get("/vendor/products/:id/options", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listOptions(req.actor, req.params.id));
  });

  app.post("/vendor/products/:id/options", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = createOptionSchema.parse(req.body);
    return reply.status(201).send(await service.createOption(req.actor, req.params.id, body));
  });

  // Variants
  app.get("/vendor/products/:id/variants", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listVariants(req.actor, req.params.id));
  });

  app.post("/vendor/products/:id/variants", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = createVariantSchema.parse(req.body);
    return reply.status(201).send(await service.createVariant(req.actor, req.params.id, body));
  });

  app.get("/vendor/variants/:variantId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.getVariantById(req.actor, req.params.variantId));
  });

  app.patch("/vendor/variants/:variantId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = updateVariantSchema.parse(req.body);
    return reply.send(await service.updateVariant(req.actor, req.params.variantId, body as any));
  });

  // Archive variant (soft-delete)
  app.delete("/vendor/variants/:variantId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.archiveVariant(req.actor, req.params.variantId));
  });

  // Images
  app.get("/vendor/products/:id/images", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listImages(req.actor, req.params.id));
  });

  app.post("/vendor/products/:id/images", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = createImageSchema.parse(req.body);
    return reply.status(201).send(await service.addImage(req.actor, req.params.id, body));
  });

  app.patch("/vendor/products/:id/images/:imageId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = updateImageSchema.parse(req.body);
    return reply.send(await service.updateImage(req.actor, req.params.id, req.params.imageId, body as any));
  });

  app.delete("/vendor/products/:id/images/:imageId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.deleteImage(req.actor, req.params.id, req.params.imageId));
  });

  // Tags
  app.get("/vendor/products/:id/tags", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listTags(req.actor, req.params.id));
  });

  app.post("/vendor/products/:id/tags", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = z.object({ tags: z.array(z.string().min(1)).min(1) }).parse(req.body);
    return reply.status(201).send(await service.addTags(req.actor, req.params.id, body.tags));
  });

  app.delete("/vendor/products/:id/tags/:tag", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.removeTag(req.actor, req.params.id, req.params.tag));
  });

  // Vendor variant images
  app.get("/vendor/variants/:variantId/images", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.listVariantImages(req.actor, req.params.variantId));
  });
  app.post("/vendor/variants/:variantId/images", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = createVariantImageSchema.parse(req.body);
    return reply.status(201).send(await service.addVariantImage(req.actor, req.params.variantId, body));
  });
  app.delete("/vendor/variants/:variantId/images/:imageId", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    return reply.send(await service.deleteVariantImage(req.actor, req.params.variantId, req.params.imageId));
  });

  // ── Storefront ───────────────────────────────────────────────────────────
  app.get("/storefront/products", async (req, reply) => {
    const filters = productFiltersSchema.parse(req.query);
    return reply.send(await service.listPublicProducts(filters));
  });

  // Exposes the catalog-wide variant price range so the storefront filter
  // slider can bound itself to the actual data instead of a hardcoded cap.
  app.get("/storefront/products/price-range", async (_req, reply) => {
    return reply.send(await service.getPublicPriceRange());
  });

  app.get("/storefront/products/:handle", async (req: any, reply) => {
    return reply.send(await service.getProductByHandle(req.params.handle));
  });

  // ── Bulk operations (admin) ─────────────────────────────────────────────

  const bulkUpdateSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(100),
    update: z.object({
      status: z.enum(["draft", "active", "archived"]).optional(),
    }),
  });

  const bulkDeleteSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(100),
  });

  app.post("/admin/products/bulk-update", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = bulkUpdateSchema.parse(req.body);
    return reply.send(await service.bulkUpdateProducts(req.actor, body.ids, body.update));
  });

  app.post("/admin/products/bulk-delete", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = bulkDeleteSchema.parse(req.body);
    return reply.send(await service.bulkArchiveProducts(req.actor, body.ids));
  });

  app.post("/admin/products/export", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const csv = await service.exportProductsCsv(req.actor);
    return reply.header("Content-Type", "text/csv").header("Content-Disposition", "attachment; filename=products.csv").send(csv);
  });

  // ── Vendor CSV import / export ─────────────────────────────────────────
  // Vendors get the same export as admin but scoped to their own products.
  app.get("/vendor/products/export", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const csv = await service.exportProductsCsv(req.actor);
    return reply
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", "attachment; filename=products.csv")
      .send(csv);
  });

  // Sample template — header row + one example. Public for convenience so
  // vendors can fetch it on the login screen if needed; still cheap.
  app.get("/vendor/products/import-template", async (_req, reply) => {
    const csv = service.importProductsCsvTemplate();
    return reply
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", "attachment; filename=products-template.csv")
      .send(csv);
  });

  const importBodySchema = z.object({
    csv: z.string().min(1).max(2_000_000), // 2 MB cap — vendor uploads, not Shopify-scale.
  });

  app.post("/vendor/products/import", { preHandler: [app.authenticate] }, async (req: any, reply) => {
    const body = importBodySchema.parse(req.body);
    const result = await service.importProductsCsv(req.actor, body.csv);
    return reply.status(200).send(result);
  });
}
