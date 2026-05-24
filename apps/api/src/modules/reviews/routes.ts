import type { FastifyInstance } from "fastify";
import * as ctrl from "./controller.js";

export async function reviewRoutes(app: FastifyInstance) {
  // Storefront — public product reviews
  app.get(
    "/storefront/products/:productId/reviews",
    ctrl.publicProductReviews
  );

  // Storefront — customer review actions
  app.post(
    "/storefront/reviews",
    { preHandler: [app.authenticate] },
    ctrl.createReview
  );
  app.patch(
    "/storefront/reviews/:id",
    { preHandler: [app.authenticate] },
    ctrl.updateReview as any
  );
  app.delete(
    "/storefront/reviews/:id",
    { preHandler: [app.authenticate] },
    ctrl.deleteReview as any
  );

  // Admin — list, moderate, and delete reviews
  app.get(
    "/admin/reviews",
    { preHandler: [app.authenticate] },
    ctrl.listReviews
  );
  app.patch(
    "/admin/reviews/:id/moderate",
    { preHandler: [app.authenticate] },
    ctrl.moderateReview as any
  );
  app.delete(
    "/admin/reviews/:id",
    { preHandler: [app.authenticate] },
    ctrl.adminDeleteReview as any
  );

  // Vendor — list reviews (vendors query by productId of their own products)
  app.get(
    "/vendor/reviews",
    { preHandler: [app.authenticate] },
    ctrl.listReviews
  );
}
