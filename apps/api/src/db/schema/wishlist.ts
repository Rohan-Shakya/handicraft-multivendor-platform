import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { products } from "./products";

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("wishlist_items_customer_id_idx").on(t.customerId),
    index("wishlist_items_product_id_idx").on(t.productId),
    uniqueIndex("wishlist_items_customer_product_unique").on(t.customerId, t.productId),
  ]
);
