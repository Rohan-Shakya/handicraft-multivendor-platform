import { eq, and, isNull, asc } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { shippingZones, shippingRates } from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { cacheGet, cacheInvalidate } from "../../lib/redis.js";

// ─── DTOs ──────────────────────────────────────────────────────────────────

export interface CreateShippingZoneDto {
  name: string;
  countries: string[];
  isRestOfWorld?: boolean;
}

export interface UpdateShippingZoneDto {
  name?: string;
  countries?: string[];
  isRestOfWorld?: boolean;
}

export interface CreateShippingRateDto {
  name: string;
  type?: "flat_rate" | "weight_based" | "price_based" | "free";
  price?: number;
  minWeight?: number | null;
  maxWeight?: number | null;
  minOrderAmount?: number | null;
  maxOrderAmount?: number | null;
  freeAboveAmount?: number | null;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
  isActive?: boolean;
  position?: number;
}

export interface UpdateShippingRateDto {
  name?: string;
  type?: "flat_rate" | "weight_based" | "price_based" | "free";
  price?: number;
  minWeight?: number | null;
  maxWeight?: number | null;
  minOrderAmount?: number | null;
  maxOrderAmount?: number | null;
  freeAboveAmount?: number | null;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
  isActive?: boolean;
  position?: number;
}

// ─── Zone operations ───────────────────────────────────────────────────────

export async function listShippingZones(actor: AuthActor) {
  assertPermission(actor, "settings:manage");

  const zones = await db
    .select()
    .from(shippingZones)
    .where(isNull(shippingZones.deletedAt))
    .orderBy(asc(shippingZones.createdAt));

  const rates = await db
    .select()
    .from(shippingRates)
    .orderBy(asc(shippingRates.position));

  return zones.map((zone) => ({
    ...zone,
    rates: rates.filter((r) => r.zoneId === zone.id),
  }));
}

export async function createShippingZone(actor: AuthActor, data: CreateShippingZoneDto) {
  assertPermission(actor, "settings:manage");

  const [zone] = await db
    .insert(shippingZones)
    .values({
      id: generateId(),
      name: data.name,
      countries: data.countries,
      isRestOfWorld: data.isRestOfWorld ?? false,
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "shipping_zone",
    entityId: zone!.id,
    action: "shipping_zone.created",
    afterJson: zone,
  });

  cacheInvalidate("shipping:*");
  return zone!;
}

export async function updateShippingZone(actor: AuthActor, id: string, data: UpdateShippingZoneDto) {
  assertPermission(actor, "settings:manage");

  const [existing] = await db
    .select()
    .from(shippingZones)
    .where(and(eq(shippingZones.id, id), isNull(shippingZones.deletedAt)));
  if (!existing) throw new NotFoundError("Shipping zone not found");

  const [updated] = await db
    .update(shippingZones)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.countries !== undefined && { countries: data.countries }),
      ...(data.isRestOfWorld !== undefined && { isRestOfWorld: data.isRestOfWorld }),
      updatedAt: new Date(),
    })
    .where(eq(shippingZones.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "shipping_zone",
    entityId: id,
    action: "shipping_zone.updated",
    beforeJson: existing,
    afterJson: updated,
  });

  cacheInvalidate("shipping:*");
  return updated!;
}

export async function deleteShippingZone(actor: AuthActor, id: string) {
  assertPermission(actor, "settings:manage");

  const [existing] = await db
    .select()
    .from(shippingZones)
    .where(and(eq(shippingZones.id, id), isNull(shippingZones.deletedAt)));
  if (!existing) throw new NotFoundError("Shipping zone not found");

  // Delete child rates first, then soft-delete the zone
  await db.delete(shippingRates).where(eq(shippingRates.zoneId, id));

  const [deleted] = await db
    .update(shippingZones)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(shippingZones.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "shipping_zone",
    entityId: id,
    action: "shipping_zone.deleted",
    beforeJson: existing,
    afterJson: deleted,
  });

  cacheInvalidate("shipping:*");
  return deleted!;
}

// ─── Rate operations ───────────────────────────────────────────────────────

export async function createShippingRate(actor: AuthActor, zoneId: string, data: CreateShippingRateDto) {
  assertPermission(actor, "settings:manage");

  // Verify zone exists
  const [zone] = await db
    .select()
    .from(shippingZones)
    .where(and(eq(shippingZones.id, zoneId), isNull(shippingZones.deletedAt)));
  if (!zone) throw new NotFoundError("Shipping zone not found");

  const [rate] = await db
    .insert(shippingRates)
    .values({
      id: generateId(),
      zoneId,
      name: data.name,
      type: data.type ?? "flat_rate",
      price: data.price ?? 0,
      minWeight: data.minWeight ?? null,
      maxWeight: data.maxWeight ?? null,
      minOrderAmount: data.minOrderAmount ?? null,
      maxOrderAmount: data.maxOrderAmount ?? null,
      freeAboveAmount: data.freeAboveAmount ?? null,
      estimatedDaysMin: data.estimatedDaysMin ?? null,
      estimatedDaysMax: data.estimatedDaysMax ?? null,
      isActive: data.isActive ?? true,
      position: data.position ?? 0,
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "shipping_rate",
    entityId: rate!.id,
    action: "shipping_rate.created",
    afterJson: rate,
  });

  cacheInvalidate("shipping:*");
  return rate!;
}

