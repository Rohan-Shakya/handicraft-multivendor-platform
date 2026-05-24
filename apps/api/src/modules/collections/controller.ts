import type { FastifyReply } from "fastify";
import * as service from "./service.js";
import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionProductSchema,
  collectionFiltersSchema,
} from "./schema.js";

export async function listCollections(
  req: any,
  reply: FastifyReply
) {
  const filters = collectionFiltersSchema.parse(req.query);
  const result = await service.listCollections(req.actor, filters);
  return reply.send(result);
}

export async function getCollection(
  req: any,
  reply: FastifyReply
) {
  const collection = await service.getCollectionById(req.actor, req.params.id);
  return reply.send(collection);
}

export async function createCollection(
  req: any,
  reply: FastifyReply
) {
  const body = createCollectionSchema.parse(req.body);
  const collection = await service.createCollection(req.actor, {
    ...body,
    vendorId: req.actor.vendorId!,
  });
  return reply.status(201).send(collection);
}

export async function updateCollection(
  req: any,
  reply: FastifyReply
) {
  const body = updateCollectionSchema.parse(req.body);
  const collection = await service.updateCollection(
    req.actor,
    req.params.id,
    body as any
  );
  return reply.send(collection);
}

export async function getCollectionProducts(
  req: any,
  reply: FastifyReply
) {
  const products = await service.getCollectionProducts(
    req.actor,
    req.params.id
  );
  return reply.send(products);
}

export async function addProduct(
  req: any,
  reply: FastifyReply
) {
  const { productId } = collectionProductSchema.parse(req.body);
  const result = await service.addProductToCollection(
    req.actor,
    req.params.id,
    productId
  );
  return reply.send(result);
}

export async function removeProduct(
  req: any,
  reply: FastifyReply
) {
  await service.removeProductFromCollection(
    req.actor,
    req.params.id,
    req.params.productId
  );
  return reply.status(204).send();
}
