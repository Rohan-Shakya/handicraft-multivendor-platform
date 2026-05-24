/**
 * Test application builder — creates a Fastify instance for integration tests.
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import authPlugin from "../../plugins/auth.js";

export async function createTestApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(authPlugin);

  return app;
}

/**
 * Make a test request with JSON body and auth token.
 */
export function testRequest(app: ReturnType<typeof Fastify>) {
  return {
    get: (path: string, token?: string) =>
      app.inject({
        method: "GET",
        url: path,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      }),
    post: (path: string, body?: unknown, token?: string) =>
      app.inject({
        method: "POST",
        url: path,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        payload: body ? JSON.stringify(body) : undefined,
      }),
    put: (path: string, body?: unknown, token?: string) =>
      app.inject({
        method: "PUT",
        url: path,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        payload: body ? JSON.stringify(body) : undefined,
      }),
    patch: (path: string, body?: unknown, token?: string) =>
      app.inject({
        method: "PATCH",
        url: path,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        payload: body ? JSON.stringify(body) : undefined,
      }),
    delete: (path: string, token?: string) =>
      app.inject({
        method: "DELETE",
        url: path,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      }),
  };
}
