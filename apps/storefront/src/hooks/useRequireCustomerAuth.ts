"use client";

import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { useAuth } from "@/context/AuthContext";

/**
 * Auth gate for customer-only pages. Waits for the AuthContext's initial
 * hydration before deciding whether to redirect — without this, the redirect
 * fires on the very first render (before localStorage is read) and a logged-in
 * user gets bounced to /customer/login on every navigation.
 *
 * Captures the current path as `?next=` so the user lands back where they
 * came from after signing in.
 */
export function useRequireCustomerAuth(loginPath = "/customer/login") {
  const { customer, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;
    if (customer) return;
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`${loginPath}${next}`);
  }, [loading, customer, router, loginPath, pathname]);

  return { customer, loading };
}
