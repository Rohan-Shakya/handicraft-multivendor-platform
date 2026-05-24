import type { FastifyInstance } from "fastify";
import * as service from "./service.js";
import {
  createFacetFilterSchema,
  updateFacetFilterSchema,
  reorderSchema,
} from "./schema.js";

export async function facetFilterRoutes(app: FastifyInstance) {
  // ── Admin CRUD ────────────────────────────────────────────────────────────
  app.get(
    "/admin/facet-filters",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      return reply.send(await service.adminListFacetFilters(req.actor));
    }
  );

  app.post(
    "/admin/facet-filters",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = createFacetFilterSchema.parse(req.body);
      const row = await service.adminCreateFacetFilter(req.actor, body);
      return reply.status(201).send(row);
    }
  );

  app.patch(
    "/admin/facet-filters/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = updateFacetFilterSchema.parse(req.body);
      const row = await service.adminUpdateFacetFilter(
        req.actor,
        req.params.id,
        body
      );
      return reply.send(row);
    }
  );

  app.delete(
    "/admin/facet-filters/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      return reply.send(
        await service.adminDeleteFacetFilter(req.actor, req.params.id)
      );
    }
  );

  app.post(
    "/admin/facet-filters/reorder",
    { preHandler: [app.authenticate] },
    async (req: any, reply) => {
      const body = reorderSchema.parse(req.body);
      return reply.send(
        await service.adminReorderFacetFilters(req.actor, body.ids)
      );
    }
  );

  // ── Storefront (public) ───────────────────────────────────────────────────
  app.get("/storefront/facets", async (_req, reply) => {
    return reply.send(await service.buildStorefrontFacets());
  });
}
