import { eq, and, isNull, desc, sql } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { commissionRules } from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";

export interface CreateCommissionRuleDto {
  name: string;
  scope: "default" | "vendor";
  vendorId?: string | null;
  status?: "draft" | "active" | "archived";
  type: "bps" | "flat_fee";
  value: string;
  currencyCode?: string | null;
  appliesToShipping?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface UpdateCommissionRuleDto {
  name?: string;
  scope?: "default" | "vendor";
  vendorId?: string | null;
  status?: "draft" | "active" | "archived";
  type?: "bps" | "flat_fee";
  value?: string;
  currencyCode?: string | null;
  appliesToShipping?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

function validateScopeVendor(scope: string, vendorId?: string | null) {
  if (scope === "default" && vendorId) {
    throw new UnprocessableError("Default-scope rules must not have a vendorId");
  }
  if (scope === "vendor" && !vendorId) {
    throw new UnprocessableError("Vendor-scope rules require a vendorId");
  }
}

function validateDateRange(startsAt?: string | null, endsAt?: string | null) {
  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
    throw new UnprocessableError("startsAt must be before or equal to endsAt");
  }
}

export async function createCommissionRule(actor: AuthActor, data: CreateCommissionRuleDto) {
  assertPermission(actor, "commission-rule:manage:any");

  validateScopeVendor(data.scope, data.vendorId);
  validateDateRange(data.startsAt, data.endsAt);

  const [rule] = await db
    .insert(commissionRules)
    .values({
      id: generateId(),
      name: data.name,
      scope: data.scope,
      vendorId: data.vendorId ?? null,
      status: data.status ?? "draft",
      type: data.type,
      value: data.value,
      currencyCode: data.currencyCode ?? null,
      appliesToShipping: data.appliesToShipping ?? false,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "commission_rule",
    entityId: rule!.id,
    action: "commission_rule.created",
    afterJson: rule,
  });

  return rule!;
}

export async function listCommissionRules(
  actor: AuthActor,
  pagination: { page?: number; limit?: number } = {}
) {
  assertPermission(actor, "commission-rule:manage:any");

  const page = pagination.page ?? 1;
  const limit = Math.min(pagination.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  const condition = isNull(commissionRules.archivedAt);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(commissionRules)
      .where(condition)
      .orderBy(desc(commissionRules.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(commissionRules)
      .where(condition),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function getCommissionRuleById(actor: AuthActor, id: string) {
  assertPermission(actor, "commission-rule:manage:any");

  const [rule] = await db
    .select()
    .from(commissionRules)
    .where(and(eq(commissionRules.id, id), isNull(commissionRules.archivedAt)));
  if (!rule) throw new NotFoundError("Commission rule not found");

  return rule;
}

export async function updateCommissionRule(
  actor: AuthActor,
  id: string,
  data: UpdateCommissionRuleDto
) {
  assertPermission(actor, "commission-rule:manage:any");

  const [existing] = await db
    .select()
    .from(commissionRules)
    .where(and(eq(commissionRules.id, id), isNull(commissionRules.archivedAt)));
  if (!existing) throw new NotFoundError("Commission rule not found");

  const scope = data.scope ?? existing.scope;
  const vendorId = data.vendorId !== undefined ? data.vendorId : existing.vendorId;
  validateScopeVendor(scope, vendorId);

  const startsAt = data.startsAt !== undefined ? data.startsAt : existing.startsAt?.toISOString();
  const endsAt = data.endsAt !== undefined ? data.endsAt : existing.endsAt?.toISOString();
  validateDateRange(startsAt, endsAt);

  const [updated] = await db
    .update(commissionRules)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.scope !== undefined && { scope: data.scope }),
      ...(data.vendorId !== undefined && { vendorId: data.vendorId ?? null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.value !== undefined && { value: data.value }),
      ...(data.currencyCode !== undefined && { currencyCode: data.currencyCode ?? null }),
      ...(data.appliesToShipping !== undefined && { appliesToShipping: data.appliesToShipping }),
      ...(data.startsAt !== undefined && {
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
      }),
      ...(data.endsAt !== undefined && { endsAt: data.endsAt ? new Date(data.endsAt) : null }),
      updatedAt: new Date(),
    })
    .where(eq(commissionRules.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "commission_rule",
    entityId: id,
    action: "commission_rule.updated",
    beforeJson: existing,
    afterJson: updated,
  });

  return updated!;
}

export async function deleteCommissionRule(actor: AuthActor, id: string) {
  assertPermission(actor, "commission-rule:manage:any");

  const [existing] = await db
    .select()
    .from(commissionRules)
    .where(and(eq(commissionRules.id, id), isNull(commissionRules.archivedAt)));
  if (!existing) throw new NotFoundError("Commission rule not found");

  const [archived] = await db
    .update(commissionRules)
    .set({
      status: "archived",
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(commissionRules.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "commission_rule",
    entityId: id,
    action: "commission_rule.archived",
    beforeJson: existing,
    afterJson: archived,
  });

  return archived!;
}
