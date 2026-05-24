import path from "node:path";
import type { MultipartFile } from "@fastify/multipart";
import type { AuthActor } from "@repo/types";
import { eq, and, desc, sql, isNull, ilike, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { files } from "../../db/schema/index.js";
import { generateId } from "../../lib/id.js";
import { logger } from "../../lib/logger.js";
import {
  assertPermission,
  assertVendorOwnership,
} from "../../lib/permissions.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../lib/errors.js";
import {
  uploadToR2,
  deleteFromR2,
  createPresignedUploadUrl,
  buildStorageKey,
  sanitizeFileName,
  addUniqueSuffix,
  objectExists,
} from "../../lib/storage.js";

// ─── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "text/csv",
  "text/plain",
];

function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

/** Escape SQL LIKE wildcards so user input is treated literally. */
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateFileDto {
  originalName: string;
  fileName: string;
  mimeType?: string;
  extension?: string;
  storageKey: string;
  url: string;
  altText?: string;
  kind?: "image" | "video" | "document" | "audio" | "other";
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: string;
  checksum?: string;
}

export interface UpdateFileDto {
  altText?: string | null;
  fileName?: string;
  status?: "active" | "archived";
}

export interface FileFilters {
  page?: number;
  limit?: number;
  kind?: "image" | "video" | "document" | "audio" | "other";
  status?: "active" | "archived";
  vendorId?: string;
  search?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function detectKind(
  mimeType: string
): "image" | "video" | "document" | "audio" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.startsWith("application/pdf") ||
    mimeType.startsWith("application/msword") ||
    mimeType.startsWith(
      "application/vnd.openxmlformats-officedocument"
    ) ||
    mimeType.startsWith("text/")
  )
    return "document";
  return "other";
}

/**
 * Resolve a unique storage key: use the sanitized original name,
 * only append a short suffix if the key already exists in R2.
 */
