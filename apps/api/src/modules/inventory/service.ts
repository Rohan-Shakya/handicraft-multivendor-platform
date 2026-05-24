import { eq, and, sql } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import {
  inventoryItems,
  inventoryAdjustments,
  variants,
} from "../../db/schema/index.js";
import {
  assertPermission,
  assertVendorOwnership,
} from "../../lib/permissions.js";
import { ForbiddenError, NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InventoryFilters {
  page?: number;
  limit?: number;
}

export interface AdjustInput {
  delta: number;
  reason: "manual" | "correction" | "restock" | "import";
  note?: string;
}

export interface UpdateInventorySettingsInput {
  tracked?: boolean;
  reorderThreshold?: number | null;
  allowBackorder?: boolean;
}

// ─── List inventory items for vendor ─────────────────────────────────────────

export async function listInventory(actor: AuthActor, filters: InventoryFilters) {
  assertPermission(actor, "variant:inventory:update:own");
  if (!actor.vendorId) throw new ForbiddenError("Vendor context required");

  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.vendorId, actor.vendorId))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(eq(inventoryItems.vendorId, actor.vendorId)),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

// ─── Get inventory for a variant ─────────────────────────────────────────────

export async function getInventoryByVariant(actor: AuthActor, variantId: string) {
  assertPermission(actor, "variant:inventory:update:own");
  if (!actor.vendorId) throw new ForbiddenError("Vendor context required");

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.variantId, variantId));

  if (!item) throw new NotFoundError("Inventory item not found for this variant");
  assertVendorOwnership(actor, item.vendorId);

  return item;
}

// ─── Adjust inventory (manual stock adjustment) ──────────────────────────────

export async function adjustInventory(
  actor: AuthActor,
  variantId: string,
  input: AdjustInput
) {
  assertPermission(actor, "variant:inventory:update:own");
  if (!actor.vendorId) throw new ForbiddenError("Vendor context required");

  // Validate delta is not zero
  if (input.delta === 0) {
    throw new UnprocessableError("Delta must be non-zero");
  }

  return db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.variantId, variantId));

    if (!item) throw new NotFoundError("Inventory item not found for this variant");
    assertVendorOwnership(actor, item.vendorId);

    // Check that resulting quantity won't go below zero
    if (item.availableQuantity + input.delta < 0) {
      throw new UnprocessableError(
        `Adjustment would result in negative stock (current: ${item.availableQuantity}, delta: ${input.delta})`
      );
    }

    const [updated] = await tx
      .update(inventoryItems)
      .set({
        availableQuantity: sql`${inventoryItems.availableQuantity} + ${input.delta}`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, item.id))
      .returning();

    const [adjustment] = await tx
      .insert(inventoryAdjustments)
      .values({
        id: generateId(),
        inventoryItemId: item.id,
        reason: input.reason,
        delta: input.delta,
        note: input.note ?? null,
        referenceType: "manual_adjustment",
        referenceId: null,
        createdBy: actor.id,
      })
      .returning();

    return { inventoryItem: updated!, adjustment: adjustment! };
  });
}

// ─── Update inventory settings ───────────────────────────────────────────────

export async function updateInventorySettings(
  actor: AuthActor,
  variantId: string,
  input: UpdateInventorySettingsInput
) {
  assertPermission(actor, "variant:inventory:update:own");
  if (!actor.vendorId) throw new ForbiddenError("Vendor context required");

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.variantId, variantId));

  if (!item) throw new NotFoundError("Inventory item not found for this variant");
  assertVendorOwnership(actor, item.vendorId);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.tracked !== undefined) patch.tracked = input.tracked;
  if (input.reorderThreshold !== undefined) patch.reorderThreshold = input.reorderThreshold;
  if (input.allowBackorder !== undefined) patch.allowBackorder = input.allowBackorder;

  const [updated] = await db
    .update(inventoryItems)
    .set(patch as never)
    .where(eq(inventoryItems.id, item.id))
    .returning();

  return updated!;
}
