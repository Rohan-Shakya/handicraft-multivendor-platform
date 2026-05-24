import type { AuthActor } from "@repo/types";
import { ForbiddenError } from "./errors.js";

// ─── Permission keys ──────────────────────────────────────────────────────────

export type Permission =
  // Users
  | "user:create"
  | "user:read:any"
  | "user:update:any"
  | "user:delete:any"
  // Vendors
  | "vendor:create"
  | "vendor:read:any"
  | "vendor:update:any"
  | "vendor:approve"
  | "vendor:suspend"
  | "vendor:profile:update:own"
  // Vendor Addresses
  | "vendor-address:manage:own"
  // Vendor KYC
  | "vendor-kyc:submit:own"
  | "vendor-kyc:review:any"
  // Vendor Memberships
  | "vendor-membership:manage:own"
  | "vendor-membership:manage:any"
  // Products
  | "product:create:own"
  | "product:read:own"
  | "product:update:own"
  | "product:read:any"
  | "product:update:any"
  // Product Options / Variants
  | "product-option:manage:own"
  | "variant:manage:own"
  | "variant:inventory:update:own"
  // Collections
  | "collection:manage:own"
  | "collection:manage:any"
  // Facet filters (storefront filter management)
  | "facet-filter:manage:any"
  // Files
  | "file:upload:own"
  | "file:read:own"
  | "file:manage:any"
  // Pages (platform CMS — admin only)
  | "page:manage:any"
  // Blogs (platform CMS — admin only)
  | "blog:manage:any"
  // Reviews
  | "review:read:any"
  | "review:moderate:any"
  | "review:create:self"
  | "review:update:self"
  | "review:delete:self"
  // Orders (admin)
  | "order:read:any"
  | "order:update:any"
  | "order:create:any"
  // Orders (vendor)
  | "vendor-order:read:own"
  | "vendor-order:fulfill:own"
  // Orders (customer)
  | "order:read:self"
  // Customers
  | "customer:read:any"
  | "customer:update:any"
  | "customer:update:self"
  | "customer-address:manage:self"
  // Customer Segments
  | "customer-segment:manage:any"
  // Discounts
  | "discount:manage:any"
  // Marketing campaigns
  | "campaign:manage:any"
  // Payments (admin)
  | "payment:read:any"
  | "payment:manage:any"
  // Refunds
  | "refund:create:any"
  | "refund:read:any"
  // Returns
  | "return:manage:any"
  | "return:create:self"
  | "return:read:self"
  // Payouts
  | "payout:manage:any"
  // Notifications
  | "notification:read:self"
  // Webhooks
  | "webhook:manage:any"
  // Wishlist / Cart
  | "wishlist:manage:self"
  | "cart:manage:self"
  // Audit Logs
  | "audit-log:read:any"
  // Commission Rules
  | "commission-rule:manage:any"
  // Settings
  | "settings:manage"
  // API keys (server-to-server integrations)
  | "api-key:read:any"
  | "api-key:manage:any"
  // Subscriptions
  | "subscription:manage:own"
  | "subscription:manage:any"
  // Dashboard
  | "dashboard:read:any"
  | "dashboard:read:own";

// ─── Role → permissions ───────────────────────────────────────────────────────

// Platform roles (from platformRoleEnum in users table: super_admin | support_agent)
const PLATFORM_READ_PERMISSIONS: Permission[] = [
  "vendor:read:any",
  "product:read:any",
  "collection:manage:any",
  "review:read:any",
  "order:read:any",
  "customer:read:any",
  "payment:read:any",
  "refund:read:any",
  "dashboard:read:any",
  "audit-log:read:any",
];

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    ...PLATFORM_READ_PERMISSIONS,
    "user:create",
    "user:read:any",
    "user:update:any",
    "user:delete:any",
    "vendor:create",
    "vendor:update:any",
    "vendor:approve",
    "vendor:suspend",
    "vendor-kyc:review:any",
    "vendor-membership:manage:any",
    "product:update:any",
    "file:manage:any",
    "facet-filter:manage:any",
    "page:manage:any",
    "blog:manage:any",
    "review:moderate:any",
    "order:update:any",
    "order:create:any",
    "customer:update:any",
    "customer-segment:manage:any",
    "discount:manage:any",
    "campaign:manage:any",
    "payment:manage:any",
    "refund:create:any",
    "return:manage:any",
    "payout:manage:any",
    "webhook:manage:any",
    "commission-rule:manage:any",
    "settings:manage",
    "api-key:read:any",
    "api-key:manage:any",
    "subscription:manage:any",
  ],
  support_agent: [
    ...PLATFORM_READ_PERMISSIONS,
    "order:update:any",
    "order:create:any",
    "refund:create:any",
    "return:manage:any",
    "customer:update:any",
  ],
};

