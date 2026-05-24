import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  numeric,
  integer,
  boolean,
  index,
  uniqueIndex,
  check,
  jsonb,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers";
import { products, variants } from "./products";
import { vendors } from "./vendors";
import { carts } from "./carts";

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "open",
  "completed",
  "cancelled",
  "archived",
]);

export const orderPaymentStatusEnum = pgEnum("order_payment_status", [
  "pending",
  "authorized",
  "partially_paid",
  "paid",
  "partially_refunded",
  "refunded",
  "voided",
  "failed",
]);

export const orderFulfillmentStatusEnum = pgEnum("order_fulfillment_status", [
  "unfulfilled",
  "partially_fulfilled",
  "fulfilled",
  "returned",
  "cancelled",
]);

export const orderDeliveryStatusEnum = pgEnum("order_delivery_status", [
  "not_shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "returned",
  "failed",
]);

export const orderItemStatusEnum = pgEnum("order_item_status", [
  "open",
  "fulfilled",
  "cancelled",
  "returned",
  "refunded",
]);

export const orderAddressTypeEnum = pgEnum("order_address_type", ["shipping", "billing"]);

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "pending",
  "fulfilled",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id").references(() => carts.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    orderNumber: text("order_number").notNull(),
    status: orderStatusEnum("status").notNull().default("open"),
    paymentStatus: orderPaymentStatusEnum("payment_status").notNull().default("pending"),
    fulfillmentStatus: orderFulfillmentStatusEnum("fulfillment_status")
      .notNull()
      .default("unfulfilled"),
    deliveryStatus: orderDeliveryStatusEnum("delivery_status").notNull().default("not_shipped"),
    currencyCode: text("currency_code").notNull().default("USD"),
    customerEmail: text("customer_email"),
    customerFirstName: text("customer_first_name"),
    customerLastName: text("customer_last_name"),
    customerPhone: text("customer_phone"),
    channel: text("channel"),
    deliveryMethod: text("delivery_method"),
    itemCount: integer("item_count").notNull().default(0),
    subtotalPrice: numeric("subtotal_price", {
      precision: 14,
      scale: 2,
    }).notNull(),
    discountTotal: numeric("discount_total", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    shippingPrice: numeric("shipping_price", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    taxTotal: numeric("tax_total", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalPrice: numeric("total_price", {
      precision: 14,
      scale: 2,
    }).notNull(),
    totalPaid: numeric("total_paid", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalRefunded: numeric("total_refunded", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    note: text("note"),
    additionalDetails: jsonb("additional_details"),
    tags: text("tags").array(),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_order_number_unique").on(t.orderNumber),
    uniqueIndex("orders_id_order_number_unique").on(t.id, t.orderNumber),
    index("orders_customer_id_idx").on(t.customerId),
    index("orders_cart_id_idx").on(t.cartId),
    index("orders_status_idx").on(t.status),
    index("orders_payment_status_idx").on(t.paymentStatus),
    index("orders_fulfillment_status_idx").on(t.fulfillmentStatus),
    index("orders_delivery_status_idx").on(t.deliveryStatus),
    index("orders_placed_at_idx").on(t.placedAt),
    index("orders_customer_email_idx").on(t.customerEmail),
    check(
      "orders_customer_email_lowercase_chk",
      sql`${t.customerEmail} IS NULL OR ${t.customerEmail} = lower(${t.customerEmail})`
    ),
    check("orders_item_count_nonnegative_chk", sql`${t.itemCount} >= 0`),
    check("orders_subtotal_nonnegative_chk", sql`${t.subtotalPrice} >= 0`),
    check("orders_discount_nonnegative_chk", sql`${t.discountTotal} >= 0`),
    check("orders_shipping_nonnegative_chk", sql`${t.shippingPrice} >= 0`),
    check("orders_tax_nonnegative_chk", sql`${t.taxTotal} >= 0`),
    check("orders_total_nonnegative_chk", sql`${t.totalPrice} >= 0`),
    check("orders_total_paid_nonnegative_chk", sql`${t.totalPaid} >= 0`),
    check("orders_total_refunded_nonnegative_chk", sql`${t.totalRefunded} >= 0`),
    check("orders_refunded_lte_paid_chk", sql`${t.totalRefunded} <= ${t.totalPaid}`),
  ]
);

export const vendorOrders = pgTable(
  "vendor_orders",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    vendorOrderNumber: text("vendor_order_number").notNull(),
    status: orderStatusEnum("status").notNull().default("open"),
    paymentStatus: orderPaymentStatusEnum("payment_status").notNull().default("pending"),
    fulfillmentStatus: orderFulfillmentStatusEnum("fulfillment_status")
      .notNull()
      .default("unfulfilled"),
    deliveryStatus: orderDeliveryStatusEnum("delivery_status").notNull().default("not_shipped"),
    currencyCode: text("currency_code").notNull().default("USD"),
    itemCount: integer("item_count").notNull().default(0),
    subtotalPrice: numeric("subtotal_price", {
      precision: 14,
      scale: 2,
    }).notNull(),
    discountTotal: numeric("discount_total", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    shippingPrice: numeric("shipping_price", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    taxTotal: numeric("tax_total", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalPrice: numeric("total_price", {
      precision: 14,
      scale: 2,
    }).notNull(),
    totalPaid: numeric("total_paid", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalRefunded: numeric("total_refunded", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    note: text("note"),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vendor_orders_number_unique").on(t.vendorOrderNumber),
    uniqueIndex("vendor_orders_order_vendor_unique").on(t.orderId, t.vendorId),
    uniqueIndex("vendor_orders_id_order_vendor_unique").on(t.id, t.orderId, t.vendorId),
    index("vendor_orders_order_id_idx").on(t.orderId),
    index("vendor_orders_vendor_id_idx").on(t.vendorId),
    index("vendor_orders_status_idx").on(t.status),
    index("vendor_orders_payment_status_idx").on(t.paymentStatus),
    index("vendor_orders_fulfillment_status_idx").on(t.fulfillmentStatus),
    index("vendor_orders_delivery_status_idx").on(t.deliveryStatus),
    check("vendor_orders_item_count_nonnegative_chk", sql`${t.itemCount} >= 0`),
    check("vendor_orders_subtotal_nonnegative_chk", sql`${t.subtotalPrice} >= 0`),
    check("vendor_orders_discount_nonnegative_chk", sql`${t.discountTotal} >= 0`),
    check("vendor_orders_shipping_nonnegative_chk", sql`${t.shippingPrice} >= 0`),
    check("vendor_orders_tax_nonnegative_chk", sql`${t.taxTotal} >= 0`),
    check("vendor_orders_total_nonnegative_chk", sql`${t.totalPrice} >= 0`),
    check("vendor_orders_total_paid_nonnegative_chk", sql`${t.totalPaid} >= 0`),
    check("vendor_orders_total_refunded_nonnegative_chk", sql`${t.totalRefunded} >= 0`),
    check("vendor_orders_refunded_lte_paid_chk", sql`${t.totalRefunded} <= ${t.totalPaid}`),
  ]
);

export const orderAddresses = pgTable(
  "order_addresses",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: orderAddressTypeEnum("type").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    phone: text("phone"),
    address1: text("address1").notNull(),
    address2: text("address2"),
    city: text("city").notNull(),
    province: text("province"),
    provinceCode: text("province_code"),
    country: text("country").notNull(),
    countryCode: text("country_code").notNull(),
    zip: text("zip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("order_addresses_order_id_idx").on(t.orderId),
    uniqueIndex("order_addresses_order_type_unique").on(t.orderId, t.type),
  ]
);

export const vendorOrderAddresses = pgTable(
  "vendor_order_addresses",
  {
    id: text("id").primaryKey(),
    vendorOrderId: text("vendor_order_id")
      .notNull()
      .references(() => vendorOrders.id, { onDelete: "cascade" }),
    type: orderAddressTypeEnum("type").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    phone: text("phone"),
    address1: text("address1").notNull(),
    address2: text("address2"),
    city: text("city").notNull(),
    province: text("province"),
    provinceCode: text("province_code"),
    country: text("country").notNull(),
    countryCode: text("country_code").notNull(),
    zip: text("zip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vendor_order_addresses_vendor_order_id_idx").on(t.vendorOrderId),
    uniqueIndex("vendor_order_addresses_vendor_order_type_unique").on(t.vendorOrderId, t.type),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    vendorOrderId: text("vendor_order_id").notNull(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, {
        onDelete: "restrict",
      }),
    productId: text("product_id").references(() => products.id, {
      onDelete: "restrict",
    }),
    variantId: text("variant_id").references(() => variants.id, {
      onDelete: "restrict",
    }),
    title: text("title").notNull(),
    variantTitle: text("variant_title"),
    sku: text("sku"),
    quantity: integer("quantity").notNull(),
    fulfilledQuantity: integer("fulfilled_quantity").notNull().default(0),
    refundedQuantity: integer("refunded_quantity").notNull().default(0),
    unitPrice: numeric("unit_price", {
      precision: 14,
      scale: 2,
    }).notNull(),
    lineSubtotal: numeric("line_subtotal", {
      precision: 14,
      scale: 2,
    }).notNull(),
    discountTotal: numeric("discount_total", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    taxTotal: numeric("tax_total", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalPrice: numeric("total_price", {
      precision: 14,
      scale: 2,
    }).notNull(),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    status: orderItemStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.orderId],
      foreignColumns: [orders.id],
      name: "order_items_order_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.vendorOrderId, t.orderId, t.vendorId],
      foreignColumns: [vendorOrders.id, vendorOrders.orderId, vendorOrders.vendorId],
      name: "order_items_vendor_order_consistency_fk",
    }).onDelete("cascade"),
    uniqueIndex("order_items_id_vendor_order_unique").on(t.id, t.vendorOrderId),
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_vendor_order_id_idx").on(t.vendorOrderId),
    index("order_items_vendor_id_idx").on(t.vendorId),
    index("order_items_product_id_idx").on(t.productId),
    index("order_items_variant_id_idx").on(t.variantId),
    index("order_items_status_idx").on(t.status),
    check("order_items_quantity_positive_chk", sql`${t.quantity} > 0`),
    check("order_items_fulfilled_nonnegative_chk", sql`${t.fulfilledQuantity} >= 0`),
    check("order_items_refunded_nonnegative_chk", sql`${t.refundedQuantity} >= 0`),
    check("order_items_fulfilled_lte_quantity_chk", sql`${t.fulfilledQuantity} <= ${t.quantity}`),
    check("order_items_refunded_lte_quantity_chk", sql`${t.refundedQuantity} <= ${t.quantity}`),
    check("order_items_unit_price_nonnegative_chk", sql`${t.unitPrice} >= 0`),
    check("order_items_line_subtotal_nonnegative_chk", sql`${t.lineSubtotal} >= 0`),
    check("order_items_discount_nonnegative_chk", sql`${t.discountTotal} >= 0`),
    check("order_items_tax_nonnegative_chk", sql`${t.taxTotal} >= 0`),
    check("order_items_total_nonnegative_chk", sql`${t.totalPrice} >= 0`),
  ]
);

export const orderFulfillments = pgTable(
  "order_fulfillments",
  {
    id: text("id").primaryKey(),
    vendorOrderId: text("vendor_order_id")
      .notNull()
      .references(() => vendorOrders.id, { onDelete: "cascade" }),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, {
        onDelete: "restrict",
      }),
    fulfillmentNumber: text("fulfillment_number").notNull(),
    status: fulfillmentStatusEnum("status").notNull().default("pending"),
    carrier: text("carrier"),
    service: text("service"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("order_fulfillments_number_unique").on(t.fulfillmentNumber),
    uniqueIndex("order_fulfillments_id_vendor_order_unique").on(t.id, t.vendorOrderId),
    index("order_fulfillments_vendor_order_id_idx").on(t.vendorOrderId),
    index("order_fulfillments_vendor_id_idx").on(t.vendorId),
    index("order_fulfillments_status_idx").on(t.status),
  ]
);

export const orderFulfillmentItems = pgTable(
  "order_fulfillment_items",
  {
    fulfillmentId: text("fulfillment_id").notNull(),
    vendorOrderId: text("vendor_order_id").notNull(),
    orderItemId: text("order_item_id").notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.fulfillmentId, t.vendorOrderId],
      foreignColumns: [orderFulfillments.id, orderFulfillments.vendorOrderId],
      name: "order_fulfillment_items_fulfillment_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.orderItemId, t.vendorOrderId],
      foreignColumns: [orderItems.id, orderItems.vendorOrderId],
      name: "order_fulfillment_items_order_item_fk",
    }).onDelete("cascade"),
    primaryKey({
      columns: [t.fulfillmentId, t.orderItemId],
      name: "order_fulfillment_items_pk",
    }),
    index("order_fulfillment_items_vendor_order_id_idx").on(t.vendorOrderId),
    index("order_fulfillment_items_order_item_id_idx").on(t.orderItemId),
    check("order_fulfillment_items_quantity_positive_chk", sql`${t.quantity} > 0`),
  ]
);
