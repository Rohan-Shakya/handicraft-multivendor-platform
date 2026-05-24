import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Shared structured logger for code running outside the Fastify request context
 * (workers, library init, webhooks). Inside request handlers, use `req.log` instead.
 */
export const logger = pino({
  level: isDev ? "info" : "warn",
  ...(isDev && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
