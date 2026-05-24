import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const statusSchema = z.object({
  status: z.enum(["draft", "open", "completed", "cancelled", "archived"]),
});
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
});

// ─── Draft order schemas ─────────────────────────────────────────────────────

const moneySchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative decimal with up to 2 places");

const addressSchema = z.object({
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  company: z.string().nullish(),
  phone: z.string().nullish(),
  address1: z.string().min(1),
  address2: z.string().nullish(),
  city: z.string().min(1),
  province: z.string().nullish(),
  provinceCode: z.string().nullish(),
  country: z.string().min(1),
  countryCode: z.string().min(2).max(2),
  zip: z.string().min(1),
});

const lineItemSchema = z
  .object({
    variantId: z.string().optional(),
    vendorId: z.string().optional(),
    productId: z.string().optional(),
    title: z.string().min(1).optional(),
    variantTitle: z.string().optional(),
    sku: z.string().optional(),
    quantity: z.number().int().min(1),
    unitPrice: moneySchema.optional(),
    discountTotal: moneySchema.optional(),
    taxTotal: moneySchema.optional(),
    requiresShipping: z.boolean().optional(),
  })
  .refine(
    (v) => v.variantId || (v.vendorId && v.title && v.unitPrice),
    "Custom line items require vendorId, title, and unitPrice"
  );

const createDraftSchema = z.object({
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerFirstName: z.string().optional(),
  customerLastName: z.string().optional(),
  customerPhone: z.string().optional(),
  currencyCode: z.string().length(3).optional(),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional(),
  items: z.array(lineItemSchema).min(1),
  shippingPrice: moneySchema.optional(),
  taxTotal: moneySchema.optional(),
  discountTotal: moneySchema.optional(),
  note: z.string().optional(),
});

const updateDraftSchema = z.object({
  customerId: z.string().nullable().optional(),
  customerEmail: z.string().email().nullable().optional(),
  customerFirstName: z.string().nullable().optional(),
  customerLastName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  currencyCode: z.string().length(3).optional(),
  shippingAddress: addressSchema.nullable().optional(),
  billingAddress: addressSchema.nullable().optional(),
  items: z.array(lineItemSchema).min(1).optional(),
  shippingPrice: moneySchema.optional(),
  taxTotal: moneySchema.optional(),
  discountTotal: moneySchema.optional(),
  note: z.string().nullable().optional(),
});

// ─── Quote request (storefront → draft order) ───────────────────────────────

/**
 * Customer-facing bulk-quote payload. Captures one line item (the PDP the
 * customer is browsing) plus an optional shipping address and free-text note.
 * The seller fills in unit price, shipping cost, etc. on the resulting draft
 * order in admin before sending an invoice.
 */
const createQuoteRequestSchema = z.object({
  variantId: z.string().min(1),
  productId: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(10000),
  shippingAddress: addressSchema.optional(),
  message: z.string().max(2000).optional(),
});

// ─── Storefront ───────────────────────────────────────────────────────────────

export async function createQuoteRequest(req: FastifyRequest, reply: FastifyReply) {
  const body = createQuoteRequestSchema.parse(req.body);
  const order = await service.createQuoteRequest(req.actor, body);
  return reply.status(201).send(order);
}

export async function listMyOrders(req: FastifyRequest, reply: FastifyReply) {
  const filters = paginationSchema.parse(req.query);
  return reply.send(await service.listMyOrders(req.actor, filters));
}

export async function getMyOrder(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  return reply.send(await service.getMyOrder(req.actor, req.params.id));
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function listOrders(req: FastifyRequest, reply: FastifyReply) {
  const filters = paginationSchema.parse(req.query);
  return reply.send(await service.listOrders(req.actor, filters));
}

export async function getOrder(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  return reply.send(await service.getOrderById(req.actor, req.params.id));
}

export async function updateOrderStatus(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { status } = statusSchema.parse(req.body);
  return reply.send(await service.updateOrderStatus(req.actor, req.params.id, status));
}

export async function listVendorOrdersAdmin(req: FastifyRequest, reply: FastifyReply) {
  const filters = paginationSchema.parse(req.query);
  return reply.send(await service.listVendorOrdersAdmin(req.actor, filters));
}

// ─── Cancel ──────────────────────────────────────────────────────────────────

export async function cancelOrderAdmin(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  return reply.send(await service.cancelOrderAdmin(req.actor, req.params.id));
}

export async function cancelOrderCustomer(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  return reply.send(await service.cancelOrderCustomer(req.actor, req.params.id));
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export async function listMyVendorOrders(req: FastifyRequest, reply: FastifyReply) {
  const filters = paginationSchema.parse(req.query);
  return reply.send(await service.listMyVendorOrders(req.actor, filters));
}

export async function getMyVendorOrder(
  req: FastifyRequest<{ Params: { vendorOrderId: string } }>,
  reply: FastifyReply
) {
  return reply.send(await service.getMyVendorOrder(req.actor, req.params.vendorOrderId));
}

export async function updateVendorOrderStatus(
  req: FastifyRequest<{ Params: { vendorOrderId: string } }>,
  reply: FastifyReply
) {
  const { status } = statusSchema.parse(req.body);
  return reply.send(
    await service.updateVendorOrderStatus(req.actor, req.params.vendorOrderId, status)
  );
}

export async function exportOrdersCsv(req: FastifyRequest, reply: FastifyReply) {
  const csv = await service.exportOrdersCsv(req.actor);
  return reply
    .header("Content-Type", "text/csv")
    .header("Content-Disposition", "attachment; filename=orders.csv")
    .send(csv);
}

// ─── Draft orders ────────────────────────────────────────────────────────────

export async function createDraftOrder(req: FastifyRequest, reply: FastifyReply) {
  const body = createDraftSchema.parse(req.body);
  const order = await service.createDraftOrder(req.actor, body);
  return reply.status(201).send(order);
}

export async function updateDraftOrder(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const body = updateDraftSchema.parse(req.body);
  return reply.send(await service.updateDraftOrder(req.actor, req.params.id, body));
}

export async function convertDraftOrder(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  return reply.send(await service.convertDraftOrder(req.actor, req.params.id));
}

export async function sendDraftInvoice(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  return reply.send(await service.sendDraftInvoice(req.actor, req.params.id));
}
