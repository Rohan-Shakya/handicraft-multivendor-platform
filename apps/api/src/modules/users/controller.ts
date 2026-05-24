import type { FastifyRequest, FastifyReply } from "fastify";
import * as service from "./service.js";
import {
  createUserSchema,
  updateUserSchema,
  userFiltersSchema,
} from "./schema.js";

export async function listUsers(req: FastifyRequest, reply: FastifyReply) {
  const filters = userFiltersSchema.parse(req.query);
  const result = await service.listUsers(req.actor, filters);
  return reply.send(result);
}

export async function getUser(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = await service.getUserById(req.actor, req.params.id);
  return reply.send(user);
}

export async function createUser(req: FastifyRequest, reply: FastifyReply) {
  const body = createUserSchema.parse(req.body);
  const user = await service.createUser(req.actor, body);
  return reply.status(201).send(user);
}

export async function updateUser(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const body = updateUserSchema.parse(req.body);
  const user = await service.updateUser(req.actor, req.params.id, body);
  return reply.send(user);
}

export async function deleteUser(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  await service.deleteUser(req.actor, req.params.id);
  return reply.status(204).send();
}
