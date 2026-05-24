// ─── Actor types ─────────────────────────────────────────────────────────────

// Platform roles — must match platformRoleEnum in DB (users table)
export type AdminRole = "super_admin" | "support_agent";

export type VendorRole =
  | "owner"
  | "admin"
  | "catalog_manager"
  | "content_manager"
  | "support_agent";

export type ActorType = "admin" | "vendor" | "customer";

export interface AuthActor {
  id: string;
  type: ActorType;
  role?: AdminRole | VendorRole;
  vendorId?: string; // set when type === "vendor"
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export type VendorStatus = "active" | "suspended" | "pending" | "rejected";

export interface Vendor {
  id: string;
  name: string;
  legalName?: string | null;
  slug: string;
  status: VendorStatus;
  bio: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl?: string | null;
  primaryEmail?: string | null;
  supportEmail?: string | null;
  billingEmail?: string | null;
  primaryPhone?: string | null;
  supportPhone?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  vatNumber?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Optional product count returned by some list endpoints. */
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export type ProductStatus = "draft" | "active" | "archived";

export interface Product {
  id: string;
  vendorId: string;
  title: string;
  handle: string;
  description: string | null;
  status: ProductStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Product Image ────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  position: number;
  isFeatured: boolean;
  createdAt: Date;
}

// ─── Product Option ───────────────────────────────────────────────────────────

export interface ProductOption {
  id: string;
  productId: string;
  name: string; // e.g. "Color", "Size", "Shape"
  position: number;
  values: ProductOptionValue[];
}

export interface ProductOptionValue {
  id: string;
  optionId: string;
  value: string; // e.g. "Red", "M", "Round"
  position: number;
}

// ─── Variant ──────────────────────────────────────────────────────────────────

export type VariantStatus = "active" | "inactive";

export interface Variant {
  id: string;
  productId: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  inventoryQuantity: number;
  status: VariantStatus;
  selectedOptions: VariantSelectedOption[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantSelectedOption {
  optionId: string;
  optionValueId: string;
}

// ─── Metafield ────────────────────────────────────────────────────────────────

export type MetafieldType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "json"
  | "date";

export interface Metafield {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: MetafieldType;
}

// ─── Collection ───────────────────────────────────────────────────────────────

export type CollectionStatus = "active" | "draft";

export interface Collection {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  status: CollectionStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export type PageStatus = "published" | "draft";

export interface Page {
  id: string;
  title: string;
  handle: string;
  body: string | null;
  status: PageStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Comma-separated keywords. */
  seoKeywords?: string | null;
  seoCanonicalUrl?: string | null;
  /** OG/Twitter image — `files.id` reference. */
  ogImageFileId?: string | null;
  /** Hydrated when the API joins the file row. */
  ogImage?: { id: string; url: string; altText?: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

export interface Blog {
  id: string;
  title: string;
  handle: string;
  status: PageStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPost {
  id: string;
  blogId: string;
  title: string;
  handle: string;
  body: string | null;
  status: PageStatus;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  provinceCode?: string | null;
  country: string;
  countryCode: string;
  zip: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface Cart {
  id: string;
  customerId: string | null;
  sessionId: string | null;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  customerId: string;
  productId: string;
  createdAt: Date;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderItemStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  totalPrice: number;
  subtotalPrice: number;
  shippingPrice: number;
  shippingAddressId: string | null;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderItemStatus;
}

// ─── Review ───────────────────────────────────────────────────────────────────

export type ReviewStatus = "pending" | "published" | "rejected";

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API Response helpers ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
