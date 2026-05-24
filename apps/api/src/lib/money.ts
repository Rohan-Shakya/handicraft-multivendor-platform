/**
 * Integer-based money arithmetic to avoid floating-point precision issues.
 *
 * All internal calculations use integer cents. Conversion to/from
 * string (the DB storage format for numeric columns) happens at boundaries.
 */

/** Parse a numeric string (e.g. "19.99") to integer cents. */
export function toCents(value: string | number): number {
  if (typeof value === "number") {
    return Math.round(value * 100);
  }
  // Avoid floating-point: parse the integer and fractional parts separately
  const parts = value.split(".");
  const whole = parseInt(parts[0]!, 10) || 0;
  let frac = parts[1] ?? "0";
  // Pad or truncate to exactly 2 digits
  if (frac.length === 0) frac = "00";
  else if (frac.length === 1) frac = frac + "0";
  else if (frac.length > 2) frac = frac.substring(0, 2);
  const sign = whole < 0 || value.startsWith("-") ? -1 : 1;
  return sign * (Math.abs(whole) * 100 + parseInt(frac, 10));
}

/** Convert integer cents back to a string with 2 decimal places (e.g. 1999 → "19.99"). */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${frac.toString().padStart(2, "0")}`;
}

/** Sum an array of numeric strings and return a string result. */
export function sumMoney(values: string[]): string {
  const totalCents = values.reduce((sum, v) => sum + toCents(v), 0);
  return fromCents(totalCents);
}

/** Multiply a money string by a quantity and return a string result. */
export function multiplyMoney(value: string, quantity: number): string {
  return fromCents(toCents(value) * quantity);
}

/** Subtract b from a, returning a string result. */
export function subtractMoney(a: string, b: string): string {
  return fromCents(toCents(a) - toCents(b));
}

/** Add a and b, returning a string result. */
export function addMoney(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b));
}

/**
 * Proportionally allocate a total across items based on their weights.
 * Returns an array of string amounts that sum exactly to `total`.
 * Uses the "largest remainder" method to handle rounding.
 */
export function allocateProportionally(
  total: string,
  weights: string[]
): string[] {
  const totalCents = toCents(total);
  const weightCents = weights.map(toCents);
  const weightSum = weightCents.reduce((s, w) => s + w, 0);

  if (weightSum === 0) {
    return weights.map(() => "0.00");
  }

  // Calculate raw allocations and remainders
  const rawAllocations = weightCents.map((w) => (totalCents * w) / weightSum);
  const flooredAllocations = rawAllocations.map(Math.floor);
  const remainders = rawAllocations.map((raw, i) => raw - flooredAllocations[i]!);

  // Distribute the remaining cents to items with largest remainders
  let remaining = totalCents - flooredAllocations.reduce((s, a) => s + a, 0);
  const indices = remainders
    .map((r, i) => ({ i, r }))
    .sort((a, b) => b.r - a.r);

  for (const { i } of indices) {
    if (remaining <= 0) break;
    flooredAllocations[i]!++;
    remaining--;
  }

  return flooredAllocations.map(fromCents);
}