async function resolveUniqueKey(
  scope: "platform" | "vendor",
  vendorId: string | null,
  originalName: string
): Promise<{ fileName: string; storageKey: string }> {
  const fileName = sanitizeFileName(originalName);
  let key = buildStorageKey(scope, vendorId, fileName);

  if (await objectExists(key)) {
    const uniqueName = addUniqueSuffix(fileName);
    key = buildStorageKey(scope, vendorId, uniqueName);
    return { fileName: uniqueName, storageKey: key };
  }

  return { fileName, storageKey: key };
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ─── Upload to R2 ─────────────────────────────────────────────────────────────

async function uploadFileToR2(
  filePart: MultipartFile,
  scope: "platform" | "vendor",
  vendorId: string | null
): Promise<{
  originalName: string;
  fileName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  storageKey: string;
  url: string;
  kind: "image" | "video" | "document" | "audio" | "other";
}> {
  const originalName = filePart.filename;
  const mimeType = filePart.mimetype;
  const extension = path.extname(originalName).replace(/^\./, "");

  if (!isAllowedMimeType(mimeType)) {
    throw new BadRequestError(
      `File type "${mimeType}" is not allowed. Accepted: images, videos, audio, PDFs, and documents.`
    );
  }

  // Buffer the stream to get size and check truncation
  const buffer = await streamToBuffer(filePart.file);

  if (filePart.file.truncated) {
    throw new BadRequestError("File too large. Maximum size is 10MB.");
  }

  const { fileName, storageKey } = await resolveUniqueKey(scope, vendorId, originalName);
  const { url } = await uploadToR2(storageKey, buffer, mimeType, buffer.length);

  return {
    originalName,
    fileName,
    mimeType,
    extension,
    sizeBytes: buffer.length,
    storageKey,
    url,
    kind: detectKind(mimeType),
  };
}

// ─── Upload operations ─────────────────────────────────────────────────────────

export async function uploadAdminFile(
  actor: AuthActor,
  filePart: MultipartFile
) {
  assertPermission(actor, "file:manage:any");

  const fileData = await uploadFileToR2(filePart, "platform", null);

  const id = generateId();
  const [file] = await db
    .insert(files)
    .values({
      id,
      scope: "platform",
      vendorId: null,
      kind: fileData.kind,
      status: "active",
      originalName: fileData.originalName,
      fileName: fileData.fileName,
      mimeType: fileData.mimeType,
      extension: fileData.extension,
      storageKey: fileData.storageKey,
      url: fileData.url,
      sizeBytes: fileData.sizeBytes,
      uploadedBy: actor.id,
    })
    .returning();

  return file;
}

export async function uploadVendorFile(
  actor: AuthActor,
  filePart: MultipartFile
) {
  assertPermission(actor, "file:upload:own");

  if (!actor.vendorId) {
    throw new ForbiddenError("Vendor context required");
  }

  const fileData = await uploadFileToR2(filePart, "vendor", actor.vendorId);

  const id = generateId();
  const [file] = await db
    .insert(files)
    .values({
      id,
      scope: "vendor",
      vendorId: actor.vendorId,
      kind: fileData.kind,
      status: "active",
      originalName: fileData.originalName,
      fileName: fileData.fileName,
      mimeType: fileData.mimeType,
      extension: fileData.extension,
      storageKey: fileData.storageKey,
      url: fileData.url,
      sizeBytes: fileData.sizeBytes,
      uploadedBy: actor.id,
    })
    .returning();

  return file;
}

// ─── Presigned upload (browser → R2 direct) ──────────────────────────────────

export async function createPresignedUpload(
  actor: AuthActor,
  data: { fileName: string; contentType: string; scope?: "platform" | "vendor" }
) {
  const scope = data.scope ?? (actor.type === "vendor" ? "vendor" : "platform");

  if (scope === "platform") {
    assertPermission(actor, "file:manage:any");
  } else {
    assertPermission(actor, "file:upload:own");
    if (!actor.vendorId) throw new ForbiddenError("Vendor context required");
  }

  if (!isAllowedMimeType(data.contentType)) {
    throw new BadRequestError(
      `File type "${data.contentType}" is not allowed. Accepted: images, videos, audio, PDFs, and documents.`
    );
  }

  const vendorId = scope === "vendor" ? actor.vendorId ?? null : null;
  const { fileName, storageKey } = await resolveUniqueKey(scope, vendorId, data.fileName);
  const extension = path.extname(data.fileName).replace(/^\./, "");
  const kind = detectKind(data.contentType);

  const presigned = await createPresignedUploadUrl(storageKey, data.contentType);

  // Pre-create the file record so the client can reference it immediately
  const id = generateId();
  const [file] = await db
    .insert(files)
    .values({
      id,
      scope,
      vendorId,
      kind,
      status: "active",
      originalName: data.fileName,
      fileName,
      mimeType: data.contentType,
      extension,
      storageKey,
      url: presigned.publicUrl,
      uploadedBy: actor.id,
    })
    .returning();

  return {
    file,
    uploadUrl: presigned.uploadUrl,
  };
}

// After browser upload completes, client calls this to finalize metadata
export async function confirmUpload(
  actor: AuthActor,
  fileId: string,
  data: { sizeBytes?: number; width?: number; height?: number }
) {
  const [existing] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), isNull(files.deletedAt)));

  if (!existing) throw new NotFoundError("File not found");

  // Verify ownership
  if (existing.scope === "vendor") {
    if (actor.type === "vendor") {
      assertVendorOwnership(actor, existing.vendorId ?? "");
    } else {
      assertPermission(actor, "file:manage:any");
    }
  } else {
    assertPermission(actor, "file:manage:any");
  }

  const setData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.sizeBytes !== undefined) setData.sizeBytes = data.sizeBytes;
  if (data.width !== undefined) setData.width = data.width;
  if (data.height !== undefined) setData.height = data.height;

  const [updated] = await db
    .update(files)
    .set(setData)
    .where(eq(files.id, fileId))
    .returning();

  return updated;
}

// ─── Admin operations ───────────────────────────────────────────────────────

export async function createAdminFile(actor: AuthActor, data: CreateFileDto) {
  assertPermission(actor, "file:manage:any");

  const id = generateId();
  const [file] = await db
    .insert(files)
    .values({
      id,
      scope: "platform",
      vendorId: null,
      kind: data.kind ?? "image",
      status: "active",
      originalName: data.originalName,
      fileName: data.fileName,
      mimeType: data.mimeType,
      extension: data.extension,
      storageKey: data.storageKey,
      url: data.url,
      altText: data.altText,
      sizeBytes: data.sizeBytes,
      width: data.width,
      height: data.height,
      durationSeconds: data.durationSeconds,
      checksum: data.checksum,
      uploadedBy: actor.id,
    })
    .returning();

  return file;
}

export async function listAdminFiles(actor: AuthActor, filters: FileFilters) {
  assertPermission(actor, "file:manage:any");

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [isNull(files.deletedAt)];

  if (filters.kind) {
    conditions.push(eq(files.kind, filters.kind));
  }
  if (filters.status) {
    conditions.push(eq(files.status, filters.status));
  }
  if (filters.vendorId) {
    conditions.push(eq(files.vendorId, filters.vendorId));
  }
  if (filters.search) {
    conditions.push(
      or(
        ilike(files.originalName, `%${escapeLikePattern(filters.search)}%`),
        ilike(files.fileName, `%${escapeLikePattern(filters.search)}%`)
      )!
    );
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(files)
      .where(where)
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(where),
  ]);

  return {
    data,
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  };
}

export async function getAdminFile(actor: AuthActor, id: string) {
  assertPermission(actor, "file:manage:any");

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), isNull(files.deletedAt)));

  if (!file) {
    throw new NotFoundError("File not found");
  }

  return file;
}

