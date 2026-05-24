import { z } from "zod";

export const createCustomerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(50).optional(),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).optional().nullable(),
  lastName: z.string().min(1).max(100).optional().nullable(),
  phone: z.string().min(1).max(50).optional().nullable(),
});

export const createAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  province: z.string().optional(),
  country: z.string().min(1),
  zip: z.string().min(1),
  phone: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  address1: z.string().min(1).optional(),
  address2: z.string().optional(),
  city: z.string().min(1).optional(),
  province: z.string().optional(),
  country: z.string().min(1).optional(),
  zip: z.string().min(1).optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const adminUpdateCustomerSchema = z.object({
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  language: z.string().max(10).optional(),
  state: z.enum(["enabled", "disabled", "invited"]).optional(),
  notes: z.string().max(5000).optional().nullable(),
  taxStatus: z.enum(["collect", "exempt", "reverse_charge"]).optional(),
  vatNumber: z.string().max(50).optional().nullable(),
  emailMarketingSubscribed: z.boolean().optional(),
  smsMarketingSubscribed: z.boolean().optional(),
  storeCreditBalance: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid currency format").optional(),
});

export const adminCreateAddressSchema = z.object({
  label: z.string().max(100).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  address1: z.string().min(1).max(500),
  address2: z.string().max(500).optional(),
  city: z.string().min(1).max(200),
  province: z.string().max(200).optional(),
  provinceCode: z.string().max(10).optional(),
  country: z.string().min(1).max(200),
  countryCode: z.string().min(1).max(10),
  zip: z.string().min(1).max(20),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
});

export const adminUpdateAddressSchema = z.object({
  label: z.string().max(100).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  address1: z.string().min(1).max(500).optional(),
  address2: z.string().max(500).optional(),
  city: z.string().min(1).max(200).optional(),
  province: z.string().max(200).optional(),
  provinceCode: z.string().max(10).optional(),
  country: z.string().min(1).max(200).optional(),
  countryCode: z.string().min(1).max(10).optional(),
  zip: z.string().min(1).max(20).optional(),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});

export const customerFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

export const addCustomerTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(100)).min(1).max(50),
});
