/**
 * Campaigns service — marketing wrapper around discounts.
 *
 * A campaign has a window, a hero, and one or more linked discounts (linked
 * via `discounts.campaignId`). The storefront uses an active campaign to drive
 * the homepage banner, sale badges on product cards, and the /sale/[handle]
 * landing page. Analytics roll up impressions / clicks / conversions per
 * campaign for the admin dashboard.
 */
import type { AuthActor } from "@repo/types";
import { eq, and, desc, sql, gte, lte, isNull, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  campaigns,
  campaignEvents,
  discounts,
  orderAppliedDiscounts,
  orders,
} from "../../db/schema/index.js";
import { assertPermission } from "../../lib/permissions.js";
import { NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { logAudit, auditActorId } from "../../lib/audit.js";
import { generateId } from "../../lib/id.js";
import { cacheInvalidate } from "../../lib/redis.js";

interface CampaignFilters {
  page?: number;
  limit?: number;
  status?: string;
}

export interface CreateCampaignInput {
  handle: string;
  title: string;
  headline?: string;
  description?: string;
  heroImageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  priority?: number;
  status?: "draft" | "scheduled" | "active" | "ended" | "archived";
  startsAt: string;
  endsAt: string;
  accentColor?: string;
  backgroundColor?: string;
  discountIds?: string[];
}

export type UpdateCampaignInput = Partial<CreateCampaignInput>;

function invalidateCampaignCache(): void {
  // Best-effort — the storefront active-campaign + active-auto-discount caches
  // both feed off the same rows.
  cacheInvalidate("campaigns:active-hero").catch(() => {});
  cacheInvalidate("discounts:active-auto").catch(() => {});
}

export async function listCampaigns(actor: AuthActor, filters: CampaignFilters) {
  assertPermission(actor, "campaign:manage:any");
  const { page = 1, limit = 20, status } = filters;
  const offset = (page - 1) * limit;

  const conditions = [
    isNull(campaigns.deletedAt),
    status ? eq(campaigns.status, status as any) : undefined,
  ].filter(Boolean);
  const where = conditions.length > 0 ? and(...(conditions as any)) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(campaigns)
      .where(where)
      .orderBy(desc(campaigns.startsAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(where),
  ]);

  return {
    data: rows,
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  };
}

export async function getCampaignById(actor: AuthActor, id: string) {
  assertPermission(actor, "campaign:manage:any");
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), isNull(campaigns.deletedAt)));
  if (!campaign) throw new NotFoundError("Campaign not found");

  const linkedDiscounts = await db
    .select()
    .from(discounts)
    .where(and(eq(discounts.campaignId, id), isNull(discounts.deletedAt)));

  return { ...campaign, discounts: linkedDiscounts };
}

export async function createCampaign(actor: AuthActor, data: CreateCampaignInput) {
  assertPermission(actor, "campaign:manage:any");

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new UnprocessableError("startsAt and endsAt must be valid ISO timestamps");
  }
  if (startsAt > endsAt) {
    throw new UnprocessableError("startsAt must be on or before endsAt");
  }

  // Handle uniqueness check (covered by the partial unique index too, but a
  // clean error message beats a Postgres constraint blow-up).
  const [existing] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.handle, data.handle), isNull(campaigns.deletedAt)));
  if (existing) {
    throw new UnprocessableError(`Campaign handle "${data.handle}" already exists`);
  }

  const id = generateId();
  const [campaign] = await db
    .insert(campaigns)
    .values({
      id,
      handle: data.handle,
      title: data.title,
      headline: data.headline ?? null,
      description: data.description ?? null,
      heroImageUrl: data.heroImageUrl ?? null,
      ctaText: data.ctaText ?? null,
      ctaUrl: data.ctaUrl ?? null,
      priority: data.priority ?? 100,
      status: data.status ?? "draft",
      startsAt,
      endsAt,
      accentColor: data.accentColor ?? null,
      backgroundColor: data.backgroundColor ?? null,
      createdByUserId: actor.id,
    })
    .returning();

  if (!campaign) throw new Error("Failed to create campaign");

  // Attach any pre-selected discounts.
  if (data.discountIds && data.discountIds.length > 0) {
    await db
      .update(discounts)
      .set({ campaignId: id, updatedAt: new Date() })
      .where(inArray(discounts.id, data.discountIds));
  }

  invalidateCampaignCache();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "campaign",
    entityId: id,
    action: "campaign.created",
    afterJson: campaign,
  });

  return campaign;
}

