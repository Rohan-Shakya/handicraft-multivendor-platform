/**
 * Centralized currency + number formatting for the storefront.
 *
 * Prior to this helper different pages used three different approaches
 * (`Intl.NumberFormat`, plain `$${x}`, and `Rs. ${x}`), producing inconsistent
 * displays. Route ALL price rendering through `formatPrice`.
 */
import { brand } from "../config/brand";

/**
 * Platform-default ISO 4217 currency. Falls back here only when the record
 * itself doesn't carry a currencyCode.
 */
export function getPlatformCurrency(): string {
  return brand.currencyCode;
}

export type MoneyInput = number | string | null | undefined;

/**
 * Format a major-unit amount (e.g. 12.50) or cent string in the requested ISO
 * 4217 currency. Falls back to `"{CODE} 12.50"` when the code is invalid.
 */
export function formatPrice(
  amount: MoneyInput,
  currencyCode?: string | null,
  locale?: string
): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(numeric)) return String(amount);

  const currency = (currencyCode ?? getPlatformCurrency()).toUpperCase();
  const resolvedLocale =
    locale ??
    (typeof navigator !== "undefined" ? navigator.language : "en-US");

  // ICU's "NPR" symbol resolves to "NPR" or "रू" depending on locale — for
  // Nepali rupee we always want the conventional "Rs " prefix used in retail.
  if (currency === "NPR") {
    return `Rs ${new Intl.NumberFormat(resolvedLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric)}`;
  }

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toFixed(2)}`;
  }
}

/**
 * Convenience wrapper for prices stored in minor units (cents).
 */
export function formatPriceCents(
  cents: MoneyInput,
  currencyCode?: string | null,
  locale?: string
): string {
  if (cents === null || cents === undefined || cents === "") return "";
  const numeric = typeof cents === "string" ? parseFloat(cents) : cents;
  if (!Number.isFinite(numeric)) return String(cents);
  return formatPrice(numeric / 100, currencyCode, locale);
}

export function formatNumber(
  value: number | string | null | undefined,
  locale?: string
): string {
  if (value === null || value === undefined || value === "") return "";
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(numeric)) return String(value);
  const resolvedLocale =
    locale ??
    (typeof navigator !== "undefined" ? navigator.language : "en-US");
  return new Intl.NumberFormat(resolvedLocale).format(numeric);
}
