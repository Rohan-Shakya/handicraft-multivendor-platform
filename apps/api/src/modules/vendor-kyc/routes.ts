import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const addDocumentSchema = z.object({
  documentType: z.enum([
    "registration_certificate",
    "tax_document",
    "vat_document",
    "owner_identity",
    "bank_proof",
    "address_proof",
    "other",
  ]),
  fileId: z.string().min(1),
  note: z.string().optional(),
});

const rejectSchema = z.object({
  reason: z.string().optional(),
});

const kycListQuerySchema = z.object({
  status: z.enum(["pending", "under_review", "approved", "rejected"]).optional(),
});

export async function vendorKycRoutes(app: FastifyInstance) {
  // ── Vendor: submit KYC ────────────────────────────────────────────────────

  app.post(
    "/vendor/kyc",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (!req.actor?.vendorId) {
        return reply.status(403).send({ message: "Vendor context required" });
      }
      return reply
        .status(201)
        .send(await service.getOrCreateKyc(req.actor, req.actor.vendorId));
    }
  );

  app.post(
    "/vendor/kyc/documents",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (!req.actor?.vendorId) {
        return reply.status(403).send({ message: "Vendor context required" });
      }
      const body = addDocumentSchema.parse(req.body);
      return reply
        .status(201)
        .send(await service.addKycDocument(req.actor, req.actor.vendorId, body));
    }
  );

  app.post(
    "/vendor/kyc/submit",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (!req.actor?.vendorId) {
        return reply.status(403).send({ message: "Vendor context required" });
      }
      return reply.send(await service.submitKyc(req.actor, req.actor.vendorId));
    }
  );

  // ── Admin: review KYC ─────────────────────────────────────────────────────

  app.get(
    "/admin/kyc",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      const { status } = kycListQuerySchema.parse(req.query);
      return reply.send(await service.listKycs(req.actor, status));
    }
  );

  app.get(
    "/admin/vendors/:vendorId/kyc",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getKycForVendor(req.actor, req.params.vendorId));
    }
  );

  app.post(
    "/admin/kyc/:kycId/approve",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.approveKyc(req.actor, req.params.kycId));
    }
  );

  app.post(
    "/admin/kyc/:kycId/reject",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = rejectSchema.parse(req.body);
      return reply.send(await service.rejectKyc(req.actor, req.params.kycId, body.reason));
    }
  );
}
