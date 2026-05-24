import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type StarRatingProps = {
  rating: number;
  count?: number;
  size?: "sm" | "md";
};

export function StarRating({ rating, count, size = "md" }: StarRatingProps) {
  const clampedRating = Math.min(5, Math.max(0, rating));
  const fullStars = Math.floor(clampedRating);
  const hasHalfStar = clampedRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`${clampedRating.toFixed(1)} out of 5 stars`}
      >
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(iconSize, "fill-amber-400 text-amber-400")}
            aria-hidden="true"
          />
        ))}

        {/* Half star — rendered as a clipped full star overlaying an empty star */}
        {hasHalfStar && (
          <span className="relative inline-flex" aria-hidden="true">
            {/* Empty background */}
            <Star className={cn(iconSize, "fill-transparent text-amber-300")} />
            {/* Filled half overlay */}
            <span className="absolute inset-0 overflow-hidden w-1/2">
              <Star className={cn(iconSize, "fill-amber-400 text-amber-400")} />
            </span>
          </span>
        )}

        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(iconSize, "fill-transparent text-amber-300")}
            aria-hidden="true"
          />
        ))}
      </div>

      {count != null && (
        <span className={cn(textSize, "text-muted-foreground tabular-nums")}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}
