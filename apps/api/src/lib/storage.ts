import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "./env.js";

// ─── Config (lazy-initialized after env validation) ──────────────────────────

let _r2: S3Client | null = null;

function getR2(): S3Client {
  if (!_r2) {
    const env = getEnv();
    _r2 = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2;
}

/** @deprecated Use getR2() internally. Kept for backward compat. */
export const r2 = new Proxy({} as S3Client, {
  get(_, prop) {
    return (getR2() as any)[prop];
  },
});

// ─── Upload (server-side — streams multipart file directly to R2) ───────────

export async function uploadToR2(
  key: string,
  body: Buffer | ReadableStream | NodeJS.ReadableStream,
  contentType: string,
  contentLength?: number
): Promise<{ url: string; storageKey: string }> {
  const env = getEnv();
  const fileName = key.split("/").pop() ?? key;
  await getR2().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body as any,
      ContentType: contentType,
      ContentDisposition: `inline; filename="${fileName}"`,
      ...(contentLength ? { ContentLength: contentLength } : {}),
    })
  );

  return {
    storageKey: key,
    url: `${env.R2_PUBLIC_URL}/${key}`,
  };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteFromR2(key: string): Promise<void> {
  const env = getEnv();
  await getR2().send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

// ─── Head (check existence / get metadata) ──────────────────────────────────

export async function headObject(key: string) {
  const env = getEnv();
  try {
    return await getR2().send(
      new HeadObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch {
    return null;
  }
}

// ─── Presigned URL (for direct browser → R2 uploads) ─────────────────────────

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600 // 10 minutes
): Promise<{ uploadUrl: string; publicUrl: string; storageKey: string }> {
  const env = getEnv();
  const fileName = key.split("/").pop() ?? key;
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentDisposition: `inline; filename="${fileName}"`,
  });

  const uploadUrl = await getSignedUrl(getR2(), command, { expiresIn });

  return {
    uploadUrl,
    publicUrl: `${env.R2_PUBLIC_URL}/${key}`,
    storageKey: key,
  };
}

// ─── Key builders ────────────────────────────────────────────────────────────

export function buildStorageKey(
  scope: "platform" | "vendor",
  vendorId: string | null,
  fileName: string
): string {
  if (scope === "vendor" && vendorId) {
    return `vendors/${vendorId}/${fileName}`;
  }
  return `platform/${fileName}`;
}

/** Sanitize original file name: lowercase, replace spaces/special chars with dashes */
export function sanitizeFileName(originalName: string): string {
  const ext = originalName.lastIndexOf(".") >= 0
    ? originalName.slice(originalName.lastIndexOf("."))
    : "";
  const base = originalName.slice(0, originalName.length - ext.length);
  const sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return `${sanitized}${ext.toLowerCase()}`;
}

/** Add a short unique suffix to avoid collisions: "photo.jpg" → "photo-a3f9.jpg" */
export function addUniqueSuffix(fileName: string): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0) return `${fileName}-${suffix}`;
  return `${fileName.slice(0, dotIndex)}-${suffix}${fileName.slice(dotIndex)}`;
}

/** Check if a key already exists in R2 */
export async function objectExists(key: string): Promise<boolean> {
  return (await headObject(key)) !== null;
}

export function getPublicUrl(key: string): string {
  return `${getEnv().R2_PUBLIC_URL}/${key}`;
}
