export function generateId(): string {
  return crypto.randomUUID();
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

export function generateVendorOrderNumber(vendorSlug: string): string {
  const prefix = vendorSlug.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `VO-${prefix}-${ts}-${rand}`;
}

export function generateFulfillmentNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `FUL-${ts}-${rand}`;
}

export function generatePayoutReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `PAY-${ts}-${rand}`;
}
