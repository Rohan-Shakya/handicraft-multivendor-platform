export type CollectionSortOrder =
  | "manual" | "best_selling" | "created_desc" | "created_asc"
  | "updated_desc" | "updated_asc" | "title_asc" | "title_desc"
  | "price_asc" | "price_desc";

export interface CreateCollectionDto {
  vendorId: string;
  title: string;
  handle: string;
  description?: string;
  type?: "manual" | "smart";
  status?: "active" | "draft" | "archived";
  imageUrl?: string;
  imageFileId?: string;
  imageAlt?: string;
  sortOrder?: CollectionSortOrder;
  seoTitle?: string;
  seoDescription?: string;
  seoCanonicalUrl?: string;
}

export interface UpdateCollectionDto {
  title?: string;
  handle?: string;
  description?: string;
  status?: "active" | "draft" | "archived";
  imageUrl?: string;
  imageFileId?: string;
  imageAlt?: string;
  sortOrder?: CollectionSortOrder;
  seoTitle?: string;
  seoDescription?: string;
  seoCanonicalUrl?: string;
}

export interface CollectionFilters {
  status?: "active" | "draft" | "archived";
  type?: "manual" | "smart";
  search?: string;
  page?: number;
  limit?: number;
}
