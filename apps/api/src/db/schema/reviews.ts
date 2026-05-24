import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendors } from "./vendors";
import { products, variants } from "./products";
import { customers } from "./customers";
import { files } from "./files";
import { orderItems } from "./orders";
import { users } from "./users";

export const reviewStatusEnum = pgEnum("review_status", ["pending", "published", "rejected"]);

export const productReviews = pgTable(
  "product_reviews",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => variants.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    orderItemId: text("order_item_id").references(() => orderItems.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name"),
    authorEmail: text("author_email"),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body"),
    status: reviewStatusEnum("status").notNull().default("pending"),
    verifiedPurchase: boolean("verified_purchase").notNull().default(false),
    helpfulCount: integer("helpful_count").notNull().default(0),
    moderationReason: text("moderation_reason"),
    moderatedBy: text("moderated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_reviews_vendor_product_status_idx").on(t.vendorId, t.productId, t.status),
    index("product_reviews_variant_id_idx").on(t.variantId),
    index("product_reviews_customer_id_idx").on(t.customerId),
    index("product_reviews_status_rating_idx").on(t.status, t.rating),
    index("product_reviews_published_at_idx").on(t.publishedAt),
    index("product_reviews_moderated_by_idx").on(t.moderatedBy),
    uniqueIndex("product_reviews_order_item_unique")
      .on(t.orderItemId)
      .where(sql`${t.orderItemId} IS NOT NULL`),
    check("product_reviews_rating_range_chk", sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
    check("product_reviews_helpful_count_nonnegative_chk", sql`${t.helpfulCount} >= 0`),
    check(
      "product_reviews_author_email_lowercase_chk",
      sql`${t.authorEmail} IS NULL OR ${t.authorEmail} = lower(${t.authorEmail})`
    ),
  ]
);

export const productReviewMedia = pgTable(
  "product_review_media",
  {
    reviewId: text("review_id")
      .notNull()
      .references(() => productReviews.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    altText: text("alt_text"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.reviewId, t.fileId], name: "product_review_media_pk" }),
    index("product_review_media_review_id_idx").on(t.reviewId),
    index("product_review_media_file_id_idx").on(t.fileId),
    uniqueIndex("product_review_media_review_position_unique").on(t.reviewId, t.position),
    check("product_review_media_position_nonnegative_chk", sql`${t.position} >= 0`),
  ]
);
