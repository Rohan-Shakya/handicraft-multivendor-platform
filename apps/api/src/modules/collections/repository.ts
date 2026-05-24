import { eq, and, sql, ilike, or, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
import {
  collections,
  collectionProducts,
  products,
  vendors,
  files,
} from "../../db/schema/index.js";
import type {
  CreateCollectionDto,
  UpdateCollectionDto,
  CollectionFilters,
} from "./types.js";

function generateId() {
  return crypto.randomUUID();
}

/* ------------------------------------------------------------------ */
/*  List collections — joins vendor + image file, counts products     */
/* ------------------------------------------------------------------ */
export async function findCollections(filters: CollectionFilters) {
  const { page = 1, limit = 20, status, type, search } = filters;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [isNull(collections.deletedAt)];

  if (status) conditions.push(eq(collections.status, status));
  if (type) conditions.push(eq(collections.type, type));
  if (search) {
    conditions.push(
      or(
        ilike(collections.title, `%${escapeLike(search)}%`),
        ilike(collections.handle, `%${escapeLike(search)}%`)
      )!
    );
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  // Sub-query for product count
  const productCountSq = db
    .select({
      collectionId: collectionProducts.collectionId,
      count: sql<number>`count(*)`.as("product_count"),
    })
    .from(collectionProducts)
    .groupBy(collectionProducts.collectionId)
    .as("pc");

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: collections.id,
        vendorId: collections.vendorId,
        title: collections.title,
        handle: collections.handle,
        type: collections.type,
        status: collections.status,
        description: collections.description,
        imageFileId: collections.imageFileId,
        imageAlt: collections.imageAlt,
        imageUrl: files.url,
        sortOrder: collections.sortOrder,
        seoTitle: collections.seoTitle,
        seoDescription: collections.seoDescription,
        seoCanonicalUrl: collections.seoCanonicalUrl,
        publishedAt: collections.publishedAt,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        vendorName: vendors.name,
        productCount: sql<number>`coalesce(${productCountSq.count}, 0)`,
      })
      .from(collections)
      .leftJoin(vendors, eq(collections.vendorId, vendors.id))
      .leftJoin(files, eq(collections.imageFileId, files.id))
      .leftJoin(productCountSq, eq(collections.id, productCountSq.collectionId))
      .where(where)
      .orderBy(collections.createdAt)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(collections)
      .where(where),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    vendorId: r.vendorId,
    title: r.title,
    handle: r.handle,
    type: r.type,
    status: r.status,
    description: r.description,
    imageFileId: r.imageFileId,
    imageAlt: r.imageAlt,
    imageUrl: r.imageUrl ?? null,
    sortOrder: r.sortOrder,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    seoCanonicalUrl: r.seoCanonicalUrl,
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    productCount: Number(r.productCount),
    vendor: r.vendorName ? { id: r.vendorId, name: r.vendorName } : null,
  }));

  return { data, total: Number(countResult[0]?.count ?? 0), page, limit };
}

/* ------------------------------------------------------------------ */
/*  Get single collection with vendor, image, and product count       */
/* ------------------------------------------------------------------ */
export async function findCollectionById(id: string) {
  const productCountSq = db
    .select({
      collectionId: collectionProducts.collectionId,
      count: sql<number>`count(*)`.as("product_count"),
    })
    .from(collectionProducts)
    .groupBy(collectionProducts.collectionId)
    .as("pc");

  const [row] = await db
    .select({
      id: collections.id,
      vendorId: collections.vendorId,
      title: collections.title,
      handle: collections.handle,
      type: collections.type,
      status: collections.status,
      description: collections.description,
      imageFileId: collections.imageFileId,
      imageAlt: collections.imageAlt,
      imageUrl: files.url,
      sortOrder: collections.sortOrder,
      ruleApplyMode: collections.ruleApplyMode,
      seoTitle: collections.seoTitle,
      seoDescription: collections.seoDescription,
      seoCanonicalUrl: collections.seoCanonicalUrl,
      publishedAt: collections.publishedAt,
      createdBy: collections.createdBy,
      updatedBy: collections.updatedBy,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      deletedAt: collections.deletedAt,
      vendorName: vendors.name,
      productCount: sql<number>`coalesce(${productCountSq.count}, 0)`,
    })
    .from(collections)
    .leftJoin(vendors, eq(collections.vendorId, vendors.id))
    .leftJoin(files, eq(collections.imageFileId, files.id))
    .leftJoin(productCountSq, eq(collections.id, productCountSq.collectionId))
    .where(eq(collections.id, id));

  if (!row) return null;

  return {
    ...row,
    imageUrl: row.imageUrl ?? null,
    productCount: Number(row.productCount),
    vendor: row.vendorName ? { id: row.vendorId, name: row.vendorName } : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Find by handle (for storefront)                                   */
/* ------------------------------------------------------------------ */
export async function findCollectionByHandle(handle: string) {
  const [collection] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.handle, handle), isNull(collections.deletedAt)));
  return collection ?? null;
}

