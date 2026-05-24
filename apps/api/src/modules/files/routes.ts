import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { ForbiddenError } from "../../lib/errors.js";
import * as service from "./service.js";

const presignedUploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

const confirmUploadSchema = z.object({
  sizeBytes: z.number().int().min(0).optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
});

const updateFileSchema = z.object({
  altText: z.string().max(500).nullable().optional(),
  fileName: z.string().min(1).max(255).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

const createFileSchema = z.object({
  originalName: z.string().min(1).max(255),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(127).optional(),
  extension: z.string().max(20).optional(),
  storageKey: z.string().min(1),
  url: z.string().url(),
  altText: z.string().max(500).optional(),
  kind: z.enum(["image", "video", "document", "audio", "other"]).optional(),
  sizeBytes: z.number().int().min(0).optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
  durationSeconds: z.string().optional(),
  checksum: z.string().max(128).optional(),
});

const listFilesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  kind: z.enum(["image", "video", "document", "audio", "other"]).optional(),
  status: z.enum(["active", "archived"]).optional(),
  vendorId: z.string().optional(),
  search: z.string().optional(),
});

/** Throw unless the caller is an admin actor. */
function requireAdminActor(req: FastifyRequest) {
  if (req.actor.type !== "admin") {
    throw new ForbiddenError("Admin access required");
  }
}

/** Throw unless the caller is a vendor actor with a resolved vendorId. */
function requireVendorActor(req: FastifyRequest) {
  if (req.actor.type !== "vendor" || !req.actor.vendorId) {
    throw new ForbiddenError("Vendor access required");
  }
}

export async function fileRoutes(app: FastifyInstance) {
  // ── Admin ───────────────────────────────────────────────────────────────

  // Multipart upload (server proxies to R2)
  app.post(
    "/admin/files/upload",
    { preHandler: [app.authenticate], bodyLimit: 10 * 1024 * 1024 },
    async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdminActor(req);
      const filePart = await (req as FastifyRequest & { file: () => Promise<unknown> }).file();
      if (!filePart) {
        return reply
          .status(400)
          .send({ statusCode: 400, message: "No file provided. Send a multipart form with a 'file' field." });
      }
      const file = await service.uploadAdminFile(req.actor, filePart as never);
      return reply.status(201).send(file);
    }
  );

  // Presigned upload (browser uploads directly to R2)
  app.post(
    "/admin/files/presign",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdminActor(req);
      const body = presignedUploadSchema.parse(req.body);
      const result = await service.createPresignedUpload(req.actor, {
        ...body,
        scope: "platform",
      });
      return reply.status(201).send(result);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/admin/files/:id/confirm",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      requireAdminActor(req);
      const body = confirmUploadSchema.parse(req.body);
      const file = await service.confirmUpload(req.actor, req.params.id, body);
      return reply.send(file);
    }
  );

  app.post(
    "/admin/files",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      requireAdminActor(req);
      const body = createFileSchema.parse(req.body);
      const file = await service.createAdminFile(req.actor, body);
      return reply.status(201).send(file);
    }
  );

  app.get(
    "/admin/files",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      requireAdminActor(req);
      const filters = listFilesQuerySchema.parse(req.query);
      return reply.send(await service.listAdminFiles(req.actor, filters));
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/files/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      requireAdminActor(req);
      return reply.send(await service.getAdminFile(req.actor, req.params.id));
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/admin/files/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      requireAdminActor(req);
      const body = updateFileSchema.parse(req.body);
      return reply.send(await service.updateAdminFile(req.actor, req.params.id, body));
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/admin/files/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      requireAdminActor(req);
      return reply.send(await service.deleteAdminFile(req.actor, req.params.id));
    }
  );

  // ── Vendor ──────────────────────────────────────────────────────────────

  // Multipart upload
  app.post(
    "/vendor/files/upload",
    { preHandler: [app.authenticate], bodyLimit: 10 * 1024 * 1024 },
    async (req: FastifyRequest, reply: FastifyReply) => {
      requireVendorActor(req);
      const filePart = await (req as FastifyRequest & { file: () => Promise<unknown> }).file();
      if (!filePart) {
        return reply
          .status(400)
          .send({ statusCode: 400, message: "No file provided. Send a multipart form with a 'file' field." });
      }
      const file = await service.uploadVendorFile(req.actor, filePart as never);
      return reply.status(201).send(file);
    }
  );

  // Presigned upload
  app.post(
    "/vendor/files/presign",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      requireVendorActor(req);
      const body = presignedUploadSchema.parse(req.body);
      const result = await service.createPresignedUpload(req.actor, {
        ...body,
        scope: "vendor",
      });
      return reply.status(201).send(result);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/vendor/files/:id/confirm",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      requireVendorActor(req);
      const body = confirmUploadSchema.parse(req.body);
      const file = await service.confirmUpload(req.actor, req.params.id, body);
      return reply.send(file);
    }
  );

  app.post(
    "/vendor/files",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      requireVendorActor(req);
      const body = createFileSchema.parse(req.body);
      const file = await service.createVendorFile(req.actor, body);
      return reply.status(201).send(file);
    }
  );

  app.get(
    "/vendor/files",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      requireVendorActor(req);
      const filters = listFilesQuerySchema.parse(req.query);
      return reply.send(await service.listVendorFiles(req.actor, filters));
    }
  );

  app.get<{ Params: { id: string } }>(
    "/vendor/files/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      requireVendorActor(req);
      return reply.send(await service.getVendorFile(req.actor, req.params.id));
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/vendor/files/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      requireVendorActor(req);
      const body = updateFileSchema.parse(req.body);
      return reply.send(await service.updateVendorFile(req.actor, req.params.id, body));
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/vendor/files/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      requireVendorActor(req);
      return reply.send(await service.deleteVendorFile(req.actor, req.params.id));
    }
  );
}
