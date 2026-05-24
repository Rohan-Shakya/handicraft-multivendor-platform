import { eq, and, isNull, sql, inArray, desc } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import {
  vendorOrderFinancials,
  vendorPayouts,
  vendorPayoutItems,
  vendorOrders,
  vendors,
  vendorKycs,
  commissionRules,
} from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { BadRequestError, NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { generateId, generatePayoutReference } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { toCents, fromCents, sumMoney } from "../../lib/money.js";
import { sendEmail } from "../../lib/email.js";
import { payoutCompletedEmail } from "../../lib/email-templates.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve the effective commission rate (in bps) for a vendor.
 *
 * Priority:
 *  1. Active vendor-scoped commission rule whose date range covers now
 *  2. Active default-scoped commission rule whose date range covers now
 *  3. Vendor's own commissionBps field (fallback)
 */
async function resolveCommissionBps(vendorId: string, fallbackBps: number): Promise<number> {
  const now = new Date();

  // Look for an active vendor-specific rule first, then a default rule
  const rules = await db
    .select()
    .from(commissionRules)
    .where(
      and(
        eq(commissionRules.status, "active"),
        eq(commissionRules.type, "bps")
      )
    );

  // Find vendor-scoped rule that is currently valid
  const vendorRule = rules.find(
    (r) =>
      r.scope === "vendor" &&
      r.vendorId === vendorId &&
      (r.startsAt === null || r.startsAt <= now) &&
      (r.endsAt === null || r.endsAt >= now)
  );
  if (vendorRule) return Number(vendorRule.value);

  // Find default-scoped rule that is currently valid
  const defaultRule = rules.find(
    (r) =>
      r.scope === "default" &&
      r.vendorId === null &&
      (r.startsAt === null || r.startsAt <= now) &&
      (r.endsAt === null || r.endsAt >= now)
  );
  if (defaultRule) return Number(defaultRule.value);

  return fallbackBps;
}

/**
 * Valid payout status transitions.
 * Maps current status -> set of allowed next statuses.
 */
const VALID_STATUS_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(["scheduled", "cancelled"]),
  scheduled: new Set(["paid", "failed", "cancelled"]),
  failed: new Set(["scheduled", "cancelled"]),
};

// ─── Vendor Order Financials (generated after order is paid) ──────────────────

export async function generateVendorOrderFinancial(
  actor: AuthActor,
  vendorOrderId: string
) {
  assertPermission(actor, "payout:manage:any");

  const [vo] = await db.select().from(vendorOrders).where(eq(vendorOrders.id, vendorOrderId));
  if (!vo) throw new NotFoundError("Vendor order not found");

  // Check not already generated
  const [existing] = await db
    .select()
    .from(vendorOrderFinancials)
    .where(eq(vendorOrderFinancials.vendorOrderId, vendorOrderId));
  if (existing) throw new BadRequestError("Financial record already exists for this vendor order");

  // Get vendor for fallback commission rate
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vo.vendorId));
  if (!vendor) throw new NotFoundError("Vendor not found");

  // Resolve effective commission rate from rules or vendor fallback
  const commissionBps = await resolveCommissionBps(vo.vendorId, vendor.commissionBps);

  // Convert all monetary values to integer cents for precise arithmetic
  const grossSalesCents = toCents(vo.subtotalPrice);
  const discountTotalCents = toCents(vo.discountTotal);
  const shippingAmountCents = toCents(vo.shippingPrice);
  const taxAmountCents = toCents(vo.taxTotal);
  const refundedAmountCents = toCents(vo.totalRefunded);

  // Commission is calculated on (grossSales - discountTotal) only
  const commissionBaseCents = grossSalesCents - discountTotalCents;
  const commissionAmountCents = Math.max(
    0,
    Math.round((commissionBaseCents * commissionBps) / 10000)
  );

  // netPayable = grossSales - discountTotal + shippingAmount - commissionAmount - refundedAmount
  const netPayableCents = Math.max(
    0,
    grossSalesCents - discountTotalCents + shippingAmountCents - commissionAmountCents - refundedAmountCents
  );

  const [financial] = await db
    .insert(vendorOrderFinancials)
    .values({
      id: generateId(),
      vendorOrderId,
      vendorId: vo.vendorId,
      grossSales: fromCents(grossSalesCents),
      discountTotal: fromCents(discountTotalCents),
      shippingAmount: fromCents(shippingAmountCents),
      taxAmount: fromCents(taxAmountCents),
      refundedAmount: fromCents(refundedAmountCents),
      commissionBpsSnapshot: String(commissionBps),
      commissionAmount: fromCents(commissionAmountCents),
      netPayable: fromCents(netPayableCents),
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "vendor_order_financial",
    entityId: financial!.id,
    action: "vendor_order_financial.generated",
    afterJson: financial,
  });

  return financial!;
}