export async function updateCampaign(
  actor: AuthActor,
  id: string,
  data: UpdateCampaignInput
) {
  assertPermission(actor, "campaign:manage:any");

  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), isNull(campaigns.deletedAt)));
  if (!existing) throw new NotFoundError("Campaign not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.handle !== undefined) patch.handle = data.handle;
  if (data.title !== undefined) patch.title = data.title;
  if (data.headline !== undefined) patch.headline = data.headline;
  if (data.description !== undefined) patch.description = data.description;
  if (data.heroImageUrl !== undefined) patch.heroImageUrl = data.heroImageUrl;
  if (data.ctaText !== undefined) patch.ctaText = data.ctaText;
  if (data.ctaUrl !== undefined) patch.ctaUrl = data.ctaUrl;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.status !== undefined) patch.status = data.status;
  if (data.accentColor !== undefined) patch.accentColor = data.accentColor;
  if (data.backgroundColor !== undefined) patch.backgroundColor = data.backgroundColor;
  if (data.startsAt !== undefined) patch.startsAt = new Date(data.startsAt);
  if (data.endsAt !== undefined) patch.endsAt = new Date(data.endsAt);

  if (patch.startsAt && patch.endsAt && (patch.startsAt as Date) > (patch.endsAt as Date)) {
    throw new UnprocessableError("startsAt must be on or before endsAt");
  }

  const [updated] = await db
    .update(campaigns)
    .set(patch as never)
    .where(eq(campaigns.id, id))
    .returning();

  // Replace the linked-discount set if discountIds is provided. Unlinking is
  // done by setting campaignId=NULL on previously-linked discounts not in the
  // new set.
  if (data.discountIds !== undefined) {
    await db
      .update(discounts)
      .set({ campaignId: null, updatedAt: new Date() })
      .where(eq(discounts.campaignId, id));
    if (data.discountIds.length > 0) {
      await db
        .update(discounts)
        .set({ campaignId: id, updatedAt: new Date() })
        .where(inArray(discounts.id, data.discountIds));
    }
  }

  invalidateCampaignCache();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "campaign",
    entityId: id,
    action: "campaign.updated",
    beforeJson: existing,
    afterJson: updated,
  });

  return updated!;
}

export async function archiveCampaign(actor: AuthActor, id: string) {
  assertPermission(actor, "campaign:manage:any");
  const now = new Date();
  const [archived] = await db
    .update(campaigns)
    .set({ status: "archived", deletedAt: now, updatedAt: now })
    .where(eq(campaigns.id, id))
    .returning();
  if (!archived) throw new NotFoundError("Campaign not found");

  // Unlink discounts so they don't continue auto-applying.
  await db
    .update(discounts)
    .set({ campaignId: null, updatedAt: now })
    .where(eq(discounts.campaignId, id));

  invalidateCampaignCache();

  await logAudit({
    actorUserId: auditActorId(actor),
    entityType: "campaign",
    entityId: id,
    action: "campaign.archived",
  });

  return archived;
}

/**
 * Campaign analytics rollup — impressions / clicks / conversions / revenue.
 * Single query per metric so this stays cheap even with millions of events.
 */
export async function getCampaignAnalytics(actor: AuthActor, id: string) {
  assertPermission(actor, "campaign:manage:any");

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id));
  if (!campaign) throw new NotFoundError("Campaign not found");

  const [[impressions], [clicks], [conversions], revenueRow] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(campaignEvents)
      .where(and(eq(campaignEvents.campaignId, id), eq(campaignEvents.type, "impression"))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(campaignEvents)
      .where(and(eq(campaignEvents.campaignId, id), eq(campaignEvents.type, "click"))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(campaignEvents)
      .where(and(eq(campaignEvents.campaignId, id), eq(campaignEvents.type, "conversion"))),
    db
      .select({
        revenue: sql<string>`COALESCE(SUM(${campaignEvents.revenue}::numeric), 0)::text`,
      })
      .from(campaignEvents)
      .where(and(eq(campaignEvents.campaignId, id), eq(campaignEvents.type, "conversion"))),
  ]);

  const impressionCount = impressions?.c ?? 0;
  const clickCount = clicks?.c ?? 0;
  const conversionCount = conversions?.c ?? 0;
  const revenue = revenueRow[0]?.revenue ?? "0";

  const clickThroughRate =
    impressionCount > 0 ? clickCount / impressionCount : 0;
  const conversionRate =
    clickCount > 0 ? conversionCount / clickCount : 0;

  return {
    campaign,
    metrics: {
      impressions: impressionCount,
      clicks: clickCount,
      conversions: conversionCount,
      revenue,
      clickThroughRate,
      conversionRate,
    },
  };
}

