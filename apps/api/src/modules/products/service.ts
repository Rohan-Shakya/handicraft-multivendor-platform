import { eq, and, inArray, desc } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import {
  assertPermission,
  assertVendorOwnership,
} from "../../lib/permissions.js";
import { ForbiddenError, UnprocessableError } from "../../lib/errors.js";
import { db } from "../../db/index.js";
import {
  products as productsTable,
  vendorKycs,
} from "../../db/schema/index.js";
import * as repo from "./repository.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { cacheGet, cacheDel, cacheInvalidate } from "../../lib/redis.js";
import { revalidateStorefront } from "../../lib/storefront-cache.js";

/**
 * Assert that a vendor has passed KYC. Used to gate publish-style actions
 * (e.g. flipping a product to "active"). Admins bypass — only callers in
 * vendor context should invoke this.
 */
async function assertVendorKycApproved(vendorId: string): Promise<void> {
  const [latestKyc] = await db
    .select({ status: vendorKycs.status })
    .from(vendorKycs)
    .where(eq(vendorKycs.vendorId, vendorId))
    .orderBy(desc(vendorKycs.updatedAt))
    .limit(1);
  if (!latestKyc || latestKyc.status !== "approved") {
    throw new UnprocessableError(
      `Vendor cannot publish products until KYC is approved (current: ${latestKyc?.status ?? "no submission"})`
    );
  }
}
import type {
  CreateProductDto,
  AdminCreateProductDto,
  UpdateProductDto,
  CreateOptionDto,
  CreateVariantDto,
  UpdateVariantDto,
  ProductFilters,
} from "./types.js";

// ─── Products ─────────────────────────────────────────────────────────────────

/** Public storefront — no actor needed, always forces status: active */
export async function listPublicProducts(filters: ProductFilters) {
  return repo.findProducts(undefined, { ...filters, status: "active" });
}

/** Min/max variant price across the public catalog — for filter sliders. */
export async function getPublicPriceRange() {
  return repo.getPublicPriceRange();
}

export async function listProducts(actor: AuthActor, filters: ProductFilters) {
  if (actor.type === "vendor") {
    // Vendors see only their own products
    return repo.findProducts(actor.vendorId, filters);
  }
  assertPermission(actor, "product:read:any");
  return repo.findProducts(filters.vendorId, filters);
}

export async function getProductById(actor: AuthActor, id: string) {
  const product = await repo.findProductByIdWithDetails(id);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:read:any");
  }

  return product;
}

export async function getProductByHandle(handle: string) {
  // Public storefront — active products only, with full details
  // Cached for 5 minutes (storefront hot path)
  const product = await cacheGet(`product:handle:${handle}`, 300, () =>
    repo.findProductByHandleWithDetails(handle)
  );
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  return product;
}

export async function createProduct(actor: AuthActor, data: CreateProductDto) {
  assertPermission(actor, "product:create:own");
  if (!actor.vendorId) {
    throw Object.assign(new Error("Vendor context required"), { statusCode: 403 });
  }

  // Check handle uniqueness within this vendor's catalog
  const existing = await repo.findProductByHandleForVendor(data.handle, actor.vendorId);
  if (existing) {
    throw Object.assign(new Error("Product handle already in use"), { statusCode: 409 });
  }

  const product = await repo.createProduct(actor.vendorId, data);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "product",
    entityId: product.id,
    action: "product.created",
    afterJson: product,
  });

  revalidateStorefront({
    tags: ["products:list", "home:featured", "home:new"],
  });

  return product;
}

export async function adminCreateProduct(actor: AuthActor, data: AdminCreateProductDto) {
  assertPermission(actor, "product:update:any");

  // Check handle uniqueness within the specified vendor's catalog
  const existing = await repo.findProductByHandleForVendor(data.handle, data.vendorId);
  if (existing) {
    throw Object.assign(new Error("Product handle already in use for this vendor"), { statusCode: 409 });
  }

  const { vendorId, ...productData } = data;
  const product = await repo.createProduct(vendorId, productData);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "product",
    entityId: product.id,
    action: "product.created",
    afterJson: product,
  });

  revalidateStorefront({
    tags: ["products:list", "home:featured", "home:new"],
  });

  return product;
}

