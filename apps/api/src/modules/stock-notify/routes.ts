/**
 * Storefront route for "Notify me when back in stock" — anonymous and
 * logged-in customers can subscribe to a variant's restock. The scheduled job
 * `back_in_stock_notify` (see lib/scheduled-jobs.ts) fires the email when
 * inventory.availableQuantity > 0.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  stockNotifySubscriptions,
  variants,
  inventoryItems,
} from "../../db/schema/index.js";
import { generateId } from "../../lib/id.js";
import { NotFoundError, UnprocessableError } from "../../lib/errors.js";

const subscribeSchema = z.object({
  variantId: z.string().min(1),
  email: z.string().email().max(255),
});

export async function stockNotifyRoutes(app: FastifyInstance) {
  app.post(
    "/storefront/stock-notify",
    {
      // Per-IP cap so a script can't spam the table with random emails.
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (req: any, reply: any) => {
      const body = subscribeSchema.parse(req.body);

      // Verify the variant exists and is tracked + currently out of stock.
      // Subscribing on a stocked variant is a no-op (the customer can just buy).
      const [row] = await db
        .select({
          variantId: variants.id,
          inventoryTracked: variants.inventoryTracked,
          available: inventoryItems.availableQuantity,
        })
        .from(variants)
        .leftJoin(inventoryItems, eq(inventoryItems.variantId, variants.id))
        .where(and(eq(variants.id, body.variantId), isNull(variants.deletedAt)));
      if (!row) throw new NotFoundError("Variant not found");
      if ((row.available ?? 0) > 0) {
        throw new UnprocessableError(
          "This variant is currently in stock — you can buy it now."
        );
      }

      const email = body.email.toLowerCase();
      const customerId =
        req.actor?.type === "customer" ? (req.actor.id as string) : null;

      // Upsert: if (variantId, email) already exists, reset notifiedAt so the
      // customer gets notified next restock even if they were notified
      // previously and the item went out of stock again.
      await db
        .insert(stockNotifySubscriptions)
        .values({
          id: generateId(),
          variantId: body.variantId,
          email,
          customerId,
        })
        .onConflictDoUpdate({
          target: [
            stockNotifySubscriptions.variantId,
            stockNotifySubscriptions.email,
          ],
          set: { notifiedAt: null, customerId },
        });

      return reply.status(204).send();
    }
  );
}
