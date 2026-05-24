import type { AuthActor } from "@repo/types";
import { assertPermission } from "../../lib/permissions.js";
import { hashPassword } from "../../lib/password.js";
import { ForbiddenError } from "../../lib/errors.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { sendEmail } from "../../lib/email.js";
import { accountDeactivatedEmail } from "../../lib/email-templates.js";
import * as repo from "./repository.js";
import type { CreateUserDto, UpdateUserDto, UserFilters } from "./types.js";

function omitHash<T extends { passwordHash: string | null }>(u: T) {
  const { passwordHash, ...rest } = u;
  return rest;
}

export async function listUsers(actor: AuthActor, filters: UserFilters) {
  assertPermission(actor, "user:read:any");
  const result = await repo.findUsers(filters);
  return { ...result, data: result.data.map(omitHash) };
}

export async function getUserById(actor: AuthActor, id: string) {
  assertPermission(actor, "user:read:any");
  const user = await repo.findUserById(id);
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  return omitHash(user);
}

export async function createUser(actor: AuthActor, data: CreateUserDto) {
  assertPermission(actor, "user:create");

  const existing = await repo.findUserByEmail(data.email);
  if (existing) {
    throw Object.assign(new Error("Email already in use"), { statusCode: 409 });
  }

  const passwordHash = await hashPassword(data.password);
  const user = await repo.createUser({
    email: data.email,
    passwordHash,
    role: data.role,
    firstName: data.firstName,
    lastName: data.lastName,
  });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "user",
    entityId: user.id,
    action: "user.created",
    afterJson: omitHash(user),
  });

  return omitHash(user);
}

export async function updateUser(
  actor: AuthActor,
  id: string,
  data: UpdateUserDto
) {
  assertPermission(actor, "user:update:any");

  const existing = await repo.findUserById(id);
  if (!existing) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  // Prevent self-demotion or self-deactivation (lockout protection)
  if (actor.id === id) {
    if (data.isActive === false) {
      throw new ForbiddenError("You cannot deactivate your own account");
    }
    if (data.role !== undefined && data.role !== actor.role) {
      throw new ForbiddenError("You cannot change your own role");
    }
  }

  const payload: Partial<{
    email: string;
    passwordHash: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
  }> = {};
  if (data.email !== undefined) payload.email = data.email;
  if (data.role !== undefined) payload.role = data.role;
  if (data.password !== undefined) payload.passwordHash = await hashPassword(data.password);
  if (data.firstName !== undefined) payload.firstName = data.firstName ?? null;
  if (data.lastName !== undefined) payload.lastName = data.lastName ?? null;
  if (data.isActive !== undefined) payload.isActive = data.isActive;

  const user = await repo.updateUser(id, payload);
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "user",
    entityId: id,
    action: "user.updated",
    beforeJson: omitHash(existing),
    afterJson: omitHash(user),
  });

  // Send account deactivation email when admin deactivates a user
  if (data.isActive === false && existing.isActive) {
    const emailData = accountDeactivatedEmail({
      name: existing.firstName ?? existing.email,
      accountType: "admin",
    });
    sendEmail({ to: existing.email, subject: emailData.subject, html: emailData.html, text: emailData.text }).catch(() => {});
  }

  return omitHash(user);
}

export async function deleteUser(actor: AuthActor, id: string) {
  assertPermission(actor, "user:delete:any");

  // Prevent self-deletion (lockout protection)
  if (actor.id === id) {
    throw new ForbiddenError("You cannot delete your own account");
  }

  const existing = await repo.findUserById(id);
  if (!existing) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  await repo.deleteUser(id);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "user",
    entityId: id,
    action: "user.deleted",
    beforeJson: omitHash(existing),
    metadata: { email: existing.email },
  });

  return { success: true };
}
