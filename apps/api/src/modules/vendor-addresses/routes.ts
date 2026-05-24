import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const addressBodySchema = z.object({
  type: z.enum(["business", "billing", "warehouse", "return", "origin"]),
  label: z.string().optional(),
  contactName: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  province: z.string().optional(),
  provinceCode: z.string().optional(),
  country: z.string().min(1),
  countryCode: z.string().length(2),
  zip: z.string().min(1),
  isDefault: z.boolean().optional(),
});

const patchBodySchema = addressBodySchema.partial();

export async function vendorAddressRoutes(app: FastifyInstance) {
  // Vendor self-service
  app.get(
    "/storefront/vendors/:vendorId/addresses",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.listVendorAddresses(req.actor, req.params.vendorId));
    }
  );

  app.post(
    "/storefront/vendors/:vendorId/addresses",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = addressBodySchema.parse(req.body);
      return reply.status(201).send(await service.addVendorAddress(req.actor, req.params.vendorId, body));
    }
  );

  app.patch(
    "/storefront/vendors/:vendorId/addresses/:addressId",
    { preHandler: [app.authenticate] },
    async (
      req: any,
      reply: any
    ) => {
      const body = patchBodySchema.parse(req.body);
      return reply.send(
        await service.updateVendorAddress(req.actor, req.params.vendorId, req.params.addressId, body)
      );
    }
  );

  app.delete(
    "/storefront/vendors/:vendorId/addresses/:addressId",
    { preHandler: [app.authenticate] },
    async (
      req: any,
      reply: any
    ) => {
      await service.deleteVendorAddress(req.actor, req.params.vendorId, req.params.addressId);
      return reply.status(204).send();
    }
  );

  // Admin mirror
  app.get(
    "/admin/vendors/:vendorId/addresses",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.listVendorAddresses(req.actor, req.params.vendorId));
    }
  );
}
