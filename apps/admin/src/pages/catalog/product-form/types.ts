import type { Product, ProductImage, ProductOption } from "@repo/types";

export interface VariantDetail {
  id: string;
  productId: string;
  title: string | null;
  sku: string | null;
  barcode: string | null;
  status: string;
  price: number | string;
  compareAtPrice: number | string | null;
  costPerItem: number | string | null;
  taxable: boolean;
  inventoryTracked: boolean;
  inventoryPolicy: string;
  inventoryQuantity?: number;
  requiresShipping: boolean;
  weightValue: number | string | null;
  weightUnit: string | null;
  countryOfOrigin: string | null;
  harmonizedSystemCode: string | null;
  position: number;
  selectedOptions?: Array<{
    optionId: string;
    optionValueId: string;
    optionName?: string;
    value?: string;
  }>;
}

export interface CollectionRef {
  id: string;
  title: string;
  handle: string;
}

export interface ProductDetail extends Product {
  variants?: VariantDetail[];
  options?: ProductOption[];
  images?: ProductImage[];
  tags?: string[];
  collections?: CollectionRef[];
  vendor?: { id: string; name: string };
  productType?: string | null;
  brand?: string | null;
  excerpt?: string | null;
}

export interface VendorOption {
  id: string;
  name: string;
}

export interface ProductForm {
  title: string;
  handle: string;
  description: string;
  status: string;
  productType: string;
  brand: string;
  vendorId: string;
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
}

export interface DefaultVariantForm {
  price: string;
  compareAtPrice: string;
  costPerItem: string;
  taxable: boolean;
  sku: string;
  barcode: string;
  tracked: boolean;
  quantity: string;
  inventoryPolicy: string;
  requiresShipping: boolean;
  weight: string;
  weightUnit: string;
  countryOfOrigin: string;
  hsCode: string;
}

export interface VariantEditForm {
  sku: string;
  barcode: string;
  price: string;
  compareAtPrice: string;
  costPerItem: string;
  taxable: boolean;
  inventoryTracked: boolean;
  inventoryPolicy: string;
  inventoryQuantity: string;
  requiresShipping: boolean;
  weight: string;
  weightUnit: string;
  countryOfOrigin: string;
  hsCode: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const INITIAL_PRODUCT: ProductForm = {
  title: "",
  handle: "",
  description: "",
  status: "draft",
  productType: "",
  brand: "",
  vendorId: "",
  seoTitle: "",
  seoDescription: "",
  excerpt: "",
};

export const INITIAL_DEFAULT_VARIANT: DefaultVariantForm = {
  price: "",
  compareAtPrice: "",
  costPerItem: "",
  taxable: true,
  sku: "",
  barcode: "",
  tracked: true,
  quantity: "",
  inventoryPolicy: "deny",
  requiresShipping: true,
  weight: "",
  weightUnit: "kg",
  countryOfOrigin: "",
  hsCode: "",
};

export const INITIAL_VARIANT_EDIT: VariantEditForm = {
  sku: "",
  barcode: "",
  price: "",
  compareAtPrice: "",
  costPerItem: "",
  taxable: true,
  inventoryTracked: true,
  inventoryPolicy: "deny",
  inventoryQuantity: "",
  requiresShipping: true,
  weight: "",
  weightUnit: "kg",
  countryOfOrigin: "",
  hsCode: "",
};

export const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

export const WEIGHT_UNITS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "lb", label: "lb" },
  { value: "oz", label: "oz" },
] as const;

export const INVENTORY_POLICIES = [
  { value: "deny", label: "Deny - Stop selling when out of stock" },
  { value: "continue", label: "Continue - Allow sales when out of stock" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toDisplayPrice(value: number | string | null | undefined): string {
  if (value == null) return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  return String(num);
}

export function variantDisplayName(v: VariantDetail): string {
  if (v.selectedOptions && v.selectedOptions.length > 0) {
    return v.selectedOptions.map((o) => o.value ?? o.optionValueId).join(" / ");
  }
  if (v.title) return v.title;
  return `Variant #${v.position + 1}`;
}

export function groupVariantsByFirstOption(
  variants: VariantDetail[]
): Map<string, VariantDetail[]> {
  const groups = new Map<string, VariantDetail[]>();
  for (const v of variants) {
    const firstVal =
      v.selectedOptions?.[0]?.value ?? v.selectedOptions?.[0]?.optionValueId ?? "Default";
    const existing = groups.get(firstVal) ?? [];
    existing.push(v);
    groups.set(firstVal, existing);
  }
  return groups;
}

export function buildVariantPayload(f: DefaultVariantForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    taxable: f.taxable,
    inventoryTracked: f.tracked,
    inventoryPolicy: f.inventoryPolicy,
    requiresShipping: f.requiresShipping,
    sku: f.sku.trim() || null,
    barcode: f.barcode.trim() || null,
    countryOfOrigin: f.countryOfOrigin.trim() || null,
    harmonizedSystemCode: f.hsCode.trim() || null,
  };
  if (f.price.trim()) payload.price = f.price.trim();
  payload.compareAtPrice = f.compareAtPrice.trim() || null;
  payload.costPerItem = f.costPerItem.trim() || null;
  if (f.weight.trim()) {
    payload.weightValue = f.weight.trim();
    payload.weightUnit = f.weightUnit;
  } else {
    payload.weightValue = null;
  }
  return payload;
}
