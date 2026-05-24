"use client";

import { Heart } from "lucide-react";
import * as React from "react";

import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/utils";

interface Props {
  productId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "filled";
  label?: string;
}

/**
 * Accessible wishlist toggle. Prefer this over raw <button> so we stay
 * consistent with the optimistic `useWishlist` behaviour everywhere.
 */
export function WishlistButton({
  productId,
  className,
  size = "md",
  variant = "filled",
  label,
}: Props) {
  const { has, toggle } = useWishlist();
  const wished = has(productId);

  const sizeClasses = {
    sm: "size-7 [&_svg]:size-3.5",
    md: "size-10 [&_svg]:size-4",
    lg: "size-12 [&_svg]:size-5",
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-label={
        label ??
        (wished ? "Remove from wishlist" : "Save to wishlist")
      }
      aria-pressed={wished}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-all",
        variant === "filled"
          ? "border bg-background shadow-sm hover:shadow-md"
          : "hover:bg-muted",
        wished && "text-rose-500",
        !wished && "text-muted-foreground hover:text-rose-500",
        sizeClasses[size],
        className
      )}
    >
      <Heart className={cn(wished && "fill-rose-500")} aria-hidden />
    </button>
  );
}
