import { eq, sql, and, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema/index.js";
import type { UserFilters } from "./types.js";

function generateId() {
  return crypto.randomUUID();
}

export async function findUsers(filters: UserFilters) {
  const { page = 1, limit = 20, role } = filters;
  const offset = (page - 1) * limit;

  const conditions = [isNull(users.deletedAt)];
  if (role) conditions.push(eq(users.platformRole, role as any));
  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db.select().from(users).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function findUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)));
  return user ?? null;
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)));
  return user ?? null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  role: string;
  firstName?: string;
  lastName?: string;
}) {
  const [user] = await db
    .insert(users)
    .values({
      id: generateId(),
      email: data.email,
      passwordHash: data.passwordHash,
      platformRole: data.role as "super_admin" | "support_agent",
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
    })
    .returning();
  return user!;
}

export async function updateUser(
  id: string,
  data: Partial<{
    email: string;
    passwordHash: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
  }>
) {
  const { role, ...rest } = data;
  const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (role !== undefined) {
    updateData.platformRole = role as "super_admin" | "support_agent";
  }
  const [user] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning();
  return user ?? null;
}

export async function deleteUser(id: string) {
  const [user] = await db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
    .where(eq(users.id, id))
    .returning();
  return user ?? null;
}
