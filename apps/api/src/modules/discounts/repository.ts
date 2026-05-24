import { eq, and, sql, desc, lte, gte, isNull, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  discounts,
  discountCodes,
  discountVendorTargets,
  discountProducts,
  discountCollections,
  discountRedemptions,
  cartAppliedDiscounts,
} from "../../db/schema/index.js";
import { generateId } from "../../lib/id.js";
import type {
  CreateDiscountDto,
  UpdateDiscountDto,
  CreateDiscountCodeDto,
  DiscountFilters,
} from "./types.js";

// ─── Discounts ────────────────────────────────────────────────────────────────

export async function findDiscounts(filters: DiscountFilters) {
  const { page = 1, limit = 20, status, scope } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    status ? eq(discounts.status, status as any) : undefined,
    scope ? eq(discounts.scope, scope as any) : undefined,
    isNull(discounts.deletedAt),
  ].filter(Boolean);

  const where = and(...(conditions as any));

  const [rows, countResult] = await Promise.all([
    db.select().from(discounts).where(where).orderBy(desc(discounts.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(discounts).where(where),
  ]);

  // Fetch product/collection targets for each discount
  const discountIds = rows.map((r) => r.id);
  let productTargetMap: Record<string, string[]> = {};
  let collectionTargetMap: Record<string, string[]> = {};

  if (discountIds.length) {
    const [productTargets, collectionTargets] = await Promise.all([
      db
        .select({ discountId: discountProducts.discountId, productId: discountProducts.productId })
        .from(discountProducts)
        .where(sql`${discountProducts.discountId} IN ${discountIds}`),
      db
        .select({ discountId: discountCollections.discountId, collectionId: discountCollections.collectionId })
        .from(discountCollections)
        .where(sql`${discountCollections.discountId} IN ${discountIds}`),
    ]);

    for (const pt of productTargets) {
      (productTargetMap[pt.discountId] ??= []).push(pt.productId);
    }
    for (const ct of collectionTargets) {
      (collectionTargetMap[ct.discountId] ??= []).push(ct.collectionId);
    }
  }

  const data = rows.map((row) => ({
    ...row,
    productIds: productTargetMap[row.id] ?? [],
    collectionIds: collectionTargetMap[row.id] ?? [],
  }));

  return { data, total: Number(countResult[0]?.count ?? 0), page, limit };
}

/**
 * Vendor ids targeted by a `targeted_vendors`-scope discount.
 */
export async function findDiscountVendorTargets(discountId: string) {
  return db
    .select({ vendorId: discountVendorTargets.vendorId })
    .from(discountVendorTargets)
    .where(eq(discountVendorTargets.discountId, discountId));
}

export async function findDiscountById(id: string) {
  const [discount] = await db
    .select()
    .from(discounts)
    .where(and(eq(discounts.id, id), isNull(discounts.deletedAt)));

  if (!discount) return null;

  const [productTargets, collectionTargets] = await Promise.all([
    db
      .select({ productId: discountProducts.productId })
      .from(discountProducts)
      .where(eq(discountProducts.discountId, id)),
    db
      .select({ collectionId: discountCollections.collectionId })
      .from(discountCollections)
      .where(eq(discountCollections.discountId, id)),
  ]);

  return {
    ...discount,
    productIds: productTargets.map((r) => r.productId),
    collectionIds: collectionTargets.map((r) => r.collectionId),
  };
}

export async function createDiscount(data: CreateDiscountDto, createdByUserId?: string) {
  const [discount] = await db
    .insert(discounts)
    .values({
      id: generateId(),
      scope: data.scope ?? "platform",
      vendorId: data.vendorId ?? null,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "draft",
      type: data.type,
      method: data.method ?? "code",
      campaignId: data.campaignId ?? null,
      targetType: data.targetType ?? "order",
      value: String(data.value),
      minimumSubtotal: data.minimumSubtotal ? String(data.minimumSubtotal) : null,
      usageLimit: data.usageLimit ?? null,
      oncePerCustomer: data.oncePerCustomer ?? false,
      firstOrderOnly: data.firstOrderOnly ?? false,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      createdByUserId: createdByUserId ?? null,
    })
    .returning();

  // Create vendor targets if targeted_vendors scope
  if (data.scope === "targeted_vendors" && data.vendorTargetIds?.length) {
    await db.insert(discountVendorTargets).values(
      data.vendorTargetIds.map((vendorId) => ({
        discountId: discount!.id,
        vendorId,
      }))
    );
  }

  // Create product targets
  if (data.productIds?.length) {
    await db.insert(discountProducts).values(
      data.productIds.map((productId) => ({
        id: generateId(),
        discountId: discount!.id,
        productId,
      }))
    );
  }

  // Create collection targets
  if (data.collectionIds?.length) {
    await db.insert(discountCollections).values(
      data.collectionIds.map((collectionId) => ({
        id: generateId(),
        discountId: discount!.id,
        collectionId,
      }))
    );
  }

  return discount!;
}

export async function updateDiscount(id: string, data: UpdateDiscountDto) {
  const { productIds, collectionIds, ...updateData } = data;

  const [discount] = await db
    .update(discounts)
    .set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(discounts.id, id), isNull(discounts.deletedAt)))
    .returning();

  if (!discount) return null;

  // Replace product targets if provided
  if (productIds !== undefined) {
    await db.delete(discountProducts).where(eq(discountProducts.discountId, id));
    if (productIds.length) {
      await db.insert(discountProducts).values(
        productIds.map((productId) => ({
          id: generateId(),
          discountId: id,
          productId,
        }))
      );
    }
  }

  // Replace collection targets if provided
  if (collectionIds !== undefined) {
    await db.delete(discountCollections).where(eq(discountCollections.discountId, id));
    if (collectionIds.length) {
      await db.insert(discountCollections).values(
        collectionIds.map((collectionId) => ({
          id: generateId(),
          discountId: id,
          collectionId,
        }))
      );
    }
  }

  return discount;
}