/* ------------------------------------------------------------------ */
/*  Create collection                                                 */
/* ------------------------------------------------------------------ */
export async function createCollection(data: CreateCollectionDto) {
  const [collection] = await db
    .insert(collections)
    .values({
      id: generateId(),
      vendorId: data.vendorId,
      title: data.title,
      handle: data.handle,
      type: (data.type as any) ?? "manual",
      description: data.description,
      status: (data.status as any) ?? "draft",
      imageFileId: data.imageFileId,
      imageAlt: data.imageAlt,
      sortOrder: (data.sortOrder as any) ?? "manual",
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoCanonicalUrl: data.seoCanonicalUrl,
    })
    .returning();
  return collection!;
}

/* ------------------------------------------------------------------ */
/*  Update collection                                                 */
/* ------------------------------------------------------------------ */
export async function updateCollection(id: string, data: UpdateCollectionDto) {
  const setData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.title !== undefined) setData.title = data.title;
  if (data.handle !== undefined) setData.handle = data.handle;
  if (data.description !== undefined) setData.description = data.description;
  if (data.status !== undefined) setData.status = data.status;
  if (data.imageFileId !== undefined) setData.imageFileId = data.imageFileId;
  if (data.imageAlt !== undefined) setData.imageAlt = data.imageAlt;
  if (data.sortOrder !== undefined) setData.sortOrder = data.sortOrder;
  if (data.seoTitle !== undefined) setData.seoTitle = data.seoTitle;
  if (data.seoDescription !== undefined) setData.seoDescription = data.seoDescription;
  if (data.seoCanonicalUrl !== undefined) setData.seoCanonicalUrl = data.seoCanonicalUrl;

  const [collection] = await db
    .update(collections)
    .set(setData)
    .where(eq(collections.id, id))
    .returning();
  return collection ?? null;
}

/* ------------------------------------------------------------------ */
/*  Archive collection (soft delete)                                  */
/* ------------------------------------------------------------------ */
export async function archiveCollection(id: string) {
  const [collection] = await db
    .update(collections)
    .set({ status: "archived", deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning();
  return collection ?? null;
}

/* ------------------------------------------------------------------ */
/*  Collection products                                               */
/* ------------------------------------------------------------------ */
export async function addProduct(collectionId: string, productId: string) {
  // Get the max position in this collection
  const [maxPos] = await db
    .select({ maxPosition: sql<number>`coalesce(max(${collectionProducts.position}), -1)` })
    .from(collectionProducts)
    .where(eq(collectionProducts.collectionId, collectionId));

  const nextPosition = Number(maxPos?.maxPosition ?? -1) + 1;

  await db
    .insert(collectionProducts)
    .values({ collectionId, productId, position: nextPosition })
    .onConflictDoNothing();
}

export async function removeProduct(collectionId: string, productId: string) {
  await db
    .delete(collectionProducts)
    .where(
      and(
        eq(collectionProducts.collectionId, collectionId),
        eq(collectionProducts.productId, productId)
      )
    );
}

export async function findProductsInCollection(collectionId: string) {
  const rows = await db
    .select({
      id: products.id,
      title: products.title,
      handle: products.handle,
      status: products.status,
      featuredFileId: products.featuredFileId,
      featuredImageUrl: files.url,
      position: collectionProducts.position,
    })
    .from(collectionProducts)
    .innerJoin(products, eq(collectionProducts.productId, products.id))
    .leftJoin(files, eq(products.featuredFileId, files.id))
    .where(eq(collectionProducts.collectionId, collectionId))
    .orderBy(collectionProducts.position);

  return { data: rows };
}

export async function findActiveProductsInCollection(
  collectionId: string,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit;

  const where = and(
    eq(collectionProducts.collectionId, collectionId),
    eq(products.status, "active"),
    isNull(products.deletedAt)
  );

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: products.id,
        title: products.title,
        handle: products.handle,
        vendorId: products.vendorId,
        status: products.status,
        featuredFileId: products.featuredFileId,
        featuredImageUrl: files.url,
      })
      .from(collectionProducts)
      .innerJoin(products, eq(collectionProducts.productId, products.id))
      .leftJoin(files, eq(products.featuredFileId, files.id))
      .where(where)
      .orderBy(collectionProducts.position)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(collectionProducts)
      .innerJoin(products, eq(collectionProducts.productId, products.id))
      .where(where),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}
