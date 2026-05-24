import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orders, payments, paymentTransactions } from "../../db/schema/index.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { fireWebhook } from "../../lib/webhooks.js";
import { getPaymentProvider } from "../../lib/payments/index.js";
import { getEnv } from "../../lib/env.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import { SYSTEM_ACTOR } from "../../lib/permissions.js";
import * as service from "./service.js";

// Make `req.rawBody` available on the encapsulated webhook route only.
declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

// PayPal is intentionally NOT in this list — no provider class is implemented,
// and including it here would cause a 500 from initiate(). Re-add once a
// PayPalProvider exists in lib/payments/.
const SUPPORTED_PROVIDERS = ["stripe", "esewa", "khalti", "fonepay", "cod", "manual"] as const;

const listAllPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "authorized", "captured", "partially_captured", "refunded", "partially_refunded", "voided", "failed"]).optional(),
  provider: z.enum(SUPPORTED_PROVIDERS).optional(),
});

const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(SUPPORTED_PROVIDERS),
  providerPaymentId: z.string().optional(),
  currencyCode: z.string().length(3),
  amountAuthorized: z.number().positive(),
  isTest: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

const initiatePaymentSchema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(["esewa", "khalti", "fonepay", "stripe", "cod"]),
});

const recordTxnSchema = z.object({
  type: z.enum(["authorization", "capture", "refund", "void", "failure", "adjustment"]),
  status: z.enum(["pending", "succeeded", "failed"]),
  providerTransactionId: z.string().optional(),
  amount: z.number().positive(),
  currencyCode: z.string().length(3),
  rawResponse: z.record(z.unknown()).optional(),
});

