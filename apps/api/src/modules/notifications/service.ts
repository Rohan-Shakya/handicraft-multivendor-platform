import { eq, and, isNull, desc } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { notifications } from "../../db/schema/index.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";

export interface CreateNotificationDto {
  recipientType: "user" | "customer";
  userId?: string;
  customerId?: string;
  vendorId?: string;
  channel?: "in_app" | "email" | "sms" | "push";
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}

/**
 * Internal utility — create a notification record.
 * Not exposed directly to actors; called by domain event handlers.
 */
export async function createNotification(data: CreateNotificationDto) {
  const [notification] = await db
    .insert(notifications)
    .values({
      id: generateId(),
      recipientType: data.recipientType,
      userId: data.userId ?? null,
      customerId: data.customerId ?? null,
      vendorId: data.vendorId ?? null,
      channel: data.channel ?? "in_app",
      status: "pending",
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      payload: data.payload ?? null,
      isRead: false,
    })
    .returning();

  return notification!;
}

/**
 * Customer: list their own notifications.
 */
export async function listMyNotifications(actor: AuthActor) {
  if (actor.type !== "customer") throw new ForbiddenError();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.customerId, actor.id))
    .orderBy(desc(notifications.createdAt));
}

/**
 * Customer: mark a notification as read.
 */
export async function markNotificationRead(actor: AuthActor, notificationId: string) {
  if (actor.type !== "customer") throw new ForbiddenError();

  const [notification] = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.customerId, actor.id)
      )
    );
  if (!notification) throw new NotFoundError("Notification not found");

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date(), status: "read", updatedAt: new Date() })
    .where(eq(notifications.id, notificationId))
    .returning();

  return updated!;
}

/**
 * Customer: mark all notifications as read.
 */
export async function markAllNotificationsRead(actor: AuthActor) {
  if (actor.type !== "customer") throw new ForbiddenError();

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date(), status: "read", updatedAt: new Date() })
    .where(
      and(
        eq(notifications.customerId, actor.id),
        eq(notifications.isRead, false)
      )
    );
}