export async function updateProduct(
  actor: AuthActor,
  id: string,
  data: UpdateProductDto
) {
  const product = await repo.findProductById(id);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertPermission(actor, "product:update:own");
    assertVendorOwnership(actor, product.vendorId);

    // KYC gate on publish — a vendor cannot flip status to "active" until
    // their KYC has been approved. Admins (the `else` branch below) bypass.
    const isPublishing =
      data.status === "active" && product.status !== "active";
    if (isPublishing) {
      await assertVendorKycApproved(product.vendorId);
    }
  } else {
    assertPermission(actor, "product:update:any");
  }

  const updated = await repo.updateProduct(id, data);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "product",
    entityId: id,
    action: "product.updated",
    beforeJson: product,
    afterJson: updated,
  });

  cacheDel(`product:handle:${product.handle}`);
  cacheInvalidate(`product:*:${id}`);
  cacheInvalidate(`search:*`);

  // Storefront Next.js Data Cache — drop the product detail page and any
  // listings/recommendations that may surface it.
  revalidateStorefront({
    tags: [
      `product:${product.handle}`,
      `product:${id}`,
      `product:${id}:reviews`,
      `product:${id}:recommendations`,
      "products:list",
      "home:featured",
      "home:new",
    ],
  });

  return updated;
}

// Archive rather than hard-delete to preserve order history integrity
export async function archiveProduct(actor: AuthActor, id: string) {
  const product = await repo.findProductById(id);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertPermission(actor, "product:update:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }

  const [archived] = await db
    .update(productsTable)
    .set({ status: "archived", deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(productsTable.id, id))
    .returning();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "product",
    entityId: id,
    action: "product.archived",
    beforeJson: product,
    afterJson: archived,
  });

  cacheDel(`product:handle:${product.handle}`);
  cacheInvalidate(`product:*:${id}`);
  cacheInvalidate(`search:*`);

  revalidateStorefront({
    tags: [
      `product:${product.handle}`,
      `product:${id}`,
      "products:list",
      "home:featured",
      "home:new",
    ],
  });

  return archived ?? null;
}

// ─── Product Collections ─────────────────────────────────────────────────────

export async function getProductCollections(actor: AuthActor, productId: string) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:read:any");
  }

  return repo.findCollectionsByProduct(productId);
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface UpdateOptionDto {
  name?: string;
  position?: number;
}

export async function listOptions(actor: AuthActor, productId: string) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") assertVendorOwnership(actor, product.vendorId);

  return repo.findOptionsByProduct(productId);
}

export async function createOption(
  actor: AuthActor,
  productId: string,
  data: CreateOptionDto
) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertPermission(actor, "product-option:manage:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }

  return repo.createOption(productId, data);
}

export async function updateOption(
  actor: AuthActor,
  productId: string,
  optionId: string,
  data: UpdateOptionDto
) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertPermission(actor, "product-option:manage:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }

  const option = await repo.findOptionById(optionId);
  if (!option || option.productId !== productId) {
    throw Object.assign(new Error("Option not found"), { statusCode: 404 });
  }

  return repo.updateOption(optionId, data);
}

export async function deleteOption(
  actor: AuthActor,
  productId: string,
  optionId: string
) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertPermission(actor, "product-option:manage:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }

  const option = await repo.findOptionById(optionId);
  if (!option || option.productId !== productId) {
    throw Object.assign(new Error("Option not found"), { statusCode: 404 });
  }

  await repo.deleteOption(optionId);
  return { success: true };
}

// ─── Variants ─────────────────────────────────────────────────────────────────

export async function listVariants(actor: AuthActor, productId: string) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") assertVendorOwnership(actor, product.vendorId);

  return repo.findVariantsByProduct(productId);
}

