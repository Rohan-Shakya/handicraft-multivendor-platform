/**
 * Currency + number formatting helpers.
 *
 * Previously many pages hard-coded `Intl.NumberFormat("en-US", { currency: "USD" })`,
 * which broke for vendors operating in other currencies. Centralize formatting
 * here so every surface can render prices in the vendor's / platform's currency.
 */
import { brand } from "../config/brand";

/**
 * Platform-default ISO 4217 currency. Use as a fallback when a record has no
 * `currencyCode`. For records that DO carry currency (orders, vendors, etc.)
 * always pass that value to `formatPrice` directly so multi-currency shops
 * render correctly.
 */
export function getPlatformCurrency(): string {
  return brand.currencyCode;
}

/**
 * Just the currency symbol (with trailing space) — useful for compact
 * displays like analytics rollups where you want "Rs 1.2k" not "Rs 1,200.00".
 */
export function currencySymbol(currencyCode?: string | null): string {
  const code = (currencyCode ?? getPlatformCurrency()).toUpperCase();
  if (code === "NPR") return "Rs ";
  if (code === "USD") return "$";
  if (code === "EUR") return "€";
  if (code === "GBP") return "£";
  if (code === "INR") return "₹";
  if (code === "JPY") return "¥";
  return `${code} `;
}

/**
 * Format a money amount (either a number in the major unit or a decimal string)
 * in the requested currency. Falls back gracefully when a currency code is
 * invalid — returns `"{code} {amount}"` instead of throwing.
 */
export function formatPrice(
  amount: number | string | null | undefined,
  currencyCode?: string | null,
  locale: string = typeof navigator !== "undefined" ? navigator.language : "en-US"
): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(numeric)) return String(amount);

  const currency = (currencyCode ?? getPlatformCurrency()).toUpperCase();

  // ICU's "NPR" symbol resolves to "NPR" or "रू" depending on locale — use
  // the conventional "Rs " prefix used in Nepali retail.
  if (currency === "NPR") {
    return `Rs ${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric)}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(numeric);
  } catch {
    // Unknown ISO 4217 code — fall back to a plain "{CODE} 12.34" format.
    return `${currency} ${numeric.toFixed(2)}`;
  }
}

/**
 * Shorter numeric formatter, e.g. `12,345`.
 */
export function formatNumber(
  value: number | string | null | undefined,
  locale: string = typeof navigator !== "undefined" ? navigator.language : "en-US"
): string {
  if (value === null || value === undefined || value === "") return "";
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat(locale).format(numeric);
}

/**
 * Percentage helper — e.g. `formatPercent(0.12)` → `"12%"`.
 */
export function formatPercent(
  fraction: number,
  locale: string = typeof navigator !== "undefined" ? navigator.language : "en-US",
  maximumFractionDigits: number = 1
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits,
  }).format(fraction);
}

const _userLocale = () =>
  typeof navigator !== "undefined" ? navigator.language : "en-US";

/**
 * Format a date in one of three styles:
 *   - "short": locale short date (e.g. "5/7/26")
 *   - "long":  locale month + day + year + time (e.g. "May 7, 2026, 4:25 PM")
 *   - "date":  date only, locale long (e.g. "May 7, 2026")
 *
 * Returns "" for null/undefined/invalid input — safe to drop into JSX.
 */
export function formatDate(
  value: Date | string | number | null | undefined,
  style: "short" | "long" | "date" = "date",
  locale: string = _userLocale()
): string {
  if (value === null || value === undefined || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  if (style === "short") return d.toLocaleDateString(locale);
  if (style === "long") {
    return d.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Relative time — "just now", "3m ago", "2h ago", "Yesterday", "May 7".
 * For dates older than ~1 week, falls back to a short absolute date.
 */
export function formatRelative(
  value: Date | string | number | null | undefined,
  locale: string = _userLocale()
): string {
  if (value === null || value === undefined || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return "Yesterday";
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}
