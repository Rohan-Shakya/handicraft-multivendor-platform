import type { FastifyInstance } from "fastify";
import * as service from "./service.js";

export async function auditLogRoutes(app: FastifyInstance) {
  app.get(
    "/admin/audit-logs",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const {
        entityType,
        entityId,
        action,
        actorId,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      return reply.send(
        await service.listAuditLogs(req.actor, {
          entityType,
          entityId,
          action,
          actorId,
          startDate,
          endDate,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        })
      );
    }
  );

  app.get(
    "/admin/audit-logs/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      return reply.send(await service.getAuditLogById(req.actor, req.params.id));
    }
  );
}
