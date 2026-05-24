"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  trackCampaignImpression,
  trackCampaignClick,
} from "@/lib/campaign-analytics";

export interface ActiveCampaign {
  id: string;
  handle: string;
  title: string;
  headline: string | null;
  heroImageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  startsAt: string;
  endsAt: string;
}

interface CampaignBannerProps {
  campaign: ActiveCampaign;
  /** Where in the page the banner is being rendered — recorded with the impression. */
  surface?: "homepage" | "footer";
  className?: string;
}

function formatRemaining(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function CountdownPill({ endsAt }: { endsAt: string }) {
  const target = React.useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    // Tick every second while the campaign is still in the future.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = target - now;
  if (remaining <= 0) return null;
  const { days, hours, minutes, seconds } = formatRemaining(remaining);
  const text =
    days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-xs font-semibold tabular-nums"
      role="timer"
      aria-live="off"
      aria-label={`Sale ends in ${days} days, ${hours} hours, ${minutes} minutes`}
    >
      <Clock className="size-3" aria-hidden />
      Ends in {text}
    </span>
  );
}

/**
 * Homepage hero banner for an active marketing campaign. Renders the
 * campaign's hero image, headline, and CTA, with a live countdown to the end
 * time. Fires an impression once per session and a click event on CTA
 * activation (both via sendBeacon so navigation doesn't drop the event).
 *
 * SEO: the campaign hero is server-rendered with semantic headings so search
 * engines can crawl the promotion. Countdown is client-only — search bots see
 * the static text.
 */
export function CampaignBanner({
  campaign,
  surface = "homepage",
  className,
}: CampaignBannerProps) {
  React.useEffect(() => {
    trackCampaignImpression(campaign.id, surface);
  }, [campaign.id, surface]);

  const href = campaign.ctaUrl || `/sale/${campaign.handle}`;
  const ctaText = campaign.ctaText || "Shop the sale";

  const customStyle = React.useMemo(() => {
    const style: React.CSSProperties = {};
    if (campaign.backgroundColor) style.backgroundColor = campaign.backgroundColor;
    if (campaign.accentColor) style.color = campaign.accentColor;
    return style;
  }, [campaign.accentColor, campaign.backgroundColor]);

  return (
    <section
      aria-labelledby={`campaign-${campaign.id}-title`}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        !campaign.backgroundColor && "bg-red-600 text-white",
        className
      )}
      style={customStyle}
      data-campaign-id={campaign.id}
    >
      {campaign.heroImageUrl && (
        // Use a regular img — it's a full-bleed hero in a marketing banner; we
        // don't want next/image's lazy behaviour here since this is LCP.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={campaign.heroImageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      )}
      <div className="relative z-10 flex flex-col items-start gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] opacity-90">
            Limited time
            <CountdownPill endsAt={campaign.endsAt} />
          </p>
          <h2
            id={`campaign-${campaign.id}-title`}
            className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {campaign.title}
          </h2>
          {campaign.headline && (
            <p className="text-base font-medium sm:text-lg lg:text-xl">
              {campaign.headline}
            </p>
          )}
        </div>
        <Link
          href={href}
          onClick={() => trackCampaignClick(campaign.id, surface)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-600"
        >
          {ctaText}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
