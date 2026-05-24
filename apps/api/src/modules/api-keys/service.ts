import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { apiKeys } from "../../db/schema/index.js";
import { generateId } from "../../lib/id.js";
import { logAudit } from "../../lib/audit.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../lib/errors.js";
import { assertPermission } from "../../lib/permissions.js";

export interface CreateApiKeyDto {
  name: string;
  /** Vendor id — required for vendor-scoped keys; null for platform admin. */
  vendorId?: string | null;
  /** Permission strings (same vocabulary as JWT actors). */
  scopes: string[];
  /** Optional ISO date string after which the key stops working. */
  expiresAt?: string | null;
}

/** Hash helper — same primitive used on lookup. */
function hashKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

/** Generate a fresh plaintext key: `sk_live_<24 bytes base64url>`. */
function mintPlaintext(): { plaintext: string; prefix: string } {
  const body = crypto.randomBytes(24).toString("base64url");
  const plaintext = `sk_live_${body}`;
  return { plaintext, prefix: plaintext.slice(0, 12) };
}

function canManage(actor: AuthActor, vendorId: string | null | undefined) {
  if (actor.type === "admin") return true;
  if (actor.type === "vendor" && vendorId && actor.vendorId === vendorId) {
    return true;
  }
  return false;
}

/**
 * Create a new key. Returns the plaintext ONCE — the caller must show it to
 * the user and discard it. After this call the server only keeps the hash.
 */
export async function createApiKey(actor: AuthActor, data: CreateApiKeyDto) {
  assertPermission(actor, "api-key:manage:any");
  if (data.scopes.length === 0) {
    throw new BadRequestError("An API key must have at least one scope");
  }

  const resolvedVendorId =
    actor.type === "vendor" ? actor.vendorId ?? null : data.vendorId ?? null;

  if (!canManage(actor, resolvedVendorId)) {
    throw new ForbiddenError("Cannot create a key for this vendor scope");
  }

  const { plaintext, prefix } = mintPlaintext();
  const keyHash = hashKey(plaintext);
  const id = generateId();

  const [row] = await db
    .insert(apiKeys)
    .values({
      id,
      keyHash,
      keyPrefix: prefix,
      name: data.name,
      vendorId: resolvedVendorId,
      createdBy: actor.type !== "customer" ? actor.id : null,
      scopes: data.scopes,
      status: "active",
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    })
    .returning();

  await logAudit({
    actorUserId: actor.type !== "customer" ? actor.id : undefined,
    entityType: "api_key",
    entityId: id,
    action: "api_key.created",
    metadata: { name: data.name, vendorId: resolvedVendorId, scopes: data.scopes },
  });

  return {
    id: row!.id,
    name: row!.name,
    prefix: row!.keyPrefix,
    scopes: row!.scopes,
    vendorId: row!.vendorId,
    createdAt: row!.createdAt,
    expiresAt: row!.expiresAt,
    /** Present ONLY in the create response. Never exposed again. */
    plaintextKey: plaintext,
  };
}

export async function listApiKeys(actor: AuthActor) {
  assertPermission(actor, "api-key:read:any");
  const scope =
    actor.type === "vendor"
      ? eq(apiKeys.vendorId, actor.vendorId ?? "__none__")
      : undefined;
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.keyPrefix,
      vendorId: apiKeys.vendorId,
      scopes: apiKeys.scopes,
      status: apiKeys.status,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(scope);
  return rows;
}

export async function revokeApiKey(actor: AuthActor, id: string) {
  assertPermission(actor, "api-key:manage:any");
  const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
  if (!row) throw new NotFoundError("API key not found");
  if (!canManage(actor, row.vendorId)) {
    throw new ForbiddenError("Cannot revoke this key");
  }
  const [updated] = await db
    .update(apiKeys)
    .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning();

  await logAudit({
    actorUserId: actor.type !== "customer" ? actor.id : undefined,
    entityType: "api_key",
    entityId: id,
    action: "api_key.revoked",
  });
  return updated!;
}

/**
 * Verify an incoming `X-Api-Key` header. Returns the key row if valid, or
 * null if the key is unknown / revoked / expired. Updates `lastUsedAt`
 * asynchronously so repeated calls don't contend on the row.
 */
export async function verifyApiKey(plaintext: string) {
  if (!plaintext.startsWith("sk_")) return null;
  const keyHash = hashKey(plaintext);
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)));
  if (!row) return null;
  if (row.status !== "active") return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;

  // Fire-and-forget usage timestamp.
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .catch(() => {});

  return row;
}
