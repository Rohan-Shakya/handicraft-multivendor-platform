import type { AuthActor } from "@repo/types";
import { assertPermission } from "../../lib/permissions.js";
import * as repo from "./repository.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import type {
  CreateCollectionDto,
  UpdateCollectionDto,
  CollectionFilters,
} from "./types.js";

export async function listCollections(
  actor: AuthActor,
  filters: CollectionFilters
) {
  assertPermission(actor, "collection:manage:any");
  return repo.findCollections(filters);
}

export async function getCollectionById(actor: AuthActor, id: string) {
  assertPermission(actor, "collection:manage:any");
  const collection = await repo.findCollectionById(id);
  if (!collection) {
    throw Object.assign(new Error("Collection not found"), { statusCode: 404 });
  }

  // Include products in the response
  const productsResult = await repo.findProductsInCollection(id);

  return {
    ...collection,
    products: productsResult.data,
  };
}

export async function getPublicCollectionByHandle(handle: string) {
  const collection = await repo.findCollectionByHandle(handle);
  if (!collection || collection.status !== "active") {
    throw Object.assign(new Error("Collection not found"), { statusCode: 404 });
  }
  return collection;
}

export async function getPublicCollections() {
  return repo.findCollections({ status: "active", page: 1, limit: 100 });
}

export async function createCollection(
  actor: AuthActor,
  data: CreateCollectionDto
) {
  assertPermission(actor, "collection:manage:any");
  const existing = await repo.findCollectionByHandle(data.handle);
  if (existing) {
    throw Object.assign(new Error("Collection handle already taken"), {
      statusCode: 409,
    });
  }
  const collection = await repo.createCollection(data);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "collection",
    entityId: collection.id,
    action: "collection.created",
    afterJson: collection,
  });

  return collection;
}

export async function updateCollection(
  actor: AuthActor,
  id: string,
  data: UpdateCollectionDto
) {
  assertPermission(actor, "collection:manage:any");

  // If handle is being changed, check uniqueness
  if (data.handle) {
    const existing = await repo.findCollectionByHandle(data.handle);
    if (existing && existing.id !== id) {
      throw Object.assign(new Error("Collection handle already taken"), {
        statusCode: 409,
      });
    }
  }

  const before = await repo.findCollectionById(id);
  const collection = await repo.updateCollection(id, data);
  if (!collection) {
    throw Object.assign(new Error("Collection not found"), { statusCode: 404 });
  }

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "collection",
    entityId: id,
    action: "collection.updated",
    beforeJson: before,
    afterJson: collection,
  });

  return collection;
}

export async function archiveCollection(actor: AuthActor, id: string) {
  assertPermission(actor, "collection:manage:any");
  const collection = await repo.findCollectionById(id);
  if (!collection) {
    throw Object.assign(new Error("Collection not found"), { statusCode: 404 });
  }
  const archived = await repo.archiveCollection(id);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "collection",
    entityId: id,
    action: "collection.archived",
    beforeJson: collection,
    afterJson: archived,
  });

  return archived;
}

export async function addProductToCollection(
  actor: AuthActor,
  collectionId: string,
  productId: string
) {
  assertPermission(actor, "collection:manage:any");
  const collection = await repo.findCollectionById(collectionId);
  if (!collection) {
    throw Object.assign(new Error("Collection not found"), { statusCode: 404 });
  }

  // Verify the product exists to avoid raw FK violation errors
  const { findProductById } = await import("../products/repository.js");
  const product = await findProductById(productId);
  if (!product) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }

  await repo.addProduct(collectionId, productId);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "collection",
    entityId: collectionId,
    action: "collection.product_added",
    metadata: { productId },
  });

  return { collectionId, productId };
}

export async function removeProductFromCollection(
  actor: AuthActor,
  collectionId: string,
  productId: string
) {
  assertPermission(actor, "collection:manage:any");
  await repo.removeProduct(collectionId, productId);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "collection",
    entityId: collectionId,
    action: "collection.product_removed",
    metadata: { productId },
  });
}

export async function getCollectionProducts(
  actor: AuthActor,
  collectionId: string
) {
  assertPermission(actor, "collection:manage:any");
  return repo.findProductsInCollection(collectionId);
}

// ─── CSV import / export ─────────────────────────────────────────────────────

const COLLECTION_IMPORT_HEADER =
  "title,handle,description,status,sort_order,seo_title,seo_description";

const COLLECTION_HANDLE_RE = /^[a-z0-9-]+$/;
const COLLECTION_SORT_ORDERS = new Set([
  "manual", "best_selling", "created_desc", "created_asc",
  "updated_desc", "updated_asc", "title_asc", "title_desc",
  "price_asc", "price_desc",
]);
const COLLECTION_STATUS = new Set(["active", "draft", "archived"]);

