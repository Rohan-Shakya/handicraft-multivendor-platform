import { eq, and, isNull, asc } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { taxZones, taxRates } from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { cacheGet, cacheInvalidate } from "../../lib/redis.js";

// ─── DTOs ──────────────────────────────────────────────────────────────────

export interface CreateTaxZoneDto {
  name: string;
  countryCode: string;
  provinceCode?: string | null;
  behavior?: "exclusive" | "inclusive";
  isActive?: boolean;
}

export interface UpdateTaxZoneDto {
  name?: string;
  countryCode?: string;
  provinceCode?: string | null;
  behavior?: "exclusive" | "inclusive";
  isActive?: boolean;
}

export interface CreateTaxRateDto {
  name: string;
  rateBps: number;
  isCompound?: boolean;
  isShippingTaxed?: boolean;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateTaxRateDto {
  name?: string;
  rateBps?: number;
  isCompound?: boolean;
  isShippingTaxed?: boolean;
  priority?: number;
  isActive?: boolean;
}

// ─── Zone operations ───────────────────────────────────────────────────────

export async function listTaxZones(actor: AuthActor) {
  assertPermission(actor, "settings:manage");

  const zones = await db
    .select()
    .from(taxZones)
    .where(isNull(taxZones.deletedAt))
    .orderBy(asc(taxZones.createdAt));

  const rates = await db
    .select()
    .from(taxRates)
    .orderBy(asc(taxRates.priority));

  return zones.map((zone) => ({
    ...zone,
    rates: rates.filter((r) => r.zoneId === zone.id),
  }));
}

export async function createTaxZone(actor: AuthActor, data: CreateTaxZoneDto) {
  assertPermission(actor, "settings:manage");

  const [zone] = await db
    .insert(taxZones)
    .values({
      id: generateId(),
      name: data.name,
      countryCode: data.countryCode,
      provinceCode: data.provinceCode ?? null,
      behavior: data.behavior ?? "exclusive",
      isActive: data.isActive ?? true,
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "tax_zone",
    entityId: zone!.id,
    action: "tax_zone.created",
    afterJson: zone,
  });

  cacheInvalidate("tax:*");
  return zone!;
}

export async function updateTaxZone(actor: AuthActor, id: string, data: UpdateTaxZoneDto) {
  assertPermission(actor, "settings:manage");

  const [existing] = await db
    .select()
    .from(taxZones)
    .where(and(eq(taxZones.id, id), isNull(taxZones.deletedAt)));
  if (!existing) throw new NotFoundError("Tax zone not found");

  const [updated] = await db
    .update(taxZones)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.countryCode !== undefined && { countryCode: data.countryCode }),
      ...(data.provinceCode !== undefined && { provinceCode: data.provinceCode ?? null }),
      ...(data.behavior !== undefined && { behavior: data.behavior }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(taxZones.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "tax_zone",
    entityId: id,
    action: "tax_zone.updated",
    beforeJson: existing,
    afterJson: updated,
  });

  cacheInvalidate("tax:*");
  return updated!;
}

export async function deleteTaxZone(actor: AuthActor, id: string) {
  assertPermission(actor, "settings:manage");

  const [existing] = await db
    .select()
    .from(taxZones)
    .where(and(eq(taxZones.id, id), isNull(taxZones.deletedAt)));
  if (!existing) throw new NotFoundError("Tax zone not found");

  // Delete child rates first, then soft-delete the zone
  await db.delete(taxRates).where(eq(taxRates.zoneId, id));

  const [deleted] = await db
    .update(taxZones)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(taxZones.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "tax_zone",
    entityId: id,
    action: "tax_zone.deleted",
    beforeJson: existing,
    afterJson: deleted,
  });

  cacheInvalidate("tax:*");
  return deleted!;
}

// ─── Rate operations ───────────────────────────────────────────────────────

export async function createTaxRate(actor: AuthActor, zoneId: string, data: CreateTaxRateDto) {
  assertPermission(actor, "settings:manage");

  // Verify zone exists
  const [zone] = await db
    .select()
    .from(taxZones)
    .where(and(eq(taxZones.id, zoneId), isNull(taxZones.deletedAt)));
  if (!zone) throw new NotFoundError("Tax zone not found");

  const [rate] = await db
    .insert(taxRates)
    .values({
      id: generateId(),
      zoneId,
      name: data.name,
      rateBps: data.rateBps,
      isCompound: data.isCompound ?? false,
      isShippingTaxed: data.isShippingTaxed ?? false,
      priority: data.priority ?? 0,
      isActive: data.isActive ?? true,
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "tax_rate",
    entityId: rate!.id,
    action: "tax_rate.created",
    afterJson: rate,
  });

  cacheInvalidate("tax:*");
  return rate!;
}

export async function updateTaxRate(actor: AuthActor, id: string, data: UpdateTaxRateDto) {
  assertPermission(actor, "settings:manage");

  const [existing] = await db
    .select()
    .from(taxRates)
    .where(eq(taxRates.id, id));
  if (!existing) throw new NotFoundError("Tax rate not found");

  const [updated] = await db
    .update(taxRates)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.rateBps !== undefined && { rateBps: data.rateBps }),
      ...(data.isCompound !== undefined && { isCompound: data.isCompound }),
      ...(data.isShippingTaxed !== undefined && { isShippingTaxed: data.isShippingTaxed }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(taxRates.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "tax_rate",
    entityId: id,
    action: "tax_rate.updated",
    beforeJson: existing,
    afterJson: updated,
  });

  cacheInvalidate("tax:*");
  return updated!;
}

