import { eq, and, gte, lte, desc, sql, like } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { auditLogs } from "../../db/schema/index.js";
import { users } from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError } from "../../lib/errors.js";

export interface ListAuditLogsFilters {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs(
  actor: AuthActor,
  filters: ListAuditLogsFilters
) {
  assertPermission(actor, "audit-log:read:any");

  const conditions = [];

  if (filters.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters.entityId) {
    conditions.push(eq(auditLogs.entityId, filters.entityId));
  }
  if (filters.action) {
    // Support both exact match ("discount.created") and partial ("created")
    // If the filter doesn't contain a dot, use LIKE for substring matching
    if (filters.action.includes(".")) {
      conditions.push(eq(auditLogs.action, filters.action));
    } else {
      conditions.push(like(auditLogs.action, `%${filters.action}%`));
    }
  }
  if (filters.actorId) {
    conditions.push(eq(auditLogs.actorUserId, filters.actorId));
  }
  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    // End of day for the end date
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogs.createdAt, endDate));
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        actorEmail: users.email,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        beforeJson: auditLogs.beforeJson,
        afterJson: auditLogs.afterJson,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(where),
  ]);

  return {
    data: rows,
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  };
}

export async function getAuditLogById(actor: AuthActor, id: string) {
  assertPermission(actor, "audit-log:read:any");

  const [log] = await db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      actorEmail: users.email,
      actorFirstName: users.firstName,
      actorLastName: users.lastName,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      action: auditLogs.action,
      beforeJson: auditLogs.beforeJson,
      afterJson: auditLogs.afterJson,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(eq(auditLogs.id, id));

  if (!log) throw new NotFoundError("Audit log entry not found");

  return log;
}
