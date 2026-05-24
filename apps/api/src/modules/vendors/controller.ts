import type { FastifyRequest, FastifyReply } from "fastify";
import * as service from "./service.js";
import {
  createVendorSchema,
  updateVendorSchema,
  updateVendorPageSchema,
  setVendorStatusSchema,
  vendorFiltersSchema,
} from "./schema.js";

export async function listVendors(req: FastifyRequest, reply: FastifyReply) {
  const filters = vendorFiltersSchema.parse(req.query);
  const result = await service.listVendors(req.actor, filters);
  return reply.send(result);
}

export async function getVendor(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const vendor = await service.getVendorByIdWithStats(req.actor, req.params.id);
  return reply.send(vendor);
}

export async function createVendor(req: FastifyRequest, reply: FastifyReply) {
  const body = createVendorSchema.parse(req.body);
  const vendor = await service.createVendor(req.actor, body);
  return reply.status(201).send(vendor);
}

export async function updateVendor(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const body = updateVendorSchema.parse(req.body);
  const vendor = await service.updateVendor(req.actor, req.params.id, body as any);
  return reply.send(vendor);
}

// Bug fix: vendorId comes from the actor (JWT), not URL params — route is /vendor/me/page
export async function updateVendorPage(req: FastifyRequest, reply: FastifyReply) {
  const body = updateVendorPageSchema.parse(req.body);
  if (!req.actor.vendorId) {
    return reply.status(403).send({ message: "Vendor context required" });
  }
  const vendor = await service.updateVendorPage(req.actor, req.actor.vendorId, body as any);
  return reply.send(vendor);
}

export async function deleteVendor(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const vendor = await service.softDeleteVendor(req.actor, req.params.id);
  return reply.send(vendor);
}

// Bug fix: validate status body with Zod before passing to service
export async function setVendorStatus(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { status, reason } = setVendorStatusSchema.parse(req.body);
  const vendor = await service.setVendorStatus(req.actor, req.params.id, status, reason);
  return reply.send(vendor);
}
