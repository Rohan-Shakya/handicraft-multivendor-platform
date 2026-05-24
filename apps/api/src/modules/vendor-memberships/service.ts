import { eq, and, sql } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { vendorMemberships, users, vendors } from "../../db/schema/index.js";
import { assertVendorOwnership, hasPermission } from "../../lib/permissions.js";
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { sendEmail } from "../../lib/email.js";
import { vendorMembershipInviteEmail } from "../../lib/email-templates.js";

// ─── Types ───────────────────────────────────────────────────────────────────

type MemberRole = "owner" | "admin" | "catalog_manager" | "content_manager" | "support_agent";
type MembershipStatus = "invited" | "active" | "suspended" | "revoked";

/**
 * Vendor team management is gated by either:
 *   - `vendor-membership:manage:own` — vendor owners managing their own team
 *   - `vendor-membership:manage:any` — platform admins managing any vendor
 *
 * Use this helper at every entry point so the two permissions stay in sync.
 */
function assertCanManageMembership(actor: AuthActor): void {
  if (
    !hasPermission(actor, "vendor-membership:manage:own") &&
    !hasPermission(actor, "vendor-membership:manage:any")
  ) {
    throw new ForbiddenError("Insufficient permissions");
  }
}

// ─── Invite member ───────────────────────────────────────────────────────────

export async function inviteMember(
  actor: AuthActor,
  data: {
    vendorId: string;
    email: string;
    role: MemberRole;
  }
) {
  assertCanManageMembership(actor);
  assertVendorOwnership(actor, data.vendorId);

  // Only existing owners (or platform admins) may invite new owners.
  const isPlatformAdmin = actor.type === "admin";
  const actorIsOwner =
    actor.type === "vendor" &&
    actor.vendorId === data.vendorId &&
    actor.role === "owner";
  if (data.role === "owner" && !isPlatformAdmin && !actorIsOwner) {
    throw new UnprocessableError(
      "Only an existing owner can invite a new owner"
    );
  }

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email));

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        id: generateId(),
        email: data.email,
        isActive: true,
      })
      .returning();
  }

  const [existing] = await db
    .select()
    .from(vendorMemberships)
    .where(
      and(
        eq(vendorMemberships.userId, user!.id),
        eq(vendorMemberships.vendorId, data.vendorId)
      )
    );

  if (existing) {
    throw new ConflictError("User already has a membership for this vendor");
  }

  const [membership] = await db
    .insert(vendorMemberships)
    .values({
      id: generateId(),
      userId: user!.id,
      vendorId: data.vendorId,
      role: data.role,
      status: "invited",
      invitedBy: actor.id,
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "vendor_membership",
    entityId: membership!.id,
    action: "vendor_membership.invited",
    afterJson: membership,
  });

  // Best-effort invite email — never blocks the API response.
  const [vendor] = await db
    .select({ name: vendors.name })
    .from(vendors)
    .where(eq(vendors.id, data.vendorId));
  if (vendor) {
    const t = vendorMembershipInviteEmail({
      inviteeEmail: data.email,
      vendorName: vendor.name,
      role: data.role,
    });
    sendEmail({ to: data.email, subject: t.subject, html: t.html, text: t.text }).catch(() => {});
  }

  return membership!;
}

// ─── List members ────────────────────────────────────────────────────────────

export async function listMembers(actor: AuthActor, vendorId: string) {
  assertCanManageMembership(actor);
  assertVendorOwnership(actor, vendorId);

  return db
    .select()
    .from(vendorMemberships)
    .where(eq(vendorMemberships.vendorId, vendorId));
}

// ─── Get membership ──────────────────────────────────────────────────────────

export async function getMembership(actor: AuthActor, membershipId: string) {
  assertCanManageMembership(actor);

  const [membership] = await db
    .select()
    .from(vendorMemberships)
    .where(eq(vendorMemberships.id, membershipId));

  if (!membership) throw new NotFoundError("Membership not found");
  assertVendorOwnership(actor, membership.vendorId);

  return membership;
}

