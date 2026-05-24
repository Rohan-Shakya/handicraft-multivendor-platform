import { pgTable, text, timestamp, integer, pgEnum, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { inventoryItems } from "./products";
import { carts } from "./carts";
import { orders } from "./orders";

export const inventoryReservationStatusEnum = pgEnum("inventory_reservation_status", [
  "active",
  "released",
  "consumed",
  "expired",
]);

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: text("id").primaryKey(),
    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    cartId: text("cart_id").references(() => carts.id, {
      onDelete: "set null",
    }),
    orderId: text("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    quantity: integer("quantity").notNull(),
    status: inventoryReservationStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inventory_reservations_inventory_item_id_idx").on(t.inventoryItemId),
    index("inventory_reservations_cart_id_idx").on(t.cartId),
    index("inventory_reservations_order_id_idx").on(t.orderId),
    index("inventory_reservations_status_idx").on(t.status),
    index("inventory_reservations_expires_at_idx").on(t.expiresAt),
    check("inventory_reservations_quantity_positive_chk", sql`${t.quantity} > 0`),
  ]
);
