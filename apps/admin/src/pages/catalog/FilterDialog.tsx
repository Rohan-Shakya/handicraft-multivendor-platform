/**
 * Create / edit dialog for an admin-managed storefront filter.
 *
 * The same component handles both flows — if `filter` is provided we PATCH,
 * else we POST. Source-type changes hide/show the `sourceRef` field (metafields
 * + variant options need a ref, built-ins don't).
 */
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, Field, FormSubmit } from "@/components/form/Form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface SourceTypeOption {
  value:
    | "variant_price"
    | "variant_option"
    | "variant_metafield"
    | "product_metafield"
    | "collection"
    | "tag"
    | "vendor"
    | "rating"
    | "availability";
  label: string;
  hint?: string;
}

const SOURCE_TYPES: SourceTypeOption[] = [
  { value: "variant_price", label: "Variant Price", hint: "Range slider" },
  { value: "variant_option", label: "Variant Option", hint: "e.g. Color, Size" },
  { value: "variant_metafield", label: "Variant Metafield", hint: "namespace.key" },
  { value: "product_metafield", label: "Product Metafield", hint: "namespace.key" },
  { value: "collection", label: "Collection" },
  { value: "tag", label: "Tag" },
  { value: "vendor", label: "Vendor" },
  { value: "rating", label: "Rating" },
  { value: "availability", label: "Availability" },
];

const DISPLAY_TYPES = [
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio" },
  { value: "slider", label: "Slider" },
  { value: "swatch", label: "Swatch" },
  { value: "toggle", label: "Toggle" },
] as const;

const SOURCE_TYPES_REQUIRING_REF = new Set([
  "variant_option",
  "variant_metafield",
  "product_metafield",
]);

const formSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9][a-z0-9_-]*$/, "Lowercase slug only (a-z, 0-9, -, _)"),
    label: z.string().min(1).max(120),
    sourceType: z.enum([
      "variant_price",
      "variant_option",
      "variant_metafield",
      "product_metafield",
      "collection",
      "tag",
      "vendor",
      "rating",
      "availability",
    ]),
    sourceRef: z.string().max(200).optional().nullable(),
    displayType: z.enum(["checkbox", "radio", "slider", "swatch", "toggle"]),
    enabled: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (SOURCE_TYPES_REQUIRING_REF.has(val.sourceType) && !val.sourceRef) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceRef"],
        message: "Required for this source type",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export interface FilterRow {
  id: string;
  key: string;
  label: string;
  sourceType: FormValues["sourceType"];
  sourceRef: string | null;
  displayType: FormValues["displayType"];
  enabled: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter?: FilterRow;
  onSaved: () => void;
}

export function FilterDialog({ open, onOpenChange, filter, onSaved }: Props) {
  const isEdit = !!filter;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: filter?.key ?? "",
      label: filter?.label ?? "",
      sourceType: filter?.sourceType ?? "collection",
      sourceRef: filter?.sourceRef ?? "",
      displayType: filter?.displayType ?? "checkbox",
      enabled: filter?.enabled ?? true,
    },
  });

  // Reset form when a different filter is loaded into the dialog.
  React.useEffect(() => {
    form.reset({
      key: filter?.key ?? "",
      label: filter?.label ?? "",
      sourceType: filter?.sourceType ?? "collection",
      sourceRef: filter?.sourceRef ?? "",
      displayType: filter?.displayType ?? "checkbox",
      enabled: filter?.enabled ?? true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.id, open]);

  const sourceType = form.watch("sourceType");
  const needsRef = SOURCE_TYPES_REQUIRING_REF.has(sourceType);
  const sourceHint = SOURCE_TYPES.find((s) => s.value === sourceType)?.hint;

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        sourceRef:
          values.sourceRef && values.sourceRef.trim().length > 0
            ? values.sourceRef.trim()
            : null,
      };
      if (isEdit && filter) {
        await apiFetch(`/admin/facet-filters/${filter.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Filter updated" });
      } else {
        await apiFetch("/admin/facet-filters", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Filter created" });
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit filter" : "New filter"}</DialogTitle>
          <DialogDescription>
            Configure how this filter is shown on the storefront.
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Field name="key" label="Key" required>
              <Input placeholder="material" autoComplete="off" />
            </Field>
            <Field name="label" label="Label" required>
              <Input placeholder="Material" autoComplete="off" />
            </Field>
          </div>

          <Field name="sourceType" label="Source type" required>
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          {needsRef && (
            <Field
              name="sourceRef"
              label="Source ref"
              description={sourceHint}
              required
            >
              <Input
                placeholder={
                  sourceType === "variant_option"
                    ? "Color"
                    : "custom.material"
                }
                autoComplete="off"
              />
            </Field>
          )}

          <Field name="displayType" label="Display" required>
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPLAY_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field name="enabled" label="Enabled">
            {(field) => (
              <div className="flex items-center gap-3">
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <span className="text-sm text-muted-foreground">
                  {field.value ? "Shown on storefront" : "Hidden"}
                </span>
              </div>
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <FormSubmit>{isEdit ? "Save changes" : "Create filter"}</FormSubmit>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
