/**
 * Email client — queues emails via BullMQ for reliable delivery with retry.
 * Falls back to direct SMTP if the queue is not available.
 *
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
 *
 * Notification preferences: callers that want a recipient's
 * `notification_preferences` consulted before send should pass
 * `category` + `recipient`. If preferences say "off" the send is skipped.
 * Calls without `category` always send — that's the transactional path for
 * legal/security/critical emails (password reset, 2FA changes, receipts).
 */
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "../db/index.js";
import { notificationPreferences } from "../db/schema/index.js";
import { getEnv } from "./env.js";
import { logger } from "./logger.js";

export type EmailCategory =
  | "order_updates"
  | "promotions"
  | "newsletter"
  | "security_alerts"
  | "vendor_updates"
  | "review_reminders";

/**
 * Returns true if the recipient has opted in (or hasn't opted out) to the
 * given category. No preference row found ⇒ defaults to opt-in (matches the
 * column defaults in the schema). Security alerts always return true.
 */
async function isOptedIn(
  category: EmailCategory,
  recipient: { userId?: string; customerId?: string }
): Promise<boolean> {
  if (category === "security_alerts") return true;
  if (!recipient.userId && !recipient.customerId) return true;
  try {
    const where = recipient.customerId
      ? eq(notificationPreferences.customerId, recipient.customerId)
      : eq(notificationPreferences.userId, recipient.userId!);
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(where)
      .limit(1);
    if (!prefs) return true; // no row ⇒ defaults apply
    switch (category) {
      case "order_updates":     return prefs.emailOrderUpdates;
      case "promotions":        return prefs.emailPromotions;
      case "newsletter":        return prefs.emailNewsletter;
      case "vendor_updates":    return prefs.emailVendorUpdates;
      case "review_reminders":  return prefs.emailReviewReminders;
      default:                  return true;
    }
  } catch (err) {
    // DB outage — fail-open so we don't silently swallow transactional sends.
    logger.warn({ err, category }, "Failed to read notification_preferences; sending anyway");
    return true;
  }
}

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    const env = getEnv();
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" }
        : undefined,
    });
  }
  return transport;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  /** When provided alongside `recipient`, consults `notification_preferences`
   *  and skips the send if the recipient has opted out. Omit for
   *  transactional/security mail that should always go (default behaviour). */
  category?: EmailCategory;
  recipient?: { userId?: string; customerId?: string };
}

/**
 * Queue an email for background delivery.
 * Falls back to direct SMTP send if the queue is unavailable.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  // Honor notification_preferences. Only kicks in when the caller has
  // declared a category — transactional sends without one always pass.
  if (options.category && options.recipient) {
    const optedIn = await isOptedIn(options.category, options.recipient);
    if (!optedIn) {
      logger.debug(
        { category: options.category, recipient: options.recipient },
        "Email skipped — recipient opted out"
      );
      return;
    }
  }

  // Strip preference fields before they hit the queue/SMTP layer.
  const { category: _c, recipient: _r, ...mailOpts } = options;
  void _c; void _r;

  try {
    // Try to use the BullMQ queue for reliable delivery.
    const { getEmailQueue } = await import("./queue.js");
    const queue = getEmailQueue();
    if (queue) {
      await queue.add("send-email", mailOpts);
      return;
    }
  } catch {
    // Module import / queue push failed — fall through to direct send.
  }

  // Direct send fallback
  await sendEmailDirect(mailOpts);
}

/**
 * Send an email directly via SMTP (used by the worker and as fallback).
 */
export async function sendEmailDirect(options: SendEmailOptions): Promise<void> {
  const env = getEnv();
  try {
    await getTransport().sendMail({
      from: options.from ?? env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });
  } catch (err) {
    logger.error({ err }, "Failed to send email");
  }
}

/** Verify SMTP connection on startup (non-blocking) */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await getTransport().verify();
    logger.info("SMTP connection verified");
    return true;
  } catch {
    logger.warn("SMTP not configured or unreachable — emails will be logged only");
    return false;
  }
}
