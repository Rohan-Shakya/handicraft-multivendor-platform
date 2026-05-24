import type { AuthActor } from "@repo/types";

/**
 * Client-side permission checker — mirrors the API RBAC matrix.
 * Used for UI gating (hiding/disabling routes & buttons).
 * The server remains the authoritative source; this is defense-in-depth.
 */

export type Permission =
  | "user:create"
  | "user:read:any"
  | "user:update:any"
  | "user:delete:any"
  | "vendor:read:any"
  | "vendor:update:any"
  | "vendor:approve"
  | "vendor:suspend"
  | "vendor:profile:update:own"
  | "vendor-address:manage:own"
  | "vendor-kyc:submit:own"
  | "vendor-kyc:review:any"
  | "vendor-membership:manage:own"
  | "product:create:own"
  | "product:read:own"
  | "product:update:own"
  | "product:read:any"
  | "product:update:any"
  | "product-option:manage:own"
  | "variant:manage:own"
  | "variant:inventory:update:own"
  | "collection:manage:own"
  | "collection:manage:any"
  | "facet-filter:manage:any"
  | "file:upload:own"
  | "file:read:own"
  | "file:manage:any"
  | "page:manage:any"
  | "blog:manage:any"
  | "review:read:any"
  | "review:moderate:any"
  | "order:read:any"
  | "order:update:any"
  | "order:create:any"
  | "vendor-order:read:own"
  | "vendor-order:fulfill:own"
  | "customer:read:any"
  | "customer:update:any"
  | "customer-segment:manage:any"
  | "discount:manage:any"
  | "campaign:manage:any"
  | "payment:read:any"
  | "payment:manage:any"
  | "refund:create:any"
  | "refund:read:any"
  | "return:manage:any"
  | "payout:manage:any"
  | "webhook:manage:any"
  | "audit-log:read:any"
  | "commission-rule:manage:any"
  | "settings:manage"
  | "dashboard:read:any"
  | "dashboard:read:own";

const PLATFORM_READ: Permission[] = [
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
    ...PLATFORM_READ,
    "user:create",
    "user:read:any",
    "user:update:any",
    "user:delete:any",
    "vendor:update:any",
    "vendor:approve",
    "vendor:suspend",
    "vendor-kyc:review:any",
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
  ],
  support_agent: [
    ...PLATFORM_READ,
    "order:update:any",
    "order:create:any",
    "refund:create:any",
    "return:manage:any",
    "customer:update:any",
  ],
};

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

export function getPermissions(actor: AuthActor): Permission[] {
  if (actor.type === "admin" && actor.role) {
    return ROLE_PERMISSIONS[actor.role] ?? [];
  }
  if (actor.type === "vendor" && actor.role) {
    return VENDOR_ROLE_PERMISSIONS[actor.role] ?? VENDOR_ROLE_PERMISSIONS["admin"]!;
  }
  return [];
}

export function hasPermission(actor: AuthActor, permission: Permission): boolean {
  return getPermissions(actor).includes(permission);
}

export function hasAnyPermission(actor: AuthActor, permissions: Permission[]): boolean {
  const actorPerms = getPermissions(actor);
  return permissions.some((p) => actorPerms.includes(p));
}
