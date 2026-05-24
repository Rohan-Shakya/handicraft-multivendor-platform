export interface OrderFilters {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: string;
  paymentStatus?: string;
}

export interface VendorOrderFilters {
  page?: number;
  limit?: number;
  vendorId?: string;
  status?: string;
  orderId?: string;
}

// Kept for legacy compatibility in existing code
export type OrderItemFilters = VendorOrderFilters;

export interface AddressSnapshot {
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
}

export interface PlaceOrderInput {
  cartId: string;
  customerId?: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  shippingAddress?: AddressSnapshot;
  billingAddress?: AddressSnapshot;
  shippingPrice?: string;
  taxTotal?: string;
  /** When true, `taxTotal` is the portion of the cart's subtotal that is
   *  tax — already embedded in the price — so we do NOT add it to
   *  totalPrice. The column is still populated for reporting. Set by the
   *  checkout flow when the matched tax zone is `behavior: "inclusive"`. */
  taxInclusive?: boolean;
  note?: string;
}

/**
 * Single line item on a draft order. Either:
 *  - `variantId` is provided → catalog item; vendor / title / unitPrice are
 *    snapshotted from the product/variant (admin can still override unitPrice
 *    to support negotiated pricing).
 *  - `variantId` is omitted → custom one-off line (e.g. a bespoke rug). The
 *    caller must supply `vendorId`, `title`, and `unitPrice`.
 */
export interface DraftOrderLineItemInput {
  variantId?: string;
  vendorId?: string;
  productId?: string;
  title?: string;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  unitPrice?: string;
  discountTotal?: string;
  taxTotal?: string;
  requiresShipping?: boolean;
}

export interface CreateDraftOrderInput {
  customerId?: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  currencyCode?: string;
  shippingAddress?: AddressSnapshot;
  billingAddress?: AddressSnapshot;
  items: DraftOrderLineItemInput[];
  shippingPrice?: string;
  taxTotal?: string;
  discountTotal?: string;
  note?: string;
}

export interface UpdateDraftOrderInput {
  customerId?: string | null;
  customerEmail?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string | null;
  currencyCode?: string;
  shippingAddress?: AddressSnapshot | null;
  billingAddress?: AddressSnapshot | null;
  items?: DraftOrderLineItemInput[];
  shippingPrice?: string;
  taxTotal?: string;
  discountTotal?: string;
  note?: string | null;
}

// Legacy — kept for backward compat
export interface CreateOrderDto {
  cartId: string;
  shippingAddressId?: string;
  note?: string;
}

// Legacy — kept for backward compat
export interface CreateOrderInput {
  customerId: string;
  shippingAddressId?: string;
  subtotalPrice: number;
  shippingPrice: number;
  totalPrice: number;
  cartId: string;
  items: Array<{
    variantId: string;
    vendorId: string;
    quantity: number;
    unitPrice: number;
  }>;
}
