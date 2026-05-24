import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";
import type { CreateMetafieldDto } from "./service.js";

const createMetafieldSchema = z.object({
  key: z.string().min(1),
  value: z.any().refine((v) => v !== undefined, { message: "value is required" }),
  type: z.enum(["string", "integer", "float", "boolean", "json", "date"]),
  namespace: z.string().min(1).optional(),
});

const updateMetafieldSchema = z.object({
  key: z.string().min(1).optional(),
  value: z.unknown().optional(),
  type: z.enum(["string", "integer", "float", "boolean", "json", "date"]).optional(),
  namespace: z.string().min(1).optional(),
});

export async function metafieldRoutes(app: FastifyInstance) {
  // ── Product Metafields ──────────────────────────────────────────────────────
  app.get(
    "/admin/products/:productId/metafields",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.listProductMetafields(req.actor, req.params.productId)
      );
    }
  );

  app.post(
    "/admin/products/:productId/metafields",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = createMetafieldSchema.parse(req.body) as CreateMetafieldDto;
      return reply
        .status(201)
        .send(
          await service.createProductMetafield(req.actor, req.params.productId, body)
        );
    }
  );

  app.patch(
    "/admin/metafields/products/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateMetafieldSchema.parse(req.body);
      return reply.send(
        await service.updateProductMetafield(req.actor, req.params.id, body)
      );
    }
  );

  app.delete(
    "/admin/metafields/products/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.deleteProductMetafield(req.actor, req.params.id)
      );
    }
  );

  // ── Variant Metafields ──────────────────────────────────────────────────────
  app.get(
    "/admin/variants/:variantId/metafields",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.listVariantMetafields(req.actor, req.params.variantId)
      );
    }
  );

  app.post(
    "/admin/variants/:variantId/metafields",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = createMetafieldSchema.parse(req.body) as CreateMetafieldDto;
      return reply
        .status(201)
        .send(
          await service.createVariantMetafield(req.actor, req.params.variantId, body)
        );
    }
  );

  app.patch(
    "/admin/metafields/variants/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateMetafieldSchema.parse(req.body);
      return reply.send(
        await service.updateVariantMetafield(req.actor, req.params.id, body)
      );
    }
  );

  app.delete(
    "/admin/metafields/variants/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.deleteVariantMetafield(req.actor, req.params.id)
      );
    }
  );

  // ── Collection Metafields ───────────────────────────────────────────────────
  app.get(
    "/admin/collections/:collectionId/metafields",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.listCollectionMetafields(req.actor, req.params.collectionId)
      );
    }
  );

  app.post(
    "/admin/collections/:collectionId/metafields",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = createMetafieldSchema.parse(req.body) as CreateMetafieldDto;
      return reply
        .status(201)
        .send(
          await service.createCollectionMetafield(
            req.actor,
            req.params.collectionId,
            body
          )
        );
    }
  );

  app.patch(
    "/admin/metafields/collections/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateMetafieldSchema.parse(req.body);
      return reply.send(
        await service.updateCollectionMetafield(req.actor, req.params.id, body)
      );
    }
  );

  app.delete(
    "/admin/metafields/collections/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.deleteCollectionMetafield(req.actor, req.params.id)
      );
    }
  );

  // ── Customer Metafields ─────────────────────────────────────────────────────
  app.get(
    "/admin/customers/:customerId/metafields",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.listCustomerMetafields(req.actor, req.params.customerId)
      );
    }
  );

  app.post(
    "/admin/customers/:customerId/metafields",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = createMetafieldSchema.parse(req.body) as CreateMetafieldDto;
      return reply
        .status(201)
        .send(
          await service.createCustomerMetafield(
            req.actor,
            req.params.customerId,
            body
          )
        );
    }
  );

  app.patch(
    "/admin/metafields/customers/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateMetafieldSchema.parse(req.body);
      return reply.send(
        await service.updateCustomerMetafield(req.actor, req.params.id, body)
      );
    }
  );

  app.delete(
    "/admin/metafields/customers/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(
        await service.deleteCustomerMetafield(req.actor, req.params.id)
      );
    }
  );
}