export async function deleteTaxRate(actor: AuthActor, id: string) {
  assertPermission(actor, "settings:manage");

  const [existing] = await db
    .select()
    .from(taxRates)
    .where(eq(taxRates.id, id));
  if (!existing) throw new NotFoundError("Tax rate not found");

  await db.delete(taxRates).where(eq(taxRates.id, id));

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "tax_rate",
    entityId: id,
    action: "tax_rate.deleted",
    beforeJson: existing,
  });

  cacheInvalidate("tax:*");
  return { success: true };
}

// ─── Checkout helpers ──────────────────────────────────────────────────────

export interface TaxBreakdownItem {
  name: string;
  rateBps: number;
  amount: number; // cents
}

/**
 * `exclusive` (default): subtotal is the net-of-tax price; tax is added on
 * top so `lineTotal = subtotal + taxTotal`. This is the US/Canada model.
 *
 * `inclusive`: subtotal already contains tax; we extract the tax portion so
 * `lineTotal = subtotal` and `subtotalExTax = subtotal - taxTotal`. This is
 * the EU/UK/Nepal VAT model.
 *
 * When the matching zone is `inclusive` we return the tax already embedded
 * in `subtotalCents`. Callers should subtract `taxTotal` from `subtotalCents`
 * to get the net-of-tax line subtotal — `taxInclusive: true` on the result
 * flags this so the checkout/order-summary code can render the right copy.
 */
export interface TaxCalculationResult {
  taxTotal: number; // cents
  breakdown: TaxBreakdownItem[];
  /** True when the matching zone's `behavior === "inclusive"`. Callers should
   *  treat `taxTotal` as the portion of `subtotalCents` that is tax, rather
   *  than an amount to add on top. */
  taxInclusive: boolean;
}

/**
 * Calculate tax for a given country/province, subtotal, and shipping amount.
 * Returns the total tax in cents and a line-by-line breakdown.
 */
export async function calculateTax(
  countryCode: string,
  provinceCode: string | undefined,
  subtotalCents: number,
  shippingCents: number
): Promise<TaxCalculationResult> {
  // Cache zone + rate data for 15 min (rarely changes)
  const { zones, rates: allRates } = await cacheGet("tax:zones-rates", 900, async () => {
    const z = await db
      .select()
      .from(taxZones)
      .where(and(eq(taxZones.isActive, true), isNull(taxZones.deletedAt)));
    const r = await db
      .select()
      .from(taxRates)
      .where(eq(taxRates.isActive, true))
      .orderBy(asc(taxRates.priority));
    return { zones: z, rates: r };
  });

  // Match zones: exact province match first, then country-only zones (provinceCode is null)
  const matchingZones = zones.filter(
    (z) =>
      z.countryCode === countryCode &&
      (z.provinceCode === null || z.provinceCode === provinceCode)
  );

  if (matchingZones.length === 0) {
    return { taxTotal: 0, breakdown: [], taxInclusive: false };
  }

  // Prefer the most-specific zone (province > country) for the behavior flag.
  // All matching zones contribute rates, but the behavior is taken from the
  // best-matching zone so admins can override at the province level.
  const primaryZone =
    matchingZones.find((z) => z.provinceCode === provinceCode) ??
    matchingZones[0]!;
  const taxInclusive = primaryZone.behavior === "inclusive";

  const zoneIds = matchingZones.map((z) => z.id);

  const applicableRates = allRates.filter((r) => zoneIds.includes(r.zoneId));

  if (applicableRates.length === 0) {
    return { taxTotal: 0, breakdown: [], taxInclusive };
  }

  const breakdown: TaxBreakdownItem[] = [];
  let runningTaxTotal = 0;

  for (const rate of applicableRates) {
    // For inclusive pricing, the subtotal already contains the tax. We solve
    // for the embedded amount with: tax = gross × bps / (10000 + bps).
    // For exclusive pricing we apply the rate to the net subtotal.
    let taxableAmount: number;
    let taxAmount: number;

    if (taxInclusive) {
      // Compound and shipping-taxed flags don't extend the gross — they're an
      // exclusive-pricing concept. Inclusive zones almost always declare a
      // single non-compound, non-shipping-taxed VAT rate; we evaluate them
      // additively just to keep the loop uniform.
      taxableAmount = subtotalCents + (rate.isShippingTaxed ? shippingCents : 0);
      taxAmount = Math.round(
        (rate.rateBps * taxableAmount) / (10000 + rate.rateBps)
      );
    } else {
      taxableAmount = subtotalCents;
      if (rate.isCompound) taxableAmount = subtotalCents + runningTaxTotal;
      if (rate.isShippingTaxed) taxableAmount += shippingCents;
      taxAmount = Math.round((rate.rateBps / 10000) * taxableAmount);
    }

    breakdown.push({
      name: rate.name,
      rateBps: rate.rateBps,
      amount: taxAmount,
    });

    runningTaxTotal += taxAmount;
  }

  return { taxTotal: runningTaxTotal, breakdown, taxInclusive };
}
