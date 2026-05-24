import type { AuthActor } from "@repo/types";
import {
  assertPermission,
  assertCustomerOwnership,
} from "../../lib/permissions.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import * as repo from "./repository.js";
import type { CreateReviewDto, UpdateReviewDto, ReviewFilters } from "./types.js";

export async function listReviews(actor: AuthActor, filters: ReviewFilters) {
  assertPermission(actor, "review:read:any");

  if (actor.type === "vendor" && actor.vendorId) {
    // Vendors may only see reviews for their own products
    const productIds = await repo.findProductIdsByVendor(actor.vendorId);

    if (filters.productId) {
      if (!productIds.includes(filters.productId)) {
        throw Object.assign(new Error("Forbidden: not your product"), { statusCode: 403 });
      }
      return repo.findReviews(filters);
    }

    if (productIds.length === 0) {
      return { data: [], total: 0, page: filters.page ?? 1, limit: filters.limit ?? 20 };
    }

    return repo.findReviewsByProductIds(productIds, filters);
  }

  return repo.findReviews(filters);
}

export async function getPublicProductReviews(
  productId: string,
  filters: { page?: number; limit?: number }
) {
  return repo.findReviews({ productId, status: "published", ...filters });
}

export async function createReview(actor: AuthActor, data: CreateReviewDto) {
  if (actor.type !== "customer") {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
  assertPermission(actor, "review:create:self");

  const existing = await repo.findReviewByCustomerAndProduct(
    actor.id,
    data.productId
  );
  if (existing) {
    throw Object.assign(new Error("Already reviewed this product"), {
      statusCode: 409,
    });
  }

  // Verified-purchase gate. We block non-purchasers by default — set
  // ALLOW_UNVERIFIED_REVIEWS=1 to fall back to "tag-only" mode where any
  // customer can review but the verified badge is reserved for real buyers.
  const verifiedPurchase = await repo.hasPurchasedProduct(actor.id, data.productId);
  const allowUnverified = process.env.ALLOW_UNVERIFIED_REVIEWS === "1";
  if (!verifiedPurchase && !allowUnverified) {
    throw Object.assign(
      new Error("You can only review products you've purchased"),
      { statusCode: 403 }
    );
  }

  return repo.createReview({ ...data, customerId: actor.id, verifiedPurchase });
}

export async function updateReview(
  actor: AuthActor,
  reviewId: string,
  data: UpdateReviewDto
) {
  assertPermission(actor, "review:update:self");

  const review = await repo.findReviewById(reviewId);
  if (!review) {
    throw Object.assign(new Error("Review not found"), { statusCode: 404 });
  }

  assertCustomerOwnership(actor, review.customerId ?? "");

  const updated = await repo.updateReview(reviewId, data);
  return updated!;
}

export async function deleteReview(actor: AuthActor, reviewId: string) {
  assertPermission(actor, "review:delete:self");

  const review = await repo.findReviewById(reviewId);
  if (!review) {
    throw Object.assign(new Error("Review not found"), { statusCode: 404 });
  }

  assertCustomerOwnership(actor, review.customerId ?? "");

  await repo.deleteReview(reviewId);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "review",
    entityId: reviewId,
    action: "review.deleted",
    beforeJson: review,
  });

  return { success: true };
}

export async function adminDeleteReview(actor: AuthActor, reviewId: string) {
  assertPermission(actor, "review:moderate:any");

  const review = await repo.findReviewById(reviewId);
  if (!review) {
    throw Object.assign(new Error("Review not found"), { statusCode: 404 });
  }

  await repo.deleteReview(reviewId);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "review",
    entityId: reviewId,
    action: "review.deleted",
    beforeJson: review,
  });

  return { success: true };
}

export async function moderateReview(
  actor: AuthActor,
  reviewId: string,
  status: "pending" | "published" | "rejected"
) {
  assertPermission(actor, "review:moderate:any");

  const review = await repo.findReviewById(reviewId);
  if (!review) {
    throw Object.assign(new Error("Review not found"), { statusCode: 404 });
  }

  const updated = await repo.setReviewStatus(reviewId, status);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "review",
    entityId: reviewId,
    action: `review.${status === "published" ? "approved" : status === "rejected" ? "rejected" : "moderated"}`,
    beforeJson: review,
    afterJson: updated,
    metadata: { status },
  });

  return updated;
}
