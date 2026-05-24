/**
 * Product configurator routes.
 *
 * Storefront:
 *   GET /storefront/products/:id/configurator — returns the options + values
 *     the customer fills in.
 *   POST /storefront/quote-requests — submits filled-in values, creating a
 *     draft order the vendor can price.
 *
 * Admin / vendor:
 *   GET/POST/PATCH/DELETE /admin/products/:id/configurator/options[/:optionId]
 *     manages the option set per product.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  productConfigOptions,
  productConfigOptionValues,
  products,
  variants,
  vendors,
  customers,
} from "../../db/schema/index.js";
import { createDraftOrder } from "../orders/repository.js";
import { generateId } from "../../lib/id.js";
import { NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { assertPermission } from "../../lib/permissions.js";

const valueSchema = z.object({
  value: z.string().min(1).max(120),
  priceModifier: z.number().default(0),
  position: z.number().int().min(0).optional(),
});

const optionSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["select", "text", "number"]).default("select"),
  required: z.boolean().default(true),
  helpText: z.string().max(500).optional(),
  position: z.number().int().min(0).optional(),
  values: z.array(valueSchema).optional(),
});

const quoteSubmissionSchema = z.object({
  productId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().max(120).optional(),
  customerPhone: z.string().max(40).optional(),
  shippingAddress: z
    .object({
      address1: z.string().min(1),
      address2: z.string().optional(),
      city: z.string().min(1),
      province: z.string().optional(),
      country: z.string().min(1),
      countryCode: z.string().length(2),
      zip: z.string().min(1),
    })
    .optional(),
  selections: z.array(
    z.object({
      optionId: z.string().min(1),
      value: z.string().min(1).max(500),
      /** Set when the customer picked a pre-defined value with a price modifier. */
      valueId: z.string().optional(),
    })
  ),
  message: z.string().max(2000).optional(),
});

