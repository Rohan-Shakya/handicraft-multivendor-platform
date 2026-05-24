import { eq, and, sql } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import {
  productMetafields,
  variantMetafields,
  collectionMetafields,
  customerMetafields,
  products,
  variants,
  collections,
} from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError, ConflictError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateMetafieldDto {
  key: string;
  value: unknown;
  type: "string" | "integer" | "float" | "boolean" | "json" | "date";
  namespace?: string;
}

export interface UpdateMetafieldDto {
  key?: string;
  value?: unknown;
  type?: "string" | "integer" | "float" | "boolean" | "json" | "date";
  namespace?: string;
}

// ─── Product Metafields ──────────────────────────────────────────────────────

export async function listProductMetafields(actor: AuthActor, productId: string) {
  assertPermission(actor, "product:read:any");
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) throw new NotFoundError("Product not found");
  return db.select().from(productMetafields).where(eq(productMetafields.productId, productId));
}

export async function createProductMetafield(
  actor: AuthActor,
  productId: string,
  data: CreateMetafieldDto
) {
  assertPermission(actor, "product:update:any");
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) throw new NotFoundError("Product not found");

  const namespace = data.namespace ?? "custom";

  const [metafield] = await db
    .insert(productMetafields)
    .values({
      id: generateId(),
      vendorId: product.vendorId,
      productId,
      namespace,
      key: data.key,
      valueJson: data.value,
      type: data.type,
    })
    .returning();

  return metafield!;
}

export async function updateProductMetafield(
  actor: AuthActor,
  id: string,
  data: UpdateMetafieldDto
) {
  assertPermission(actor, "product:update:any");

  const [existing] = await db
    .select()
    .from(productMetafields)
    .where(eq(productMetafields.id, id));
  if (!existing) throw new NotFoundError("Metafield not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.key !== undefined) patch.key = data.key;
  if (data.value !== undefined) patch.valueJson = data.value;
  if (data.type !== undefined) patch.type = data.type;
  if (data.namespace !== undefined) patch.namespace = data.namespace;

  const [updated] = await db
    .update(productMetafields)
    .set(patch as any)
    .where(eq(productMetafields.id, id))
    .returning();

  return updated!;
}

export async function deleteProductMetafield(actor: AuthActor, id: string) {
  assertPermission(actor, "product:update:any");
  const [deleted] = await db
    .delete(productMetafields)
    .where(eq(productMetafields.id, id))
    .returning();
  if (!deleted) throw new NotFoundError("Metafield not found");
  return { success: true };
}

// ─── Variant Metafields ──────────────────────────────────────────────────────

export async function listVariantMetafields(actor: AuthActor, variantId: string) {
  assertPermission(actor, "product:read:any");
  const [variant] = await db.select().from(variants).where(eq(variants.id, variantId));
  if (!variant) throw new NotFoundError("Variant not found");
  return db.select().from(variantMetafields).where(eq(variantMetafields.variantId, variantId));
}

export async function createVariantMetafield(
  actor: AuthActor,
  variantId: string,
  data: CreateMetafieldDto
) {
  assertPermission(actor, "product:update:any");
  const [variant] = await db.select().from(variants).where(eq(variants.id, variantId));
  if (!variant) throw new NotFoundError("Variant not found");

  const namespace = data.namespace ?? "custom";

  const [metafield] = await db
    .insert(variantMetafields)
    .values({
      id: generateId(),
      vendorId: variant.vendorId,
      variantId,
      namespace,
      key: data.key,
      valueJson: data.value,
      type: data.type,
    })
    .returning();

  return metafield!;
}

export async function updateVariantMetafield(
  actor: AuthActor,
  id: string,
  data: UpdateMetafieldDto
) {
  assertPermission(actor, "product:update:any");

  const [existing] = await db
    .select()
    .from(variantMetafields)
    .where(eq(variantMetafields.id, id));
  if (!existing) throw new NotFoundError("Metafield not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.key !== undefined) patch.key = data.key;
  if (data.value !== undefined) patch.valueJson = data.value;
  if (data.type !== undefined) patch.type = data.type;
  if (data.namespace !== undefined) patch.namespace = data.namespace;

  const [updated] = await db
    .update(variantMetafields)
    .set(patch as any)
    .where(eq(variantMetafields.id, id))
    .returning();

  return updated!;
}

export async function deleteVariantMetafield(actor: AuthActor, id: string) {
  assertPermission(actor, "product:update:any");
  const [deleted] = await db
    .delete(variantMetafields)
    .where(eq(variantMetafields.id, id))
    .returning();
  if (!deleted) throw new NotFoundError("Metafield not found");
  return { success: true };
}

// ─── Collection Metafields ───────────────────────────────────────────────────

export async function listCollectionMetafields(actor: AuthActor, collectionId: string) {
  assertPermission(actor, "collection:manage:any");
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId));
  if (!collection) throw new NotFoundError("Collection not found");
  return db
    .select()
    .from(collectionMetafields)
    .where(eq(collectionMetafields.collectionId, collectionId));
}

