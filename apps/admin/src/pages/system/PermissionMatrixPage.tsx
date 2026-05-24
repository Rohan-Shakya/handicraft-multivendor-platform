import * as React from "react";
import { Shield, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Read-only permission matrix for super-admins. Mirrors the shape of
 * ROLE_PERMISSIONS in src/lib/permissions.ts so engineers can review and
 * auditors can print a single page showing "who can do what".
 */

interface RoleSpec {
  id: string;
  label: string;
  type: "platform" | "vendor" | "customer";
  permissions: string[];
}

// Kept in sync manually with apps/api/src/lib/permissions.ts. Treating this as
// a local copy keeps the admin UI decoupled from the API bundle.
const ROLES: RoleSpec[] = [
  {
    id: "super_admin",
    label: "Super Admin",
    type: "platform",
    permissions: [
      "user:create", "user:read:any", "user:update:any", "user:delete:any",
      "vendor:create", "vendor:read:any", "vendor:update:any",
      "vendor:approve", "vendor:suspend", "vendor-kyc:review:any",
      "product:read:any", "product:update:any",
      "collection:manage:any", "file:manage:any",
      "page:manage:any", "blog:manage:any",
      "review:moderate:any", "order:update:any", "order:read:any",
      "customer:read:any", "customer:update:any", "customer-segment:manage:any",
      "discount:manage:any",
      "payment:read:any", "payment:manage:any",
      "refund:create:any", "refund:read:any", "return:manage:any",
      "payout:manage:any", "webhook:manage:any",
      "commission-rule:manage:any",
      "settings:manage", "audit-log:read:any",
      "api-key:read:any", "api-key:manage:any",
      "subscription:manage:any", "dashboard:read:any",
    ],
  },
  {
    id: "support_agent",
    label: "Support Agent",
    type: "platform",
    permissions: [
      "vendor:read:any", "product:read:any", "collection:manage:any",
      "review:read:any", "order:read:any", "order:update:any",
      "customer:read:any", "customer:update:any",
      "payment:read:any", "refund:create:any", "refund:read:any",
      "return:manage:any", "audit-log:read:any", "dashboard:read:any",
    ],
  },
  {
    id: "owner",
    label: "Vendor Owner",
    type: "vendor",
    permissions: [
      "vendor:profile:update:own", "vendor-address:manage:own",
      "vendor-kyc:submit:own", "vendor-membership:manage:own",
      "product:create:own", "product:read:own", "product:update:own",
      "product-option:manage:own", "variant:manage:own",
      "variant:inventory:update:own", "collection:manage:own",
      "file:upload:own", "file:read:own", "review:read:any",
      "vendor-order:read:own", "vendor-order:fulfill:own",
      "dashboard:read:own",
      "api-key:read:any", "api-key:manage:any",
    ],
  },
  {
    id: "admin",
    label: "Vendor Admin",
    type: "vendor",
    permissions: [
      "vendor:profile:update:own", "vendor-address:manage:own",
      "vendor-kyc:submit:own", "vendor-membership:manage:own",
      "product:create:own", "product:read:own", "product:update:own",
      "product-option:manage:own", "variant:manage:own",
      "variant:inventory:update:own", "collection:manage:own",
      "file:upload:own", "file:read:own", "review:read:any",
      "vendor-order:read:own", "vendor-order:fulfill:own", "dashboard:read:own",
    ],
  },
  {
    id: "catalog_manager",
    label: "Catalog Manager",
    type: "vendor",
    permissions: [
      "product:create:own", "product:read:own", "product:update:own",
      "product-option:manage:own", "variant:manage:own",
      "variant:inventory:update:own", "collection:manage:own",
      "file:upload:own", "file:read:own", "dashboard:read:own",
    ],
  },
  {
    id: "content_manager",
    label: "Content Manager",
    type: "vendor",
    permissions: [
      "product:read:own", "collection:manage:own",
      "file:upload:own", "file:read:own", "dashboard:read:own",
    ],
  },
  {
    id: "vendor_support",
    label: "Vendor Support",
    type: "vendor",
    permissions: [
      "vendor-order:read:own", "vendor-order:fulfill:own",
      "review:read:any", "dashboard:read:own",
    ],
  },
  {
    id: "customer",
    label: "Customer",
    type: "customer",
    permissions: [
      "order:read:self", "review:create:self", "review:update:self",
      "review:delete:self", "customer:update:self",
      "customer-address:manage:self", "wishlist:manage:self",
      "cart:manage:self", "notification:read:self",
      "return:create:self", "return:read:self",
      "subscription:manage:own",
    ],
  },
];

const GROUPS: Array<{ title: string; prefix: string }> = [
  { title: "Users", prefix: "user:" },
  { title: "Vendors", prefix: "vendor:" },
  { title: "Products & Variants", prefix: "product" },
  { title: "Collections", prefix: "collection" },
  { title: "Files", prefix: "file" },
  { title: "Reviews", prefix: "review" },
  { title: "Orders", prefix: "order" },
  { title: "Vendor Orders", prefix: "vendor-order" },
  { title: "Customers", prefix: "customer" },
  { title: "Discounts", prefix: "discount" },
  { title: "Payments & Refunds", prefix: "payment" },
  { title: "Refunds & Returns", prefix: "refund" },
  { title: "Returns", prefix: "return" },
  { title: "Payouts", prefix: "payout" },
  { title: "Webhooks", prefix: "webhook" },
  { title: "Wishlist / Cart", prefix: "wishlist" },
  { title: "API Keys", prefix: "api-key" },
  { title: "Subscriptions", prefix: "subscription" },
  { title: "Content", prefix: "page" },
  { title: "Blog", prefix: "blog" },
  { title: "Audit Log", prefix: "audit-log" },
  { title: "Settings", prefix: "settings" },
  { title: "Commission", prefix: "commission" },
  { title: "Dashboard", prefix: "dashboard" },
];

export function PermissionMatrixPage() {
  const [filter, setFilter] = React.useState("");
  const allPermissions = React.useMemo(
    () => Array.from(new Set(ROLES.flatMap((r) => r.permissions))).sort(),
    []
  );

  const filtered = filter.trim()
    ? allPermissions.filter((p) =>
        p.toLowerCase().includes(filter.trim().toLowerCase())
      )
    : allPermissions;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permission matrix"
        description="Read-only reference of which roles grant each permission."
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter permissions…"
          className="pl-9"
        />
      </div>

      {GROUPS.map((g) => {
        const perms = filtered.filter((p) => p.startsWith(g.prefix));
        if (perms.length === 0) return null;
        return (
          <section key={g.prefix} className="rounded-xl border bg-card">
            <header className="border-b px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Shield className="size-4 text-muted-foreground" aria-hidden />
                {g.title}
              </h2>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="sticky left-0 bg-muted/30 px-3 py-2 text-left">Permission</th>
                    {ROLES.map((r) => (
                      <th key={r.id} className="px-2 py-2 text-center">
                        <span className="block whitespace-nowrap">{r.label}</span>
                        <span className="block text-[10px] font-normal">({r.type})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perms.map((p) => (
                    <tr key={p} className="border-t">
                      <th className="sticky left-0 bg-card px-3 py-2 text-left font-mono text-[11px] font-medium">
                        {p}
                      </th>
                      {ROLES.map((r) => {
                        const has = r.permissions.includes(p);
                        return (
                          <td
                            key={r.id}
                            className={cn(
                              "px-2 py-2 text-center",
                              has ? "text-emerald-600" : "text-muted-foreground/40"
                            )}
                          >
                            {has ? "●" : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
