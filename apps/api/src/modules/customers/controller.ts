import type { FastifyRequest, FastifyReply } from "fastify";
import * as service from "./service.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  createAddressSchema,
  updateAddressSchema,
  customerFiltersSchema,
  adminUpdateCustomerSchema,
  adminCreateAddressSchema,
  adminUpdateAddressSchema,
  addCustomerTagsSchema,
} from "./schema.js";

export async function getMyProfile(req: FastifyRequest, reply: FastifyReply) {
  const customer = await service.getMyProfile(req.actor);
  return reply.send(customer);
}

export async function updateMyProfile(req: FastifyRequest, reply: FastifyReply) {
  const body = updateCustomerSchema.parse(req.body);
  const customer = await service.updateMyProfile(req.actor, body);
  return reply.send(customer);
}

export async function getMyAddresses(req: FastifyRequest, reply: FastifyReply) {
  const addresses = await service.getMyAddresses(req.actor);
  return reply.send(addresses);
}

export async function createAddress(req: FastifyRequest, reply: FastifyReply) {
  const body = createAddressSchema.parse(req.body);
  const address = await service.createAddress(req.actor, body);
  return reply.status(201).send(address);
}

export async function updateAddress(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const body = updateAddressSchema.parse(req.body);
  const address = await service.updateAddress(req.actor, req.params.id, body);
  return reply.send(address);
}

export async function deleteAddress(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  await service.deleteAddress(req.actor, req.params.id);
  return reply.status(204).send();
}

export async function createCustomer(req: FastifyRequest, reply: FastifyReply) {
  const body = createCustomerSchema.parse(req.body);
  const customer = await service.createCustomer(req.actor, body);
  return reply.status(201).send(customer);
}

export async function listCustomers(req: FastifyRequest, reply: FastifyReply) {
  const filters = customerFiltersSchema.parse(req.query);
  const result = await service.listCustomers(req.actor, filters);
  return reply.send(result);
}

export async function getCustomer(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const customer = await service.getCustomerById(req.actor, req.params.id);
  return reply.send(customer);
}

// --- Admin customer management ---

export async function adminUpdateCustomer(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const body = adminUpdateCustomerSchema.parse(req.body);
  const customer = await service.adminUpdateCustomer(req.actor, req.params.id, body);
  return reply.send(customer);
}

export async function deleteCustomer(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  await service.softDeleteCustomer(req.actor, req.params.id);
  return reply.status(204).send();
}

// --- Admin address management ---

export async function adminListAddresses(
  req: FastifyRequest<{ Params: { customerId: string } }>,
  reply: FastifyReply
) {
  const addresses = await service.adminListAddresses(req.actor, req.params.customerId);
  return reply.send(addresses);
}

export async function adminCreateAddress(
  req: FastifyRequest<{ Params: { customerId: string } }>,
  reply: FastifyReply
) {
  const body = adminCreateAddressSchema.parse(req.body);
  const address = await service.adminCreateAddress(req.actor, req.params.customerId, body);
  return reply.status(201).send(address);
}

export async function adminUpdateAddress(
  req: FastifyRequest<{ Params: { customerId: string; addressId: string } }>,
  reply: FastifyReply
) {
  const body = adminUpdateAddressSchema.parse(req.body);
  const address = await service.adminUpdateAddress(
    req.actor,
    req.params.customerId,
    req.params.addressId,
    body
  );
  return reply.send(address);
}

export async function adminDeleteAddress(
  req: FastifyRequest<{ Params: { customerId: string; addressId: string } }>,
  reply: FastifyReply
) {
  await service.adminDeleteAddress(req.actor, req.params.customerId, req.params.addressId);
  return reply.status(204).send();
}

// --- Customer tags ---

export async function listCustomerTags(
  req: FastifyRequest<{ Params: { customerId: string } }>,
  reply: FastifyReply
) {
  const tags = await service.listCustomerTags(req.actor, req.params.customerId);
  return reply.send(tags);
}

export async function addCustomerTags(
  req: FastifyRequest<{ Params: { customerId: string } }>,
  reply: FastifyReply
) {
  const body = addCustomerTagsSchema.parse(req.body);
  const tags = await service.addCustomerTags(req.actor, req.params.customerId, body.tags);
  return reply.status(201).send(tags);
}

export async function removeCustomerTag(
  req: FastifyRequest<{ Params: { customerId: string; tag: string } }>,
  reply: FastifyReply
) {
  await service.removeCustomerTag(req.actor, req.params.customerId, req.params.tag);
  return reply.status(204).send();
}
