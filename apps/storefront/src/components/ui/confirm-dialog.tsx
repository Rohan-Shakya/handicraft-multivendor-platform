"use client";

/**
 * Drop-in replacements for `window.confirm` and `window.prompt` that render a
 * shadcn-styled dialog (using our existing `@radix-ui/react-dialog` setup)
 * instead of the browser's native modal.
 *
 * Usage:
 *   import { confirm, prompt } from "@/components/ui/confirm-dialog";
 *
 *   if (await confirm({ title: "Sign out?", confirmText: "Sign out", variant: "destructive" })) {
 *     await logout();
 *   }
 *
 *   const reason = await prompt({ title: "Reason for return", required: true });
 *   if (reason) submitReturn(reason);
 *
 * `<ConfirmDialogHost />` must be mounted once in the root layout for these
 * helpers to work; if it is not mounted we fall back to the browser dialogs
 * so old call sites still function during migration.
 */

import { AlertTriangle, Loader2 } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

// ─── Types ────────────────────────────────────────────────────────────────

type Variant = "default" | "destructive";

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
}

interface PromptOptions extends ConfirmOptions {
  defaultValue?: string;
  placeholder?: string;
  /** Iff true, the confirm button is disabled while the input is empty. */
  required?: boolean;
  /** Optional input type — "text" (default), "email", "password", etc. */
  inputType?: React.HTMLInputTypeAttribute;
  /** Optional label rendered above the input. */
  label?: string;
  /** Custom validator. Return error string to block submission, or null. */
  validate?: (value: string) => string | null;
}

type Request =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "prompt"; opts: PromptOptions; resolve: (value: string | null) => void };

// ─── Singleton store ──────────────────────────────────────────────────────

type Listener = (req: Request | null) => void;
const listeners = new Set<Listener>();
let current: Request | null = null;

function publish(req: Request | null) {
  current = req;
  for (const fn of listeners) fn(req);
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(current);
  return () => {
    listeners.delete(fn);
  };
}

let hostMounted = false;

// ─── Public API ───────────────────────────────────────────────────────────

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  if (!hostMounted && typeof window !== "undefined") {
    // Fallback — host wasn't mounted yet. Native dialog keeps the app usable.
    const msg = [opts.title, typeof opts.description === "string" ? opts.description : ""]
      .filter(Boolean)
      .join("\n\n");
    return Promise.resolve(window.confirm(msg));
  }
  return new Promise((resolve) => {
    publish({ kind: "confirm", opts, resolve });
  });
}

export function prompt(opts: PromptOptions): Promise<string | null> {
  if (!hostMounted && typeof window !== "undefined") {
    const msg = [opts.title, typeof opts.description === "string" ? opts.description : ""]
      .filter(Boolean)
      .join("\n\n");
    return Promise.resolve(window.prompt(msg, opts.defaultValue));
  }
  return new Promise((resolve) => {
    publish({ kind: "prompt", opts, resolve });
  });
}

// ─── Host component ───────────────────────────────────────────────────────

export function ConfirmDialogHost() {
  const [request, setRequest] = React.useState<Request | null>(null);
  const [pending, setPending] = React.useState(false);

  // Local state for prompt-mode input.
  const [value, setValue] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    hostMounted = true;
    const unsub = subscribe((next) => {
      setRequest(next);
      if (next?.kind === "prompt") {
        setValue(next.opts.defaultValue ?? "");
      } else {
        setValue("");
      }
      setValidationError(null);
      setPending(false);
    });
    return () => {
      hostMounted = false;
      unsub();
    };
  }, []);

  function close(result: boolean | string | null) {
    if (!request) return;
    if (request.kind === "confirm") {
      request.resolve(result === true);
    } else {
      request.resolve(typeof result === "string" ? result : null);
    }
    publish(null);
  }

  function handleConfirm() {
    if (!request) return;
    if (request.kind === "confirm") {
      close(true);
      return;
    }
    // Prompt branch — validate first.
    const v = value;
    if (request.opts.required && !v.trim()) {
      setValidationError("Please enter a value.");
      inputRef.current?.focus();
      return;
    }
    if (request.opts.validate) {
      const err = request.opts.validate(v);
      if (err) {
        setValidationError(err);
        inputRef.current?.focus();
        return;
      }
    }
    close(v);
  }

  const open = !!request;
  const opts = request?.opts;
  const variant: Variant = opts?.variant ?? "default";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !pending) close(request?.kind === "prompt" ? null : false);
      }}
    >
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="flex flex-row items-start gap-3 p-6 pb-3">
          {variant === "destructive" && (
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"
            >
              <AlertTriangle className="size-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base">{opts?.title}</DialogTitle>
            {opts?.description && (
              <DialogDescription className="mt-1.5 p-0">
                {opts.description}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        {request?.kind === "prompt" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className="px-6"
          >
            {request.opts.label && (
              <label
                htmlFor="confirm-prompt-input"
                className="mb-1.5 block text-sm font-medium"
              >
                {request.opts.label}
              </label>
            )}
            <Input
              ref={inputRef}
              id="confirm-prompt-input"
              type={request.opts.inputType ?? "text"}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={request.opts.placeholder}
              autoFocus
              aria-invalid={!!validationError}
              aria-describedby={validationError ? "confirm-prompt-error" : undefined}
              className="h-10"
            />
            {validationError && (
              <p
                id="confirm-prompt-error"
                role="alert"
                className="mt-1.5 text-xs text-destructive"
              >
                {validationError}
              </p>
            )}
          </form>
        )}

        <DialogFooter className="p-6 pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => close(request?.kind === "prompt" ? null : false)}
            className="inline-flex h-10 items-center justify-center rounded-full border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {opts?.cancelText ?? "Cancel"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleConfirm}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60",
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
                : "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary"
            )}
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {opts?.confirmText ?? (request?.kind === "prompt" ? "Submit" : "Confirm")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
