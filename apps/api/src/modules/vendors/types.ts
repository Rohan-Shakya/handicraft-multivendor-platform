export interface CreateVendorDto {
  name: string;
  slug: string;
  userEmail: string;
  userPassword: string;
  legalName?: string;
  bio?: string;
  websiteUrl?: string;
  primaryEmail?: string;
  supportEmail?: string;
  billingEmail?: string;
  primaryPhone?: string;
  supportPhone?: string;
  countryCode?: string;
  currencyCode?: string;
  timezone?: string;
  vatNumber?: string;
  taxId?: string;
  registrationNumber?: string;
  commissionBps?: number;
  logoUrl?: string;
  bannerUrl?: string;
}

export interface UpdateVendorDto {
  name?: string;
  legalName?: string | null;
  bio?: string | null;
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
  commissionBps?: number;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface UpdateVendorPageDto {
  bio?: string;
  logoUrl?: string;
  bannerUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface VendorFilters {
  status?: "active" | "suspended" | "pending" | "rejected";
  search?: string;
  page?: number;
  limit?: number;
}