export async function updateAdminFile(
  actor: AuthActor,
  id: string,
  data: UpdateFileDto
) {
  assertPermission(actor, "file:manage:any");

  const [existing] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), isNull(files.deletedAt)));

  if (!existing) {
    throw new NotFoundError("File not found");
  }

  // Only allow safe fields
  const setData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.altText !== undefined) setData.altText = data.altText;
  if (data.fileName !== undefined) setData.fileName = data.fileName;
  if (data.status !== undefined) setData.status = data.status;

  const [updated] = await db
    .update(files)
    .set(setData)
    .where(eq(files.id, id))
    .returning();

  return updated;
}

export async function deleteAdminFile(actor: AuthActor, id: string) {
  assertPermission(actor, "file:manage:any");

  const [existing] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), isNull(files.deletedAt)));

  if (!existing) {
    throw new NotFoundError("File not found");
  }

  // Delete from R2
  try {
    await deleteFromR2(existing.storageKey);
  } catch (err) {
    // Log but don't block — the DB record should still be soft-deleted
    logger.error({ err }, "Failed to delete from R2");
  }

  const [deleted] = await db
    .update(files)
    .set({ deletedAt: new Date(), status: "deleted", updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  return deleted;
}

// ─── Vendor operations ──────────────────────────────────────────────────────

export async function createVendorFile(actor: AuthActor, data: CreateFileDto) {
  assertPermission(actor, "file:upload:own");

  if (!actor.vendorId) {
    throw new ForbiddenError("Vendor context required");
  }

  const id = generateId();
  const [file] = await db
    .insert(files)
    .values({
      id,
      scope: "vendor",
      vendorId: actor.vendorId,
      kind: data.kind ?? "image",
      status: "active",
      originalName: data.originalName,
      fileName: data.fileName,
      mimeType: data.mimeType,
      extension: data.extension,
      storageKey: data.storageKey,
      url: data.url,
      altText: data.altText,
      sizeBytes: data.sizeBytes,
      width: data.width,
      height: data.height,
      durationSeconds: data.durationSeconds,
      checksum: data.checksum,
      uploadedBy: actor.id,
    })
    .returning();

  return file;
}

export async function listVendorFiles(actor: AuthActor, filters: FileFilters) {
  assertPermission(actor, "file:read:own");

  if (!actor.vendorId) {
    throw new ForbiddenError("Vendor context required");
  }

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = [
    eq(files.vendorId, actor.vendorId),
    isNull(files.deletedAt),
  ] as ReturnType<typeof eq>[];

  if (filters.kind) {
    conditions.push(eq(files.kind, filters.kind));
  }
  if (filters.status) {
    conditions.push(eq(files.status, filters.status));
  }
  if (filters.search) {
    conditions.push(
      or(
        ilike(files.originalName, `%${escapeLikePattern(filters.search)}%`),
        ilike(files.fileName, `%${escapeLikePattern(filters.search)}%`)
      )!
    );
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(files)
      .where(where)
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(where),
  ]);

  return {
    data,
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  };
}

export async function getVendorFile(actor: AuthActor, id: string) {
  assertPermission(actor, "file:read:own");

  if (!actor.vendorId) {
    throw new ForbiddenError("Vendor context required");
  }

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), isNull(files.deletedAt)));

  if (!file) {
    throw new NotFoundError("File not found");
  }

  assertVendorOwnership(actor, file.vendorId ?? "");

  return file;
}

export async function updateVendorFile(
  actor: AuthActor,
  id: string,
  data: UpdateFileDto
) {
  assertPermission(actor, "file:upload:own");

  if (!actor.vendorId) {
    throw new ForbiddenError("Vendor context required");
  }

  const [existing] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), isNull(files.deletedAt)));

  if (!existing) {
    throw new NotFoundError("File not found");
  }

  assertVendorOwnership(actor, existing.vendorId ?? "");

  // Only allow safe fields
  const setData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.altText !== undefined) setData.altText = data.altText;
  if (data.fileName !== undefined) setData.fileName = data.fileName;
  if (data.status !== undefined) setData.status = data.status;

  const [updated] = await db
    .update(files)
    .set(setData)
    .where(eq(files.id, id))
    .returning();

  return updated;
}

export async function deleteVendorFile(actor: AuthActor, id: string) {
  assertPermission(actor, "file:upload:own");

  if (!actor.vendorId) {
    throw new ForbiddenError("Vendor context required");
  }

  const [existing] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), isNull(files.deletedAt)));

  if (!existing) {
    throw new NotFoundError("File not found");
  }

  assertVendorOwnership(actor, existing.vendorId ?? "");

  // Delete from R2
  try {
    await deleteFromR2(existing.storageKey);
  } catch (err) {
    logger.error({ err }, "Failed to delete from R2");
  }

  const [deleted] = await db
    .update(files)
    .set({ deletedAt: new Date(), status: "deleted", updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  return deleted;
}
