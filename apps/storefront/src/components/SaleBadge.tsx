import { cn } from "@/lib/utils";

interface SaleBadgeProps {
  /** Percentage saved, e.g. 30 — rendered as "30% OFF". */
  percentOff?: number;
  /** Override the default text — e.g. "FLASH SALE" for a campaign-specific banner. */
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Visually hidden text for screen readers; defaults to "Sale, {percentOff} percent off". */
  ariaLabel?: string;
}

/**
 * The red "30% OFF" tag used on product cards / PDPs during a sale. Visually
 * distinct from the brand palette so customers spot a discount instantly.
 *
 * Accessibility: the visible text is short ("-30%") but screen readers get the
 * fuller "Sale, 30 percent off" label.
 */
export function SaleBadge({
  percentOff,
  label,
  size = "md",
  className,
  ariaLabel,
}: SaleBadgeProps) {
  const display = label ?? (percentOff ? `-${percentOff}%` : "SALE");
  const a11y =
    ariaLabel ??
    (percentOff
      ? `Sale, ${percentOff} percent off`
      : "Sale");
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-red-600 text-white font-bold tracking-wide shadow-sm",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
        className
      )}
      role="img"
      aria-label={a11y}
    >
      <span aria-hidden>{display}</span>
    </span>
  );
}
