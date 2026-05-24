"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface CheckoutStep {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

interface Props {
  steps: CheckoutStep[];
  /** Index of the currently active step (0-based). */
  currentIndex: number;
  /** Optional click handler for going back to a completed step. */
  onSelect?: (index: number) => void;
}

export function CheckoutStepper({ steps, currentIndex, onSelect }: Props) {
  return (
    <ol
      className="flex items-center gap-2 sm:gap-3"
      aria-label="Checkout progress"
    >
      {steps.map((step, i) => {
        const state =
          i < currentIndex
            ? "complete"
            : i === currentIndex
              ? "current"
              : "upcoming";

        const interactive = state === "complete" && onSelect;
        const Icon = step.icon;
        const isLast = i === steps.length - 1;

        return (
          <li
            key={step.id}
            className="flex flex-1 items-center gap-2 sm:gap-3"
          >
            <button
              type="button"
              onClick={interactive ? () => onSelect!(i) : undefined}
              disabled={!interactive && state !== "current"}
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "group flex min-w-0 items-center gap-3 rounded-xl text-left outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                interactive && "cursor-pointer",
                !interactive && state !== "current" && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "relative grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold transition-all duration-300",
                  state === "complete" &&
                    "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                  state === "current" &&
                    "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-lg shadow-primary/30 ring-[6px] ring-primary/15",
                  state === "upcoming" &&
                    "bg-muted/70 text-muted-foreground/70 ring-1 ring-inset ring-border"
                )}
              >
                {state === "complete" ? (
                  <Check className="size-5" aria-hidden strokeWidth={3} />
                ) : Icon ? (
                  <Icon className="size-[18px]" aria-hidden />
                ) : (
                  i + 1
                )}
              </span>

              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                    state === "current"
                      ? "text-primary"
                      : "text-muted-foreground/70"
                  )}
                >
                  Step {i + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-sm font-semibold transition-colors",
                    state === "current" && "text-foreground",
                    state === "complete" && "text-foreground/80",
                    state === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </span>
            </button>

            {!isLast && (
              <span
                aria-hidden
                className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-[width] duration-500 ease-out",
                    state === "complete"
                      ? "w-full"
                      : state === "current"
                        ? "w-1/2"
                        : "w-0"
                  )}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
