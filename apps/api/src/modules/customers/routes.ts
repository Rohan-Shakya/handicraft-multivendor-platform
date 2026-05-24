import type { FastifyInstance } from "fastify";
import * as ctrl from "./controller.js";

export async function customerRoutes(app: FastifyInstance) {
  // Storefront — customer self-service
  app.get("/storefront/customer/me", { preHandler: [app.authenticate] }, ctrl.getMyProfile);
  app.patch("/storefront/customer/me", { preHandler: [app.authenticate] }, ctrl.updateMyProfile);
  app.get("/storefront/customer/addresses", { preHandler: [app.authenticate] }, ctrl.getMyAddresses);
  app.post("/storefront/customer/addresses", { preHandler: [app.authenticate] }, ctrl.createAddress);
  app.patch("/storefront/customer/addresses/:id", { preHandler: [app.authenticate] }, ctrl.updateAddress as any);
  app.delete("/storefront/customer/addresses/:id", { preHandler: [app.authenticate] }, ctrl.deleteAddress as any);

  // Admin — manage customers
  app.get("/admin/customers", { preHandler: [app.authenticate] }, ctrl.listCustomers);
  app.post("/admin/customers", { preHandler: [app.authenticate] }, ctrl.createCustomer);
  app.get("/admin/customers/:id", { preHandler: [app.authenticate] }, ctrl.getCustomer as any);
  app.patch("/admin/customers/:id", { preHandler: [app.authenticate] }, ctrl.adminUpdateCustomer as any);
  app.delete("/admin/customers/:id", { preHandler: [app.authenticate] }, ctrl.deleteCustomer as any);

  // Admin — manage customer addresses
  app.get("/admin/customers/:customerId/addresses", { preHandler: [app.authenticate] }, ctrl.adminListAddresses as any);
  app.post("/admin/customers/:customerId/addresses", { preHandler: [app.authenticate] }, ctrl.adminCreateAddress as any);
  app.patch("/admin/customers/:customerId/addresses/:addressId", { preHandler: [app.authenticate] }, ctrl.adminUpdateAddress as any);
  app.delete("/admin/customers/:customerId/addresses/:addressId", { preHandler: [app.authenticate] }, ctrl.adminDeleteAddress as any);

  // Admin — manage customer tags
  app.get("/admin/customers/:customerId/tags", { preHandler: [app.authenticate] }, ctrl.listCustomerTags as any);
  app.post("/admin/customers/:customerId/tags", { preHandler: [app.authenticate] }, ctrl.addCustomerTags as any);
  app.delete("/admin/customers/:customerId/tags/:tag", { preHandler: [app.authenticate] }, ctrl.removeCustomerTag as any);
}