// ─── Update role/status ──────────────────────────────────────────────────────

export async function updateMembership(
  actor: AuthActor,
  membershipId: string,
  data: { role?: MemberRole; status?: MembershipStatus }
) {
  assertCanManageMembership(actor);

  const [membership] = await db
    .select()
    .from(vendorMemberships)
    .where(eq(vendorMemberships.id, membershipId));

  if (!membership) throw new NotFoundError("Membership not found");
  assertVendorOwnership(actor, membership.vendorId);

  if (membership.status === "revoked") {
    throw new UnprocessableError("Cannot update a revoked membership");
  }

  // ── Owner-role privilege guard ─────────────────────────────────────────────
  // Only existing owners (or platform admins) may grant or revoke the "owner"
  // role. Without this check, any vendor `admin` with `vendor-membership:manage:own`
  // could promote themselves and lock the original owner out.
  const isPlatformAdmin = actor.type === "admin";
  const actorIsOwner =
    actor.type === "vendor" &&
    actor.vendorId === membership.vendorId &&
    actor.role === "owner";

  if (data.role === "owner" && !isPlatformAdmin && !actorIsOwner) {
    throw new UnprocessableError(
      "Only an existing owner can grant the owner role"
    );
  }

  // Prevent demoting/suspending the last active owner — same invariant as
  // revoke, applied here in case role/status updates would break it.
  const wouldRemoveOwner =
    membership.role === "owner" &&
    membership.status === "active" &&
    ((data.role !== undefined && data.role !== "owner") ||
      (data.status !== undefined && data.status !== "active"));

  if (wouldRemoveOwner) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vendorMemberships)
      .where(
        and(
          eq(vendorMemberships.vendorId, membership.vendorId),
          eq(vendorMemberships.role, "owner"),
          eq(vendorMemberships.status, "active")
        )
      );
    if (Number(count ?? 0) <= 1) {
      throw new UnprocessableError(
        "Cannot demote the last active owner. Transfer ownership first."
      );
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.role) updates.role = data.role;
  if (data.status) {
    updates.status = data.status;
    if (data.status === "active" && !membership.acceptedAt) {
      updates.acceptedAt = new Date();
      updates.joinedAt = new Date();
    }
  }

  const [updated] = await db
    .update(vendorMemberships)
    .set(updates)
    .where(eq(vendorMemberships.id, membershipId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "vendor_membership",
    entityId: membershipId,
    action: "vendor_membership.updated",
    beforeJson: membership,
    afterJson: updated,
  });

  return updated!;
}

// ─── Revoke membership ───────────────────────────────────────────────────────

export async function revokeMembership(actor: AuthActor, membershipId: string) {
  assertCanManageMembership(actor);

  const [membership] = await db
    .select()
    .from(vendorMemberships)
    .where(eq(vendorMemberships.id, membershipId));

  if (!membership) throw new NotFoundError("Membership not found");
  assertVendorOwnership(actor, membership.vendorId);

  if (membership.status === "revoked") {
    throw new ConflictError("Membership is already revoked");
  }

  // Prevent revoking the last active owner
  if (membership.role === "owner" && membership.status === "active") {
    const activeOwners = await db
      .select({ count: sql<number>`count(*)` })
      .from(vendorMemberships)
      .where(
        and(
          eq(vendorMemberships.vendorId, membership.vendorId),
          eq(vendorMemberships.role, "owner"),
          eq(vendorMemberships.status, "active")
        )
      );
    if (Number(activeOwners[0]?.count ?? 0) <= 1) {
      throw new UnprocessableError(
        "Cannot revoke the last active owner. Transfer ownership first."
      );
    }
  }

  const [updated] = await db
    .update(vendorMemberships)
    .set({
      status: "revoked",
      revokedBy: actor.id,
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(vendorMemberships.id, membershipId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "vendor_membership",
    entityId: membershipId,
    action: "vendor_membership.revoked",
    beforeJson: membership,
    afterJson: updated,
  });

  return updated!;
}
