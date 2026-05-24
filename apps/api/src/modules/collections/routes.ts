import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as ctrl from "./controller.js";
import * as service from "./service.js";

export async function collectionRoutes(app: FastifyInstance) {
  // Admin — manage collections
  app.get(
    "/admin/collections",
    { preHandler: [app.authenticate] },
    ctrl.listCollections
  );
  app.get(
    "/admin/collections/:id",
    { preHandler: [app.authenticate] },
    ctrl.getCollection
  );
  app.post(
    "/admin/collections",
    { preHandler: [app.authenticate] },
    ctrl.createCollection
  );
  app.patch(
    "/admin/collections/:id",
    { preHandler: [app.authenticate] },
    ctrl.updateCollection
  );
  app.delete(
    "/admin/collections/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      return reply.send(await service.archiveCollection(req.actor, req.params.id));
    }
  );
  app.get(
    "/admin/collections/:id/products",
    { preHandler: [app.authenticate] },
    ctrl.getCollectionProducts
  );
  app.post(
    "/admin/collections/:id/products",
    { preHandler: [app.authenticate] },
    ctrl.addProduct
  );
  app.delete(
    "/admin/collections/:id/products/:productId",
    { preHandler: [app.authenticate] },
    ctrl.removeProduct
  );

  // Storefront — public collection access
  app.get("/storefront/collections", async (_req, reply) => {
    const result = await service.getPublicCollections();
    return reply.send(result);
  });

  app.get(
    "/storefront/collections/:handle",
    async (req: any, reply) => {
      const collection = await service.getPublicCollectionByHandle(
        req.params.handle
      );
      return reply.send(collection);
    }
  );

  app.get(
    "/storefront/collections/:handle/products",
    async (req: any, reply) => {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const result = await service.getPublicCollectionProducts(
        req.params.handle,
        page,
        limit
      );
      return reply.send(result);
    }
  );

  // ── Vendor CSV import / export ─────────────────────────────────────────
  app.get(
    "/vendor/collections/export",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const csv = await service.exportCollectionsCsv(req.actor);
      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", "attachment; filename=collections.csv")
        .send(csv);
    }
  );

  app.get("/vendor/collections/import-template", async (_req, reply) => {
    const csv = service.importCollectionsCsvTemplate();
    return reply
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", "attachment; filename=collections-template.csv")
      .send(csv);
  });

  const importBodySchema = z.object({
    csv: z.string().min(1).max(2_000_000),
  });

  app.post(
    "/vendor/collections/import",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = importBodySchema.parse(req.body);
      const result = await service.importCollectionsCsv(req.actor, body.csv);
      return reply.status(200).send(result);
    }
  );
}
