export interface CreateCustomerDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UpdateCustomerDto {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

export interface AdminUpdateCustomerDto {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  language?: string;
  state?: "enabled" | "disabled" | "invited";
  notes?: string | null;
  taxStatus?: "collect" | "exempt" | "reverse_charge";
  vatNumber?: string | null;
  emailMarketingSubscribed?: boolean;
  smsMarketingSubscribed?: boolean;
  storeCreditBalance?: string;
}

export interface CreateAddressDto {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface AdminCreateAddressDto {
  label?: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  provinceCode?: string;
  country: string;
  countryCode: string;
  zip: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export interface AdminUpdateAddressDto {
  label?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  provinceCode?: string;
  country?: string;
  countryCode?: string;
  zip?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
}
