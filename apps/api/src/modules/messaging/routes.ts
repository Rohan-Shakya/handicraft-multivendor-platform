/**
 * Customer ↔ vendor messaging.
 *
 * Storefront endpoints serve the customer side (create thread, list mine,
 * fetch one, reply). Vendor endpoints serve the vendor side. An admin endpoint
 * is intentionally omitted — moderation can be added later by reading
 * audit_logs / message rows directly.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, desc, sql, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  messageThreads,
  messages,
  customers,
  vendors,
  products,
  orders,
} from "../../db/schema/index.js";
import { generateId } from "../../lib/id.js";
import { ForbiddenError, NotFoundError, UnprocessableError } from "../../lib/errors.js";

const createThreadSchema = z.object({
  vendorId: z.string().min(1),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  productId: z.string().optional(),
  orderId: z.string().optional(),
});

const replySchema = z.object({
  body: z.string().min(1).max(5000),
});

export async function messagingRoutes(app: FastifyInstance) {
  // ─── Storefront (customer) ──────────────────────────────────────────────

  /** Create a new thread + first message. */
  app.post(
    "/storefront/messages/threads",
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (req: any, reply: any) => {
      if (req.actor.type !== "customer") throw new ForbiddenError();
      const body = createThreadSchema.parse(req.body);

      // Verify vendor exists
      const [vendor] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.id, body.vendorId));
      if (!vendor) throw new NotFoundError("Vendor not found");

      // If orderId is supplied, verify the customer owns it.
      if (body.orderId) {
        const [order] = await db
          .select({ customerId: orders.customerId })
          .from(orders)
          .where(eq(orders.id, body.orderId));
        if (!order || order.customerId !== req.actor.id) {
          throw new ForbiddenError("Order does not belong to this customer");
        }
      }

      const threadId = generateId();
      const messageId = generateId();
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(messageThreads).values({
          id: threadId,
          customerId: req.actor.id,
          vendorId: body.vendorId,
          subject: body.subject,
          productId: body.productId ?? null,
          orderId: body.orderId ?? null,
          lastMessageAt: now,
          customerUnreadCount: 0,
          vendorUnreadCount: 1,
        });
        await tx.insert(messages).values({
          id: messageId,
          threadId,
          senderType: "customer",
          senderId: req.actor.id,
          body: body.body,
        });
      });

      return reply.status(201).send({ id: threadId });
    }
  );

  /** List the customer's threads (most recently active first). */
  app.get(
    "/storefront/messages/threads",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (req.actor.type !== "customer") throw new ForbiddenError();
      const rows = await db
        .select({
          id: messageThreads.id,
          subject: messageThreads.subject,
          status: messageThreads.status,
          lastMessageAt: messageThreads.lastMessageAt,
          unread: messageThreads.customerUnreadCount,
          vendorName: vendors.name,
          vendorSlug: vendors.slug,
          productId: messageThreads.productId,
          orderId: messageThreads.orderId,
        })
        .from(messageThreads)
        .innerJoin(vendors, eq(vendors.id, messageThreads.vendorId))
        .where(eq(messageThreads.customerId, req.actor.id))
        .orderBy(desc(messageThreads.lastMessageAt))
        .limit(100);
      return reply.send({ data: rows });
    }
  );

  /** Fetch one thread (with messages). Clears the customer's unread count. */
  app.get(
    "/storefront/messages/threads/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (req.actor.type !== "customer") throw new ForbiddenError();
      const threadId = req.params.id as string;
      const thread = await loadAndAuthThread(threadId, "customer", req.actor.id);
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, threadId))
        .orderBy(messages.createdAt);
      // Mark customer's unread → zero. Also stamp readAt on vendor-authored
      // messages so the vendor can see when customer last looked.
      await db
        .update(messageThreads)
        .set({ customerUnreadCount: 0 })
        .where(eq(messageThreads.id, threadId));
      await db
        .update(messages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(messages.threadId, threadId),
            eq(messages.senderType, "vendor"),
            sql`${messages.readAt} IS NULL`
          )
        );
      return reply.send({ thread, messages: msgs });
    }
  );

  /** Reply to a thread. */
  app.post(
    "/storefront/messages/threads/:id/reply",
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 60, timeWindow: "1 hour" } },
    },
    async (req: any, reply: any) => {
      if (req.actor.type !== "customer") throw new ForbiddenError();
      const body = replySchema.parse(req.body);
      const threadId = req.params.id as string;
      await loadAndAuthThread(threadId, "customer", req.actor.id);
      await db.transaction(async (tx) => {
        await tx.insert(messages).values({
          id: generateId(),
          threadId,
          senderType: "customer",
          senderId: req.actor.id,
          body: body.body,
        });
        await tx
          .update(messageThreads)
          .set({
            lastMessageAt: new Date(),
            vendorUnreadCount: sql`${messageThreads.vendorUnreadCount} + 1`,
          })
          .where(eq(messageThreads.id, threadId));
      });
      return reply.status(204).send();
    }
  );

  // ─── Vendor side ──────────────────────────────────────────────────────────

  app.get(
    "/vendor/messages/threads",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (req.actor.type !== "vendor" || !req.actor.vendorId) {
        throw new ForbiddenError();
      }
      const rows = await db
        .select({
          id: messageThreads.id,
          subject: messageThreads.subject,
          status: messageThreads.status,
          lastMessageAt: messageThreads.lastMessageAt,
          unread: messageThreads.vendorUnreadCount,
          customerName: sql<string>`coalesce(${customers.firstName} || ' ' || ${customers.lastName}, ${customers.email})`,
          customerEmail: customers.email,
          productId: messageThreads.productId,
          orderId: messageThreads.orderId,
        })
        .from(messageThreads)
        .innerJoin(customers, eq(customers.id, messageThreads.customerId))
        .where(eq(messageThreads.vendorId, req.actor.vendorId))
        .orderBy(desc(messageThreads.lastMessageAt))
        .limit(100);
      return reply.send({ data: rows });
    }
  );

  app.get(
    "/vendor/messages/threads/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      if (req.actor.type !== "vendor" || !req.actor.vendorId) {
        throw new ForbiddenError();
      }
      const threadId = req.params.id as string;
      const thread = await loadAndAuthThread(threadId, "vendor", req.actor.vendorId);
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, threadId))
        .orderBy(messages.createdAt);
      await db
        .update(messageThreads)
        .set({ vendorUnreadCount: 0 })
        .where(eq(messageThreads.id, threadId));
      await db
        .update(messages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(messages.threadId, threadId),
            eq(messages.senderType, "customer"),
            sql`${messages.readAt} IS NULL`
          )
        );
      return reply.send({ thread, messages: msgs });
    }
  );

  app.post(
    "/vendor/messages/threads/:id/reply",
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 120, timeWindow: "1 hour" } },
    },
    async (req: any, reply: any) => {
      if (req.actor.type !== "vendor" || !req.actor.vendorId) {
        throw new ForbiddenError();
      }
      const body = replySchema.parse(req.body);
      const threadId = req.params.id as string;
      await loadAndAuthThread(threadId, "vendor", req.actor.vendorId);
      await db.transaction(async (tx) => {
        await tx.insert(messages).values({
          id: generateId(),
          threadId,
          senderType: "vendor",
          senderId: req.actor.id,
          body: body.body,
        });
        await tx
          .update(messageThreads)
          .set({
            lastMessageAt: new Date(),
            customerUnreadCount: sql`${messageThreads.customerUnreadCount} + 1`,
          })
          .where(eq(messageThreads.id, threadId));
      });
      return reply.status(204).send();
    }
  );
}

/** Verify the thread exists and the requester is a member. */
async function loadAndAuthThread(
  threadId: string,
  actorType: "customer" | "vendor",
  actorId: string
) {
  const [thread] = await db
    .select()
    .from(messageThreads)
    .where(eq(messageThreads.id, threadId));
  if (!thread) throw new NotFoundError("Thread not found");
  if (actorType === "customer" && thread.customerId !== actorId) {
    throw new ForbiddenError();
  }
  if (actorType === "vendor" && thread.vendorId !== actorId) {
    throw new ForbiddenError();
  }
  if (thread.status !== "open") {
    throw new UnprocessableError(`Thread is ${thread.status}`);
  }
  return thread;
}
