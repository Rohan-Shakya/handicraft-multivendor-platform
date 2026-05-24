/**
 * Loyalty points service helpers. Earn-on-order is hooked from orders/service
 * placeOrder + draft-convert via `awardPointsForOrder` (fire-and-forget so
 * order placement never blocks on this).
 *
 * Rate is platform-fixed at 1 point per major currency unit for now — wire
 * this through `settings` if you want per-tier or per-region rates.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { loyaltyLedger, orders } from "../../db/schema/index.js";
import { generateId } from "../../lib/id.js";
import { logger } from "../../lib/logger.js";

const POINTS_PER_MAJOR_UNIT = 1;

/**
 * Credit the customer for placing an order. Idempotent on
 * (customerId, orderId, type='earn') via the partial unique index — calling
 * twice on the same order is a no-op.
 */
export async function awardPointsForOrder(orderId: string): Promise<number> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return 0;
  if (!order.customerId) return 0;
  // Don't credit cancelled / refunded orders.
  if (
    order.status === "cancelled" ||
    order.paymentStatus === "refunded" ||
    order.paymentStatus === "voided"
  ) {
    return 0;
  }

  // Floor — fractional points aren't a thing.
  const points = Math.floor(parseFloat(order.totalPrice) * POINTS_PER_MAJOR_UNIT);
  if (points <= 0) return 0;

  try {
    await db
      .insert(loyaltyLedger)
      .values({
        id: generateId(),
        customerId: order.customerId,
        type: "earn",
        points,
        orderId: order.id,
        note: `Earned on order ${order.orderNumber}`,
      })
      .onConflictDoNothing({
        target: [
          loyaltyLedger.customerId,
          loyaltyLedger.orderId,
          loyaltyLedger.type,
        ],
      });
  } catch (err) {
    logger.error({ err, orderId }, "loyalty.award_failed");
    return 0;
  }
  return points;
}

/**
 * Debit a customer's points to redeem for cart credit. Throws if balance is
 * insufficient. Used by checkout when the customer opts to spend points.
 */
export async function redeemPointsForOrder(
  customerId: string,
  points: number,
  orderId: string
): Promise<{ debited: number; balanceAfter: number }> {
  if (points <= 0) return { debited: 0, balanceAfter: 0 };

  // Compute current balance — read-then-write isn't safe under concurrency,
  // but a real production system can SERIALIZE the redemption via an advisory
  // lock or move to a per-customer balance row. For the template scope this
  // is acceptable.
  const [row] = await db
    .select({ balance: sql<number>`COALESCE(SUM(${loyaltyLedger.points}), 0)::int` })
    .from(loyaltyLedger)
    .where(eq(loyaltyLedger.customerId, customerId));
  const balance = Number(row?.balance ?? 0);
  if (balance < points) {
    throw new Error(`Insufficient points (have ${balance}, need ${points})`);
  }

  await db.insert(loyaltyLedger).values({
    id: generateId(),
    customerId,
    type: "redeem",
    points: -points,
    orderId,
    note: `Redeemed at checkout`,
  });

  return { debited: points, balanceAfter: balance - points };
}
