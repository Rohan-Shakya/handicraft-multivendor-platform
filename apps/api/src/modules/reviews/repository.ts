import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  productReviews as reviews,
  products,
  orderItems,
  orders,
} from "../../db/schema/index.js";
import type { CreateReviewDto, UpdateReviewDto, ReviewFilters } from "./types.js";

/**
 * Verified-purchase check: returns true if the customer has at least one
 * fulfilled or paid order_item for this product (cancelled/archived items
 * don't count). Used to set `verifiedPurchase` on review creation.
 */
export async function hasPurchasedProduct(
  customerId: string,
  productId: string
): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.customerId, customerId),
        eq(orderItems.productId, productId),
        sql`${orderItems.status} NOT IN ('cancelled', 'archived')`
      )
    );
  return Number(row?.count ?? 0) > 0;
}

function generateId() {
  return crypto.randomUUID();
}

export async function findReviews(filters: ReviewFilters) {
  const { page = 1, limit = 20, productId, status, customerId } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    productId ? eq(reviews.productId, productId) : undefined,
    status ? eq(reviews.status, status as any) : undefined,
    customerId ? eq(reviews.customerId, customerId) : undefined,
  ].filter(Boolean);

  const where = conditions.length > 0 ? and(...(conditions as any)) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(reviews).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(reviews).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function findReviewById(id: string) {
  const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
  return review ?? null;
}

export async function findReviewByCustomerAndProduct(
  customerId: string,
  productId: string
) {
  const [review] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.customerId, customerId), eq(reviews.productId, productId)));
  return review ?? null;
}

export async function createReview(
  data: CreateReviewDto & { customerId: string; verifiedPurchase: boolean }
) {
  // Resolve vendorId from the product
  const [product] = await db
    .select({ vendorId: products.vendorId })
    .from(products)
    .where(eq(products.id, data.productId));

  if (!product) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }

  const [review] = await db
    .insert(reviews)
    .values({
      id: generateId(),
      vendorId: product.vendorId,
      productId: data.productId,
      customerId: data.customerId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      verifiedPurchase: data.verifiedPurchase,
    })
    .returning();
  return review!;
}

export async function updateReview(id: string, data: UpdateReviewDto) {
  const [review] = await db
    .update(reviews)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(reviews.id, id))
    .returning();
  return review ?? null;
}

export async function setReviewStatus(
  id: string,
  status: "pending" | "published" | "rejected"
) {
  const [review] = await db
    .update(reviews)
    .set({ status, updatedAt: new Date() })
    .where(eq(reviews.id, id))
    .returning();
  return review ?? null;
}

export async function deleteReview(id: string) {
  const [review] = await db
    .delete(reviews)
    .where(eq(reviews.id, id))
    .returning();
  return review ?? null;
}

// ─── Vendor-scoped helpers ────────────────────────────────────────────────────

export async function findProductIdsByVendor(vendorId: string): Promise<string[]> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.vendorId, vendorId));
  return rows.map((r) => r.id);
}

export async function findReviewsByProductIds(
  productIds: string[],
  filters: ReviewFilters
) {
  const { page = 1, limit = 20, status } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    inArray(reviews.productId, productIds),
    status ? eq(reviews.status, status as any) : undefined,
  ].filter(Boolean);

  const where = and(...(conditions as any));

  const [rows, countResult] = await Promise.all([
    db.select().from(reviews).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(reviews).where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}
