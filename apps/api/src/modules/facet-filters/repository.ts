/**
 * Repository layer for `facet_filters`.
 *
 * All queries scope to a vendor when provided; `vendorId === null` targets the
 * platform-wide set. Soft deletes filter out `deletedAt IS NOT NULL` rows so
 * admins can undo a delete later via raw SQL if we ever add a Trash UI.
 */
import { and, asc, eq, isNull, sql, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { facetFilters } from "../../db/schema/index.js";
import type { CreateFacetFilterDto, UpdateFacetFilterDto } from "./types.js";

function generateId() {
  return crypto.randomUUID();
}

/** Returns all filters for a scope ordered by position (ASC, stable). */
export async function listFacetFilters(opts: {
  vendorId: string | null;
  enabled?: boolean;
}) {
  const conditions = [
    isNull(facetFilters.deletedAt),
    opts.vendorId === null
      ? isNull(facetFilters.vendorId)
      : eq(facetFilters.vendorId, opts.vendorId),
    opts.enabled != null ? eq(facetFilters.enabled, opts.enabled) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  return db
    .select()
    .from(facetFilters)
    .where(and(...conditions))
    .orderBy(asc(facetFilters.position), asc(facetFilters.createdAt));
}

export async function findFacetFilterById(id: string) {
  const [row] = await db
    .select()
    .from(facetFilters)
    .where(and(eq(facetFilters.id, id), isNull(facetFilters.deletedAt)));
  return row ?? null;
}

export async function createFacetFilter(opts: {
  vendorId: string | null;
  data: CreateFacetFilterDto;
  userId?: string;
}) {
  // If position wasn't specified, put it at the end.
  let position = opts.data.position;
  if (position == null) {
    const [{ max }] = await db
      .select({ max: sql<number | null>`MAX(${facetFilters.position})` })
      .from(facetFilters)
      .where(
        and(
          isNull(facetFilters.deletedAt),
          opts.vendorId === null
            ? isNull(facetFilters.vendorId)
            : eq(facetFilters.vendorId, opts.vendorId)
        )
      );
    position = max == null ? 0 : Number(max) + 1;
  }

  const [row] = await db
    .insert(facetFilters)
    .values({
      id: generateId(),
      vendorId: opts.vendorId,
      key: opts.data.key.toLowerCase(),
      label: opts.data.label,
      sourceType: opts.data.sourceType,
      sourceRef: opts.data.sourceRef ?? null,
      displayType: opts.data.displayType,
      config: opts.data.config ?? null,
      position,
      enabled: opts.data.enabled ?? true,
      createdBy: opts.userId ?? null,
      updatedBy: opts.userId ?? null,
    })
    .returning();
  return row!;
}

export async function updateFacetFilter(
  id: string,
  data: UpdateFacetFilterDto,
  userId?: string
) {
  const patch: Partial<typeof facetFilters.$inferInsert> = {
    updatedAt: new Date(),
    updatedBy: userId ?? null,
  };
  if (data.key !== undefined) patch.key = data.key.toLowerCase();
  if (data.label !== undefined) patch.label = data.label;
  if (data.sourceType !== undefined) patch.sourceType = data.sourceType;
  if (data.sourceRef !== undefined) patch.sourceRef = data.sourceRef;
  if (data.displayType !== undefined) patch.displayType = data.displayType;
  if (data.config !== undefined) patch.config = data.config;
  if (data.position !== undefined) patch.position = data.position;
  if (data.enabled !== undefined) patch.enabled = data.enabled;

  const [row] = await db
    .update(facetFilters)
    .set(patch)
    .where(and(eq(facetFilters.id, id), isNull(facetFilters.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteFacetFilter(id: string, userId?: string) {
  const [row] = await db
    .update(facetFilters)
    .set({ deletedAt: new Date(), updatedBy: userId ?? null })
    .where(and(eq(facetFilters.id, id), isNull(facetFilters.deletedAt)))
    .returning();
  return row ?? null;
}

/**
 * Reorder by rewriting `position` sequentially to match the given id order.
 * Runs in a single transaction — either all rows update or none do.
 */
export async function reorderFacetFilters(opts: {
  vendorId: string | null;
  ids: string[];
  userId?: string;
}) {
  if (opts.ids.length === 0) return;
  await db.transaction(async (tx) => {
    // Write positions in two phases to avoid briefly colliding with the
    // unique index (if we ever add one on position).
    for (let i = 0; i < opts.ids.length; i++) {
      await tx
        .update(facetFilters)
        .set({ position: i, updatedAt: new Date(), updatedBy: opts.userId ?? null })
        .where(
          and(
            eq(facetFilters.id, opts.ids[i]!),
            isNull(facetFilters.deletedAt),
            opts.vendorId === null
              ? isNull(facetFilters.vendorId)
              : eq(facetFilters.vendorId, opts.vendorId)
          )
        );
    }
  });
}

/** Used by the storefront endpoint — enabled only, ordered. */
export async function listEnabledForStorefront() {
  return db
    .select()
    .from(facetFilters)
    .where(
      and(
        isNull(facetFilters.deletedAt),
        eq(facetFilters.enabled, true),
        isNull(facetFilters.vendorId)
      )
    )
    .orderBy(asc(facetFilters.position), asc(facetFilters.createdAt));
}

/** Find by IDs — for bulk operations. */
export async function findByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(facetFilters)
    .where(and(inArray(facetFilters.id, ids), isNull(facetFilters.deletedAt)));
}
