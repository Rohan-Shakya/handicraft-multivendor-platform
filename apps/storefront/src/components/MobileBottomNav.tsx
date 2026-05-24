"use client";

import { Heart, Home, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Shop", icon: Search },
  { href: "/wishlist", label: "Saved", icon: Heart, badge: "wishlist" as const },
  { href: "/cart", label: "Cart", icon: ShoppingBag, badge: "cart" as const },
  { href: "/customer/account", label: "Me", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { productIds } = useWishlist();
  const wishCount = productIds.size;

  // Hide on checkout to keep the flow focused.
  if (pathname?.startsWith("/checkout")) return null;

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/80 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 items-stretch">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname?.startsWith(href) ?? false;
          const count = badge === "cart" ? itemCount : badge === "wishlist" ? wishCount : 0;
          const countLabel =
            count > 0
              ? badge === "cart"
                ? `, ${count} ${count === 1 ? "item" : "items"} in cart`
                : `, ${count} saved`
              : "";
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:bg-muted focus-visible:text-foreground",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={`${label}${countLabel}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative inline-flex">
                  <Icon className="size-5" aria-hidden />
                  {count > 0 && (
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-1.5 min-w-[16px] rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground ring-2 ring-background"
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