export async function productConfiguratorRoutes(app: FastifyInstance) {
  // ── Storefront: fetch configurator schema ─────────────────────────────────
  app.get(
    "/storefront/products/:id/configurator",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (req: any, reply: any) => {
      const productId = req.params.id as string;
      const [product] = await db
        .select({
          id: products.id,
          title: products.title,
          isConfigurable: products.isConfigurable,
          leadTimeDays: products.configuratorLeadTimeDays,
          vendorId: products.vendorId,
        })
        .from(products)
        .where(eq(products.id, productId));
      if (!product) throw new NotFoundError("Product not found");
      if (!product.isConfigurable) {
        return reply.send({
          product,
          options: [],
        });
      }

      const opts = await db
        .select()
        .from(productConfigOptions)
        .where(eq(productConfigOptions.productId, productId))
        .orderBy(asc(productConfigOptions.position));
      const optionIds = opts.map((o) => o.id);
      const values = optionIds.length
        ? await db
            .select()
            .from(productConfigOptionValues)
            .where(inArray(productConfigOptionValues.optionId, optionIds))
            .orderBy(asc(productConfigOptionValues.position))
        : [];

      const valuesByOption = new Map<string, typeof values>();
      for (const v of values) {
        const list = valuesByOption.get(v.optionId) ?? [];
        list.push(v);
        valuesByOption.set(v.optionId, list);
      }

      return reply.send({
        product,
        options: opts.map((o) => ({
          ...o,
          values: valuesByOption.get(o.id) ?? [],
        })),
      });
    }
  );

  // ── Storefront: submit a quote request ────────────────────────────────────
  app.post(
    "/storefront/quote-requests",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (req: any, reply: any) => {
      const body = quoteSubmissionSchema.parse(req.body);

      // Look up the product + its first variant (we need a vendorId on the
      // line item and an anchor price to seed the draft order).
      const [product] = await db
        .select({
          id: products.id,
          title: products.title,
          vendorId: products.vendorId,
          isConfigurable: products.isConfigurable,
        })
        .from(products)
        .where(eq(products.id, body.productId));
      if (!product) throw new NotFoundError("Product not found");
      if (!product.isConfigurable) {
        throw new UnprocessableError(
          "This product doesn't accept quote requests"
        );
      }

      const [firstVariant] = await db
        .select({ id: variants.id, price: variants.price })
        .from(variants)
        .where(eq(variants.productId, product.id))
        .limit(1);

      // Hydrate the selection values so the draft-order title is human-readable
      // ("Custom Tabriz — Size: 8x10 ft, Material: Wool, Colour: Burgundy").
      const valueIds = body.selections
        .map((s) => s.valueId)
        .filter((v): v is string => !!v);
      const hydratedValues = valueIds.length
        ? await db
            .select()
            .from(productConfigOptionValues)
            .where(inArray(productConfigOptionValues.id, valueIds))
        : [];
      const valueById = new Map(hydratedValues.map((v) => [v.id, v]));

      const opts = await db
        .select()
        .from(productConfigOptions)
        .where(eq(productConfigOptions.productId, product.id));
      const optById = new Map(opts.map((o) => [o.id, o]));

      const selectionsHuman = body.selections
        .map((s) => {
          const optName = optById.get(s.optionId)?.name ?? "Option";
          return `${optName}: ${s.value}`;
        })
        .join(", ");

      // Compute starting price = first-variant price + sum(priceModifiers).
      const basePrice = firstVariant?.price ? parseFloat(firstVariant.price) : 0;
      const modifierSum = body.selections.reduce((s, sel) => {
        const v = sel.valueId ? valueById.get(sel.valueId) : undefined;
        return s + (v ? parseFloat(v.priceModifier) : 0);
      }, 0);
      const unitPrice = (basePrice + modifierSum).toFixed(2);

      // Resolve customer if logged-in (req.actor is set when the bearer token
      // is present), or by matching email to an existing customer.
      let customerId: string | null = null;
      if (req.actor?.type === "customer") {
        customerId = req.actor.id;
      } else {
        const [existing] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, body.customerEmail.toLowerCase()));
        if (existing) customerId = existing.id;
      }

      const [vendor] = await db
        .select({ currencyCode: vendors.currencyCode })
        .from(vendors)
        .where(eq(vendors.id, product.vendorId));

      const draft = await createDraftOrder({
        customerId: customerId ?? undefined,
        customerEmail: body.customerEmail.toLowerCase(),
        customerFirstName: body.customerName?.split(" ")[0],
        customerLastName: body.customerName?.split(" ").slice(1).join(" "),
        customerPhone: body.customerPhone,
        currencyCode: vendor?.currencyCode ?? "USD",
        shippingAddress: body.shippingAddress,
        items: [
          {
            vendorId: product.vendorId,
            productId: product.id,
            title: `${product.title}${
              selectionsHuman ? ` — ${selectionsHuman}` : ""
            }`,
            quantity: 1,
            unitPrice,
            requiresShipping: true,
          },
        ],
        note: body.message
          ? `Quote request from customer:\n${body.message}`
          : `Custom quote request for ${product.title}`,
      });

      return reply.status(201).send({
        id: draft.id,
        orderNumber: draft.orderNumber,
      });
    }
  );

  // ── Admin / vendor: manage options ────────────────────────────────────────
  // Permission key: vendors get product:update:own, admins get product:update:any.
  app.get(
    "/admin/products/:id/configurator/options",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const opts = await db
        .select()
        .from(productConfigOptions)
        .where(eq(productConfigOptions.productId, req.params.id))
        .orderBy(asc(productConfigOptions.position));
      const optionIds = opts.map((o) => o.id);
      const values = optionIds.length
        ? await db
            .select()
            .from(productConfigOptionValues)
            .where(inArray(productConfigOptionValues.optionId, optionIds))
            .orderBy(asc(productConfigOptionValues.position))
        : [];
      const valuesByOption = new Map<string, typeof values>();
      for (const v of values) {
        const list = valuesByOption.get(v.optionId) ?? [];
        list.push(v);
        valuesByOption.set(v.optionId, list);
      }
      return reply.send({
        data: opts.map((o) => ({
          ...o,
          values: valuesByOption.get(o.id) ?? [],
        })),
      });
    }
  );

  app.post(
    "/admin/products/:id/configurator/options",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      // Either admin (product:update:any) or the owning vendor (product:update:own).
      try {
        assertPermission(req.actor, "product:update:any");
      } catch {
        assertPermission(req.actor, "product:update:own");
      }
      const productId = req.params.id as string;
      const body = optionSchema.parse(req.body);

      const id = generateId();
      await db.insert(productConfigOptions).values({
        id,
        productId,
        name: body.name,
        type: body.type,
        required: body.required,
        helpText: body.helpText ?? null,
        position: body.position ?? 0,
      });
      if (body.values?.length) {
        await db.insert(productConfigOptionValues).values(
          body.values.map((v, idx) => ({
            id: generateId(),
            optionId: id,
            value: v.value,
            priceModifier: String(v.priceModifier ?? 0),
            position: v.position ?? idx,
          }))
        );
      }
      // Auto-set the product as configurable when the first option is added.
      await db
        .update(products)
        .set({ isConfigurable: true, updatedAt: new Date() })
        .where(and(eq(products.id, productId), eq(products.isConfigurable, false)));

      return reply.status(201).send({ id });
    }
  );

  app.delete(
    "/admin/products/:id/configurator/options/:optionId",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      try {
        assertPermission(req.actor, "product:update:any");
      } catch {
        assertPermission(req.actor, "product:update:own");
      }
      await db
        .delete(productConfigOptions)
        .where(eq(productConfigOptions.id, req.params.optionId));
      return reply.status(204).send();
    }
  );
}
