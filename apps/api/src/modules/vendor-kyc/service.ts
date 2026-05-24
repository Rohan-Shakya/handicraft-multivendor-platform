import { eq, and, inArray } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { vendorKycs, vendorKycDocuments, files } from "../../db/schema/index.js";
import { assertPermission, assertVendorOwnership } from "../../lib/permissions.js";
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { sendEmail } from "../../lib/email.js";
import { kycStatusEmail } from "../../lib/email-templates.js";
import { vendors } from "../../db/schema/index.js";

// ─── Vendor: submit KYC ───────────────────────────────────────────────────────

export async function getOrCreateKyc(actor: AuthActor, vendorId: string) {
  assertPermission(actor, "vendor-kyc:submit:own");
  assertVendorOwnership(actor, vendorId);

  const [existing] = await db
    .select()
    .from(vendorKycs)
    .where(eq(vendorKycs.vendorId, vendorId));

  if (existing) return existing;

  const [kyc] = await db
    .insert(vendorKycs)
    .values({ id: generateId(), vendorId, status: "pending" })
    .returning();

  return kyc!;
}

export async function submitKyc(actor: AuthActor, vendorId: string) {
  assertPermission(actor, "vendor-kyc:submit:own");
  assertVendorOwnership(actor, vendorId);

  const [kyc] = await db.select().from(vendorKycs).where(eq(vendorKycs.vendorId, vendorId));
  if (!kyc) throw new NotFoundError("KYC record not found — create it first");
  if (kyc.status === "under_review" || kyc.status === "approved") {
    throw new ConflictError(`KYC is already in ${kyc.status} state`);
  }

  const [updated] = await db
    .update(vendorKycs)
    .set({ status: "under_review", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(vendorKycs.id, kyc.id))
    .returning();

  return updated!;
}

export async function addKycDocument(
  actor: AuthActor,
  vendorId: string,
  data: {
    documentType: "registration_certificate" | "tax_document" | "vat_document" | "owner_identity" | "bank_proof" | "address_proof" | "other";
    fileId: string;
    note?: string;
  }
) {
  assertPermission(actor, "vendor-kyc:submit:own");
  assertVendorOwnership(actor, vendorId);

  const [kyc] = await db.select().from(vendorKycs).where(eq(vendorKycs.vendorId, vendorId));
  if (!kyc) throw new NotFoundError("KYC record not found");
  if (kyc.status === "approved") {
    throw new UnprocessableError("Cannot modify an approved KYC");
  }

  const [doc] = await db
    .insert(vendorKycDocuments)
    .values({
      id: generateId(),
      vendorKycId: kyc.id,
      documentType: data.documentType,
      fileId: data.fileId,
      note: data.note ?? null,
    })
    .returning();

  return doc!;
}

// ─── Admin: review KYC ───────────────────────────────────────────────────────

export async function listKycs(
  actor: AuthActor,
  status?: "pending" | "under_review" | "approved" | "rejected"
) {
  assertPermission(actor, "vendor-kyc:review:any");

  const kycs = await db
    .select()
    .from(vendorKycs)
    .where(status ? eq(vendorKycs.status, status) : undefined);

  if (kycs.length === 0) return [];

  // Batch fetch documents for all KYCs
  const kycIds = kycs.map((k) => k.id);
  const allDocs = await db
    .select()
    .from(vendorKycDocuments)
    .where(inArray(vendorKycDocuments.vendorKycId, kycIds));

  // Group documents by KYC ID
  const docsByKyc = new Map<string, (typeof allDocs)[number][]>();
  for (const doc of allDocs) {
    const existing = docsByKyc.get(doc.vendorKycId) ?? [];
    existing.push(doc);
    docsByKyc.set(doc.vendorKycId, existing);
  }

  return kycs.map((kyc) => ({
    ...kyc,
    documents: docsByKyc.get(kyc.id) ?? [],
  }));
}

export async function getKycForVendor(actor: AuthActor, vendorId: string) {
  assertPermission(actor, "vendor-kyc:review:any");
  const [kyc] = await db.select().from(vendorKycs).where(eq(vendorKycs.vendorId, vendorId));
  if (!kyc) throw new NotFoundError("KYC not found");
  // Join documents with their underlying file row so the admin UI can render
  // the document type, filename, url, and upload time without a follow-up call.
  const docRows = await db
    .select({
      id: vendorKycDocuments.id,
      type: vendorKycDocuments.documentType,
      note: vendorKycDocuments.note,
      uploadedAt: vendorKycDocuments.createdAt,
      fileId: files.id,
      fileName: files.fileName,
      url: files.url,
      mimeType: files.mimeType,
      sizeBytes: files.sizeBytes,
    })
    .from(vendorKycDocuments)
    .leftJoin(files, eq(files.id, vendorKycDocuments.fileId))
    .where(eq(vendorKycDocuments.vendorKycId, kyc.id));
  return { ...kyc, documents: docRows };
}

export async function approveKyc(actor: AuthActor, kycId: string) {
  assertPermission(actor, "vendor-kyc:review:any");
  const [kyc] = await db.select().from(vendorKycs).where(eq(vendorKycs.id, kycId));
  if (!kyc) throw new NotFoundError("KYC not found");
  if (kyc.status !== "under_review") {
    throw new UnprocessableError("KYC must be under review to approve");
  }

  const [updated] = await db
    .update(vendorKycs)
    .set({
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(vendorKycs.id, kycId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "vendor_kyc",
    entityId: kycId,
    action: "kyc.approved",
    beforeJson: kyc,
    afterJson: updated,
  });

  // Send KYC approved email to vendor
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, kyc.vendorId));
  if (vendor?.primaryEmail) {
    const emailData = kycStatusEmail({ vendorName: vendor.name, status: "approved" });
    sendEmail({ to: vendor.primaryEmail, subject: emailData.subject, html: emailData.html, text: emailData.text }).catch(() => {});
  }

  return updated!;
}