export async function updateShippingRate(actor: AuthActor, id: string, data: UpdateShippingRateDto) {
  assertPermission(actor, "settings:manage");

  const [existing] = await db
    .select()
    .from(shippingRates)
    .where(eq(shippingRates.id, id));
  if (!existing) throw new NotFoundError("Shipping rate not found");

  const [updated] = await db
    .update(shippingRates)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.minWeight !== undefined && { minWeight: data.minWeight }),
      ...(data.maxWeight !== undefined && { maxWeight: data.maxWeight }),
      ...(data.minOrderAmount !== undefined && { minOrderAmount: data.minOrderAmount }),
      ...(data.maxOrderAmount !== undefined && { maxOrderAmount: data.maxOrderAmount }),
      ...(data.freeAboveAmount !== undefined && { freeAboveAmount: data.freeAboveAmount }),
      ...(data.estimatedDaysMin !== undefined && { estimatedDaysMin: data.estimatedDaysMin }),
      ...(data.estimatedDaysMax !== undefined && { estimatedDaysMax: data.estimatedDaysMax }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.position !== undefined && { position: data.position }),
      updatedAt: new Date(),
    })
    .where(eq(shippingRates.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "shipping_rate",
    entityId: id,
    action: "shipping_rate.updated",
    beforeJson: existing,
    afterJson: updated,
  });

  cacheInvalidate("shipping:*");
  return updated!;
}

export async function deleteShippingRate(actor: AuthActor, id: string) {
  assertPermission(actor, "settings:manage");

  const [existing] = await db
    .select()
    .from(shippingRates)
    .where(eq(shippingRates.id, id));
  if (!existing) throw new NotFoundError("Shipping rate not found");

  await db.delete(shippingRates).where(eq(shippingRates.id, id));

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "shipping_rate",
    entityId: id,
    action: "shipping_rate.deleted",
    beforeJson: existing,
  });

  cacheInvalidate("shipping:*");
  return { success: true };
}

// ─── Public / Checkout helpers ─────────────────────────────────────────────

export interface CalculatedShippingRate {
  rateId: string;
  zoneName: string;
  name: string;
  type: string;
  price: number; // cents
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
}

/**
 * Calculate available shipping rates for a given country, weight, and order subtotal.
 * Returns applicable rates sorted by price ascending.
 */
export async function calculateShipping(
  countryCode: string,
  totalWeight: number,
  orderSubtotal: number // cents
): Promise<CalculatedShippingRate[]> {
  // Cache zone + rate data for 15 min (rarely changes)
  const { zones, rates: allRates } = await cacheGet("shipping:zones-rates", 900, async () => {
    const z = await db
      .select()
      .from(shippingZones)
      .where(isNull(shippingZones.deletedAt));
    const r = await db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.isActive, true))
      .orderBy(asc(shippingRates.position));
    return { zones: z, rates: r };
  });

  // Find zones that include the given country or are "rest of world"
  const matchingZones = zones.filter(
    (z) => z.isRestOfWorld || (z.countries as string[]).includes(countryCode)
  );

  if (matchingZones.length === 0) return [];

  const zoneIds = matchingZones.map((z) => z.id);
  const zoneMap = new Map(matchingZones.map((z) => [z.id, z]));

  const zoneRates = allRates.filter((r) => zoneIds.includes(r.zoneId));

  const results: CalculatedShippingRate[] = [];

  for (const rate of zoneRates) {
    const zone = zoneMap.get(rate.zoneId)!;
    let price: number;

    switch (rate.type) {
      case "flat_rate":
        price = rate.price;
        break;

      case "weight_based":
        // Skip if weight not in range
        if (rate.minWeight !== null && totalWeight < rate.minWeight) continue;
        if (rate.maxWeight !== null && totalWeight > rate.maxWeight) continue;
        price = rate.price;
        break;

      case "price_based":
        // Skip if order subtotal not in range
        if (rate.minOrderAmount !== null && orderSubtotal < rate.minOrderAmount) continue;
        if (rate.maxOrderAmount !== null && orderSubtotal > rate.maxOrderAmount) continue;
        price = rate.price;
        break;

      case "free":
        price = 0;
        break;

      default:
        continue;
    }

    // Apply freeAboveAmount: if order exceeds threshold, shipping is free
    if (rate.freeAboveAmount !== null && orderSubtotal >= rate.freeAboveAmount) {
      price = 0;
    }

    results.push({
      rateId: rate.id,
      zoneName: zone.name,
      name: rate.name,
      type: rate.type,
      price,
      estimatedDaysMin: rate.estimatedDaysMin,
      estimatedDaysMax: rate.estimatedDaysMax,
    });
  }

  // Sort by price ascending
  results.sort((a, b) => a.price - b.price);

  return results;
}
