import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  /** Helper text shown under the input. Linked to the field via aria-describedby. */
  hint?: ReactNode;
  /** Error text shown under the input. When present, sets aria-invalid + aria-describedby on the child input. */
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps an input with a label, optional hint, and an error message that
 * screen readers announce via aria-describedby. When `htmlFor` matches the
 * input's id, the hint and error get stable ids the input can reference.
 */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const hintId = htmlFor && hint ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  // Inject aria-describedby + aria-invalid into the immediate child if it's a
  // single element. Falls back to rendering the child as-is otherwise.
  const enhanced = (() => {
    if (!describedBy && !error) return children;
    const arr = Children.toArray(children);
    if (arr.length !== 1) return children;
    const only = arr[0];
    if (!isValidElement(only)) return children;
    return cloneElement(only as ReactElement<Record<string, unknown>>, {
      "aria-describedby":
        [
          (only.props as Record<string, unknown>)["aria-describedby"] as string | undefined,
          describedBy,
        ]
          .filter(Boolean)
          .join(" ") || undefined,
      "aria-invalid":
        (only.props as Record<string, unknown>)["aria-invalid"] !== undefined
          ? (only.props as Record<string, unknown>)["aria-invalid"]
          : !!error || undefined,
    });
  })();

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-destructive ml-0.5" aria-label="required">
            *
          </span>
        )}
      </Label>
      {enhanced}
      {hint && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