export async function archiveDiscount(id: string) {
  const [discount] = await db
    .update(discounts)
    .set({ status: "archived", deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(discounts.id, id))
    .returning();
  return discount ?? null;
}

// ─── Discount codes ───────────────────────────────────────────────────────────

export async function findDiscountCodeByCode(code: string) {
  const [row] = await db
    .select({ code: discountCodes, discount: discounts })
    .from(discountCodes)
    .innerJoin(discounts, eq(discountCodes.discountId, discounts.id))
    .where(
      and(
        eq(discountCodes.code, code),
        eq(discountCodes.status, "active"),
        isNull(discountCodes.deletedAt),
        isNull(discounts.deletedAt)
      )
    );
  return row ?? null;
}

export async function findDiscountCodesByDiscount(discountId: string) {
  return db
    .select()
    .from(discountCodes)
    .where(and(eq(discountCodes.discountId, discountId), isNull(discountCodes.deletedAt)));
}

export async function createDiscountCode(data: CreateDiscountCodeDto) {
  const [code] = await db
    .insert(discountCodes)
    .values({
      id: generateId(),
      discountId: data.discountId,
      code: data.code.toUpperCase(),
      status: "active",
      usageLimit: data.usageLimit ?? null,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    })
    .returning();
  return code!;
}

// ─── Redemption tracking ──────────────────────────────────────────────────────

export async function countCustomerRedemptions(
  discountId: string,
  customerId: string
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(discountRedemptions)
    .where(
      and(
        eq(discountRedemptions.discountId, discountId),
        eq(discountRedemptions.customerId, customerId),
        or(
          eq(discountRedemptions.status, "applied_to_order"),
          eq(discountRedemptions.status, "completed")
        )
      )
    );
  return Number(result?.count ?? 0);
}

export async function countCustomerOrders(customerId: string): Promise<number> {
  const { orders } = await import("../../db/schema/index.js");
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.customerId, customerId));
  return Number(result?.count ?? 0);
}

export async function createRedemptionRecord(data: {
  discountId: string;
  discountCodeId?: string;
  cartId?: string;
  customerId?: string;
  code: string;
  amount: string;
}) {
  const [row] = await db
    .insert(discountRedemptions)
    .values({
      id: generateId(),
      discountId: data.discountId,
      discountCodeId: data.discountCodeId ?? null,
      cartId: data.cartId ?? null,
      customerId: data.customerId ?? null,
      code: data.code,
      amount: data.amount,
      status: "applied_to_cart",
      redeemedAt: new Date(),
    })
    .returning();
  return row!;
}
