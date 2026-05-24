import type { FastifyInstance } from "fastify";
import * as ctrl from "./controller.js";

export async function orderRoutes(app: FastifyInstance) {
  // ── Storefront (authenticated customer) ──────────────────────────────────
  app.get("/storefront/orders", { preHandler: [app.authenticate] }, ctrl.listMyOrders);
  app.get("/storefront/orders/:id", { preHandler: [app.authenticate] }, ctrl.getMyOrder as any);
  app.post(
    "/customer/orders/:id/cancel",
    { preHandler: [app.authenticate] },
    ctrl.cancelOrderCustomer as any
  );
  // Bulk-quote request — creates a draft order on behalf of the customer and
  // opens a vendor inbox thread. Admin negotiates pricing/shipping, then
  // sends an invoice via the existing draft order endpoints.
  //
  // Path is `/storefront/bulk-quotes` rather than `quote-requests` to avoid a
  // collision with the made-to-order configurator submission endpoint in
  // `product-configurator/routes.ts` — that one is for isConfigurable products
  // and starts from a selection of config options, not a stock variant.
  app.post(
    "/storefront/bulk-quotes",
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    ctrl.createQuoteRequest
  );

  // ── Admin ─────────────────────────────────────────────────────────────────
  app.get("/admin/orders", { preHandler: [app.authenticate] }, ctrl.listOrders);
  app.get("/admin/orders/:id", { preHandler: [app.authenticate] }, ctrl.getOrder as any);
  app.patch(
    "/admin/orders/:id/status",
    { preHandler: [app.authenticate] },
    ctrl.updateOrderStatus as any
  );
  app.post(
    "/admin/orders/:id/cancel",
    { preHandler: [app.authenticate] },
    ctrl.cancelOrderAdmin as any
  );

  // ── Draft orders (admin only) ────────────────────────────────────────────
  app.post(
    "/admin/orders/draft",
    { preHandler: [app.authenticate] },
    ctrl.createDraftOrder
  );
  app.patch(
    "/admin/orders/:id",
    { preHandler: [app.authenticate] },
    ctrl.updateDraftOrder as any
  );
  app.post(
    "/admin/orders/:id/convert",
    { preHandler: [app.authenticate] },
    ctrl.convertDraftOrder as any
  );
  app.post(
    "/admin/orders/:id/send-invoice",
    { preHandler: [app.authenticate] },
    ctrl.sendDraftInvoice as any
  );
  // Admin view of vendor orders
  app.get(
    "/admin/vendor-orders",
    { preHandler: [app.authenticate] },
    ctrl.listVendorOrdersAdmin
  );

  // ── Vendor ────────────────────────────────────────────────────────────────
  app.get(
    "/vendor/orders",
    { preHandler: [app.authenticate] },
    ctrl.listMyVendorOrders
  );
  app.get(
    "/vendor/orders/:vendorOrderId",
    { preHandler: [app.authenticate] },
    ctrl.getMyVendorOrder as any
  );
  app.patch(
    "/vendor/orders/:vendorOrderId/status",
    { preHandler: [app.authenticate] },
    ctrl.updateVendorOrderStatus as any
  );

  // ── Export ─────────────────────────────────────────────────────────────────
  app.post("/admin/orders/export", { preHandler: [app.authenticate] }, ctrl.exportOrdersCsv);
}