// Vendor member roles (from vendorMemberRoleEnum: owner | admin | catalog_manager | content_manager | support_agent)
// These apply when actor.type === "vendor". Ownership is always enforced at call-site.
const VENDOR_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: [
    "vendor:profile:update:own",
    "vendor-address:manage:own",
    "vendor-kyc:submit:own",
    "vendor-membership:manage:own",
    "product:create:own",
    "product:read:own",
    "product:update:own",
    "product-option:manage:own",
    "variant:manage:own",
    "variant:inventory:update:own",
    "collection:manage:own",
    "file:upload:own",
    "file:read:own",
    "review:read:any",
    "vendor-order:read:own",
    "vendor-order:fulfill:own",
    "dashboard:read:own",
    "api-key:read:any",
    "api-key:manage:any",
  ],
  admin: [
    "vendor:profile:update:own",
    "vendor-address:manage:own",
    "vendor-kyc:submit:own",
    "vendor-membership:manage:own",
    "product:create:own",
    "product:read:own",
    "product:update:own",
    "product-option:manage:own",
    "variant:manage:own",
    "variant:inventory:update:own",
    "collection:manage:own",
    "file:upload:own",
    "file:read:own",
    "review:read:any",
    "vendor-order:read:own",
    "vendor-order:fulfill:own",
    "dashboard:read:own",
  ],
  catalog_manager: [
    "product:create:own",
    "product:read:own",
    "product:update:own",
    "product-option:manage:own",
    "variant:manage:own",
    "variant:inventory:update:own",
    "collection:manage:own",
    "file:upload:own",
    "file:read:own",
    "dashboard:read:own",
  ],
  content_manager: [
    "product:read:own",
    "collection:manage:own",
    "file:upload:own",
    "file:read:own",
    "dashboard:read:own",
  ],
  support_agent: [
    "vendor-order:read:own",
    "vendor-order:fulfill:own",
    "review:read:any",
    "dashboard:read:own",
  ],
};

const CUSTOMER_PERMISSIONS: Permission[] = [
  "order:read:self",
  "review:create:self",
  "review:update:self",
  "review:delete:self",
  "customer:update:self",
  "customer-address:manage:self",
  "wishlist:manage:self",
  "cart:manage:self",
  "notification:read:self",
  "return:create:self",
  "return:read:self",
  "subscription:manage:own",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPermissions(actor: AuthActor): Permission[] {
  if (actor.type === "admin" && actor.role) {
    return ROLE_PERMISSIONS[actor.role] ?? [];
  }
  if (actor.type === "vendor") {
    const vendorRole = (actor as AuthActor & { role?: string }).role;
    if (vendorRole && VENDOR_ROLE_PERMISSIONS[vendorRole]) {
      return VENDOR_ROLE_PERMISSIONS[vendorRole]!;
    }
    // Fallback to base vendor permissions if role somehow missing
    return VENDOR_ROLE_PERMISSIONS["admin"]!;
  }
  if (actor.type === "customer") {
    return CUSTOMER_PERMISSIONS;
  }
  return [];
}

export function hasPermission(actor: AuthActor, permission: Permission): boolean {
  return getPermissions(actor).includes(permission);
}

/** Throws 403 if the actor lacks the permission. */
export function assertPermission(actor: AuthActor, permission: Permission): void {
  if (!hasPermission(actor, permission)) {
    throw new ForbiddenError("Insufficient permissions");
  }
}

/** Throws 403 if vendor actor doesn't own the resource. No-op for admins. */
export function assertVendorOwnership(actor: AuthActor, resourceVendorId: string): void {
  if (actor.type === "vendor" && actor.vendorId !== resourceVendorId) {
    throw new ForbiddenError("Access denied: resource belongs to another vendor");
  }
}

/** Throws 403 if customer actor doesn't own the resource. No-op for admins. */
export function assertCustomerOwnership(actor: AuthActor, resourceCustomerId: string): void {
  if (actor.type === "customer" && actor.id !== resourceCustomerId) {
    throw new ForbiddenError("Access denied: resource belongs to another customer");
  }
}

/** Returns true if actor is a platform admin. */
export function isAdmin(actor: AuthActor): boolean {
  return actor.type === "admin";
}

/** Returns true if actor is a vendor member. */
export function isVendor(actor: AuthActor): boolean {
  return actor.type === "vendor";
}

/** Returns true if actor is a customer. */
export function isCustomer(actor: AuthActor): boolean {
  return actor.type === "customer";
}

/**
 * Well-known system actor for internal/system-driven mutations
 * (provider webhooks, scheduled jobs, internal recovery flows).
 *
 * Use this **only** when the call originated from a trusted, authenticated
 * upstream (e.g. a Stripe webhook whose signature we already verified) and
 * there is no human user to attribute the action to. Audit entries written
 * with `actorUserId: "system"` make these calls easy to spot.
 */
export const SYSTEM_ACTOR: AuthActor = {
  id: "system",
  type: "admin",
  role: "super_admin",
};
