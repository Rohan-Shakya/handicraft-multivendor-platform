import crypto from "crypto";
import type { AuthActor } from "@repo/types";
import { assertPermission } from "../../lib/permissions.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { generateId } from "../../lib/id.js";
import { db } from "../../db/index.js";
import { giftCards, giftCardTransactions } from "../../db/schema/index.js";
import { eq, desc, ilike, and, sql, count } from "drizzle-orm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateGiftCardCode(): string {
  return crypto
    .randomBytes(8)
    .toString("hex")
    .toUpperCase()
    .slice(0, 16);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface GiftCardFilters {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

interface CreateGiftCardDto {
  initialBalance: number;
  code?: string;
  customerId?: string;
  currencyCode?: string;
  expiresAt?: string;
  note?: string;
}

interface UpdateGiftCardDto {
  status?: "active" | "disabled";
  note?: string;
  expiresAt?: string | null;
  customerId?: string | null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function listGiftCards(actor: AuthActor, filters: GiftCardFilters) {
  if (actor.type !== "admin") throw new ForbiddenError("Admin access required");
  assertPermission(actor, "settings:manage");

  const { page, limit, status, search } = filters;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status && status !== "all") {
    conditions.push(eq(giftCards.status, status as any));
  }
  if (search) {
    conditions.push(ilike(giftCards.code, `%${search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(giftCards)
      .where(where)
      .orderBy(desc(giftCards.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(giftCards)
      .where(where),
  ]);

  return {
    data,
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
  };
}

export async function getGiftCardById(actor: AuthActor, id: string) {
  if (actor.type !== "admin") throw new ForbiddenError("Admin access required");
  assertPermission(actor, "settings:manage");

  const card = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
  if (!card[0]) throw new NotFoundError("Gift card not found");

  const transactions = await db
    .select()
    .from(giftCardTransactions)
    .where(eq(giftCardTransactions.giftCardId, id))
    .orderBy(desc(giftCardTransactions.createdAt));

  return { ...card[0], transactions };
}

export async function createGiftCard(actor: AuthActor, data: CreateGiftCardDto) {
  if (actor.type !== "admin") throw new ForbiddenError("Admin access required");
  assertPermission(actor, "settings:manage");

  if (data.initialBalance <= 0) {
    throw new BadRequestError("Initial balance must be greater than 0");
  }

  const code = data.code?.toUpperCase() || generateGiftCardCode();

  // Check for duplicate code
  const existing = await db
    .select({ id: giftCards.id })
    .from(giftCards)
    .where(eq(giftCards.code, code))
    .limit(1);
  if (existing[0]) {
    throw new BadRequestError("Gift card code already exists");
  }

  const id = generateId();
  const now = new Date();

  const [card] = await db
    .insert(giftCards)
    .values({
      id,
      code,
      initialBalance: data.initialBalance,
      currentBalance: data.initialBalance,
      currencyCode: data.currencyCode ?? "USD",
      status: "active",
      customerId: data.customerId ?? null,
      issuedByUserId: actor.id,
      note: data.note ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create initial credit transaction
  await db.insert(giftCardTransactions).values({
    id: generateId(),
    giftCardId: id,
    type: "credit",
    amount: data.initialBalance,
    balanceAfter: data.initialBalance,
    note: "Initial balance",
    createdAt: now,
  });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "gift_card",
    entityId: id,
    action: "gift_card.created",
    afterJson: card,
  });

  return card;
}

export async function updateGiftCard(
  actor: AuthActor,
  id: string,
  data: UpdateGiftCardDto
) {
  if (actor.type !== "admin") throw new ForbiddenError("Admin access required");
  assertPermission(actor, "settings:manage");

  const existing = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
  if (!existing[0]) throw new NotFoundError("Gift card not found");

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (data.status !== undefined) updates.status = data.status;
  if (data.note !== undefined) updates.note = data.note;
  if (data.expiresAt !== undefined) {
    updates.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  }
  if (data.customerId !== undefined) updates.customerId = data.customerId;

  const [card] = await db
    .update(giftCards)
    .set(updates)
    .where(eq(giftCards.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "gift_card",
    entityId: id,
    action: "gift_card.updated",
    beforeJson: existing[0],
    afterJson: card,
  });

  return card;
}

export async function creditGiftCard(
  actor: AuthActor,
  id: string,
  amount: number,
  note?: string
) {
  if (actor.type !== "admin") throw new ForbiddenError("Admin access required");
  assertPermission(actor, "settings:manage");

  if (amount <= 0) {
    throw new BadRequestError("Credit amount must be greater than 0");
  }

  const existing = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
  if (!existing[0]) throw new NotFoundError("Gift card not found");

  const newBalance = existing[0].currentBalance + amount;

  const [card] = await db
    .update(giftCards)
    .set({
      currentBalance: newBalance,
      initialBalance: existing[0].initialBalance + amount,
      status: newBalance > 0 ? "active" : existing[0].status,
      updatedAt: new Date(),
    })
    .where(eq(giftCards.id, id))
    .returning();

  await db.insert(giftCardTransactions).values({
    id: generateId(),
    giftCardId: id,
    type: "credit",
    amount,
    balanceAfter: newBalance,
    note: note ?? null,
  });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "gift_card",
    entityId: id,
    action: "gift_card.credited",
    beforeJson: existing[0],
    afterJson: card,
    metadata: { amount, note },
  });

  return card;
}

export async function debitGiftCard(
  actor: AuthActor,
  id: string,
  amount: number,
  note?: string,
  orderId?: string
) {
  if (actor.type !== "admin") throw new ForbiddenError("Admin access required");
  assertPermission(actor, "settings:manage");

  if (amount <= 0) {
    throw new BadRequestError("Debit amount must be greater than 0");
  }

  const existing = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
  if (!existing[0]) throw new NotFoundError("Gift card not found");

  if (existing[0].currentBalance < amount) {
    throw new BadRequestError(
      `Insufficient balance. Available: ${existing[0].currentBalance}, requested: ${amount}`
    );
  }

  const newBalance = existing[0].currentBalance - amount;
  const newStatus = newBalance === 0 ? "depleted" : existing[0].status;

  const [card] = await db
    .update(giftCards)
    .set({
      currentBalance: newBalance,
      status: newStatus as any,
      updatedAt: new Date(),
    })
    .where(eq(giftCards.id, id))
    .returning();

  await db.insert(giftCardTransactions).values({
    id: generateId(),
    giftCardId: id,
    type: "debit",
    amount: -amount,
    balanceAfter: newBalance,
    orderId: orderId ?? null,
    note: note ?? null,
  });

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "gift_card",
    entityId: id,
    action: "gift_card.debited",
    beforeJson: existing[0],
    afterJson: card,
    metadata: { amount, note, orderId },
  });

  return card;
}

// ─── Storefront-facing helpers ───────────────────────────────────────────────

/**
 * Public balance lookup by code. Returns a slim payload (balance + currency +
 * expiry) — never the full record, since this endpoint is unauthenticated.
 * Rejects disabled / expired cards so the customer sees a useful error.
 */
export async function lookupGiftCardByCode(code: string): Promise<{
  code: string;
  balance: number;
  currencyCode: string;
  expiresAt: Date | null;
  status: string;
} | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const [card] = await db
    .select()
    .from(giftCards)
    .where(eq(giftCards.code, normalized))
    .limit(1);
  if (!card) return null;

  return {
    code: card.code,
    balance: card.currentBalance,
    currencyCode: card.currencyCode,
    expiresAt: card.expiresAt,
    status: card.status,
  };
}

/**
 * System-level (non-admin) debit used by checkout when a customer redeems a
 * gift card as a payment method. Skips the admin permission check that the
 * external `debitGiftCard` does. Validates expiry + status + balance.
 *
 * Returns the amount that was actually debited (≤ requested). Throws if the
 * card is invalid.
 */
export async function redeemGiftCardForOrder(
  code: string,
  requestedAmount: number,
  orderId: string
): Promise<{ giftCardId: string; debited: number; balanceAfter: number; currencyCode: string }> {
  const normalized = code.trim().toUpperCase();
  const [card] = await db
    .select()
    .from(giftCards)
    .where(eq(giftCards.code, normalized))
    .limit(1);
  if (!card) throw new BadRequestError("Gift card not found");
  if (card.status !== "active") throw new BadRequestError("Gift card is not active");
  if (card.expiresAt && card.expiresAt < new Date()) {
    throw new BadRequestError("Gift card has expired");
  }
  if (card.currentBalance <= 0) {
    throw new BadRequestError("Gift card has no remaining balance");
  }

  const debited = Math.min(card.currentBalance, requestedAmount);
  const balanceAfter = card.currentBalance - debited;
  const newStatus = balanceAfter === 0 ? "depleted" : card.status;

  await db
    .update(giftCards)
    .set({ currentBalance: balanceAfter, status: newStatus as any, updatedAt: new Date() })
    .where(eq(giftCards.id, card.id));

  await db.insert(giftCardTransactions).values({
    id: generateId(),
    giftCardId: card.id,
    type: "debit",
    amount: -debited,
    balanceAfter,
    orderId,
    note: "Redeemed at checkout",
  });

  return {
    giftCardId: card.id,
    debited,
    balanceAfter,
    currencyCode: card.currencyCode,
  };
}