export async function exportCollectionsCsv(actor: AuthActor): Promise<string> {
  if (actor.type === "vendor") {
    assertPermission(actor, "collection:manage:own");
    if (!actor.vendorId) {
      throw Object.assign(new Error("Vendor context required"), { statusCode: 403 });
    }
  } else {
    assertPermission(actor, "collection:manage:any");
  }
  const { generateCsv } = await import("../../lib/csv.js");
  const list = await repo.findCollections({ page: 1, limit: 10000 });
  // Vendor-scope filter — repo currently doesn't accept vendorId, so we filter
  // in-process. Acceptable while the per-vendor catalogue stays modest.
  const rows =
    actor.type === "vendor"
      ? list.data.filter((c) => c.vendorId === actor.vendorId)
      : list.data;
  const columns = [
    { header: "title", accessor: (r: any) => r.title },
    { header: "handle", accessor: (r: any) => r.handle },
    { header: "description", accessor: (r: any) => r.description ?? "" },
    { header: "status", accessor: (r: any) => r.status },
    { header: "sort_order", accessor: (r: any) => r.sortOrder ?? "manual" },
    { header: "seo_title", accessor: (r: any) => r.seoTitle ?? "" },
    { header: "seo_description", accessor: (r: any) => r.seoDescription ?? "" },
  ];
  return generateCsv(columns, rows);
}

export function importCollectionsCsvTemplate(): string {
  const example =
    'Brass Buddha Collection,brass-buddha-collection,"Hand-cast brass Buddha statues",active,manual,Buddha statues,Discover our brass Buddha pieces';
  return `${COLLECTION_IMPORT_HEADER}\n${example}\n`;
}

export interface CollectionImportSummary {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  results: Array<{
    row: number;
    handle?: string;
    ok: boolean;
    message?: string;
    collectionId?: string;
  }>;
}

export async function importCollectionsCsv(
  actor: AuthActor,
  csvText: string
): Promise<CollectionImportSummary> {
  let vendorId: string;
  if (actor.type === "vendor") {
    assertPermission(actor, "collection:manage:own");
    if (!actor.vendorId) {
      throw Object.assign(new Error("Vendor context required"), { statusCode: 403 });
    }
    vendorId = actor.vendorId;
  } else {
    assertPermission(actor, "collection:manage:any");
    throw Object.assign(
      new Error("Admin import requires a vendor_id column (not yet supported)"),
      { statusCode: 400 }
    );
  }

  const { parseCsv } = await import("../../lib/csv.js");
  const records = parseCsv(csvText);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const results: CollectionImportSummary["results"] = [];

  for (let i = 0; i < records.length; i += 1) {
    const r = records[i]!;
    const rowNum = i + 2;
    const title = (r.title ?? "").trim();
    const handle = (r.handle ?? "").trim().toLowerCase();

    if (!title || !handle) {
      failed += 1;
      results.push({
        row: rowNum, handle, ok: false,
        message: "title and handle are required",
      });
      continue;
    }
    if (!COLLECTION_HANDLE_RE.test(handle)) {
      failed += 1;
      results.push({
        row: rowNum, handle, ok: false,
        message: "handle must be lowercase letters, digits and dashes",
      });
      continue;
    }

    const existing = await repo.findCollectionByHandle(handle);
    if (existing) {
      skipped += 1;
      results.push({
        row: rowNum, handle, ok: true,
        message: "skipped (handle already exists)",
        collectionId: existing.id,
      });
      continue;
    }

    const status = (r.status ?? "draft").trim().toLowerCase();
    const sortOrder = (r.sort_order ?? "manual").trim().toLowerCase();

    try {
      const collection = await repo.createCollection({
        vendorId,
        title,
        handle,
        description: r.description?.trim() || undefined,
        status: (COLLECTION_STATUS.has(status) ? status : "draft") as any,
        sortOrder: (COLLECTION_SORT_ORDERS.has(sortOrder) ? sortOrder : "manual") as any,
        seoTitle: r.seo_title?.trim() || undefined,
        seoDescription: r.seo_description?.trim() || undefined,
      });
      created += 1;
      results.push({ row: rowNum, handle, ok: true, collectionId: collection.id });
    } catch (err) {
      failed += 1;
      results.push({
        row: rowNum, handle, ok: false,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "collection",
    entityId: vendorId,
    action: "collection.csv_imported",
    metadata: { total: records.length, created, skipped, failed },
  });

  return { total: records.length, created, skipped, failed, results };
}

export async function getPublicCollectionProducts(
  handle: string,
  page: number = 1,
  limit: number = 20
) {
  const collection = await repo.findCollectionByHandle(handle);
  if (!collection || collection.status !== "active" || collection.deletedAt) {
    throw Object.assign(new Error("Collection not found"), { statusCode: 404 });
  }
  return repo.findActiveProductsInCollection(collection.id, page, limit);
}
