/**
 * Unit tests for the RBAC permission system.
 * No DB required.
 */
import { describe, it, expect } from "vitest";
import {
  hasPermission,
  assertPermission,
  assertVendorOwnership,
  assertCustomerOwnership,
} from "../../lib/permissions.js";
import type { AuthActor } from "@repo/types";

const superAdmin: AuthActor = { id: "admin-1", type: "admin", role: "super_admin" };
const supportAgent: AuthActor = { id: "admin-2", type: "admin", role: "support_agent" };
const vendorOwner: AuthActor = { id: "user-1", type: "vendor", vendorId: "vendor-1", role: "owner" };
const vendorCatalogManager: AuthActor = { id: "user-2", type: "vendor", vendorId: "vendor-1", role: "catalog_manager" };
const customer: AuthActor = { id: "cust-1", type: "customer" };

describe("super_admin permissions", () => {
  it("has full platform permissions", () => {
    expect(hasPermission(superAdmin, "discount:manage:any")).toBe(true);
    expect(hasPermission(superAdmin, "payout:manage:any")).toBe(true);
    expect(hasPermission(superAdmin, "refund:create:any")).toBe(true);
    expect(hasPermission(superAdmin, "vendor:approve")).toBe(true);
    expect(hasPermission(superAdmin, "user:create")).toBe(true);
    expect(hasPermission(superAdmin, "return:manage:any")).toBe(true);
  });

  it("has read permissions", () => {
    expect(hasPermission(superAdmin, "vendor:read:any")).toBe(true);
    expect(hasPermission(superAdmin, "order:read:any")).toBe(true);
    expect(hasPermission(superAdmin, "payment:read:any")).toBe(true);
  });
});

describe("support_agent permissions", () => {
  it("has read permissions", () => {
    expect(hasPermission(supportAgent, "order:read:any")).toBe(true);
    expect(hasPermission(supportAgent, "customer:read:any")).toBe(true);
    expect(hasPermission(supportAgent, "vendor:read:any")).toBe(true);
  });

  it("can update orders and process refunds", () => {
    expect(hasPermission(supportAgent, "order:update:any")).toBe(true);
    expect(hasPermission(supportAgent, "refund:create:any")).toBe(true);
    expect(hasPermission(supportAgent, "return:manage:any")).toBe(true);
  });

  it("cannot manage discounts or payouts", () => {
    expect(hasPermission(supportAgent, "discount:manage:any")).toBe(false);
    expect(hasPermission(supportAgent, "payout:manage:any")).toBe(false);
    expect(hasPermission(supportAgent, "vendor:approve")).toBe(false);
  });
});

describe("vendor owner permissions", () => {
  it("can manage own products and variants", () => {
    expect(hasPermission(vendorOwner, "product:create:own")).toBe(true);
    expect(hasPermission(vendorOwner, "product:update:own")).toBe(true);
    expect(hasPermission(vendorOwner, "variant:manage:own")).toBe(true);
    expect(hasPermission(vendorOwner, "product-option:manage:own")).toBe(true);
  });

  it("can submit KYC and manage team", () => {
    expect(hasPermission(vendorOwner, "vendor-kyc:submit:own")).toBe(true);
    expect(hasPermission(vendorOwner, "vendor-membership:manage:own")).toBe(true);
    expect(hasPermission(vendorOwner, "vendor:profile:update:own")).toBe(true);
  });

  it("cannot access platform-level operations", () => {
    expect(hasPermission(vendorOwner, "discount:manage:any")).toBe(false);
    expect(hasPermission(vendorOwner, "payout:manage:any")).toBe(false);
    expect(hasPermission(vendorOwner, "user:create")).toBe(false);
    expect(hasPermission(vendorOwner, "vendor:approve")).toBe(false);
  });
});

describe("vendor catalog_manager permissions", () => {
  it("can manage products and variants", () => {
    expect(hasPermission(vendorCatalogManager, "product:create:own")).toBe(true);
    expect(hasPermission(vendorCatalogManager, "variant:manage:own")).toBe(true);
    expect(hasPermission(vendorCatalogManager, "collection:manage:own")).toBe(true);
  });

  it("cannot manage team or KYC", () => {
    expect(hasPermission(vendorCatalogManager, "vendor-membership:manage:own")).toBe(false);
    expect(hasPermission(vendorCatalogManager, "vendor-kyc:submit:own")).toBe(false);
  });
});

describe("customer permissions", () => {
  it("can manage own cart, orders, addresses", () => {
    expect(hasPermission(customer, "cart:manage:self")).toBe(true);
    expect(hasPermission(customer, "order:read:self")).toBe(true);
    expect(hasPermission(customer, "customer-address:manage:self")).toBe(true);
  });

  it("cannot access admin operations", () => {
    expect(hasPermission(customer, "order:read:any")).toBe(false);
    expect(hasPermission(customer, "discount:manage:any")).toBe(false);
    expect(hasPermission(customer, "vendor:approve")).toBe(false);
  });
});

describe("assertPermission", () => {
  it("does not throw when permission is granted", () => {
    expect(() => assertPermission(superAdmin, "discount:manage:any")).not.toThrow();
  });

  it("throws ForbiddenError when permission is denied", () => {
    expect(() => assertPermission(customer, "discount:manage:any")).toThrow();
  });
});

describe("assertVendorOwnership", () => {
  it("allows vendor to access their own resources", () => {
    expect(() => assertVendorOwnership(vendorOwner, "vendor-1")).not.toThrow();
  });

  it("blocks vendor from accessing another vendor's resources", () => {
    expect(() => assertVendorOwnership(vendorOwner, "vendor-999")).toThrow();
  });

  it("is a no-op for admins (admin bypass)", () => {
    // Admins are not subject to vendor ownership checks
    expect(() => assertVendorOwnership(superAdmin, "any-vendor-id")).not.toThrow();
  });
});

describe("assertCustomerOwnership", () => {
  it("allows customer to access their own resources", () => {
    expect(() => assertCustomerOwnership(customer, "cust-1")).not.toThrow();
  });

  it("blocks customer from accessing another customer's resources", () => {
    expect(() => assertCustomerOwnership(customer, "cust-999")).toThrow();
  });

  it("is a no-op for admins", () => {
    expect(() => assertCustomerOwnership(superAdmin, "any-customer-id")).not.toThrow();
  });
});
