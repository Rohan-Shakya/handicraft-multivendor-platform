export interface CreateReviewDto {
  productId: string;
  rating: number;
  title?: string;
  body?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  title?: string;
  body?: string;
}

export interface ReviewFilters {
  productId?: string;
  status?: "pending" | "published" | "rejected";
  customerId?: string;
  page?: number;
  limit?: number;
}
