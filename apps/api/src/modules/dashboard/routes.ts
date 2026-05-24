import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import {
  vendors,
  orders,
  customers,
  products,
  orderItems,
  productReviews as reviews,
  returns,
} from "../../db/schema/index.js";
import { eq, and, sql, inArray, desc } from "drizzle-orm";

export async function dashboardRoutes(app: FastifyInstance) {
  // ── Admin Dashboard ───────────────────────────────────────────────────────
  app.get("/admin/dashboard", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.actor.type !== "admin") {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const [
      [vendorRow],
      [orderRow],
      [customerRow],
      [productRow],
      [revenueRow],
      recentOrders,
      [pendingReturnsRow],
      [pendingReviewsRow],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(vendors),
      db.select({ count: sql<number>`count(*)` }).from(orders),
      db.select({ count: sql<number>`count(*)` }).from(customers),
      db.select({ count: sql<number>`count(*)` }).from(products),
      db
        .select({ total: sql<string>`coalesce(sum(${orders.totalPrice}), 0)` })
        .from(orders)
        .where(sql`${orders.status} NOT IN ('cancelled', 'archived')`),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5),
      db
        .select({ count: sql<number>`count(*)` })
        .from(returns)
        .where(eq(returns.status, "requested")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(eq(reviews.status, "pending")),
    ]);

    return reply.send({
      vendorCount: Number(vendorRow?.count ?? 0),
      orderCount: Number(orderRow?.count ?? 0),
      customerCount: Number(customerRow?.count ?? 0),
      productCount: Number(productRow?.count ?? 0),
      revenue: revenueRow?.total ?? "0",
      pendingReturns: Number(pendingReturnsRow?.count ?? 0),
      pendingReviews: Number(pendingReviewsRow?.count ?? 0),
      recentOrders,
    });
  });

  // ── Admin Dashboard Analytics ──────────────────────────────────────────────
  app.get("/admin/dashboard/analytics", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.actor.type !== "admin") {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const query = req.query as { period?: string };
    const period = (["7d", "30d", "90d", "12m"].includes(query.period ?? ""))
      ? query.period!
      : "30d";

    // Determine interval config based on period
    let intervalDays: number;
    let truncUnit: string; // for date_trunc
    switch (period) {
      case "7d":
        intervalDays = 7;
        truncUnit = "day";
        break;
      case "30d":
        intervalDays = 30;
        truncUnit = "day";
        break;
      case "90d":
        intervalDays = 90;
        truncUnit = "week";
        break;
      case "12m":
        intervalDays = 365;
        truncUnit = "month";
        break;
      default:
        intervalDays = 30;
        truncUnit = "day";
    }

    const statusFilter = `status NOT IN ('cancelled', 'archived')`;

    // Defense-in-depth: even though `period` is whitelisted above, re-assert
    // that the derived values are safe before interpolating into raw SQL.
    // If a future refactor accepts user-supplied units, this trips before SQL
    // injection becomes possible.
    if (
      !Number.isInteger(intervalDays) ||
      intervalDays < 1 ||
      intervalDays > 366 ||
      !["day", "week", "month"].includes(truncUnit)
    ) {
      throw new Error(
        `Unexpected dashboard period values: intervalDays=${intervalDays} truncUnit=${truncUnit}`
      );
    }

    // Current period revenue + order time series
    const currentSeriesResult = await db.execute(sql.raw(`
      SELECT
        date_trunc('${truncUnit}', placed_at)::date AS date,
        COALESCE(SUM(total_price), 0)::bigint AS revenue,
        COUNT(*)::int AS order_count
      FROM orders
      WHERE ${statusFilter}
        AND placed_at >= NOW() - INTERVAL '${intervalDays} days'
      GROUP BY 1
      ORDER BY 1
    `));

    // Previous period revenue + order time series
    const previousSeriesResult = await db.execute(sql.raw(`
      SELECT
        date_trunc('${truncUnit}', placed_at)::date AS date,
        COALESCE(SUM(total_price), 0)::bigint AS revenue,
        COUNT(*)::int AS order_count
      FROM orders
      WHERE ${statusFilter}
        AND placed_at >= NOW() - INTERVAL '${intervalDays * 2} days'
        AND placed_at < NOW() - INTERVAL '${intervalDays} days'
      GROUP BY 1
      ORDER BY 1
    `));

    // Current period totals
    const [currentTotals] = await db.execute(sql.raw(`
      SELECT
        COALESCE(SUM(total_price), 0)::bigint AS total_revenue,
        COUNT(*)::int AS total_orders
      FROM orders
      WHERE ${statusFilter}
        AND placed_at >= NOW() - INTERVAL '${intervalDays} days'
    `));

    // Previous period totals
    const [previousTotals] = await db.execute(sql.raw(`
      SELECT
        COALESCE(SUM(total_price), 0)::bigint AS total_revenue,
        COUNT(*)::int AS total_orders
      FROM orders
      WHERE ${statusFilter}
        AND placed_at >= NOW() - INTERVAL '${intervalDays * 2} days'
        AND placed_at < NOW() - INTERVAL '${intervalDays} days'
    `));

    // Top 5 products by quantity sold in current period
    const topProductsResult = await db.execute(sql.raw(`
      SELECT
        oi.product_id AS "productId",
        oi.title,
        SUM(oi.quantity)::int AS "totalSold",
        SUM(oi.total_price)::bigint AS revenue
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE o.status NOT IN ('cancelled', 'archived')
        AND o.placed_at >= NOW() - INTERVAL '${intervalDays} days'
        AND oi.product_id IS NOT NULL
      GROUP BY oi.product_id, oi.title
      ORDER BY "totalSold" DESC
      LIMIT 5
    `));

    const ct = currentTotals as any;
    const pt = previousTotals as any;

    const currentRevenue = Number(ct.total_revenue ?? 0);
    const previousRevenue = Number(pt.total_revenue ?? 0);
    const currentOrders = Number(ct.total_orders ?? 0);
    const previousOrders = Number(pt.total_orders ?? 0);

    const currentAOV = currentOrders > 0 ? Math.round(currentRevenue / currentOrders) : 0;
    const previousAOV = previousOrders > 0 ? Math.round(previousRevenue / previousOrders) : 0;

    const pctChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    };

    return reply.send({
      revenue: {
        series: (currentSeriesResult as any[]).map((r: any) => ({
          date: String(r.date),
          amount: Number(r.revenue),
        })),
        total: currentRevenue,
        previousTotal: previousRevenue,
        changePercent: pctChange(currentRevenue, previousRevenue),
      },
      orders: {
        series: (currentSeriesResult as any[]).map((r: any) => ({
          date: String(r.date),
          count: Number(r.order_count),
        })),
        total: currentOrders,
        previousTotal: previousOrders,
        changePercent: pctChange(currentOrders, previousOrders),
      },
      averageOrderValue: {
        current: currentAOV,
        previous: previousAOV,
        changePercent: pctChange(currentAOV, previousAOV),
      },
      topProducts: (topProductsResult as any[]).map((p: any) => ({
        productId: p.productId,
        title: p.title,
        totalSold: Number(p.totalSold),
        revenue: Number(p.revenue),
      })),
    });
  });

  // ── Vendor Dashboard ──────────────────────────────────────────────────────
  app.get("/vendor/dashboard", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.actor.type !== "vendor" || !req.actor.vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }
    const vendorId = req.actor.vendorId;

    // Fetch vendor's product IDs for the review avg query
    const vendorProductRows = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.vendorId, vendorId));
    const productIds = vendorProductRows.map((p) => p.id);

    const [
      [productRow],
      [pendingRow],
      [revenueRow],
      [processingRow],
      recentItems,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.vendorId, vendorId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orderItems)
        .where(and(eq(orderItems.vendorId, vendorId), eq(orderItems.status, "open"))),
      db
        .select({ total: sql<string>`coalesce(sum(${orderItems.totalPrice}), 0)` })
        .from(orderItems)
        .where(
          and(
            eq(orderItems.vendorId, vendorId),
            // Valid order_item_status values: open, fulfilled, cancelled, returned, refunded.
            // Exclude the three terminal "no-revenue" states.
            sql`${orderItems.status} NOT IN ('cancelled', 'returned', 'refunded')`
          )
        ),
      // activeItemCount: items currently in-flight (= open, before fulfilment).
      // The previous query referenced ('confirmed', 'processing', 'shipped')
      // which aren't valid order_item_status values and crashed Postgres.
      db
        .select({ count: sql<number>`count(*)` })
        .from(orderItems)
        .where(
          and(
            eq(orderItems.vendorId, vendorId),
            eq(orderItems.status, "open")
          )
        ),
      db
        .select()
        .from(orderItems)
        .where(eq(orderItems.vendorId, vendorId))
        .orderBy(desc(orderItems.orderId))
        .limit(10),
    ]);

    let avgRating: number | null = null;
    if (productIds.length > 0) {
      const [ratingRow] = await db
        .select({ avg: sql<string>`coalesce(avg(${reviews.rating})::numeric(3,1), null)` })
        .from(reviews)
        .where(
          and(
            inArray(reviews.productId, productIds),
            eq(reviews.status, "published")
          )
        );
      avgRating = ratingRow?.avg ? parseFloat(ratingRow.avg) : null;
    }

    return reply.send({
      productCount: Number(productRow?.count ?? 0),
      pendingItemCount: Number(pendingRow?.count ?? 0),
      activeItemCount: Number(processingRow?.count ?? 0),
      revenue: revenueRow?.total ?? "0",
      avgRating,
      recentItems,
    });
  });

  // ── Vendor Analytics ─────────────────────────────────────────────────────
  // Time series + top products + payout summary for the vendor analytics page.
  app.get("/vendor/analytics", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.actor.type !== "vendor" || !req.actor.vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }
    const vendorId = req.actor.vendorId;

    const query = req.query as { period?: string };
    const period = (["7d", "30d", "90d", "12m"].includes(query.period ?? ""))
      ? query.period!
      : "30d";

    let intervalDays: number;
    let truncUnit: "day" | "week" | "month";
    switch (period) {
      case "7d":  intervalDays = 7;   truncUnit = "day";   break;
      case "90d": intervalDays = 90;  truncUnit = "week";  break;
      case "12m": intervalDays = 365; truncUnit = "month"; break;
      default:    intervalDays = 30;  truncUnit = "day";
    }
    // Defense-in-depth: never let externally-supplied values reach sql.raw.
    if (!Number.isInteger(intervalDays) || !["day","week","month"].includes(truncUnit)) {
      throw new Error("Unexpected analytics period values");
    }

    // Time series: revenue + order item count per bucket, current period
    // only. Joined to orders so we can scope on order placedAt (the natural
    // billing date). `truncUnit` and `intervalDays` are whitelist-validated
    // above so `sql.raw` is safe for them; `vendorId` is bound as a parameter.
    const seriesResult = await db.execute(sql`
      SELECT
        date_trunc(${truncUnit}, o.placed_at)::date AS date,
        COALESCE(SUM(oi.total_price), 0)::text AS revenue,
        COUNT(DISTINCT oi.order_id)::int AS order_count,
        SUM(oi.quantity)::int AS units_sold
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE oi.vendor_id = ${vendorId}
        AND oi.status NOT IN ('cancelled', 'returned', 'refunded')
        AND o.placed_at >= NOW() - (${sql.raw(String(intervalDays))} || ' days')::interval
      GROUP BY 1
      ORDER BY 1
    `);
    const seriesRows = (seriesResult as any).rows ?? (seriesResult as any);
    const series = (Array.isArray(seriesRows) ? seriesRows : []).map((r: any) => ({
      date: r.date,
      revenue: r.revenue,
      orderCount: Number(r.order_count ?? 0),
      unitsSold: Number(r.units_sold ?? 0),
    }));

    // Top 5 products by quantity sold in the period
    const topProductsResult = await db.execute(sql`
      SELECT
        oi.product_id AS "productId",
        oi.title,
        SUM(oi.quantity)::int AS "unitsSold",
        SUM(oi.total_price)::text AS revenue
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE oi.vendor_id = ${vendorId}
        AND oi.status NOT IN ('cancelled', 'returned', 'refunded')
        AND o.placed_at >= NOW() - (${sql.raw(String(intervalDays))} || ' days')::interval
        AND oi.product_id IS NOT NULL
      GROUP BY oi.product_id, oi.title
      ORDER BY "unitsSold" DESC
      LIMIT 5
    `);
    const topProductsRows = (topProductsResult as any).rows ?? (topProductsResult as any);
    const topProducts = Array.isArray(topProductsRows) ? topProductsRows : [];

    // Period totals (current + previous for delta)
    const totalsResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(oi.total_price) FILTER (WHERE o.placed_at >= NOW() - (${sql.raw(String(intervalDays))} || ' days')::interval), 0)::text AS curr_revenue,
        COALESCE(SUM(oi.total_price) FILTER (WHERE o.placed_at >= NOW() - (${sql.raw(String(intervalDays * 2))} || ' days')::interval AND o.placed_at < NOW() - (${sql.raw(String(intervalDays))} || ' days')::interval), 0)::text AS prev_revenue,
        COUNT(DISTINCT oi.order_id) FILTER (WHERE o.placed_at >= NOW() - (${sql.raw(String(intervalDays))} || ' days')::interval)::int AS curr_orders,
        COUNT(DISTINCT oi.order_id) FILTER (WHERE o.placed_at >= NOW() - (${sql.raw(String(intervalDays * 2))} || ' days')::interval AND o.placed_at < NOW() - (${sql.raw(String(intervalDays))} || ' days')::interval)::int AS prev_orders
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE oi.vendor_id = ${vendorId}
        AND oi.status NOT IN ('cancelled', 'returned', 'refunded')
    `);
    const totalsRows = (totalsResult as any).rows ?? (totalsResult as any);
    const t = totalsRows[0] ?? { curr_revenue: "0", prev_revenue: "0", curr_orders: 0, prev_orders: 0 };

    return reply.send({
      period,
      series,
      topProducts,
      totals: {
        revenue: t.curr_revenue,
        previousRevenue: t.prev_revenue,
        orders: Number(t.curr_orders ?? 0),
        previousOrders: Number(t.prev_orders ?? 0),
      },
    });
  });
}