// ─── Payouts ─────────────────────────────────────────────────────────────────

export interface ListAllPayoutsFilters {
  page?: number;
  limit?: number;
  status?: string;
  vendorId?: string;
}

export async function listAllPayouts(actor: AuthActor, filters: ListAllPayoutsFilters) {
  assertPermission(actor, "payout:manage:any");
  const { page = 1, limit = 20, status, vendorId } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    status ? eq(vendorPayouts.status, status as typeof vendorPayouts.status.enumValues[number]) : undefined,
    vendorId ? eq(vendorPayouts.vendorId, vendorId) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(vendorPayouts)
      .where(where)
      .orderBy(desc(vendorPayouts.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(vendorPayouts).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function listPayoutsForVendor(actor: AuthActor, vendorId: string) {
  assertPermission(actor, "payout:manage:any");
  return db
    .select()
    .from(vendorPayouts)
    .where(eq(vendorPayouts.vendorId, vendorId))
    .orderBy(desc(vendorPayouts.createdAt));
}

/**
 * List vendor orders with financials that are eligible for payout.
 * Eligible = has a vendorOrderFinancial, is not already in a payout.
 */
export async function listEligibleForPayout(actor: AuthActor, vendorId: string) {
  assertPermission(actor, "payout:manage:any");

  // Vendor orders with financials that are not yet in any payout item
  // Uses LEFT JOIN anti-join pattern instead of correlated subquery for better performance
  const eligible = await db
    .select({ financial: vendorOrderFinancials, vendorOrder: vendorOrders })
    .from(vendorOrderFinancials)
    .innerJoin(vendorOrders, eq(vendorOrderFinancials.vendorOrderId, vendorOrders.id))
    .leftJoin(vendorPayoutItems, eq(vendorPayoutItems.vendorOrderId, vendorOrders.id))
    .where(
      and(
        eq(vendorOrderFinancials.vendorId, vendorId),
        isNull(vendorPayoutItems.id)
      )
    );

  return eligible;
}

/**
 * Create a payout batch for a vendor from eligible vendor orders.
 *
 * Validates:
 *  - All vendor orders belong to the specified vendor
 *  - Financial records exist for every vendor order
 *  - No vendor order is already included in an existing payout
 *
 * Within a transaction, creates the payout header and line items.
 */
export async function createPayout(
  actor: AuthActor,
  data: {
    vendorId: string;
    currencyCode: string;
    vendorOrderIds: string[];
    note?: string;
  }
) {
  assertPermission(actor, "payout:manage:any");

  if (data.vendorOrderIds.length === 0) {
    throw new BadRequestError("Must include at least one vendor order");
  }

  // KYC gate — we don't release funds to vendors who haven't passed KYC.
  // The latest vendor_kyc row must be in `approved` state. Missing rows count
  // as "not approved" and block the payout.
  const [latestKyc] = await db
    .select({ status: vendorKycs.status })
    .from(vendorKycs)
    .where(eq(vendorKycs.vendorId, data.vendorId))
    .orderBy(desc(vendorKycs.updatedAt))
    .limit(1);
  if (!latestKyc || latestKyc.status !== "approved") {
    throw new UnprocessableError(
      `Vendor ${data.vendorId} cannot receive payouts until KYC is approved (current: ${latestKyc?.status ?? "no submission"})`
    );
  }

  // 1. Verify all vendor orders exist and belong to this vendor
  const vendorOrderRows = await db
    .select({ id: vendorOrders.id, vendorId: vendorOrders.vendorId })
    .from(vendorOrders)
    .where(inArray(vendorOrders.id, data.vendorOrderIds));

  if (vendorOrderRows.length !== data.vendorOrderIds.length) {
    const foundIds = new Set(vendorOrderRows.map((r) => r.id));
    const missing = data.vendorOrderIds.filter((id) => !foundIds.has(id));
    throw new NotFoundError(`Vendor orders not found: ${missing.join(", ")}`);
  }

  const wrongVendor = vendorOrderRows.filter((r) => r.vendorId !== data.vendorId);
  if (wrongVendor.length > 0) {
    throw new UnprocessableError(
      `Vendor orders do not belong to vendor ${data.vendorId}: ${wrongVendor.map((r) => r.id).join(", ")}`
    );
  }

  // 2. Fetch financials for all requested vendor orders
  const financials = await db
    .select()
    .from(vendorOrderFinancials)
    .where(
      and(
        eq(vendorOrderFinancials.vendorId, data.vendorId),
        inArray(vendorOrderFinancials.vendorOrderId, data.vendorOrderIds)
      )
    );

  if (financials.length !== data.vendorOrderIds.length) {
    const financialOrderIds = new Set(financials.map((f) => f.vendorOrderId));
    const missingFinancials = data.vendorOrderIds.filter((id) => !financialOrderIds.has(id));
    throw new UnprocessableError(
      `Financial records missing for vendor orders: ${missingFinancials.join(", ")}. Generate financials first.`
    );
  }

  // 3. Check none are already in a payout
  const alreadyInPayout = await db
    .select({ vendorOrderId: vendorPayoutItems.vendorOrderId })
    .from(vendorPayoutItems)
    .where(inArray(vendorPayoutItems.vendorOrderId, data.vendorOrderIds));

  if (alreadyInPayout.length > 0) {
    const duplicates = alreadyInPayout.map((r) => r.vendorOrderId);
    throw new UnprocessableError(
      `Vendor orders already included in a payout: ${duplicates.join(", ")}`
    );
  }

  // 4. Sum netPayable using integer-cent arithmetic to avoid floating-point drift
  const totalAmount = sumMoney(financials.map((f) => f.netPayable));

  // 5. Create payout + items in a transaction
  return db.transaction(async (tx) => {
    const payoutId = generateId();

    const [payout] = await tx
      .insert(vendorPayouts)
      .values({
        id: payoutId,
        vendorId: data.vendorId,
        status: "pending",
        currencyCode: data.currencyCode,
        totalAmount,
        reference: generatePayoutReference(),
        note: data.note ?? null,
      })
      .returning();

    const payoutItemValues = financials.map((financial) => ({
      id: generateId(),
      payoutId,
      vendorOrderId: financial.vendorOrderId,
      vendorOrderFinancialId: financial.id,
      amount: financial.netPayable,
    }));

    if (payoutItemValues.length > 0) {
      await tx.insert(vendorPayoutItems).values(payoutItemValues);
    }

    await logAudit({
      actorUserId: auditActorId(actor),
      entityType: "payout",
      entityId: payoutId,
      action: "payout.created",
      afterJson: { ...payout, itemCount: payoutItemValues.length },
    });

    return payout!;
  });
}

/**
 * Update payout status with transition validation.
 *
 * Allowed transitions:
 *  - pending   -> scheduled, cancelled
 *  - scheduled -> paid, failed, cancelled
 *  - failed    -> scheduled, cancelled
 *
 * Sets paidAt timestamp when status becomes "paid".
 */
export async function updatePayoutStatus(
  actor: AuthActor,
  payoutId: string,
  status: "scheduled" | "paid" | "failed" | "cancelled"
) {
  assertPermission(actor, "payout:manage:any");

  const [payout] = await db.select().from(vendorPayouts).where(eq(vendorPayouts.id, payoutId));
  if (!payout) throw new NotFoundError("Payout not found");

  // Validate status transition
  const allowed = VALID_STATUS_TRANSITIONS[payout.status];
  if (!allowed || !allowed.has(status)) {
    throw new BadRequestError(
      `Cannot transition payout from "${payout.status}" to "${status}"`
    );
  }

  const now = new Date();
  const patch: Record<string, unknown> = { status, updatedAt: now };
  if (status === "paid") patch.paidAt = now;

  const [updated] = await db
    .update(vendorPayouts)
    .set(patch as never)
    .where(eq(vendorPayouts.id, payoutId))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "payout",
    entityId: payoutId,
    action: `payout.status.${status}`,
    beforeJson: payout,
    afterJson: updated,
  });

  // Send payout completed email when status is "paid"
  if (status === "paid") {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, payout.vendorId));
    if (vendor?.primaryEmail) {
      const emailData = payoutCompletedEmail({
        vendorName: vendor.name,
        payoutReference: payout.reference ?? payout.id,
        amount: updated!.totalAmount,
        currency: updated!.currencyCode,
      });
      sendEmail({ to: vendor.primaryEmail, subject: emailData.subject, html: emailData.html, text: emailData.text }).catch(() => {});
    }
  }

  return updated!;
}
