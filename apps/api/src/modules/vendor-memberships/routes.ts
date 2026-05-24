import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as service from "./service.js";

const inviteMemberSchema = z.object({
  vendorId: z.string(),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "catalog_manager", "content_manager", "support_agent"]),
});

const updateMembershipSchema = z.object({
  role: z.enum(["owner", "admin", "catalog_manager", "content_manager", "support_agent"]).optional(),
  status: z.enum(["invited", "active", "suspended", "revoked"]).optional(),
});

export async function vendorMembershipsRoutes(app: FastifyInstance) {
  // ── Vendor portal: own team management ───────────────────────────────────

  app.post(
    "/vendor/memberships",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = inviteMemberSchema.parse(req.body);
      return reply.status(201).send(await service.inviteMember(req.actor, body));
    }
  );

  app.get(
    "/vendor/memberships",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (!req.actor?.vendorId) {
        return reply.status(403).send({ statusCode: 403, message: "Vendor context required" });
      }
      return reply.send(await service.listMembers(req.actor, req.actor.vendorId));
    }
  );

  app.get(
    "/vendor/memberships/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getMembership(req.actor, req.params.id));
    }
  );

  app.patch(
    "/vendor/memberships/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateMembershipSchema.parse(req.body);
      return reply.send(await service.updateMembership(req.actor, req.params.id, body));
    }
  );

  app.delete(
    "/vendor/memberships/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.revokeMembership(req.actor, req.params.id));
    }
  );

  // ── Admin: manage memberships of any vendor ─────────────────────────────
  // Reuses the same service layer — `assertVendorOwnership` is a no-op for
  // admin actors, so list/invite/update/revoke all work with vendorId taken
  // from the URL instead of the actor's own vendor context.

  app.get(
    "/admin/vendors/:vendorId/memberships",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.listMembers(req.actor, req.params.vendorId));
    }
  );

  app.post(
    "/admin/vendors/:vendorId/memberships",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = inviteMemberSchema.omit({ vendorId: true }).parse(req.body);
      return reply
        .status(201)
        .send(
          await service.inviteMember(req.actor, {
            vendorId: req.params.vendorId,
            ...body,
          })
        );
    }
  );

  app.patch(
    "/admin/memberships/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const body = updateMembershipSchema.parse(req.body);
      return reply.send(await service.updateMembership(req.actor, req.params.id, body));
    }
  );

  app.delete(
    "/admin/memberships/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.revokeMembership(req.actor, req.params.id));
    }
  );
}
