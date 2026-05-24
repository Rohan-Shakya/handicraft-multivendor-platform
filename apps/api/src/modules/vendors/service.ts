import { eq, and, isNull, desc } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import {
  assertPermission,
  assertVendorOwnership,
} from "../../lib/permissions.js";
import { hashPassword } from "../../lib/password.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { db } from "../../db/index.js";
import {
  vendorAddresses,
  vendorOrders,
  vendorMemberships,
  users,
} from "../../db/schema/index.js";
import { getKycWithDocuments } from "../vendor-kyc/service.js";
import { sendEmail } from "../../lib/email.js";
import { vendorApprovedEmail, vendorRejectedEmail, vendorSuspendedEmail } from "../../lib/email-templates.js";
import * as repo from "./repository.js";
import type {
  CreateVendorDto,
  UpdateVendorDto,
  UpdateVendorPageDto,
  VendorFilters,
} from "./types.js";

export async function listVendors(actor: AuthActor, filters: VendorFilters) {
  assertPermission(actor, "vendor:read:any");
  return repo.findVendors(filters);
}

/**
 * Public storefront vendor directory.
 * Always restricts to active, non-deleted vendors.
 */
export async function listPublicVendors(filters: Omit<VendorFilters, "status">) {
  return repo.findVendors(
    { ...filters, status: "active" },
    { excludeDeleted: true }
  );
}

export async function getVendorById(actor: AuthActor, id: string) {
  assertPermission(actor, "vendor:read:any");
  const vendor = await repo.findVendorById(id);
  if (!vendor) throw Object.assign(new Error("Vendor not found"), { statusCode: 404 });
  return vendor;
}

// Vendor fetching their own profile (no admin permission gate)
export async function getVendorByIdPublic(id: string) {
  const vendor = await repo.findVendorById(id);
  if (!vendor) throw Object.assign(new Error("Vendor not found"), { statusCode: 404 });
  return vendor;
}

export async function getVendorBySlug(slug: string) {
  // Public — no auth needed
  const vendor = await repo.findVendorBySlug(slug);
  if (!vendor) throw Object.assign(new Error("Vendor not found"), { statusCode: 404 });
  return vendor;
}

export async function createVendor(actor: AuthActor, data: CreateVendorDto) {
  assertPermission(actor, "vendor:create");

  const existingVendor = await repo.findVendorBySlug(data.slug);
  if (existingVendor) {
    throw Object.assign(new Error("Vendor slug already taken"), { statusCode: 409 });
  }

  const existingUser = await repo.findUserByEmail(data.userEmail);
  if (existingUser) {
    throw Object.assign(new Error("User email already in use"), { statusCode: 409 });
  }

  const passwordHash = await hashPassword(data.userPassword);

  return repo.createVendor({
    name: data.name,
    slug: data.slug,
    bio: data.bio,
    logoUrl: data.logoUrl,
    bannerUrl: data.bannerUrl,
    userEmail: data.userEmail,
    passwordHash,
    legalName: data.legalName,
    websiteUrl: data.websiteUrl,
    primaryEmail: data.primaryEmail,
    supportEmail: data.supportEmail,
    billingEmail: data.billingEmail,
    primaryPhone: data.primaryPhone,
    supportPhone: data.supportPhone,
    countryCode: data.countryCode,
    currencyCode: data.currencyCode,
    timezone: data.timezone,
    vatNumber: data.vatNumber,
    taxId: data.taxId,
    registrationNumber: data.registrationNumber,
    commissionBps: data.commissionBps,
  });
}

export async function updateVendor(
  actor: AuthActor,
  id: string,
  data: UpdateVendorDto
) {
  assertPermission(actor, "vendor:update:any");
  const vendor = await repo.updateVendor(id, data);
  if (!vendor) throw Object.assign(new Error("Vendor not found"), { statusCode: 404 });
  return vendor;
}

