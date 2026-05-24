import { eq, sql, and, isNull, ilike, or, desc } from "drizzle-orm";
import { db } from "../../db/index.js";

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
import { customers, customerAddresses, customerTags, orders } from "../../db/schema/index.js";
import type {
  CustomerFilters,
  UpdateCustomerDto,
  AdminUpdateCustomerDto,
  CreateAddressDto,
  UpdateAddressDto,
  AdminCreateAddressDto,
  AdminUpdateAddressDto,
} from "./types.js";

function generateId() {
  return crypto.randomUUID();
}

export async function findCustomers(filters: CustomerFilters & { search?: string }) {
  const { page = 1, limit = 20, search } = filters;
  const offset = (page - 1) * limit;

  const conditions = [isNull(customers.deletedAt)];

  if (search) {
    conditions.push(
      or(
        ilike(customers.firstName, `%${escapeLike(search)}%`),
        ilike(customers.lastName, `%${escapeLike(search)}%`),
        ilike(customers.email, `%${escapeLike(search)}%`)
      )!
    );
  }

  const whereClause = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db.select().from(customers).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(whereClause),
  ]);

  return { data: rows, total: Number(countResult[0]?.count ?? 0), page, limit };
}

export async function findCustomerById(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), isNull(customers.deletedAt)));
  return customer ?? null;
}

export async function findCustomerByEmail(email: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.email, email), isNull(customers.deletedAt)));
  return customer ?? null;
}

export async function createCustomer(data: {
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}) {
  const [customer] = await db
    .insert(customers)
    .values({
      id: generateId(),
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      phone: data.phone ?? null,
    })
    .returning();
  return customer!;
}

export async function updateCustomer(id: string, data: UpdateCustomerDto) {
  const [customer] = await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return customer ?? null;
}

export async function findAddressesByCustomer(customerId: string) {
  return db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.customerId, customerId),
        isNull(customerAddresses.deletedAt)
      )
    );
}

export async function findAddressById(id: string) {
  const [address] = await db
    .select()
    .from(customerAddresses)
    .where(and(eq(customerAddresses.id, id), isNull(customerAddresses.deletedAt)));
  return address ?? null;
}

export async function createAddress(customerId: string, data: CreateAddressDto) {
  return db.transaction(async (tx) => {
    if (data.isDefault) {
      await tx
        .update(customerAddresses)
        .set({ isDefaultShipping: false })
        .where(eq(customerAddresses.customerId, customerId));
    }

    const { isDefault, ...rest } = data;
    const [addr] = await tx
      .insert(customerAddresses)
      .values({
        id: generateId(),
        customerId,
        ...rest,
        countryCode: rest.country ?? "",
        isDefaultShipping: isDefault ?? false,
      })
      .returning();

    return addr!;
  });
}

export async function updateAddress(id: string, data: UpdateAddressDto) {
  if (data.isDefault) {
    const existing = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.id, id));

    if (existing[0]) {
      await db
        .update(customerAddresses)
        .set({ isDefaultShipping: false })
        .where(eq(customerAddresses.customerId, existing[0].customerId));
    }
  }

  const { isDefault, ...rest } = data;
  const updateData: Record<string, unknown> = { ...rest };
  if (isDefault !== undefined) {
    updateData.isDefaultShipping = isDefault;
  }

  const [address] = await db
    .update(customerAddresses)
    .set(updateData)
    .where(eq(customerAddresses.id, id))
    .returning();
  return address ?? null;
}

export async function deleteAddress(id: string) {
  const [address] = await db
    .update(customerAddresses)
    .set({ deletedAt: new Date(), updatedAt: new Date(), isDefaultShipping: false, isDefaultBilling: false })
    .where(eq(customerAddresses.id, id))
    .returning();
  return address ?? null;
}

// --- Admin customer management ---

export async function adminUpdateCustomer(id: string, data: AdminUpdateCustomerDto) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };

  if (data.emailMarketingSubscribed !== undefined) {
    updateData.emailMarketingUpdatedAt = new Date();
  }
  if (data.smsMarketingSubscribed !== undefined) {
    updateData.smsMarketingUpdatedAt = new Date();
  }

  const [customer] = await db
    .update(customers)
    .set(updateData)
    .where(eq(customers.id, id))
    .returning();
  return customer ?? null;
}

