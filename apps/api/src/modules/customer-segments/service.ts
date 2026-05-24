import { eq, and, isNull, desc, sql } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { customerSegments, customerSegmentMembers, customers } from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";


export interface CreateCustomerSegmentDto {
  name: string;
  slug?: string;
  type?: "dynamic" | "manual" | "system";
  status?: "active" | "archived";
  description?: string | null;
  ruleJson?: unknown;
}

export interface UpdateCustomerSegmentDto {
  name?: string;
  slug?: string;
  type?: "dynamic" | "manual" | "system";
  status?: "active" | "archived";
  description?: string | null;
  ruleJson?: unknown;
}

export async function createCustomerSegment(actor: AuthActor, data: CreateCustomerSegmentDto) {
  assertPermission(actor, "customer-segment:manage:any");

  const slug =
    data.slug ||
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const [segment] = await db
    .insert(customerSegments)
    .values({
      id: generateId(),
      name: data.name,
      slug,
      type: data.type ?? "dynamic",
      status: data.status ?? "active",
      description: data.description ?? null,
      ruleJson: data.ruleJson ?? null,
    })
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "customer_segment",
    entityId: segment!.id,
    action: "customer_segment.created",
    afterJson: segment,
  });

  return segment!;
}

export async function listCustomerSegments(actor: AuthActor) {
  assertPermission(actor, "customer-segment:manage:any");

  return db
    .select()
    .from(customerSegments)
    .where(isNull(customerSegments.deletedAt))
    .orderBy(desc(customerSegments.createdAt));
}

export async function getCustomerSegmentById(actor: AuthActor, id: string) {
  assertPermission(actor, "customer-segment:manage:any");

  const [segment] = await db
    .select()
    .from(customerSegments)
    .where(and(eq(customerSegments.id, id), isNull(customerSegments.deletedAt)));
  if (!segment) throw new NotFoundError("Customer segment not found");

  // customerCount is maintained as a denormalized field on add/remove,
  // so no separate COUNT query is needed.
  return { ...segment, memberCount: segment.customerCount };
}

export async function updateCustomerSegment(
  actor: AuthActor,
  id: string,
  data: UpdateCustomerSegmentDto
) {
  assertPermission(actor, "customer-segment:manage:any");

  const [existing] = await db
    .select()
    .from(customerSegments)
    .where(and(eq(customerSegments.id, id), isNull(customerSegments.deletedAt)));
  if (!existing) throw new NotFoundError("Customer segment not found");

  if (existing.isSystem) {
    throw new UnprocessableError("System segments cannot be modified");
  }

  const [updated] = await db
    .update(customerSegments)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.ruleJson !== undefined && { ruleJson: data.ruleJson ?? null }),
      updatedAt: new Date(),
    })
    .where(eq(customerSegments.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "customer_segment",
    entityId: id,
    action: "customer_segment.updated",
    beforeJson: existing,
    afterJson: updated,
  });

  return updated!;
}

export async function deleteCustomerSegment(actor: AuthActor, id: string) {
  assertPermission(actor, "customer-segment:manage:any");

  const [existing] = await db
    .select()
    .from(customerSegments)
    .where(and(eq(customerSegments.id, id), isNull(customerSegments.deletedAt)));
  if (!existing) throw new NotFoundError("Customer segment not found");

  if (existing.isSystem) {
    throw new UnprocessableError("System segments cannot be deleted");
  }

  const [deleted] = await db
    .update(customerSegments)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(customerSegments.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "customer_segment",
    entityId: id,
    action: "customer_segment.deleted",
    beforeJson: existing,
    afterJson: deleted,
  });

  return deleted!;
}

export async function addMember(actor: AuthActor, segmentId: string, customerId: string) {
  assertPermission(actor, "customer-segment:manage:any");

  const [segment] = await db
    .select()
    .from(customerSegments)
    .where(and(eq(customerSegments.id, segmentId), isNull(customerSegments.deletedAt)));
  if (!segment) throw new NotFoundError("Customer segment not found");

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), isNull(customers.deletedAt)));
  if (!customer) throw new NotFoundError("Customer not found");

  const inserted = await db
    .insert(customerSegmentMembers)
    .values({ segmentId, customerId })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) {
    await db
      .update(customerSegments)
      .set({
        customerCount: sql`${customerSegments.customerCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(customerSegments.id, segmentId));
  }

  return { segmentId, customerId };
}

export async function removeMember(actor: AuthActor, segmentId: string, customerId: string) {
  assertPermission(actor, "customer-segment:manage:any");

  const [segment] = await db
    .select()
    .from(customerSegments)
    .where(and(eq(customerSegments.id, segmentId), isNull(customerSegments.deletedAt)));
  if (!segment) throw new NotFoundError("Customer segment not found");

  const deleted = await db
    .delete(customerSegmentMembers)
    .where(
      and(
        eq(customerSegmentMembers.segmentId, segmentId),
        eq(customerSegmentMembers.customerId, customerId)
      )
    )
    .returning();

  if (deleted.length > 0) {
    await db
      .update(customerSegments)
      .set({
        customerCount: sql`GREATEST(${customerSegments.customerCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(customerSegments.id, segmentId));
  }

  return { segmentId, customerId };
}

export async function listMembers(
  actor: AuthActor,
  segmentId: string,
  opts: { page?: number; limit?: number } = {}
) {
  assertPermission(actor, "customer-segment:manage:any");

  const [segment] = await db
    .select()
    .from(customerSegments)
    .where(and(eq(customerSegments.id, segmentId), isNull(customerSegments.deletedAt)));
  if (!segment) throw new NotFoundError("Customer segment not found");

  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: customers.id,
      email: customers.email,
      firstName: customers.firstName,
      lastName: customers.lastName,
      totalOrders: customers.totalOrders,
      totalSpent: customers.totalSpent,
      emailMarketingSubscribed: customers.emailMarketingSubscribed,
      state: customers.state,
    })
    .from(customerSegmentMembers)
    .innerJoin(customers, eq(customerSegmentMembers.customerId, customers.id))
    .where(eq(customerSegmentMembers.segmentId, segmentId))
    .limit(limit)
    .offset(offset);

  return rows;
}
