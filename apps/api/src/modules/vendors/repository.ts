import { eq, and, sql, ilike, or, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
import {
  vendors,
  users,
  vendorMemberships,
  vendorOrders,
  products,
  vendorKycs,
} from "../../db/schema/index.js";
import type { UpdateVendorDto, VendorFilters } from "./types.js";

function generateId() {
  return crypto.randomUUID();
}

export async function findVendors(
  filters: VendorFilters,
  options: { excludeDeleted?: boolean } = {}
) {
  const { page = 1, limit = 20, status, search } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    status ? eq(vendors.status, status) : undefined,
    options.excludeDeleted ? isNull(vendors.deletedAt) : undefined,
    search
      ? or(
          ilike(vendors.name, `%${escapeLike(search)}%`),
          ilike(vendors.slug, `%${escapeLike(search)}%`),
          ilike(vendors.bio, `%${escapeLike(search)}%`)
        )
      : undefined,
  ].filter(Boolean);

  const where =
    conditions.length > 0 ? and(...(conditions as Parameters<typeof and>)) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(vendors as any),
        productCount: sql<number>`(
          SELECT COUNT(*)::int FROM products
          WHERE products.vendor_id = vendors.id
            AND products.deleted_at IS NULL
            AND products.status = 'active'
        )`.as("product_count"),
      })
      .from(vendors)
      .where(where)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(vendors).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function findVendorById(id: string) {
  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, id), isNull(vendors.deletedAt)));
  return vendor ?? null;
}

export async function findVendorBySlug(slug: string) {
  const [vendor] = await db.select().from(vendors).where(eq(vendors.slug, slug));
  return vendor ?? null;
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export async function createVendor(data: {
  name: string;
  slug: string;
  bio?: string;
  logoUrl?: string;
  bannerUrl?: string;
  userEmail: string;
  passwordHash: string;
  createdBy?: string;
  legalName?: string;
  websiteUrl?: string;
  primaryEmail?: string;
  supportEmail?: string;
  billingEmail?: string;
  primaryPhone?: string;
  supportPhone?: string;
  countryCode?: string;
  currencyCode?: string;
  timezone?: string;
  vatNumber?: string;
  taxId?: string;
  registrationNumber?: string;
  commissionBps?: number;
}) {
  return db.transaction(async (tx) => {
    const vendorId = generateId();
    const userId = generateId();

    const [vendor] = await tx
      .insert(vendors)
      .values({
        id: vendorId,
        name: data.name,
        slug: data.slug,
        bio: data.bio,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        createdBy: data.createdBy ?? null,
        legalName: data.legalName,
        websiteUrl: data.websiteUrl,
        primaryEmail: data.primaryEmail,
        supportEmail: data.supportEmail,
        billingEmail: data.billingEmail,
        primaryPhone: data.primaryPhone,
        supportPhone: data.supportPhone,
        countryCode: data.countryCode,
        currencyCode: data.currencyCode,
        timezone: data.timezone,
        vatNumber: data.vatNumber,
        taxId: data.taxId,
        registrationNumber: data.registrationNumber,
        ...(data.commissionBps !== undefined ? { commissionBps: data.commissionBps } : {}),
      })
      .returning();

    // Create the owner user account (no vendorId column on users — membership is separate)
    const [user] = await tx
      .insert(users)
      .values({
        id: userId,
        email: data.userEmail,
        passwordHash: data.passwordHash,
      })
      .returning();

    // Create vendor membership as owner
    await tx.insert(vendorMemberships).values({
      id: generateId(),
      userId: user!.id,
      vendorId,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
      acceptedAt: new Date(),
    });

    return vendor!;
  });
}

export async function updateVendor(id: string, data: UpdateVendorDto) {
  const [vendor] = await db
    .update(vendors)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(vendors.id, id))
    .returning();
  return vendor ?? null;
}

export async function updateVendorStatus(
  id: string,
  status: "active" | "suspended" | "pending" | "rejected",
  meta?: { suspensionReason?: string; rejectionReason?: string }
) {
  const now = new Date();
  const patch: Record<string, unknown> = { status, updatedAt: now };

  if (status === "active") patch.approvedAt = now;
  if (status === "suspended") {
    patch.suspendedAt = now;
    patch.suspensionReason = meta?.suspensionReason ?? null;
  }
  if (status === "rejected") {
    patch.rejectedAt = now;
    patch.rejectionReason = meta?.rejectionReason ?? null;
  }

  const [vendor] = await db
    .update(vendors)
    .set(patch as any)
    .where(eq(vendors.id, id))
    .returning();
  return vendor ?? null;
}

export async function findVendorMemberships(vendorId: string) {
  return db
    .select({
      membership: vendorMemberships,
      user: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(vendorMemberships)
    .innerJoin(users, eq(vendorMemberships.userId, users.id))
    .where(eq(vendorMemberships.vendorId, vendorId));
}

export async function findActiveMembershipByUserAndVendor(userId: string, vendorId: string) {
  const [membership] = await db
    .select()
    .from(vendorMemberships)
    .where(
      and(
        eq(vendorMemberships.userId, userId),
        eq(vendorMemberships.vendorId, vendorId),
        eq(vendorMemberships.status, "active")
      )
    );
  return membership ?? null;
}

export async function findActiveMembershipsByUser(userId: string) {
  return db
    .select({
      membership: vendorMemberships,
      vendor: {
        id: vendors.id,
        name: vendors.name,
        slug: vendors.slug,
        status: vendors.status,
      },
    })
    .from(vendorMemberships)
    .innerJoin(vendors, eq(vendorMemberships.vendorId, vendors.id))
    .where(
      and(eq(vendorMemberships.userId, userId), eq(vendorMemberships.status, "active"))
    );
}

export async function softDeleteVendor(id: string) {
  const [vendor] = await db
    .update(vendors)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(vendors.id, id), isNull(vendors.deletedAt)))
    .returning();
  return vendor ?? null;
}

export async function countActiveVendorOrders(vendorId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(vendorOrders)
    .where(
      and(
        eq(vendorOrders.vendorId, vendorId),
        sql`${vendorOrders.status} NOT IN ('completed', 'cancelled', 'archived')`
      )
    );
  return Number(result?.count ?? 0);
}

export async function getVendorStatistics(vendorId: string) {
  const [productCountResult, orderStats, memberCount, kycResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(eq(products.vendorId, vendorId), isNull(products.deletedAt))),
    db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalRevenue: sql<string>`coalesce(sum(${vendorOrders.totalPrice}), '0')`,
      })
      .from(vendorOrders)
      .where(eq(vendorOrders.vendorId, vendorId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(vendorMemberships)
      .where(
        and(
          eq(vendorMemberships.vendorId, vendorId),
          eq(vendorMemberships.status, "active")
        )
      ),
    db
      .select({ status: vendorKycs.status })
      .from(vendorKycs)
      .where(eq(vendorKycs.vendorId, vendorId))
      .limit(1),
  ]);

  return {
    productCount: Number(productCountResult[0]?.count ?? 0),
    totalOrders: Number(orderStats[0]?.totalOrders ?? 0),
    totalRevenue: orderStats[0]?.totalRevenue ?? "0",
    memberCount: Number(memberCount[0]?.count ?? 0),
    kycStatus: kycResult[0]?.status ?? null,
  };
}
