import type { FastifyInstance } from "fastify";
import * as ctrl from "./controller.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/admin/users", { preHandler: [app.authenticate] }, ctrl.listUsers);
  app.get("/admin/users/:id", { preHandler: [app.authenticate] }, ctrl.getUser as any);
  app.post("/admin/users", { preHandler: [app.authenticate] }, ctrl.createUser);
  app.patch("/admin/users/:id", { preHandler: [app.authenticate] }, ctrl.updateUser as any);
  app.delete("/admin/users/:id", { preHandler: [app.authenticate] }, ctrl.deleteUser as any);
}
