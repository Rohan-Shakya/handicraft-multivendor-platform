"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    {(props.defaultValue ?? props.value ?? [0, 100]).map((_, i) => (
      <SliderPrimitive.Thumb
        key={i}
        // Soft halo instead of `ring-offset-2` — the offset technique paints a
        // rectangle beneath the rounded thumb and gets clipped when the thumb
        // sits at either edge of its container. A plain `ring-4` with a
        // low-alpha primary tint is fully round and can't clip.
        className="block size-5 rounded-full border-2 border-primary bg-background shadow-md transition-[box-shadow,background-color] hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 active:ring-4 active:ring-primary/25 disabled:pointer-events-none disabled:opacity-50"
      />
    ))}
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";

export { Slider };