export async function createVariant(
  actor: AuthActor,
  productId: string,
  data: CreateVariantDto
) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertPermission(actor, "variant:manage:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }

  return repo.createVariant(productId, data);
}

export async function getVariantById(actor: AuthActor, variantId: string) {
  const variant = await repo.findVariantById(variantId);
  if (!variant) throw Object.assign(new Error("Variant not found"), { statusCode: 404 });

  const product = await repo.findProductById(variant.productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:read:any");
  }

  // Get selected options, inventory, product options, images, variant images, and variant count in parallel
  const [selectedOptions, inventoryItem, productOptions, productImages, variantImagesResult, variantCount] = await Promise.all([
    repo.findVariantSelectedOptions(variantId),
    repo.findInventoryItemByVariant(variantId),
    repo.findOptionsByProduct(variant.productId),
    repo.findImagesByProduct(variant.productId),
    repo.findImagesByVariant(variantId),
    repo.countVariantsByProduct(variant.productId),
  ]);

  // Find variant's featured image — match by featuredFileId, fallback to product featured, then first
  const variantImage = variant.featuredFileId
    ? productImages.find((img: any) => img.id === variant.featuredFileId) ?? null
    : productImages.find((img: any) => img.isFeatured) ?? productImages[0] ?? null;

  return {
    ...variant,
    selectedOptions,
    inventoryItem,
    product: {
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      vendorId: product.vendorId,
      options: productOptions,
      variantCount,
    },
    image: variantImage,
    productImages,
    variantImages: variantImagesResult,
  };
}

