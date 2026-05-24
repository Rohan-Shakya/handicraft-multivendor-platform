import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Render the logomark only (no text). */
  iconOnly?: boolean;
  /** Size of the icon + text. */
  size?: "sm" | "md" | "lg";
  /** Override the colour token used for the mark. */
  markClassName?: string;
}

/**
 * Stylised "M" / mountain mark for {@link brand.shortName}.
 * Two overlapping triangles read as "MM" or as a knot diamond depending on
 * scale — works on dark + light surfaces alike.
 */
export function BrandMark({
  className,
  iconOnly,
  size = "md",
  markClassName,
}: Props) {
  const iconSize =
    size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-8";
  const textSize =
    size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight",
        className
      )}
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden
        className={cn(iconSize, "shrink-0", markClassName ?? "text-primary")}
      >
        {/* Outer knot diamond */}
        <path
          d="M16 3 L29 16 L16 29 L3 16 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Inner woven cross */}
        <path
          d="M16 9 L23 16 L16 23 L9 16 Z"
          fill="currentColor"
          fillOpacity="0.18"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="1.6" fill="currentColor" />
      </svg>
      {!iconOnly && (
        <span
          className={cn(textSize, "leading-none")}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {brand.shortName}
        </span>
      )}
    </span>
  );
}
