import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export default fp(async function swaggerPlugin(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Multi-Vendor Ecommerce API",
        description:
          "RESTful API for a multi-vendor ecommerce marketplace. Supports admin, vendor, and customer operations.",
        version: "1.0.0",
        contact: {
          name: "API Support",
        },
      },
      servers: [
        {
          url: "http://localhost:4000",
          description: "Development server",
        },
      ],
      tags: [
        { name: "Auth", description: "Authentication & authorization" },
        { name: "Products", description: "Product catalog management" },
        { name: "Orders", description: "Order lifecycle management" },
        { name: "Payments", description: "Payment processing" },
        { name: "Vendors", description: "Vendor management" },
        { name: "Customers", description: "Customer management" },
        { name: "Cart", description: "Shopping cart" },
        { name: "Checkout", description: "Checkout flow" },
        { name: "Discounts", description: "Discount & coupon management" },
        { name: "Fulfillments", description: "Order fulfillment & shipping" },
        { name: "Refunds", description: "Refund management" },
        { name: "Returns", description: "Return request management" },
        { name: "Reviews", description: "Product reviews" },
        { name: "Collections", description: "Product collections" },
        { name: "Content", description: "CMS pages & blogs" },
        { name: "Files", description: "File upload & management" },
        { name: "Search", description: "Product search" },
        { name: "Settings", description: "Platform settings" },
        { name: "System", description: "System administration" },
        { name: "Storefront", description: "Public storefront endpoints" },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT access token. Obtain via /auth/admin/login, /auth/vendor/login, or /auth/customer/login.",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
    },
  });
});
