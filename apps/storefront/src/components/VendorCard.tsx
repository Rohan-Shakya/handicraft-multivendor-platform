import type { Vendor } from "@repo/types";
import { ArrowUpRight, MapPin, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { VENDOR_BANNER_BY_SLUG } from "@/lib/vendor-banner";

type VendorWithCount = Vendor & {
  productCount?: number;
  /** Optional vendor city/region (`city, country`). Hydrated by some endpoints. */
  city?: string | null;
  region?: string | null;
};

type VendorCardProps = {
  vendor: VendorWithCount;
  /** Render as a compact horizontal card. Default: vertical card with banner. */
  compact?: boolean;
  className?: string;
};

/**
 * Brand-coherent gradient palette for vendors without an uploaded banner.
 * Earthy tones tuned to the rug marketplace; deterministic per-vendor by name
 * so the same vendor always gets the same colour treatment.
 */
const BANNER_PALETTE = [
  { from: "#3a4d3a", to: "#5a7d5a", accent: "#a8c098" }, // sage
  { from: "#7a4a2e", to: "#a65a3c", accent: "#d8a684" }, // terracotta
  { from: "#3a3530", to: "#5e4a3a", accent: "#b89878" }, // walnut
  { from: "#2d4548", to: "#456a6e", accent: "#9bbcc0" }, // teal-stone
  { from: "#5a3a4e", to: "#7d4a64", accent: "#c898ae" }, // dusty plum
  { from: "#4a4a2e", to: "#6e6e3c", accent: "#bcbc88" }, // olive
];

function paletteFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return BANNER_PALETTE[Math.abs(h) % BANNER_PALETTE.length]!;
}


function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * Editorial fallback banner — subtle hand-knotted-rug motif drawn in SVG over
 * a brand-tinted gradient. Reads as "marketplace" rather than "stock photo
 * we forgot to replace".
 */
function RugMotifBanner({
  palette,
  initials,
}: {
  palette: (typeof BANNER_PALETTE)[number];
  initials: string;
}) {
  return (
    <svg
      viewBox="0 0 320 120"
      role="img"
      aria-label={`${initials} vendor banner`}
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={`vc-bg-${initials}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
      </defs>
      <rect width="320" height="120" fill={`url(#vc-bg-${initials})`} />
      {/* Soft halo */}
      <ellipse cx="240" cy="40" rx="120" ry="70" fill="white" fillOpacity="0.08" />
      {/* Rug medallion — central */}
      <g transform="translate(160 60)" opacity="0.55">
        <ellipse rx="46" ry="22" fill="none" stroke={palette.accent} strokeWidth="1.4" />
        <ellipse rx="30" ry="14" fill={palette.accent} fillOpacity="0.18" />
        <ellipse rx="14" ry="6" fill={palette.accent} fillOpacity="0.55" />
      </g>
      {/* Knot grid */}
      <g fill={palette.accent} fillOpacity="0.35">
        {Array.from({ length: 8 }).map((_, col) =>
          Array.from({ length: 3 }).map((__, row) => (
            <circle
              key={`${col}-${row}`}
              cx={20 + col * 36}
              cy={18 + row * 36}
              r={1.4}
            />
          ))
        )}
      </g>
      {/* Fringe band */}
      <g
        stroke={palette.accent}
        strokeOpacity="0.45"
        strokeWidth="1"
        strokeLinecap="round"
      >
        {Array.from({ length: 28 }).map((_, i) => (
          <line key={`f-${i}`} x1={8 + i * 11} y1="118" x2={8 + i * 11} y2="113" />
        ))}
      </g>
    </svg>
  );
}

export function VendorCard({ vendor, compact = false, className }: VendorCardProps) {
  const palette = paletteFor(vendor.name);
  const initials = getInitials(vendor.name);
  const productCount = vendor.productCount;
  const location = [vendor.city, vendor.region].filter(Boolean).join(", ");

  if (compact) {
    return (
      <Link
        href={`/${vendor.slug}`}
        className={cn(
          "group flex items-center gap-3 rounded-2xl border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          className
        )}
        aria-label={`Visit ${vendor.name}`}
      >
        <div
          className="relative size-12 shrink-0 overflow-hidden rounded-xl shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
          }}
        >
          {vendor.logoUrl ? (
            <Image
              src={vendor.logoUrl}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-sm font-semibold text-white select-none"
              aria-hidden
            >
              {initials}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight">
            {vendor.name}
          </h3>
          {vendor.bio && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {vendor.bio}
            </p>
          )}
        </div>
        <ArrowUpRight
          className="size-4 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      </Link>
    );
  }

  return (
    <Link
      href={`/${vendor.slug}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card transition-all hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
      aria-label={`Visit ${vendor.name}${productCount != null ? ` — ${productCount} product${productCount === 1 ? "" : "s"}` : ""}`}
    >
      {/* Banner — taller for breathing room, no opacity dimming on real images */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {(() => {
          const bannerSrc = vendor.bannerUrl ?? VENDOR_BANNER_BY_SLUG[vendor.slug];
          return bannerSrc ? (
            <Image
              src={bannerSrc}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <RugMotifBanner palette={palette} initials={initials} />
          );
        })()}
      </div>

      {/* Logo — overlapping, larger, with brand-coloured ring */}
      <div className="relative -mt-9 ml-5 size-[68px] shrink-0">
        <div
          className="relative size-full overflow-hidden rounded-2xl border-[3px] border-card shadow-md"
          style={
            vendor.logoUrl
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
                }
          }
        >
          {vendor.logoUrl ? (
            <Image
              src={vendor.logoUrl}
              alt=""
              fill
              sizes="68px"
              className="object-cover"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-lg font-semibold tracking-tight text-white select-none"
              aria-hidden
              style={{ fontFamily: "var(--font-display)" }}
            >
              {initials}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-3">
        <div>
          <h3
            className="text-lg font-medium leading-tight tracking-tight transition-colors group-hover:text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {vendor.name}
          </h3>
          {(location || productCount != null) && (
            <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden />
                  {location}
                </span>
              )}
              {location && productCount != null && (
                <span aria-hidden className="text-muted-foreground/40">
                  ·
                </span>
              )}
              {productCount != null && (
                <span className="inline-flex items-center gap-1">
                  <Package className="size-3" aria-hidden />
                  {productCount} {productCount === 1 ? "piece" : "pieces"}
                </span>
              )}
            </p>
          )}
        </div>

        {vendor.bio && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {vendor.bio}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t pt-4">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            Visit store
            <ArrowUpRight
              className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70"
            aria-label="Verified active vendor"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-emerald-500"
            />
            Verified
          </span>
        </div>
      </div>
    </Link>
  );
}
