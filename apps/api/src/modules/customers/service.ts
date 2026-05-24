import type { AuthActor } from "@repo/types";
import { assertPermission, assertCustomerOwnership } from "../../lib/permissions.js";
import { hashPassword } from "../../lib/password.js";
import { ConflictError } from "../../lib/errors.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { sendEmail } from "../../lib/email.js";
import { accountDeactivatedEmail } from "../../lib/email-templates.js";
import * as repo from "./repository.js";
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  AdminUpdateCustomerDto,
  CreateAddressDto,
  UpdateAddressDto,
  AdminCreateAddressDto,
  AdminUpdateAddressDto,
  CustomerFilters,
} from "./types.js";

function omitHash<T extends { passwordHash: string | null }>(u: T) {
  const { passwordHash, ...rest } = u;
  return rest;
}

function assertIsCustomer(actor: AuthActor) {
  if (actor.type !== "customer") {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
}

export async function getMyProfile(actor: AuthActor) {
  assertIsCustomer(actor);
  const customer = await repo.findCustomerById(actor.id);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  return omitHash(customer);
}

export async function updateMyProfile(actor: AuthActor, data: UpdateCustomerDto) {
  assertIsCustomer(actor);
  const before = await repo.findCustomerById(actor.id);
  const customer = await repo.updateCustomer(actor.id, data);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "customer",
    entityId: actor.id,
    action: "customer.updated",
    beforeJson: before ? omitHash(before) : undefined,
    afterJson: omitHash(customer),
  });

  return omitHash(customer);
}

export async function getMyAddresses(actor: AuthActor) {
  assertIsCustomer(actor);
  return repo.findAddressesByCustomer(actor.id);
}

export async function createAddress(actor: AuthActor, data: CreateAddressDto) {
  assertIsCustomer(actor);
  return repo.createAddress(actor.id, data);
}

export async function updateAddress(
  actor: AuthActor,
  addressId: string,
  data: UpdateAddressDto
) {
  assertIsCustomer(actor);
  const address = await repo.findAddressById(addressId);
  if (!address) throw Object.assign(new Error("Address not found"), { statusCode: 404 });
  assertCustomerOwnership(actor, address.customerId);
  const updated = await repo.updateAddress(addressId, data);
  if (!updated) throw Object.assign(new Error("Address not found"), { statusCode: 404 });
  return updated;
}

export async function deleteAddress(actor: AuthActor, addressId: string) {
  assertIsCustomer(actor);
  const address = await repo.findAddressById(addressId);
  if (!address) throw Object.assign(new Error("Address not found"), { statusCode: 404 });
  assertCustomerOwnership(actor, address.customerId);
  await repo.deleteAddress(addressId);
  return { success: true };
}

export async function createCustomer(actor: AuthActor, data: CreateCustomerDto) {
  assertPermission(actor, "customer:update:any");

  const existing = await repo.findCustomerByEmail(data.email);
  if (existing) {
    throw new ConflictError("A customer with this email already exists");
  }

  const passwordHash = await hashPassword(data.password);
  const customer = await repo.createCustomer({
    email: data.email,
    passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
  });
  return omitHash(customer);
}

export async function listCustomers(actor: AuthActor, filters: CustomerFilters) {
  assertPermission(actor, "customer:read:any");
  const { data, total, page, limit } = await repo.findCustomers(filters);
  const safeData = data.map(({ passwordHash, ...rest }) => rest);
  return { data: safeData, total, page, limit };
}

export async function getCustomerById(actor: AuthActor, id: string) {
  assertPermission(actor, "customer:read:any");
  const customer = await repo.findCustomerByIdWithRelations(id);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  return customer;
}

// --- Admin customer management ---

export async function adminUpdateCustomer(
  actor: AuthActor,
  id: string,
  data: AdminUpdateCustomerDto
) {
  assertPermission(actor, "customer:update:any");
  const before = await repo.findCustomerById(id);
  const customer = await repo.adminUpdateCustomer(id, data);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "customer",
    entityId: id,
    action: "customer.updated",
    beforeJson: before ? omitHash(before) : undefined,
    afterJson: omitHash(customer),
  });

  return omitHash(customer);
}

export async function softDeleteCustomer(actor: AuthActor, id: string) {
  assertPermission(actor, "customer:update:any");
  const before = await repo.findCustomerById(id);
  const customer = await repo.softDeleteCustomer(id);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "customer",
    entityId: id,
    action: "customer.deleted",
    beforeJson: before ? omitHash(before) : undefined,
  });

  // Send account deactivation email
  if (before?.email) {
    const emailData = accountDeactivatedEmail({
      name: before.firstName ?? "Customer",
      accountType: "customer",
    });
    sendEmail({ to: before.email, subject: emailData.subject, html: emailData.html, text: emailData.text }).catch(() => {});
  }

  return { success: true };
}

// --- Admin address management ---

export async function adminListAddresses(actor: AuthActor, customerId: string) {
  assertPermission(actor, "customer:update:any");
  const customer = await repo.findCustomerById(customerId);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  return repo.findAddressesByCustomerAdmin(customerId);
}

export async function adminCreateAddress(
  actor: AuthActor,
  customerId: string,
  data: AdminCreateAddressDto
) {
  assertPermission(actor, "customer:update:any");
  const customer = await repo.findCustomerById(customerId);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  return repo.adminCreateAddress(customerId, data);
}

export async function adminUpdateAddress(
  actor: AuthActor,
  customerId: string,
  addressId: string,
  data: AdminUpdateAddressDto
) {
  assertPermission(actor, "customer:update:any");
  const address = await repo.findAddressById(addressId);
  if (!address || address.customerId !== customerId) {
    throw Object.assign(new Error("Address not found"), { statusCode: 404 });
  }
  const updated = await repo.adminUpdateAddress(addressId, data);
  if (!updated) throw Object.assign(new Error("Address not found"), { statusCode: 404 });
  return updated;
}

// --- Customer tags ---

export async function listCustomerTags(actor: AuthActor, customerId: string) {
  assertPermission(actor, "customer:read:any");
  const customer = await repo.findCustomerById(customerId);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  const tags = await repo.findTagsByCustomer(customerId);
  return tags.map((t) => t.tag);
}

export async function addCustomerTags(actor: AuthActor, customerId: string, tags: string[]) {
  assertPermission(actor, "customer:update:any");
  const customer = await repo.findCustomerById(customerId);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  const added = await repo.addCustomerTags(customerId, tags);
  return added.map((t) => t.tag);
}

export async function removeCustomerTag(actor: AuthActor, customerId: string, tag: string) {
  assertPermission(actor, "customer:update:any");
  const customer = await repo.findCustomerById(customerId);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  const removed = await repo.removeCustomerTag(customerId, tag);
  if (removed.length === 0) throw Object.assign(new Error("Tag not found"), { statusCode: 404 });
  return { success: true };
}

export async function adminDeleteAddress(
  actor: AuthActor,
  customerId: string,
  addressId: string
) {
  assertPermission(actor, "customer:update:any");
  const address = await repo.findAddressById(addressId);
  if (!address || address.customerId !== customerId) {
    throw Object.assign(new Error("Address not found"), { statusCode: 404 });
  }
  await repo.softDeleteAddress(addressId);
  return { success: true };
}
