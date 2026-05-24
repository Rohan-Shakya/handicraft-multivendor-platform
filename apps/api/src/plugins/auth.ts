import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AuthActor, ActorType } from "@repo/types";
import { getEnv } from "../lib/env.js";
import { hasPermission, type Permission } from "../lib/permissions.js";

type PreHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<void> | void;

declare module "fastify" {
  interface FastifyInstance {
    authenticate: PreHandler;
    /** Require the actor's `type` to be one of `types`. */
    requireActorType: (...types: ActorType[]) => PreHandler;
    /** Require an admin actor with one of `roles` (e.g. "super_admin"). */
    requireAdminRole: (...roles: string[]) => PreHandler;
    /** Require a vendor actor with one of `roles` (e.g. "owner", "admin"). */
    requireVendorRole: (...roles: string[]) => PreHandler;
    /** Require the actor to hold a specific RBAC permission. */
    requirePermission: (permission: Permission) => PreHandler;
  }
  interface FastifyRequest {
    actor: AuthActor;
  }
}

function unauthorized(reply: FastifyReply, message = "Unauthorized") {
  return reply.status(401).send({ statusCode: 401, message });
}

function forbidden(reply: FastifyReply, message = "Forbidden") {
  return reply.status(403).send({ statusCode: 403, message });
}

export default fp(async function authPlugin(app: FastifyInstance) {
  const env = getEnv();

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.decorate("authenticate", async function (req: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = await req.jwtVerify<AuthActor & { requires2FA?: boolean; aud?: string }>();
      // 2FA-pending temp tokens MUST NOT grant access to authenticated routes.
      // Defense in depth: reject by both flag and audience.
      if (payload.requires2FA === true || payload.aud === "2fa-pending") {
        return unauthorized(reply, "2FA verification required");
      }
      req.actor = payload;
    } catch {
      return unauthorized(reply);
    }
  });

  // ── Composable RBAC preHandlers ──────────────────────────────────────────
  // Hoist authorization out of services and into route declarations so the
  // contract is visible at registration time and easy to audit. Each helper
  // returns a preHandler array starting with `authenticate` so callers can
  // just write:  preHandler: app.requireAdminRole("super_admin")

  app.decorate("requireActorType", function (...types: ActorType[]) {
    return [
      app.authenticate,
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (!types.includes(req.actor.type)) return forbidden(reply);
      },
    ] as unknown as PreHandler;
  });

  app.decorate("requireAdminRole", function (...roles: string[]) {
    return [
      app.authenticate,
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (req.actor.type !== "admin") return forbidden(reply);
        if (roles.length > 0 && !roles.includes(req.actor.role ?? "")) {
          return forbidden(reply);
        }
      },
    ] as unknown as PreHandler;
  });

  app.decorate("requireVendorRole", function (...roles: string[]) {
    return [
      app.authenticate,
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (req.actor.type !== "vendor") return forbidden(reply);
        if (roles.length > 0 && !roles.includes(req.actor.role ?? "")) {
          return forbidden(reply);
        }
      },
    ] as unknown as PreHandler;
  });

  app.decorate("requirePermission", function (permission: Permission) {
    return [
      app.authenticate,
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (!hasPermission(req.actor, permission)) return forbidden(reply);
      },
    ] as unknown as PreHandler;
  });
});
