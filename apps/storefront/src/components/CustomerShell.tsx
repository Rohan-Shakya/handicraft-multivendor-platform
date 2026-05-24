"use client";

import {
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Settings as SettingsIcon,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useRequireCustomerAuth } from "@/hooks/useRequireCustomerAuth";
import { cn } from "@/lib/utils";

export type CustomerNavId =
  | "account"
  | "orders"
  | "messages"
  | "loyalty"
  | "wishlist"
  | "addresses"
  | "settings";

const NAV_ITEMS: ReadonlyArray<{
  id: CustomerNavId;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  {
    id: "account",
    label: "Overview",
    description: "Your dashboard",
    href: "/customer/account",
    icon: UserIcon,
  },
  {
    id: "orders",
    label: "Orders",
    description: "Track purchases & returns",
    href: "/customer/orders",
    icon: Package,
  },
  {
    id: "messages",
    label: "Messages",
    description: "Chat with sellers",
    href: "/customer/messages",
    icon: MessageSquare,
  },
  {
    id: "loyalty",
    label: "Rewards",
    description: "Points & history",
    href: "/customer/loyalty",
    icon: Sparkles,
  },
  {
    id: "wishlist",
    label: "Wishlist",
    description: "Saved pieces",
    href: "/wishlist",
    icon: Heart,
  },
  {
    id: "addresses",
    label: "Addresses",
    description: "Shipping locations",
    href: "/customer/addresses",
    icon: MapPin,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Profile & password",
    href: "/customer/account/settings",
    icon: SettingsIcon,
  },
];

interface Props {
  /** Display name shown in the top-right page heading. */
  title: string;
  /** Optional subtitle / lede under the title. */
  description?: string;
  /** Page-specific breadcrumb tail; "Account" + "Customer Area" are added automatically. */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Highlights a sidebar item. Pass `null` for pages that don't map to a nav slot. */
  active: CustomerNavId | null;
  /** Page body. */
  children: React.ReactNode;
  /** Optional right-aligned actions in the page header (e.g. "Add address"). */
  headerActions?: React.ReactNode;
}

export function CustomerShell({
  title,
  description,
  breadcrumbs,
  active,
  children,
  headerActions,
}: Props) {
  const { customer, loading } = useRequireCustomerAuth();
  const { logout } = useAuth();
  const router = useRouter();

  if (loading) return <CustomerShellSkeleton />;
  if (!customer) return null;

  const displayName =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email;
  const initials =
    [customer.firstName?.[0], customer.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    customer.email[0]?.toUpperCase() ||
    "U";

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <>
      <section aria-labelledby="customer-page-heading">
        <div className="mx-auto flex max-w-8xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Account", href: "/customer/account" },
                ...(breadcrumbs ?? [{ label: title }]),
              ]}
            />
            <h1
              id="customer-page-heading"
              className="mt-2 text-2xl font-medium tracking-tight sm:text-[1.75rem]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-8xl px-4 pb-16 pt-2 sm:px-6 sm:pt-3 lg:px-8 lg:pb-20">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
          {/* Sidebar */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            {/* Profile card */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/40 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-base font-semibold text-primary-foreground shadow-sm shadow-primary/30 ring-4 ring-primary/15"
                >
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {customer.email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="mt-4 h-9 w-full justify-center gap-1.5 rounded-xl text-xs font-medium"
              >
                <LogOut className="size-3.5" aria-hidden />
                Sign out
              </Button>
            </div>

            {/* Nav: rich rows on desktop */}
            <nav
              aria-label="Account navigation"
              className="hidden flex-col gap-1 lg:flex"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === active;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "bg-muted text-muted-foreground group-hover:bg-background"
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm font-semibold transition-colors",
                          isActive
                            ? "text-foreground"
                            : "text-foreground/85"
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/60 group-hover:text-foreground"
                      )}
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Nav: horizontal scrollable pills on mobile/tablet */}
            <nav
              aria-label="Account navigation"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === active;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </>
  );
}

function CustomerShellSkeleton() {
  return (
    <main className="mx-auto max-w-8xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="hidden flex-col gap-2 lg:flex">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
