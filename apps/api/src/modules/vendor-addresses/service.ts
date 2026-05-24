import { eq, and, isNull } from "drizzle-orm";
import type { AuthActor } from "@repo/types";
import { db } from "../../db/index.js";
import { vendorAddresses } from "../../db/schema/index.js";
import { assertPermission, assertVendorOwnership } from "../../lib/permissions.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { generateId } from "../../lib/id.js";

export interface UpsertVendorAddressDto {
  type: "business" | "billing" | "warehouse" | "return" | "origin";
  label?: string;
  contactName?: string;
  company?: string;
  phone?: string;
  email?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  provinceCode?: string;
  country: string;
  countryCode: string;
  zip: string;
  isDefault?: boolean;
}

function assertVendorAddressAccess(actor: AuthActor, vendorId: string) {
  if (actor.type === "vendor") {
    assertVendorOwnership(actor, vendorId);
  } else {
    assertPermission(actor, "vendor:update:any");
  }
}

export async function listVendorAddresses(actor: AuthActor, vendorId: string) {
  assertVendorAddressAccess(actor, vendorId);
  return db
    .select()
    .from(vendorAddresses)
    .where(and(eq(vendorAddresses.vendorId, vendorId), isNull(vendorAddresses.deletedAt)));
}

export async function addVendorAddress(
  actor: AuthActor,
  vendorId: string,
  data: UpsertVendorAddressDto
) {
  assertVendorAddressAccess(actor, vendorId);

  return db.transaction(async (tx) => {
    // If setting as default, unset existing default of same type
    if (data.isDefault) {
      await tx
        .update(vendorAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(vendorAddresses.vendorId, vendorId),
            eq(vendorAddresses.type, data.type),
            eq(vendorAddresses.isDefault, true),
            isNull(vendorAddresses.deletedAt)
          )
        );
    }

    const [address] = await tx
      .insert(vendorAddresses)
      .values({
        id: generateId(),
        vendorId,
        type: data.type,
        label: data.label ?? null,
        contactName: data.contactName ?? null,
        company: data.company ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address1: data.address1,
        address2: data.address2 ?? null,
        city: data.city,
        province: data.province ?? null,
        provinceCode: data.provinceCode ?? null,
        country: data.country,
        countryCode: data.countryCode,
        zip: data.zip,
        isDefault: data.isDefault ?? false,
      })
      .returning();

    return address!;
  });
}

export async function updateVendorAddress(
  actor: AuthActor,
  vendorId: string,
  addressId: string,
  data: Partial<UpsertVendorAddressDto>
) {
  assertVendorAddressAccess(actor, vendorId);

  const [existing] = await db
    .select()
    .from(vendorAddresses)
    .where(
      and(
        eq(vendorAddresses.id, addressId),
        eq(vendorAddresses.vendorId, vendorId),
        isNull(vendorAddresses.deletedAt)
      )
    );
  if (!existing) throw new NotFoundError("Vendor address not found");

  return db.transaction(async (tx) => {
    if (data.isDefault) {
      await tx
        .update(vendorAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(vendorAddresses.vendorId, vendorId),
            eq(vendorAddresses.type, data.type ?? existing.type),
            eq(vendorAddresses.isDefault, true),
            isNull(vendorAddresses.deletedAt)
          )
        );
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.label !== undefined) patch.label = data.label;
    if (data.contactName !== undefined) patch.contactName = data.contactName;
    if (data.company !== undefined) patch.company = data.company;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.email !== undefined) patch.email = data.email;
    if (data.address1 !== undefined) patch.address1 = data.address1;
    if (data.address2 !== undefined) patch.address2 = data.address2;
    if (data.city !== undefined) patch.city = data.city;
    if (data.province !== undefined) patch.province = data.province;
    if (data.provinceCode !== undefined) patch.provinceCode = data.provinceCode;
    if (data.country !== undefined) patch.country = data.country;
    if (data.countryCode !== undefined) patch.countryCode = data.countryCode;
    if (data.zip !== undefined) patch.zip = data.zip;
    if (data.isDefault !== undefined) patch.isDefault = data.isDefault;

    const [updated] = await tx
      .update(vendorAddresses)
      .set(patch as never)
      .where(eq(vendorAddresses.id, addressId))
      .returning();

    return updated!;
  });
}

export async function deleteVendorAddress(
  actor: AuthActor,
  vendorId: string,
  addressId: string
) {
  assertVendorAddressAccess(actor, vendorId);

  const [existing] = await db
    .select()
    .from(vendorAddresses)
    .where(
      and(
        eq(vendorAddresses.id, addressId),
        eq(vendorAddresses.vendorId, vendorId),
        isNull(vendorAddresses.deletedAt)
      )
    );
  if (!existing) throw new NotFoundError("Vendor address not found");
  if (existing.isDefault) throw new ConflictError("Cannot delete a default address — reassign default first");

  await db
    .update(vendorAddresses)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(vendorAddresses.id, addressId));
}