export async function updateVendorPage(
  actor: AuthActor,
  vendorId: string,
  data: UpdateVendorPageDto
) {
  assertPermission(actor, "vendor:profile:update:own");
  assertVendorOwnership(actor, vendorId);
  const vendor = await repo.updateVendor(vendorId, data);
  if (!vendor) throw Object.assign(new Error("Vendor not found"), { statusCode: 404 });
  return vendor;
}

export async function setVendorStatus(
  actor: AuthActor,
  id: string,
  status: "active" | "suspended" | "pending" | "rejected",
  reason?: string
) {
  assertPermission(actor, "vendor:update:any");
  const meta: { suspensionReason?: string; rejectionReason?: string } = {};
  if (status === "suspended" && reason) meta.suspensionReason = reason;
  if (status === "rejected" && reason) meta.rejectionReason = reason;
  const vendor = await repo.updateVendorStatus(
    id,
    status,
    Object.keys(meta).length > 0 ? meta : undefined
  );
  if (!vendor) throw Object.assign(new Error("Vendor not found"), { statusCode: 404 });

  // Send status change email to vendor
  if (vendor.primaryEmail) {
    let emailData: { subject: string; html: string; text: string } | null = null;
    if (status === "active") {
      emailData = vendorApprovedEmail({ vendorName: vendor.name, loginUrl: undefined });
    } else if (status === "rejected") {
      emailData = vendorRejectedEmail({ vendorName: vendor.name, reason });
    } else if (status === "suspended") {
      emailData = vendorSuspendedEmail({ vendorName: vendor.name, reason });
    }
    if (emailData) {
      sendEmail({ to: vendor.primaryEmail, subject: emailData.subject, html: emailData.html, text: emailData.text }).catch(() => {});
    }
  }

  return vendor;
}

export async function getVendorByIdWithStats(actor: AuthActor, id: string) {
  assertPermission(actor, "vendor:read:any");
  const vendor = await repo.findVendorById(id);
  if (!vendor) throw Object.assign(new Error("Vendor not found"), { statusCode: 404 });

  const [statistics, addresses, kyc, recentOrders, memberships] = await Promise.all([
    repo.getVendorStatistics(id),
    // Fetch addresses
    db
      .select()
      .from(vendorAddresses)
      .where(and(eq(vendorAddresses.vendorId, id), isNull(vendorAddresses.deletedAt))),
    // Fetch KYC with documents
    getKycWithDocuments(id),
    // Fetch recent vendor orders (last 5)
    db
      .select()
      .from(vendorOrders)
      .where(eq(vendorOrders.vendorId, id))
      .orderBy(desc(vendorOrders.createdAt))
      .limit(5),
    // Fetch active memberships with user info
    db
      .select({
        id: vendorMemberships.id,
        userId: vendorMemberships.userId,
        role: vendorMemberships.role,
        status: vendorMemberships.status,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(vendorMemberships)
      .innerJoin(users, eq(vendorMemberships.userId, users.id))
      .where(
        and(eq(vendorMemberships.vendorId, id), eq(vendorMemberships.status, "active"))
      ),
  ]);

  return { ...vendor, ...statistics, addresses, kyc, recentOrders, memberships };
}

export async function softDeleteVendor(actor: AuthActor, id: string) {
  assertPermission(actor, "vendor:update:any");

  const existing = await repo.findVendorById(id);
  if (!existing) throw Object.assign(new Error("Vendor not found"), { statusCode: 404 });

  const activeOrders = await repo.countActiveVendorOrders(id);
  if (activeOrders > 0) {
    throw Object.assign(
      new Error("Cannot delete vendor with active orders"),
      { statusCode: 422 }
    );
  }

  const vendor = await repo.softDeleteVendor(id);
  if (!vendor) throw Object.assign(new Error("Vendor not found"), { statusCode: 404 });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "vendor",
    entityId: id,
    action: "vendor.soft_deleted",
    beforeJson: existing,
    afterJson: vendor,
  });

  return vendor;
}