export async function paymentRoutes(app: FastifyInstance) {
  app.get(
    "/admin/payments",
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply) => {
      const filters = listAllPaymentsSchema.parse(req.query);
      return reply.send(await service.listAllPayments(req.actor, filters));
    }
  );

  app.get<{ Params: { orderId: string } }>(
    "/admin/orders/:orderId/payments",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      return reply.send(await service.listPaymentsForOrder(req.actor, req.params.orderId));
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/payments/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      return reply.send(await service.getPaymentById(req.actor, req.params.id));
    }
  );

  app.post(
    "/admin/payments",
    { preHandler: [app.authenticate] },
    app.withIdempotency("payments.create", async (req: FastifyRequest, reply) => {
      const body = createPaymentSchema.parse(req.body);
      return reply.status(201).send(await service.createPayment(req.actor, body));
    })
  );

  app.post<{ Params: { id: string } }>(
    "/admin/payments/:id/transactions",
    { preHandler: [app.authenticate] },
    app.withIdempotency("payments.txn", async (req, reply) => {
      const body = recordTxnSchema.parse(req.body);
      const { id } = req.params as { id: string };
      return reply.status(201).send(
        await service.recordTransaction(req.actor, { paymentId: id, ...body })
      );
    })
  );

  app.post(
    "/storefront/payments/initiate",
    { preHandler: [app.authenticate] },
    app.withIdempotency("payments.initiate", async (req: FastifyRequest, reply) => {
      const { orderId, provider: providerName } = initiatePaymentSchema.parse(req.body);

      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order) throw new NotFoundError("Order not found");

      if (req.actor.type === "customer" && order.customerId !== req.actor.id) {
        throw new BadRequestError("Order does not belong to this customer");
      }

      if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") {
        throw new BadRequestError(
          `Order cannot be paid again (payment status: ${order.paymentStatus})`
        );
      }

      const env = getEnv();
      const provider = getPaymentProvider(providerName);
      const result = await provider.initiatePayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalPrice,
        currency: order.currencyCode,
        customerEmail: undefined,
        successUrl: `${env.STOREFRONT_URL}/orders/${order.id}/payment-success`,
        failureUrl: `${env.STOREFRONT_URL}/orders/${order.id}/payment-failed`,
      });

      const paymentId = generateId();
      await db.insert(payments).values({
        id: paymentId,
        orderId: order.id,
        customerId: order.customerId ?? null,
        provider: providerName,
        providerPaymentId: result.providerPaymentId,
        currencyCode: order.currencyCode,
        status: "pending",
        amountAuthorized: order.totalPrice,
        amountCaptured: "0",
        amountRefunded: "0",
        isTest: false,
        metadata: result.raw ?? null,
      });

      await logAudit({
        actorUserId: auditActorId(req.actor),
        entityType: "payment",
        entityId: paymentId,
        action: "payment.initiated",
        metadata: { provider: providerName, orderId, providerPaymentId: result.providerPaymentId },
      });

      return reply.send({
        paymentId,
        redirectUrl: result.redirectUrl,
        providerPaymentId: result.providerPaymentId,
        provider: providerName,
      });
    })
  );

  app.get<{ Params: { orderId: string } }>(
    "/storefront/payments/:orderId/status",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const orderId = req.params.orderId;
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order) throw new NotFoundError("Order not found");

      if (req.actor.type === "customer" && order.customerId !== req.actor.id) {
        throw new BadRequestError("Order does not belong to this customer");
      }

      const paymentRows = await db.select().from(payments).where(eq(payments.orderId, orderId));

      return reply.send({
        orderId,
        paymentStatus: order.paymentStatus,
        payments: paymentRows.map((p) => ({
          id: p.id,
          provider: p.provider,
          status: p.status,
          amountAuthorized: p.amountAuthorized,
          amountCaptured: p.amountCaptured,
          createdAt: p.createdAt,
        })),
      });
    }
  );

  // Payment provider webhooks/callbacks.
  // These are unauthenticated — verification happens via provider signatures.
  // CRITICAL: Stripe HMACs the EXACT raw bytes it sent. Re-stringifying the
  // parsed JSON loses key order/whitespace and signature verification will
  // always fail. We register an encapsulated scope with a custom JSON parser
  // that preserves the raw buffer on `req.rawBody`, so verifyPayment can use
  // the original bytes for HMAC.
  await app.register(async (scope) => {
    scope.removeContentTypeParser(["application/json"]);
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      function (req, body, done) {
        const buf = body as Buffer;
        req.rawBody = buf;
        if (buf.length === 0) {
          done(null, {});
          return;
        }
        try {
          const json = JSON.parse(buf.toString("utf8"));
          done(null, json);
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    );

    scope.post(
      "/webhooks/payments/:provider",
      { config: { rateLimit: { max: 50, timeWindow: "1 minute" } } },
      async (req: FastifyRequest<{ Params: { provider: string } }>, reply) => {
        const providerName = req.params.provider;

        try {
          const provider = getPaymentProvider(providerName);

          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === "string") headers[key] = value;
          }

          const query: Record<string, string> = {};
          if (req.query && typeof req.query === "object") {
            for (const [key, value] of Object.entries(req.query as Record<string, unknown>)) {
              if (typeof value === "string") query[key] = value;
            }
          }

          // Use the raw bytes Stripe (and friends) signed. Fall back to a
          // JSON.stringify only if no raw body was captured (e.g. non-JSON
          // content-types from form-encoded providers).
          const body =
            req.rawBody && req.rawBody.length > 0
              ? req.rawBody.toString("utf8")
              : typeof req.body === "string"
                ? req.body
                : JSON.stringify(req.body ?? {});

          const result = await provider.verifyPayment({ headers, body, query });

          if (!result.verified) {
            req.log.warn({ provider: providerName }, "Payment verification failed");
            return reply.status(400).send({ message: "Payment verification failed" });
          }

          const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.providerPaymentId, result.providerPaymentId));

          if (!payment) {
            req.log.warn(
              { provider: providerName, providerPaymentId: result.providerPaymentId },
              "Payment record not found for webhook"
            );
            return reply.status(200).send({ message: "OK" }); // Don't 404 — provider may retry
          }

          if (result.eventType === "payment_completed" && payment.status === "pending") {
            // Amount-tampering guard (H3): the provider-reported amount must
            // match what we authorized. A 1-cent tolerance covers float rounding.
            if (result.amount !== undefined) {
              const reported = parseFloat(result.amount);
              const authorized = parseFloat(payment.amountAuthorized);
              if (!Number.isFinite(reported) || Math.abs(reported - authorized) > 0.01) {
                req.log.error(
                  {
                    provider: providerName,
                    paymentId: payment.id,
                    reported,
                    authorized,
                  },
                  "Payment amount mismatch — possible tampering"
                );
                await service.recordTransaction(SYSTEM_ACTOR, {
                  paymentId: payment.id,
                  type: "failure",
                  status: "failed",
                  providerTransactionId: result.providerPaymentId,
                  amount: authorized,
                  currencyCode: payment.currencyCode,
                  rawResponse: { ...(result.raw ?? {}), reason: "amount_mismatch" },
                });
                return reply.status(400).send({ message: "Amount mismatch" });
              }
            }

            // Idempotency: check if this provider transaction was already processed
            if (result.providerPaymentId) {
              const [existingTxn] = await db
                .select({ id: paymentTransactions.id })
                .from(paymentTransactions)
                .where(
                  and(
                    eq(paymentTransactions.paymentId, payment.id),
                    eq(paymentTransactions.providerTransactionId, result.providerPaymentId),
                    eq(paymentTransactions.type, "capture"),
                    eq(paymentTransactions.status, "succeeded")
                  )
                )
                .limit(1);
              if (existingTxn) {
                req.log.info(
                  { provider: providerName, providerPaymentId: result.providerPaymentId },
                  "Duplicate webhook — already processed"
                );
                return reply.status(200).send({ message: "Already processed" });
              }
            }

            await service.recordTransaction(SYSTEM_ACTOR, {
              paymentId: payment.id,
              type: "capture",
              status: "succeeded",
              providerTransactionId: result.providerPaymentId,
              amount: parseFloat(result.amount ?? payment.amountAuthorized),
              currencyCode: payment.currencyCode,
              rawResponse: result.raw,
            });

            fireWebhook({
              topic: "payment.captured",
              entityType: "payment",
              entityId: payment.id,
              data: {
                paymentId: payment.id,
                orderId: payment.orderId,
                provider: providerName,
                amount: result.amount ?? payment.amountAuthorized,
              },
            }).catch(() => {});
          } else if (result.eventType === "payment_failed") {
            await service.recordTransaction(SYSTEM_ACTOR, {
              paymentId: payment.id,
              type: "failure",
              status: "failed",
              providerTransactionId: result.providerPaymentId,
              amount: parseFloat(payment.amountAuthorized),
              currencyCode: payment.currencyCode,
              rawResponse: result.raw,
            });
          }

          return reply.status(200).send({ message: "OK" });
        } catch (err: any) {
          req.log.error({ err, provider: providerName }, "Webhook processing error");
          return reply.status(500).send({ message: "Webhook processing error" });
        }
      }
    );
  });

  // Payment verification callback (redirect-based: eSewa, Khalti, Fonepay)
  app.get(
    "/payments/verify/:provider",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req: FastifyRequest<{ Params: { provider: string } }>, reply) => {
      const providerName = req.params.provider;
      const env = getEnv();

      try {
        const provider = getPaymentProvider(providerName);

        const query: Record<string, string> = {};
        if (req.query && typeof req.query === "object") {
          for (const [key, value] of Object.entries(req.query as Record<string, unknown>)) {
            if (typeof value === "string") query[key] = value;
          }
        }

        const result = await provider.verifyPayment({ headers: {}, body: "", query });

        if (!result.verified || !result.providerPaymentId) {
          return reply.redirect(`${env.STOREFRONT_URL}/payment-failed`);
        }

        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.providerPaymentId, result.providerPaymentId));

        if (payment && payment.status === "pending") {
          // Idempotency: if already captured (e.g. user refreshed success page), skip.
          const [existingTxn] = await db
            .select({ id: paymentTransactions.id })
            .from(paymentTransactions)
            .where(
              and(
                eq(paymentTransactions.paymentId, payment.id),
                eq(paymentTransactions.providerTransactionId, result.providerPaymentId),
                eq(paymentTransactions.type, "capture"),
                eq(paymentTransactions.status, "succeeded")
              )
            )
            .limit(1);

          if (!existingTxn) {
            // Amount-tampering guard for redirect-based providers too.
            if (result.amount !== undefined) {
              const reported = parseFloat(result.amount);
              const authorized = parseFloat(payment.amountAuthorized);
              if (!Number.isFinite(reported) || Math.abs(reported - authorized) > 0.01) {
                req.log.error(
                  { provider: providerName, paymentId: payment.id, reported, authorized },
                  "Payment amount mismatch on redirect verify"
                );
                return reply.redirect(`${env.STOREFRONT_URL}/payment-failed`);
              }
            }

            await service.recordTransaction(SYSTEM_ACTOR, {
              paymentId: payment.id,
              type: "capture",
              status: "succeeded",
              providerTransactionId: result.providerPaymentId,
              amount: parseFloat(result.amount ?? payment.amountAuthorized),
              currencyCode: payment.currencyCode,
              rawResponse: result.raw,
            });

            fireWebhook({
              topic: "payment.captured",
              entityType: "payment",
              entityId: payment.id,
              data: {
                paymentId: payment.id,
                orderId: payment.orderId,
                provider: providerName,
                amount: result.amount ?? payment.amountAuthorized,
              },
            }).catch((err) => {
              req.log.error({ err, paymentId: payment.id }, "Failed to fire payment.captured webhook");
            });
          }

          return reply.redirect(
            `${env.STOREFRONT_URL}/orders/${payment.orderId}/payment-success`
          );
        }

        // Also redirect to success if payment was already captured (user refresh).
        if (payment && payment.status === "captured") {
          return reply.redirect(
            `${env.STOREFRONT_URL}/orders/${payment.orderId}/payment-success`
          );
        }

        return reply.redirect(`${env.STOREFRONT_URL}/payment-failed`);
      } catch (err: any) {
        req.log.error({ err, provider: providerName }, "Payment verification error");
        return reply.redirect(`${env.STOREFRONT_URL}/payment-failed`);
      }
    }
  );
}
