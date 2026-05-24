export interface CreateProductDto {
  title: string;
  handle: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface AdminCreateProductDto {
  vendorId: string;
  title: string;
  handle: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface UpdateProductDto {
  title?: string;
  description?: string | null;
  excerpt?: string | null;
  productType?: string | null;
  brand?: string | null;
  status?: "draft" | "active" | "archived";
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface CreateOptionDto {
  name: string;
  position?: number;
  values: { value: string; position?: number }[];
}

export interface CreateVariantDto {
  title?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  compareAtPrice?: number | null;
  costPerItem?: number | null;
  status?: "active" | "inactive" | "archived";
  taxable?: boolean;
  inventoryTracked?: boolean;
  inventoryPolicy?: "deny" | "continue";
  requiresShipping?: boolean;
  weightValue?: number | null;
  weightUnit?: "g" | "kg" | "lb" | "oz";
  countryOfOrigin?: string | null;
  harmonizedSystemCode?: string | null;
  inventoryQuantity?: number;
  selectedOptions: { optionId: string; optionValueId: string }[];
}

export interface UpdateVariantDto {
  title?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price?: number;
  compareAtPrice?: number | null;
  costPerItem?: number | null;
  status?: "active" | "inactive" | "archived";
  taxable?: boolean;
  inventoryTracked?: boolean;
  inventoryPolicy?: "deny" | "continue";
  requiresShipping?: boolean;
  weightValue?: number | null;
  weightUnit?: "g" | "kg" | "lb" | "oz";
  countryOfOrigin?: string | null;
  harmonizedSystemCode?: string | null;
  featuredImageId?: string | null;
  availableQuantity?: number;
}

export interface ProductFilters {
  vendorId?: string;
  status?: "draft" | "active" | "archived";
  search?: string;
  page?: number;
  limit?: number;
  /** Collection handles (OR-combined — a product matches if it belongs to any). */
  collection?: string[];
  /** Vendor slugs (OR-combined). */
  vendor?: string[];
  /** Tag values (OR-combined). */
  tag?: string[];
  /** Lowest variant price ≥ this, in the product's currency. */
  priceMin?: number;
  /** Lowest variant price ≤ this. */
  priceMax?: number;
  /** Minimum average rating. */
  rating?: number;
  /** Only products with available inventory. */
  inStock?: boolean;
  /** Only products where compareAtPrice > price on some variant. */
  onSale?: boolean;
  /** Restrict to products eligible for a specific campaign's discounts. Used by the /sale/[handle] landing page. */
  campaignId?: string;
  sort?:
    | "created_at_desc"
    | "created_at_asc"
    | "price_asc"
    | "price_desc"
    | "title_asc"
    | "title_desc";
}
