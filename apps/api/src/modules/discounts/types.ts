export interface DiscountFilters {
  page?: number;
  limit?: number;
  status?: string;
  scope?: string;
}

export interface CreateDiscountDto {
  scope?: "platform" | "vendor" | "targeted_vendors";
  vendorId?: string;
  title: string;
  description?: string;
  status?: "draft" | "active";
  type: "percentage" | "fixed_amount" | "free_shipping";
  targetType?: "order" | "shipping";
  /** `code` = customer enters a code; `automatic` = applies to every eligible cart without entry. */
  method?: "code" | "automatic";
  /** Link this discount to a marketing campaign. */
  campaignId?: string;
  value: number;
  minimumSubtotal?: number;
  usageLimit?: number;
  oncePerCustomer?: boolean;
  firstOrderOnly?: boolean;
  startsAt?: string;
  endsAt?: string;
  vendorTargetIds?: string[];
  productIds?: string[];
  collectionIds?: string[];
}

export interface UpdateDiscountDto {
  title?: string;
  description?: string;
  status?: "draft" | "active" | "expired" | "archived";
  method?: "code" | "automatic";
  campaignId?: string | null;
  minimumSubtotal?: string;
  usageLimit?: number;
  oncePerCustomer?: boolean;
  firstOrderOnly?: boolean;
  startsAt?: Date;
  endsAt?: Date;
  productIds?: string[];
  collectionIds?: string[];
}

export interface CreateDiscountCodeDto {
  discountId: string;
  code: string;
  usageLimit?: number;
  startsAt?: string;
  endsAt?: string;
}

export interface ApplyDiscountInput {
  code: string;
  cartId: string;
  customerId?: string;
  cartSubtotal: number;
  sessionId?: string;
}
