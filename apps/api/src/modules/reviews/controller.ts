import type { FastifyRequest, FastifyReply } from "fastify";
import * as service from "./service.js";
import {
  createReviewSchema,
  updateReviewSchema,
  moderateReviewSchema,
  reviewFiltersSchema,
  publicReviewFiltersSchema,
} from "./schema.js";

export async function listReviews(req: FastifyRequest, reply: FastifyReply) {
  const filters = reviewFiltersSchema.parse(req.query);
  const result = await service.listReviews(req.actor, filters);
  return reply.send(result);
}

export async function publicProductReviews(
  req: FastifyRequest<{ Params: { productId: string } }>,
  reply: FastifyReply
) {
  const { productId } = req.params;
  const filters = publicReviewFiltersSchema.parse(req.query);
  const result = await service.getPublicProductReviews(productId, filters);
  return reply.send(result);
}

export async function createReview(req: FastifyRequest, reply: FastifyReply) {
  const body = createReviewSchema.parse(req.body);
  const review = await service.createReview(req.actor, body);
  return reply.status(201).send(review);
}

export async function updateReview(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const body = updateReviewSchema.parse(req.body);
  const review = await service.updateReview(req.actor, req.params.id, body);
  return reply.send(review);
}

export async function deleteReview(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await service.deleteReview(req.actor, req.params.id);
  return reply.send(result);
}

export async function moderateReview(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { status } = moderateReviewSchema.parse(req.body);
  const review = await service.moderateReview(req.actor, req.params.id, status);
  return reply.send(review);
}

export async function adminDeleteReview(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await service.adminDeleteReview(req.actor, req.params.id);
  return reply.send(result);
}