export async function createCollectionMetafield(
  actor: AuthActor,
  collectionId: string,
  data: CreateMetafieldDto
) {
  assertPermission(actor, "collection:manage:any");
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId));
  if (!collection) throw new NotFoundError("Collection not found");

  const namespace = data.namespace ?? "custom";

  const [metafield] = await db
    .insert(collectionMetafields)
    .values({
      id: generateId(),
      vendorId: collection.vendorId,
      collectionId,
      namespace,
      key: data.key,
      valueJson: data.value,
      type: data.type,
    })
    .returning();

  return metafield!;
}

export async function updateCollectionMetafield(
  actor: AuthActor,
  id: string,
  data: UpdateMetafieldDto
) {
  assertPermission(actor, "collection:manage:any");

  const [existing] = await db
    .select()
    .from(collectionMetafields)
    .where(eq(collectionMetafields.id, id));
  if (!existing) throw new NotFoundError("Metafield not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.key !== undefined) patch.key = data.key;
  if (data.value !== undefined) patch.valueJson = data.value;
  if (data.type !== undefined) patch.type = data.type;
  if (data.namespace !== undefined) patch.namespace = data.namespace;

  const [updated] = await db
    .update(collectionMetafields)
    .set(patch as any)
    .where(eq(collectionMetafields.id, id))
    .returning();

  return updated!;
}

export async function deleteCollectionMetafield(actor: AuthActor, id: string) {
  assertPermission(actor, "collection:manage:any");
  const [deleted] = await db
    .delete(collectionMetafields)
    .where(eq(collectionMetafields.id, id))
    .returning();
  if (!deleted) throw new NotFoundError("Metafield not found");
  return { success: true };
}

// ─── Customer Metafields ─────────────────────────────────────────────────────

export async function listCustomerMetafields(actor: AuthActor, customerId: string) {
  assertPermission(actor, "customer:read:any");
  return db
    .select()
    .from(customerMetafields)
    .where(eq(customerMetafields.customerId, customerId));
}

export async function createCustomerMetafield(
  actor: AuthActor,
  customerId: string,
  data: CreateMetafieldDto
) {
  assertPermission(actor, "customer:update:any");

  const namespace = data.namespace ?? "custom";

  const [metafield] = await db
    .insert(customerMetafields)
    .values({
      id: generateId(),
      customerId,
      namespace,
      key: data.key,
      valueJson: data.value,
      type: data.type,
    })
    .returning();

  return metafield!;
}

export async function updateCustomerMetafield(
  actor: AuthActor,
  id: string,
  data: UpdateMetafieldDto
) {
  assertPermission(actor, "customer:update:any");

  const [existing] = await db
    .select()
    .from(customerMetafields)
    .where(eq(customerMetafields.id, id));
  if (!existing) throw new NotFoundError("Metafield not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.key !== undefined) patch.key = data.key;
  if (data.value !== undefined) patch.valueJson = data.value;
  if (data.type !== undefined) patch.type = data.type;
  if (data.namespace !== undefined) patch.namespace = data.namespace;

  const [updated] = await db
    .update(customerMetafields)
    .set(patch as any)
    .where(eq(customerMetafields.id, id))
    .returning();

  return updated!;
}

export async function deleteCustomerMetafield(actor: AuthActor, id: string) {
  assertPermission(actor, "customer:update:any");
  const [deleted] = await db
    .delete(customerMetafields)
    .where(eq(customerMetafields.id, id))
    .returning();
  if (!deleted) throw new NotFoundError("Metafield not found");
  return { success: true };
}