export async function rejectKyc(actor: AuthActor, kycId: string, reason?: string) {
  assertPermission(actor, "vendor-kyc:review:any");
  const [kyc] = await db.select().from(vendorKycs).where(eq(vendorKycs.id, kycId));
  if (!kyc) throw new NotFoundError("KYC not found");
  if (kyc.status !== "under_review") {
    throw new UnprocessableError("KYC must be under review to reject");
  }

  const [updated] = await db
    .update(vendorKycs)
    .set({
      status: "rejected",
      reviewedAt: new Date(),
      reviewedBy: actor.id,
      rejectionReason: reason ?? "No reason provided",
      updatedAt: new Date(),
    })
    .where(eq(vendorKycs.id, kycId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "vendor_kyc",
    entityId: kycId,
    action: "kyc.rejected",
    beforeJson: kyc,
    afterJson: updated,
  });

  // Send KYC rejected email to vendor
  const [vendorForReject] = await db.select().from(vendors).where(eq(vendors.id, kyc.vendorId));
  if (vendorForReject?.primaryEmail) {
    const emailData = kycStatusEmail({ vendorName: vendorForReject.name, status: "rejected", reason });
    sendEmail({ to: vendorForReject.primaryEmail, subject: emailData.subject, html: emailData.html, text: emailData.text }).catch(() => {});
  }

  return updated!;
}

// ─── Helper: fetch KYC with documents for a vendor ──────────────────────────

export async function getKycWithDocuments(vendorId: string) {
  const [kyc] = await db
    .select()
    .from(vendorKycs)
    .where(eq(vendorKycs.vendorId, vendorId));
  if (!kyc) return null;
  const documents = await db
    .select()
    .from(vendorKycDocuments)
    .where(eq(vendorKycDocuments.vendorKycId, kyc.id));
  return { ...kyc, documents };
}