// ─── Storefront-facing helpers ─────────────────────────────────────────────

/**
 * Fetch a campaign by handle for the /sale/[handle] landing page. Returns the
 * eligible product ids (discounts → product/collection targets expanded).
 */
export async function getCampaignByHandlePublic(handle: string) {
  const now = new Date();
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.handle, handle),
        eq(campaigns.status, "active"),
        isNull(campaigns.deletedAt),
        lte(campaigns.startsAt, now),
        gte(campaigns.endsAt, now)
      )
    );
  if (!campaign) return null;

  const linkedDiscounts = await db
    .select({
      id: discounts.id,
      title: discounts.title,
      type: discounts.type,
      value: discounts.value,
      scope: discounts.scope,
      vendorId: discounts.vendorId,
    })
    .from(discounts)
    .where(
      and(
        eq(discounts.campaignId, campaign.id),
        eq(discounts.status, "active"),
        isNull(discounts.deletedAt)
      )
    );

  return { ...campaign, discounts: linkedDiscounts };
}

// ─── Analytics writes ──────────────────────────────────────────────────────

interface RecordEventInput {
  campaignId: string;
  type: "impression" | "click" | "conversion";
  sessionId?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  revenue?: string | null;
  surface?: string | null;
}

export async function recordCampaignEvent(input: RecordEventInput): Promise<void> {
  // Verify campaign exists before writing (avoids garbage rows if a stale
  // sessionStorage banner pings after the campaign was deleted).
  const [campaign] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.id, input.campaignId));
  if (!campaign) return; // silently drop — no FK violation in logs

  await db.insert(campaignEvents).values({
    id: generateId(),
    campaignId: input.campaignId,
    type: input.type,
    sessionId: input.sessionId ?? null,
    customerId: input.customerId ?? null,
    orderId: input.orderId ?? null,
    revenue: input.revenue ?? null,
    surface: input.surface ?? null,
  });
}

/**
 * Hook called from order placement to record conversions for any campaign
 * discount applied to the order. Idempotent: skips if a conversion event
 * already exists for (campaignId, orderId).
 */
export async function recordConversionForOrder(orderId: string): Promise<void> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return;

  // Which discounts applied to this order? Cross-reference to find ones tied
  // to active campaigns.
  const applied = await db
    .select({
      discountId: orderAppliedDiscounts.discountId,
      amount: orderAppliedDiscounts.amount,
    })
    .from(orderAppliedDiscounts)
    .where(eq(orderAppliedDiscounts.orderId, orderId));
  if (applied.length === 0) return;

  const discountIds = applied
    .map((a) => a.discountId)
    .filter((id): id is string => !!id);
  if (discountIds.length === 0) return;

  const discountRows = await db
    .select({ id: discounts.id, campaignId: discounts.campaignId })
    .from(discounts)
    .where(inArray(discounts.id, discountIds));

  const campaignIds = [
    ...new Set(
      discountRows
        .map((d) => d.campaignId)
        .filter((id): id is string => !!id)
    ),
  ];
  if (campaignIds.length === 0) return;

  // De-dupe revenue across multiple discounts attached to the same campaign by
  // attributing the full order's discount sum to each campaign once. Two
  // campaigns sharing an order would each get credit for their portion.
  const discountById = new Map(discountRows.map((d) => [d.id, d]));
  const revenueByCampaign = new Map<string, number>();
  for (const a of applied) {
    if (!a.discountId) continue;
    const cid = discountById.get(a.discountId)?.campaignId;
    if (!cid) continue;
    revenueByCampaign.set(
      cid,
      (revenueByCampaign.get(cid) ?? 0) + parseFloat(a.amount)
    );
  }

  // Use idempotency on the conversion event so re-running this (e.g. order
  // updated, post-checkout) won't double-count. We do this with an existence
  // check rather than a unique constraint to avoid migration churn.
  for (const [campaignId, revenue] of revenueByCampaign) {
    const [already] = await db
      .select({ id: campaignEvents.id })
      .from(campaignEvents)
      .where(
        and(
          eq(campaignEvents.campaignId, campaignId),
          eq(campaignEvents.type, "conversion"),
          eq(campaignEvents.orderId, orderId)
        )
      );
    if (already) continue;
    await db.insert(campaignEvents).values({
      id: generateId(),
      campaignId,
      type: "conversion",
      sessionId: null,
      customerId: order.customerId ?? null,
      orderId,
      revenue: revenue.toFixed(2),
      surface: "order",
    });
  }
}
