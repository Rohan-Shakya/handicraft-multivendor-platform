import type { AuthActor } from "@repo/types";
import { db } from "../db/index.js";
import { auditLogs } from "../db/schema/index.js";
import { generateId } from "./id.js";

/**
 * `audit_logs.actor_user_id` is a FK to `users.id`, which only contains admin
 * + vendor users — never customers. Passing a customer id here triggers a
 * FK violation. Use this helper at every call site so customer/vendor-typed
 * actors never leak into the column.
 */
export function auditActorId(actor: AuthActor | undefined | null): string | undefined {
  if (!actor) return undefined;
  if (actor.id === "system") return undefined; // SYSTEM_ACTOR — synthetic, no users row
  if (actor.type === "admin" || actor.type === "vendor") return actor.id;
  return undefined;
}

export async function logAudit(params: {
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
  tx?: typeof db;
}): Promise<void> {
  const executor = params.tx ?? db;
  await executor.insert(auditLogs).values({
    id: generateId(),
    actorUserId: params.actorUserId ?? null,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    beforeJson: params.beforeJson ?? null,
    afterJson: params.afterJson ?? null,
    metadata: params.metadata ?? null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  });
}

/**
 * Extract IP + user-agent from a Fastify request. Use at any audit site that
 * cares about forensic attribution (auth events, payment moves, KYC).
 */
export function auditRequestContext(req: {
  ip?: string;
  headers?: Record<string, unknown>;
}): { ipAddress?: string; userAgent?: string } {
  const ua = req.headers?.["user-agent"];
  return {
    ipAddress: req.ip || undefined,
    userAgent: typeof ua === "string" ? ua.slice(0, 512) : undefined,
  };
}
