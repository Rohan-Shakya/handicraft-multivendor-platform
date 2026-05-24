/**
 * Loyalty points API.
 *
 * Earn:  hooked into order placement (see lib/loyalty-hooks.ts → called from
 *        orders/service.ts). 1 point per major currency unit by default.
 * Spend: customer-facing balance endpoint + ledger history page. Redemption
 *        at checkout TBD (see service.redeemForOrder for the helper).
 */
import type { FastifyInstance } from "fastify";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { loyaltyLedger } from "../../db/schema/index.js";
import { ForbiddenError } from "../../lib/errors.js";

export async function loyaltyRoutes(app: FastifyInstance) {
  // ── Storefront: customer balance + history ───────────────────────────────
  app.get(
    "/storefront/loyalty/balance",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (req.actor.type !== "customer") throw new ForbiddenError();
      const customerId = req.actor.id;
      const [row] = await db
        .select({
          balance: sql<number>`COALESCE(SUM(${loyaltyLedger.points}), 0)::int`,
          lifetimeEarned: sql<number>`COALESCE(SUM(${loyaltyLedger.points}) FILTER (WHERE ${loyaltyLedger.points} > 0), 0)::int`,
        })
        .from(loyaltyLedger)
        .where(eq(loyaltyLedger.customerId, customerId));
      return reply.send({
        balance: Number(row?.balance ?? 0),
        lifetimeEarned: Number(row?.lifetimeEarned ?? 0),
      });
    }
  );

  app.get(
    "/storefront/loyalty/history",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (req.actor.type !== "customer") throw new ForbiddenError();
      const customerId = req.actor.id;
      const rows = await db
        .select()
        .from(loyaltyLedger)
        .where(eq(loyaltyLedger.customerId, customerId))
        .orderBy(desc(loyaltyLedger.createdAt))
        .limit(50);
      return reply.send({ data: rows });
    }
  );
}