export async function softDeleteCustomer(id: string) {
  const [customer] = await db
    .update(customers)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return customer ?? null;
}

// --- Admin address management ---

export async function findAddressesByCustomerAdmin(customerId: string) {
  return db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.customerId, customerId),
        isNull(customerAddresses.deletedAt)
      )
    );
}

export async function adminCreateAddress(customerId: string, data: AdminCreateAddressDto) {
  return db.transaction(async (tx) => {
    if (data.isDefaultShipping) {
      await tx
        .update(customerAddresses)
        .set({ isDefaultShipping: false })
        .where(
          and(
            eq(customerAddresses.customerId, customerId),
            isNull(customerAddresses.deletedAt)
          )
        );
    }
    if (data.isDefaultBilling) {
      await tx
        .update(customerAddresses)
        .set({ isDefaultBilling: false })
        .where(
          and(
            eq(customerAddresses.customerId, customerId),
            isNull(customerAddresses.deletedAt)
          )
        );
    }

    const [addr] = await tx
      .insert(customerAddresses)
      .values({
        id: generateId(),
        customerId,
        ...data,
      })
      .returning();

    return addr!;
  });
}

export async function adminUpdateAddress(id: string, data: AdminUpdateAddressDto) {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.id, id));

    if (!existing[0]) return null;

    if (data.isDefaultShipping) {
      await tx
        .update(customerAddresses)
        .set({ isDefaultShipping: false })
        .where(
          and(
            eq(customerAddresses.customerId, existing[0].customerId),
            isNull(customerAddresses.deletedAt)
          )
        );
    }
    if (data.isDefaultBilling) {
      await tx
        .update(customerAddresses)
        .set({ isDefaultBilling: false })
        .where(
          and(
            eq(customerAddresses.customerId, existing[0].customerId),
            isNull(customerAddresses.deletedAt)
          )
        );
    }

    const [address] = await tx
      .update(customerAddresses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerAddresses.id, id))
      .returning();
    return address ?? null;
  });
}

export async function softDeleteAddress(id: string) {
  const [address] = await db
    .update(customerAddresses)
    .set({ deletedAt: new Date(), updatedAt: new Date(), isDefaultShipping: false, isDefaultBilling: false })
    .where(eq(customerAddresses.id, id))
    .returning();
  return address ?? null;
}

// --- Customer with relations (optimized single-response fetch) ---

export async function findCustomerByIdWithRelations(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), isNull(customers.deletedAt)));

  if (!customer) return null;

  // Parallel fetch addresses, tags, and recent orders.
  const [addresses, tags, recentOrders] = await Promise.all([
    db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.customerId, id),
          isNull(customerAddresses.deletedAt)
        )
      ),
    db
      .select({ tag: customerTags.tag })
      .from(customerTags)
      .where(eq(customerTags.customerId, id)),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        totalPrice: orders.totalPrice,
        currencyCode: orders.currencyCode,
        itemCount: orders.itemCount,
        placedAt: orders.placedAt,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.customerId, id))
      .orderBy(desc(orders.placedAt))
      .limit(10),
  ]);

  const { passwordHash, ...safe } = customer;
  return {
    ...safe,
    addresses,
    tags: tags.map((t) => t.tag),
    orders: recentOrders,
  };
}

// --- Customer tags ---

export async function findTagsByCustomer(customerId: string) {
  return db.select().from(customerTags).where(eq(customerTags.customerId, customerId));
}

export async function addCustomerTags(customerId: string, tags: string[]) {
  if (tags.length === 0) return [];
  return db
    .insert(customerTags)
    .values(tags.map((tag) => ({ customerId, tag: tag.trim().toLowerCase() })))
    .onConflictDoNothing()
    .returning();
}

export async function removeCustomerTag(customerId: string, tag: string) {
  return db
    .delete(customerTags)
    .where(and(eq(customerTags.customerId, customerId), eq(customerTags.tag, tag)))
    .returning();
}
