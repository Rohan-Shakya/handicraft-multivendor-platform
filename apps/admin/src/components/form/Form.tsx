import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Thin shell around `react-hook-form` to make the common admin-form wiring
 * boilerplate-free.
 *
 *   <Form form={form} onSubmit={onSubmit}>
 *     <Field name="title" label="Title" required>
 *       <Input />
 *     </Field>
 *   </Form>
 *
 * The consumer still owns Zod schemas via `zodResolver`; this file only
 * centralises presentation (label, description, error, required asterisk).
 */

type FormHtmlProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit">;

interface FormProps<T extends FieldValues> extends FormHtmlProps {
  form: UseFormReturn<T>;
  onSubmit: (values: T) => void | Promise<void>;
  children: React.ReactNode;
}

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  ...rest
}: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form
        {...rest}
        className={cn("space-y-5", className)}
        onSubmit={form.handleSubmit((vals) => onSubmit(vals))}
        noValidate
      >
        {children}
      </form>
    </FormProvider>
  );
}

interface FieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  /**
   * Optional render prop form — gives the caller access to the RHF
   * `ControllerRenderProps` for custom input bindings. When omitted, the
   * first child element receives the field bindings via cloning.
   */
  children:
    | React.ReactElement
    | ((field: ControllerRenderProps<T, FieldPath<T>>) => React.ReactElement);
  className?: string;
}

/**
 * Labelled, error-aware wrapper. Pair with any controlled input component
 * that accepts `value` + `onChange` (Input, Select, Textarea, Switch, …).
 */
export function Field<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  children,
}: FieldProps<T>) {
  const form = useFormContext<T>();
  const error = (form.formState.errors[name] as { message?: string } | undefined)?.message;
  const id = `field-${String(name)}`;

  return (
    <Controller
      control={form.control as Control<T>}
      name={name}
      render={({ field }) => {
        const rendered =
          typeof children === "function"
            ? children(field)
            : React.cloneElement(children, {
                ...field,
                id,
                "aria-invalid": !!error,
                "aria-describedby": error ? `${id}-error` : undefined,
              } as Record<string, unknown>);

        return (
          <div className={cn("space-y-1.5", className)}>
            {label && (
              <Label htmlFor={id} className="text-sm font-medium">
                {label}
                {required && <span className="text-destructive"> *</span>}
              </Label>
            )}
            {rendered}
            {description && !error && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {error && (
              <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

/** Convenience submit button synced to the form's `isSubmitting` state. */
export function FormSubmit({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const form = useFormContext();
  const busy = form.formState.isSubmitting;
  return (
    <button
      type="submit"
      disabled={busy || rest.disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60",
        className
      )}
      {...rest}
    >
      {busy ? "Saving…" : children}
    </button>
  );
}