export async function updateVariant(
  actor: AuthActor,
  variantId: string,
  data: UpdateVariantDto
) {
  const variant = await repo.findVariantById(variantId);
  if (!variant) throw Object.assign(new Error("Variant not found"), { statusCode: 404 });

  const product = await repo.findProductById(variant.productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertPermission(actor, "variant:manage:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }

  const updated = await repo.updateVariant(variantId, data);

  revalidateStorefront({
    tags: [
      `product:${product.handle}`,
      `product:${product.id}`,
      "products:list",
    ],
  });

  return updated;
}

// Archive rather than hard-delete to preserve order history integrity
export async function archiveVariant(actor: AuthActor, variantId: string) {
  const variant = await repo.findVariantById(variantId);
  if (!variant) throw Object.assign(new Error("Variant not found"), { statusCode: 404 });
  const product = await repo.findProductById(variant.productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  if (actor.type === "vendor") {
    assertPermission(actor, "variant:manage:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }
  return repo.archiveVariant(variantId);
}

// ─── Product Images ───────────────────────────────────────────────────────────

export async function listImages(actor: AuthActor, productId: string) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  if (actor.type === "vendor") assertVendorOwnership(actor, product.vendorId);
  return repo.findImagesByProduct(productId);
}

export async function addImage(
  actor: AuthActor,
  productId: string,
  data: { url: string; altText?: string; position?: number; isFeatured?: boolean }
) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    assertPermission(actor, "product:update:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }
  return repo.createImage(productId, data);
}

export async function updateImage(
  actor: AuthActor,
  productId: string,
  imageId: string,
  data: { url?: string; altText?: string; position?: number; isFeatured?: boolean }
) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  if (actor.type === "vendor") {
    assertPermission(actor, "product:update:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }
  const image = await repo.findImageById(imageId);
  if (!image || image.productId !== productId) {
    throw Object.assign(new Error("Image not found"), { statusCode: 404 });
  }
  return repo.updateImage(imageId, data);
}

export async function deleteImage(
  actor: AuthActor,
  productId: string,
  imageId: string
) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  if (actor.type === "vendor") {
    assertPermission(actor, "product:update:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }
  const image = await repo.findImageById(imageId);
  if (!image || image.productId !== productId) {
    throw Object.assign(new Error("Image not found"), { statusCode: 404 });
  }
  await repo.deleteImage(imageId);
  return { success: true };
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function listTags(actor: AuthActor, productId: string) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") assertVendorOwnership(actor, product.vendorId);

  return repo.findTagsByProduct(productId);
}

export async function addTags(
  actor: AuthActor,
  productId: string,
  tags: string[]
) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  if (actor.type === "vendor") {
    assertPermission(actor, "product:update:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }

  return repo.addTags(productId, tags);
}

export async function removeTag(
  actor: AuthActor,
  productId: string,
  tag: string
) {
  const product = await repo.findProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  if (actor.type === "vendor") {
    assertPermission(actor, "product:update:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    assertPermission(actor, "product:update:any");
  }

  const deleted = await repo.removeTag(productId, tag);
  if (!deleted) throw Object.assign(new Error("Tag not found"), { statusCode: 404 });
  return { success: true };
}

// ─── Variant Images ──────────────────────────────────────────────────────────

async function assertVariantAccess(actor: AuthActor, variantId: string, write: boolean) {
  const variant = await repo.findVariantById(variantId);
  if (!variant) throw Object.assign(new Error("Variant not found"), { statusCode: 404 });

  const product = await repo.findProductById(variant.productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (actor.type === "vendor") {
    if (write) assertPermission(actor, "variant:manage:own");
    assertVendorOwnership(actor, product.vendorId);
  } else {
    if (write) assertPermission(actor, "product:update:any");
    else assertPermission(actor, "product:read:any");
  }

  return { variant, product };
}

export async function listVariantImages(actor: AuthActor, variantId: string) {
  await assertVariantAccess(actor, variantId, false);
  return repo.findImagesByVariant(variantId);
}

export async function addVariantImage(
  actor: AuthActor,
  variantId: string,
  data: { url: string; altText?: string; position?: number; isFeatured?: boolean }
) {
  await assertVariantAccess(actor, variantId, true);
  return repo.createVariantImage(variantId, data);
}

export async function updateVariantImage(
  actor: AuthActor,
  variantId: string,
  imageId: string,
  data: { url?: string; altText?: string | null; position?: number; isFeatured?: boolean }
) {
  await assertVariantAccess(actor, variantId, true);
  const image = await repo.findVariantImageById(imageId);
  if (!image || image.variantId !== variantId) {
    throw Object.assign(new Error("Variant image not found"), { statusCode: 404 });
  }
  return repo.updateVariantImage(imageId, data);
}

export async function deleteVariantImage(
  actor: AuthActor,
  variantId: string,
  imageId: string
) {
  await assertVariantAccess(actor, variantId, true);
  const image = await repo.findVariantImageById(imageId);
  if (!image || image.variantId !== variantId) {
    throw Object.assign(new Error("Variant image not found"), { statusCode: 404 });
  }
  await repo.deleteVariantImage(imageId);
  return { success: true };
}

// ─── Bulk operations ─────────────────────────────────────────────────────────

export async function bulkUpdateProducts(
  actor: AuthActor,
  ids: string[],
  update: { status?: string }
) {
  if (actor.type === "vendor") {
    assertPermission(actor, "product:update:own");
    if (!actor.vendorId) throw new ForbiddenError("Vendor context required");
  } else {
    assertPermission(actor, "product:update:any");
  }

  // Verify all products belong to the actor's vendor (defense-in-depth)
  if (actor.type === "vendor") {
    const products = await db
      .select({ id: productsTable.id, vendorId: productsTable.vendorId })
      .from(productsTable)
      .where(inArray(productsTable.id, ids));
    for (const p of products) {
      assertVendorOwnership(actor, p.vendorId);
    }
  }

  let updated = 0;
  for (const id of ids) {
    try {
      if (update.status) {
        const condition = actor.type === "vendor"
          ? and(eq(productsTable.id, id), eq(productsTable.vendorId, actor.vendorId!))
          : eq(productsTable.id, id);
        await db
          .update(productsTable)
          .set({ status: update.status as any, updatedAt: new Date() })
          .where(condition);
        cacheInvalidate(`search:*`);
        updated++;
      }
    } catch {
      // Skip individual failures
    }
  }

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "product",
    entityId: ids.join(","),
    action: "product.bulk_updated",
    metadata: { ids, update, updated },
  });

  return { updated, total: ids.length };
}

export async function bulkArchiveProducts(actor: AuthActor, ids: string[]) {
  if (actor.type === "vendor") {
    assertPermission(actor, "product:update:own");
    if (!actor.vendorId) throw new ForbiddenError("Vendor context required");
  } else {
    assertPermission(actor, "product:update:any");
  }

  // Verify all products belong to the actor's vendor (defense-in-depth)
  if (actor.type === "vendor") {
    const products = await db
      .select({ id: productsTable.id, vendorId: productsTable.vendorId })
      .from(productsTable)
      .where(inArray(productsTable.id, ids));
    for (const p of products) {
      assertVendorOwnership(actor, p.vendorId);
    }
  }

  let archived = 0;
  const now = new Date();
  for (const id of ids) {
    try {
      const condition = actor.type === "vendor"
        ? and(eq(productsTable.id, id), eq(productsTable.vendorId, actor.vendorId!))
        : eq(productsTable.id, id);
      await db
        .update(productsTable)
        .set({ status: "archived", deletedAt: now, updatedAt: now })
        .where(condition);
      cacheInvalidate(`search:*`);
      archived++;
    } catch {
      // Skip individual failures
    }
  }

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "product",
    entityId: ids.join(","),
    action: "product.bulk_archived",
    metadata: { ids, archived },
  });

  return { archived, total: ids.length };
}

export async function exportProductsCsv(actor: AuthActor): Promise<string> {
  if (actor.type === "vendor") {
    assertPermission(actor, "product:read:own");
    if (!actor.vendorId) throw new ForbiddenError("Vendor context required");
  } else {
    assertPermission(actor, "product:read:any");
  }

  const { generateCsv } = await import("../../lib/csv.js");
  // Scope to vendor's products if actor is a vendor
  const vendorScope = actor.type === "vendor" ? actor.vendorId : undefined;
  const allProducts = await repo.findProducts(vendorScope, { limit: 10000, page: 1 });
  const rows = allProducts.data ?? allProducts;

  const columns = [
    { header: "ID", accessor: (r: any) => r.id },
    { header: "Title", accessor: (r: any) => r.title },
    { header: "Handle", accessor: (r: any) => r.handle },
    { header: "Status", accessor: (r: any) => r.status },
    { header: "Vendor ID", accessor: (r: any) => r.vendorId },
    { header: "Product Type", accessor: (r: any) => r.productType ?? "" },
    { header: "Brand", accessor: (r: any) => r.brand ?? "" },
    { header: "Created At", accessor: (r: any) => r.createdAt },
    { header: "Updated At", accessor: (r: any) => r.updatedAt },
  ];

  return generateCsv(columns, Array.isArray(rows) ? rows : []);
}

// ─── CSV import (vendor + admin) ─────────────────────────────────────────────

export interface ImportRowResult {
  row: number;
  handle?: string;
  ok: boolean;
  message?: string;
  productId?: string;
}

export interface ImportSummary {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  results: ImportRowResult[];
}

/**
 * Lightweight CSV → product import. Each row creates one product with a
 * default variant (price + sku + inventory). Existing handles in the same
 * vendor are skipped — re-running an import is idempotent.
 *
 * CSV columns (case-sensitive): title, handle, description, status,
 * price, sku, compare_at_price, inventory_quantity, image_url, alt_text.
 * Only `title`, `handle` and `price` are required.
 */
export async function importProductsCsv(
  actor: AuthActor,
  csvText: string
): Promise<ImportSummary> {
  if (actor.type === "vendor") {
    assertPermission(actor, "product:create:own");
    if (!actor.vendorId) throw new ForbiddenError("Vendor context required");
  } else {
    assertPermission(actor, "product:update:any");
  }
  const vendorId =
    actor.type === "vendor"
      ? actor.vendorId!
      : (() => {
          throw new Error("Admin import requires a vendor_id column (not yet supported)");
        })();

  const { parseCsv } = await import("../../lib/csv.js");
  const records = parseCsv(csvText);

  const results: ImportRowResult[] = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;

  const handleRe = /^[a-z0-9-]+$/;

  for (let i = 0; i < records.length; i += 1) {
    const r = records[i]!;
    const rowNum = i + 2; // header is row 1
    const title = (r.title ?? "").trim();
    const handle = (r.handle ?? "").trim().toLowerCase();
    const priceRaw = (r.price ?? "").trim();
    const price = priceRaw ? Number(priceRaw) : NaN;

    if (!title || !handle || !priceRaw) {
      failed += 1;
      results.push({
        row: rowNum,
        handle,
        ok: false,
        message: "title, handle and price are required",
      });
      continue;
    }
    if (!handleRe.test(handle)) {
      failed += 1;
      results.push({
        row: rowNum,
        handle,
        ok: false,
        message: "handle must be lowercase letters, digits and dashes",
      });
      continue;
    }
    if (!Number.isFinite(price) || price < 0) {
      failed += 1;
      results.push({
        row: rowNum,
        handle,
        ok: false,
        message: "price must be a non-negative number",
      });
      continue;
    }

    // Skip duplicates so re-running an import is idempotent.
    const existing = await repo.findProductByHandleForVendor(handle, vendorId);
    if (existing) {
      skipped += 1;
      results.push({
        row: rowNum,
        handle,
        ok: true,
        message: "skipped (handle already exists)",
        productId: existing.id,
      });
      continue;
    }

    try {
      const product = await repo.createProduct(vendorId, {
        title,
        handle,
        description: r.description?.trim() || undefined,
        seoTitle: undefined,
        seoDescription: undefined,
      } as CreateProductDto);

      // Default variant — vendors think one-row = one-product, so we create a
      // single variant carrying the price/sku/inventory from the row.
      await repo.createVariant(product.id, {
        sku: r.sku?.trim() || undefined,
        price,
        compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : undefined,
        inventoryQuantity: r.inventory_quantity ? parseInt(r.inventory_quantity, 10) || 0 : 0,
        selectedOptions: [],
      } as any);

      // Optional featured image.
      const imageUrl = r.image_url?.trim();
      if (imageUrl) {
        try {
          // eslint-disable-next-line no-new
          new URL(imageUrl);
          await repo.createImage(product.id, {
            url: imageUrl,
            altText: r.alt_text?.trim() || title,
            position: 0,
            isFeatured: true,
          } as any);
        } catch {
          // Bad URL — image is best-effort, don't fail the whole row.
        }
      }

      // Honour status if supplied and valid; defaults to draft otherwise.
      const status = (r.status ?? "").trim().toLowerCase();
      if (["active", "archived"].includes(status)) {
        await repo.updateProduct(product.id, { status: status as any });
      }

      created += 1;
      results.push({ row: rowNum, handle, ok: true, productId: product.id });
    } catch (err) {
      failed += 1;
      results.push({
        row: rowNum,
        handle,
        ok: false,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "product",
    entityId: vendorId,
    action: "product.csv_imported",
    metadata: { total: records.length, created, skipped, failed },
  });

  return {
    total: records.length,
    created,
    skipped,
    failed,
    results,
  };
}

/**
 * Return a small CSV template (header + one example row) so vendors have a
 * known-good starting point. Mirrors the columns `importProductsCsv` accepts.
 */
export function importProductsCsvTemplate(): string {
  const header =
    "title,handle,description,status,price,sku,compare_at_price,inventory_quantity,image_url,alt_text";
  const example =
    'Brass Sample Buddha 6 inch,brass-sample-buddha-6-inch,"Hand-cast brass Buddha, 6 inches tall.",draft,4500,SAMPLE-BUDDHA-6,5500,10,https://example.com/sample.jpg,Brass Buddha statue';
  return `${header}\n${example}\n`;
}
