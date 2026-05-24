import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                 */
/* -------------------------------------------------------------------------- */

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="breadcrumb"
      aria-label="breadcrumb"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1 text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="breadcrumb-link"
      className={cn(
        "text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-medium", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  className,
  children,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3 text-muted-foreground/40", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Route-aware breadcrumb                                                     */
/* -------------------------------------------------------------------------- */

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  vendors: "Vendors",
  approvals: "Approvals",
  kyc: "KYC Review",
  customers: "Customers",
  segments: "Segments",
  catalog: "Catalog",
  products: "Products",
  collections: "Collections",
  orders: "Orders",
  returns: "Returns",
  refunds: "Refunds",
  payments: "Payments",
  payouts: "Payouts",
  discounts: "Discounts",
  new: "New",
  reviews: "Reviews",
  content: "Content",
  pages: "Pages",
  blogs: "Blogs",
  system: "System",
  "audit-logs": "Audit Logs",
  webhooks: "Webhooks",
  users: "Users & Roles",
  login: "Login",
};

function prettify(segment: string): string {
  return (
    LABEL_MAP[segment] ??
    segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function isIdSegment(segment: string): boolean {
  // Skip segments that look like IDs (UUIDs, seed IDs, long hex strings)
  return (
    segment.length > 20 ||
    /^[0-9a-f]{8}-/.test(segment) ||
    /^seed-/.test(segment)
  );
}

function RouteBreadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Filter out ID-like segments and limit to meaningful path parts
  const meaningful = segments
    .map((segment, index) => ({
      segment,
      path: "/" + segments.slice(0, index + 1).join("/"),
      isId: isIdSegment(segment),
    }))
    .filter((s) => !s.isId);

  // Limit to 3 breadcrumb items max
  const visible = meaningful.length > 3 ? meaningful.slice(-3) : meaningful;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink to="/">Admin</BreadcrumbLink>
        </BreadcrumbItem>
        {visible.map((item, index) => {
          const isLast = index === visible.length - 1;
          return (
            <React.Fragment key={item.path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{prettify(item.segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink to={item.path}>{prettify(item.segment)}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  RouteBreadcrumb,
};
