/**
 * Currency conversion and formatting utilities.
 * Uses cached exchange rates from the currencies table.
 */
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { currencies } from "../db/schema/index.js";
import { cacheGet, cacheDel } from "./redis.js";

interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  exchangeRate: number;
  isBase: boolean;
}

/**
 * Get all active currencies with exchange rates (cached 30min).
 */
export async function getActiveCurrencies(): Promise<CurrencyInfo[]> {
  return cacheGet("currencies:active", 1800, async () => {
    const rows = await db
      .select()
      .from(currencies)
      .where(eq(currencies.isActive, true));

    return rows.map((r) => ({
      code: r.code,
      name: r.name,
      symbol: r.symbol,
      decimalPlaces: r.decimalPlaces,
      exchangeRate: parseFloat(r.exchangeRate),
      isBase: r.isBase,
    }));
  });
}

/**
 * Get the base currency code.
 */
export async function getBaseCurrency(): Promise<string> {
  const all = await getActiveCurrencies();
  const base = all.find((c) => c.isBase);
  return base?.code ?? "NPR";
}

/**
 * Convert an amount from one currency to another.
 * Uses the base currency as the intermediary.
 */
export async function convertMoney(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  const all = await getActiveCurrencies();
  const fromRate = all.find((c) => c.code === fromCurrency)?.exchangeRate;
  const toRate = all.find((c) => c.code === toCurrency)?.exchangeRate;

  if (!fromRate || !toRate) {
    throw new Error(`Currency conversion not available: ${fromCurrency} -> ${toCurrency}`);
  }

  // Convert to base first, then to target
  const baseAmount = amount / fromRate;
  return baseAmount * toRate;
}

/**
 * Format a monetary amount with currency symbol.
 */
export async function formatMoney(
  amount: number,
  currencyCode: string
): Promise<string> {
  const all = await getActiveCurrencies();
  const currency = all.find((c) => c.code === currencyCode);

  if (!currency) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }

  const formatted = amount.toFixed(currency.decimalPlaces);
  return `${currency.symbol} ${formatted}`;
}

/**
 * Invalidate currency cache (call after rate updates).
 */
export function invalidateCurrencyCache(): void {
  cacheDel("currencies:active");
}
