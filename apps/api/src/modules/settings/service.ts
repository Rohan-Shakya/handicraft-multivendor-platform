import type { AuthActor } from "@repo/types";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { settings } from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { cacheGet, cacheDel } from "../../lib/redis.js";

// ─── Known setting keys ────────────────────────────────────────────────────

export const SETTING_KEYS = [
  "site_title",
  "site_description",
  "homepage_title",
  "homepage_description",
  "social_image_url",
  "favicon_url",
  "store_name",
  "store_email",
  "store_phone",
  "store_address",
  "social_facebook",
  "social_instagram",
  "social_twitter",
  "social_pinterest",
  "social_youtube",
  "social_tiktok",
  "google_analytics_id",
  "facebook_pixel_id",
  "custom_head_code",
  "custom_body_code",
  "password_protection_enabled",
  "password_protection_password",
  "password_protection_message",
  // Policies
  "policy_refund",
  "policy_privacy",
  "policy_terms",
  "policy_shipping",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

// ─── Operations ────────────────────────────────────────────────────────────

export async function getAll(actor: AuthActor) {
  assertPermission(actor, "settings:manage");

  const rows = await db.select().from(settings);

  // Return as key-value object
  const result: Record<string, string | null> = {};
  for (const key of SETTING_KEYS) {
    result[key] = null;
  }
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function getPublicSettings() {
  return cacheGet("settings:public", 1800, async () => {
    const publicKeys = [
      "site_title",
      "site_description",
      "homepage_title",
      "homepage_description",
      "social_image_url",
      "favicon_url",
      "store_name",
      "social_facebook",
      "social_instagram",
      "social_twitter",
      "social_pinterest",
      "social_youtube",
      "social_tiktok",
      "policy_refund",
      "policy_privacy",
      "policy_terms",
      "policy_shipping",
    ];

    const rows = await db.select().from(settings);
    const result: Record<string, string | null> = {};
    for (const row of rows) {
      if (publicKeys.includes(row.key)) {
        result[row.key] = row.value;
      }
    }
    return result;
  });
}

export async function update(
  actor: AuthActor,
  data: Record<string, string | null>
) {
  assertPermission(actor, "settings:manage");

  const now = new Date();
  const entries = Object.entries(data).filter(([key]) =>
    (SETTING_KEYS as readonly string[]).includes(key)
  );

  // Upsert all settings in a single transaction
  await db.transaction(async (tx) => {
    for (const [key, value] of entries) {
      await tx
        .insert(settings)
        .values({
          key,
          value: value ?? null,
          updatedBy: actor.id,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: value ?? null,
            updatedBy: actor.id,
            updatedAt: now,
          },
        });
    }
  });

  // Invalidate settings cache
  cacheDel("settings:public");
  cacheDel("settings:all");

  const after = await getAll(actor);

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "settings",
    entityId: "global",
    action: "settings.updated",
    metadata: { keys: entries.map(([key]) => key) },
  });

  return after;
}
