import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { currencySymbol, formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { MetafieldsEditor } from "@/components/MetafieldsEditor";
import { ImagePicker, type ImagePickerValue } from "@/components/ImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ArrowLeftIcon,
  Loader2Icon,
  PackageIcon,
  ImageIcon,
  StarIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelectedOption {
  variantId: string;
  optionId: string;
  optionValueId: string;
}

interface InventoryItem {
  availableQuantity: number;
  reservedQuantity: number;
  tracked: boolean;
}

interface OptionValue {
  id: string;
  optionId: string;
  value: string;
}

interface ProductOption {
  id: string;
  name: string;
  position: number;
  values: OptionValue[];
}

interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  position: number;
  isFeatured: boolean;
}

interface ProductSummary {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendorId: string;
  options: ProductOption[];
  variantCount: number;
}

interface VariantImage {
  id: string;
  variantId: string;
  url: string;
  altText: string | null;
  position: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VariantDetail {
  id: string;
  vendorId: string;
  productId: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  status: string;
  price: string;
  compareAtPrice: string | null;
  costPerItem: string | null;
  taxable: boolean;
  inventoryTracked: boolean;
  inventoryPolicy: string | null;
  requiresShipping: boolean;
  weightValue: string | null;
  weightUnit: string | null;
  countryOfOrigin: string | null;
  harmonizedSystemCode: string | null;
  featuredFileId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  selectedOptions: SelectedOption[];
  inventoryItem: InventoryItem | null;
  product: ProductSummary;
  image: VariantImage | null;
  productImages: ProductImage[];
  variantImages: VariantImage[];
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface VariantForm {
  price: string;
  compareAtPrice: string;
  costPerItem: string;
  taxable: boolean;
  inventoryTracked: boolean;
  inventoryPolicy: string;
  availableQuantity: string;
  reservedQuantity: string;
  sku: string;
  barcode: string;
  requiresShipping: boolean;
  weightValue: string;
  weightUnit: string;
  countryOfOrigin: string;
  harmonizedSystemCode: string;
  featuredImageId: string | null;
}

function buildForm(v: VariantDetail): VariantForm {
  return {
    price: v.price ?? "",
    compareAtPrice: v.compareAtPrice ?? "",
    costPerItem: v.costPerItem ?? "",
    taxable: v.taxable,
    inventoryTracked: v.inventoryTracked,
    inventoryPolicy: v.inventoryPolicy ?? "deny",
    availableQuantity: String(v.inventoryItem?.availableQuantity ?? 0),
    reservedQuantity: String(v.inventoryItem?.reservedQuantity ?? 0),
    sku: v.sku ?? "",
    barcode: v.barcode ?? "",
    requiresShipping: v.requiresShipping,
    weightValue: v.weightValue ?? "",
    weightUnit: v.weightUnit ?? "kg",
    countryOfOrigin: v.countryOfOrigin ?? "",
    harmonizedSystemCode: v.harmonizedSystemCode ?? "",
    featuredImageId: v.featuredFileId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVariantName(
  variant: VariantDetail,
  options: ProductOption[]
): string {
  if (variant.selectedOptions.length === 0) {
    return variant.title || "Default";
  }

  const sorted = [...variant.selectedOptions].sort((a, b) => {
    const optA = options.find((o) => o.id === a.optionId);
    const optB = options.find((o) => o.id === b.optionId);
    return (optA?.position ?? 0) - (optB?.position ?? 0);
  });

  const parts: string[] = [];
  for (const sel of sorted) {
    const opt = options.find((o) => o.id === sel.optionId);
    if (!opt) continue;
    const val = opt.values.find((v) => v.id === sel.optionValueId);
    parts.push(val?.value ?? "?");
  }

  return parts.length > 0 ? parts.join(" / ") : variant.title || "Default";
}

function getOptionEntries(
  variant: VariantDetail,
  options: ProductOption[]
): { name: string; value: string }[] {
  const sorted = [...variant.selectedOptions].sort((a, b) => {
    const optA = options.find((o) => o.id === a.optionId);
    const optB = options.find((o) => o.id === b.optionId);
    return (optA?.position ?? 0) - (optB?.position ?? 0);
  });

  return sorted.map((sel) => {
    const opt = options.find((o) => o.id === sel.optionId);
    const val = opt?.values.find((v) => v.id === sel.optionValueId);
    return { name: opt?.name ?? "Option", value: val?.value ?? "?" };
  });
}

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "draft":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "archived":
      return "bg-zinc-100 text-zinc-500 border-zinc-200";
    default:
      return "bg-zinc-100 text-zinc-500 border-zinc-200";
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function VariantDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-64" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant Images Manager Component
// ---------------------------------------------------------------------------

function VariantImagesManager({
  variantId,
  images,
  onImagesChange,
}: {
  variantId: string;
  images: VariantImage[];
  onImagesChange: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingFeaturedId, setSettingFeaturedId] = useState<string | null>(null);

  async function handleImagePicked(value: ImagePickerValue | null) {
    if (!value) return;
    setAdding(true);
    try {
      await apiFetch(`/admin/variants/${variantId}/images`, {
        method: "POST",
        body: JSON.stringify({
          url: value.url,
          altText: value.altText || undefined,
        }),
      });
      toast({ title: "Image added" });
      setShowAddForm(false);
      onImagesChange();
    } catch (e: any) {
      toast({ title: "Failed to add image", description: e.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(imageId: string) {
    setDeletingId(imageId);
    try {
      await apiFetch(`/admin/variants/${variantId}/images/${imageId}`, {
        method: "DELETE",
      });
      toast({ title: "Image removed" });
      onImagesChange();
    } catch (e: any) {
      toast({ title: "Failed to remove image", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetFeatured(imageId: string) {
    setSettingFeaturedId(imageId);
    try {
      await apiFetch(`/admin/variants/${variantId}/images/${imageId}`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: true }),
      });
      toast({ title: "Featured image updated" });
      onImagesChange();
    } catch (e: any) {
      toast({ title: "Failed to update featured image", description: e.message, variant: "destructive" });
    } finally {
      setSettingFeaturedId(null);
    }
  }

  const sorted = [...images].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-3">
      {sorted.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-xl bg-muted/50 p-4 mb-3">
            <ImageIcon className="size-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">No variant images</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Add images specific to this variant
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {sorted.map((img) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border"
            >
              <img
                src={img.url}
                alt={img.altText ?? "Variant image"}
                className="size-full object-cover"
              />
              {img.isFeatured && (
                <div className="absolute top-1 left-1">
                  <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 h-4 gap-0.5">
                    <StarIcon className="size-2.5 fill-current" />
                    Featured
                  </Badge>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                {!img.isFeatured && (
                  <button
                    type="button"
                    onClick={() => handleSetFeatured(img.id)}
                    disabled={settingFeaturedId === img.id}
                    className="rounded-full bg-white/90 p-1.5 hover:bg-white transition-colors"
                    title="Set as featured"
                    aria-label="Set as featured image"
                  >
                    {settingFeaturedId === img.id ? (
                      <Loader2Icon className="size-3.5 animate-spin text-amber-600" />
                    ) : (
                      <StarIcon className="size-3.5 text-amber-600" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={deletingId === img.id}
                  className="rounded-full bg-white/90 p-1.5 hover:bg-white transition-colors"
                  title="Delete image"
                  aria-label="Delete image"
                >
                  {deletingId === img.id ? (
                    <Loader2Icon className="size-3.5 animate-spin text-red-600" />
                  ) : (
                    <Trash2Icon className="size-3.5 text-red-600" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          {adding ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2Icon className="size-6 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Adding image...</p>
            </div>
          ) : (
            <ImagePicker value={null} onChange={handleImagePicked} />
          )}
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={adding}
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAddForm(true)}
        >
          <PlusIcon className="size-3.5 mr-1.5" />
          Add image
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profit Margin Display
// ---------------------------------------------------------------------------

function ProfitDisplay({
  price,
  cost,
}: {
  price: string;
  cost: string;
}) {
  const priceNum = parseFloat(price);
  const costNum = parseFloat(cost);

  if (!price || !cost || isNaN(priceNum) || isNaN(costNum) || priceNum === 0) {
    return null;
  }

  const profit = priceNum - costNum;
  const margin = (profit / priceNum) * 100;
  const isPositive = profit >= 0;

  return (
    <div className="flex items-center gap-4 pt-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Margin</span>
        <span
          className={`text-sm font-semibold tabular-nums ${
            isPositive ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {margin.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Profit</span>
        <span
          className={`text-sm font-semibold tabular-nums ${
            isPositive ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {formatPrice(profit)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VariantDetailPage() {
  const { productId, variantId } = useParams<{
    productId: string;
    variantId: string;
  }>();
  const navigate = useNavigate();

  const [variant, setVariant] = useState<VariantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<VariantForm | null>(null);
  const [originalForm, setOriginalForm] = useState<VariantForm | null>(null);

  // ---- Fetch ----

  const loadVariant = useCallback(async (signal?: AbortSignal) => {
    if (!variantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<VariantDetail>(
        `/admin/variants/${variantId}`,
        { signal }
      );
      setVariant(res);
      const f = buildForm(res);
      setForm(f);
      setOriginalForm(f);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e.message);
        toast({
          title: "Failed to load variant",
          description: e.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [variantId]);

  useEffect(() => {
    const controller = new AbortController();
    loadVariant(controller.signal);
    return () => controller.abort();
  }, [loadVariant]);

  // ---- Dirty check ----

  const isDirty = useMemo(
    () =>
      form !== null &&
      originalForm !== null &&
      JSON.stringify(form) !== JSON.stringify(originalForm),
    [form, originalForm]
  );

  // ---- Save ----

  async function handleSave() {
    if (!variant || !form) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        price: form.price,
        compareAtPrice: form.compareAtPrice || null,
        costPerItem: form.costPerItem || null,
        taxable: form.taxable,
        inventoryTracked: form.inventoryTracked,
        inventoryPolicy: form.inventoryPolicy,
        sku: form.sku || null,
        barcode: form.barcode || null,
        requiresShipping: form.requiresShipping,
        weightValue: form.weightValue || null,
        weightUnit: form.weightUnit || null,
        countryOfOrigin: form.countryOfOrigin || null,
        harmonizedSystemCode: form.harmonizedSystemCode || null,
        featuredImageId: form.featuredImageId,
      };

      // Include inventory quantities if tracked
      if (form.inventoryTracked) {
        body.availableQuantity = parseInt(form.availableQuantity, 10) || 0;
      }

      await apiFetch(`/admin/variants/${variant.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      toast({ title: "Variant saved" });
      await loadVariant();
    } catch (e: any) {
      toast({
        title: "Failed to save variant",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // ---- Discard ----

  function handleDiscard() {
    if (originalForm) {
      setForm(originalForm);
    }
  }

  // ---- Field update helper ----

  function updateField<K extends keyof VariantForm>(
    field: K,
    value: VariantForm[K]
  ) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  // ---- Render states ----

  if (loading) {
    return <VariantDetailSkeleton />;
  }

  if (error || !variant || !form) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate(
              productId
                ? `/catalog/products/${productId}`
                : "/catalog/products"
            )
          }
        >
          <ArrowLeftIcon className="size-4 mr-1" /> Back
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Variant not found</p>
          <p className="text-sm mt-1">
            {error ?? "The requested variant could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  const variantName = getVariantName(variant, variant.product.options);
  const optionEntries = getOptionEntries(variant, variant.product.options);
  const onHand =
    (variant.inventoryItem?.availableQuantity ?? 0) +
    (variant.inventoryItem?.reservedQuantity ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Back to product"
            asChild
          >
            <Link to={`/catalog/products/${variant.productId}`}>
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-0.5">
              <Link to={`/catalog/products/${variant.productId}`} className="hover:text-foreground transition-colors">
                {variant.product.title}
              </Link>
              <span>›</span>
              <span className="text-foreground font-medium">Variant</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight truncate">
              {variantName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={!isDirty}
            onClick={handleDiscard}
          >
            Discard
          </Button>
          <Button size="sm" disabled={!isDirty || saving} onClick={handleSave}>
            {saving && <Loader2Icon className="size-4 mr-1.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Two-column layout                                                */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ============================================================== */}
        {/* LEFT COLUMN                                                    */}
        {/* ============================================================== */}
        <div className="space-y-6">
          {/* ---- Product info (compact) ---- */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-lg bg-muted/60 p-2.5">
                  <PackageIcon className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/catalog/products/${variant.productId}`}
                      className="text-sm font-medium hover:underline underline-offset-2 truncate"
                    >
                      {variant.product.title}
                    </Link>
                    <Badge
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0 h-5 ${statusColor(variant.product.status)}`}
                    >
                      {variant.product.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {variant.product.variantCount} variant
                    {variant.product.variantCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ---- Option values (readonly) ---- */}
          {optionEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Option values
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {optionEntries.map((entry) => (
                  <div key={entry.name}>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                      {entry.name}
                    </Label>
                    <Input
                      value={entry.value}
                      readOnly
                      className="mt-1.5 bg-muted/40 border-dashed"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ---- Pricing ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="price" className="text-xs text-muted-foreground">
                    Price
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {currencySymbol()}
                    </span>
                    <Input
                      id="price"
                      type="text"
                      inputMode="decimal"
                      value={form.price}
                      onChange={(e) => updateField("price", e.target.value)}
                      className="pl-9 tabular-nums"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="compareAtPrice" className="text-xs text-muted-foreground">
                    Compare-at price
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {currencySymbol()}
                    </span>
                    <Input
                      id="compareAtPrice"
                      type="text"
                      inputMode="decimal"
                      value={form.compareAtPrice}
                      onChange={(e) =>
                        updateField("compareAtPrice", e.target.value)
                      }
                      className="pl-9 tabular-nums"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="costPerItem" className="text-xs text-muted-foreground">
                    Cost per item
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {currencySymbol()}
                    </span>
                    <Input
                      id="costPerItem"
                      type="text"
                      inputMode="decimal"
                      value={form.costPerItem}
                      onChange={(e) =>
                        updateField("costPerItem", e.target.value)
                      }
                      className="pl-9 tabular-nums"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <ProfitDisplay price={form.price} cost={form.costPerItem} />

              <Separator />

              <div className="flex items-center gap-3">
                <Switch
                  id="taxable"
                  checked={form.taxable}
                  onCheckedChange={(checked) => updateField("taxable", checked)}
                />
                <Label htmlFor="taxable" className="cursor-pointer text-sm">
                  Charge tax on this variant
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* ---- Inventory ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="inventoryTracked"
                  checked={form.inventoryTracked}
                  onCheckedChange={(checked) =>
                    updateField("inventoryTracked", checked)
                  }
                />
                <Label htmlFor="inventoryTracked" className="cursor-pointer text-sm">
                  Track quantity
                </Label>
              </div>

              {form.inventoryTracked && (
                <>
                  <Separator />

                  {/* Inventory table */}
                  <div className="rounded-lg border">
                    <div className="grid grid-cols-4 gap-px bg-muted text-xs font-medium text-muted-foreground">
                      <div className="bg-muted/50 px-3 py-2 rounded-tl-lg">
                        Location
                      </div>
                      <div className="bg-muted/50 px-3 py-2 text-right">
                        Unavailable
                      </div>
                      <div className="bg-muted/50 px-3 py-2 text-right">
                        Committed
                      </div>
                      <div className="bg-muted/50 px-3 py-2 text-right rounded-tr-lg">
                        Available
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-px text-sm">
                      <div className="px-3 py-2.5 font-medium">Warehouse</div>
                      <div className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        0
                      </div>
                      <div className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {form.reservedQuantity}
                      </div>
                      <div className="px-3 py-2.5 text-right">
                        <Input
                          type="number"
                          value={form.availableQuantity}
                          onChange={(e) =>
                            updateField("availableQuantity", e.target.value)
                          }
                          className="h-7 w-20 ml-auto text-right tabular-nums text-sm"
                        />
                      </div>
                    </div>
                    <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
                      <span>On hand</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {onHand}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* SKU & Barcode */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sku" className="text-xs text-muted-foreground">
                    SKU (Stock Keeping Unit)
                  </Label>
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => updateField("sku", e.target.value)}
                    className="mt-1.5 font-mono text-sm"
                    placeholder="e.g. SHIRT-BLK-M"
                  />
                </div>
                <div>
                  <Label htmlFor="barcode" className="text-xs text-muted-foreground">
                    Barcode (ISBN, UPC, GTIN, etc.)
                  </Label>
                  <Input
                    id="barcode"
                    value={form.barcode}
                    onChange={(e) => updateField("barcode", e.target.value)}
                    className="mt-1.5 font-mono text-sm"
                    placeholder="e.g. 012345678901"
                  />
                </div>
              </div>

              {form.inventoryTracked && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Switch
                      id="inventoryPolicy"
                      checked={form.inventoryPolicy === "continue"}
                      onCheckedChange={(checked) =>
                        updateField(
                          "inventoryPolicy",
                          checked ? "continue" : "deny"
                        )
                      }
                    />
                    <Label
                      htmlFor="inventoryPolicy"
                      className="cursor-pointer text-sm"
                    >
                      Continue selling when out of stock
                    </Label>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ---- Shipping ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="requiresShipping"
                  checked={form.requiresShipping}
                  onCheckedChange={(checked) =>
                    updateField("requiresShipping", checked)
                  }
                />
                <Label htmlFor="requiresShipping" className="cursor-pointer text-sm">
                  This is a physical product
                </Label>
              </div>

              {form.requiresShipping && (
                <>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="weightValue" className="text-xs text-muted-foreground">
                        Weight
                      </Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          id="weightValue"
                          type="text"
                          inputMode="decimal"
                          value={form.weightValue}
                          onChange={(e) =>
                            updateField("weightValue", e.target.value)
                          }
                          placeholder="0.0"
                          className="flex-1 tabular-nums"
                        />
                        <Select
                          value={form.weightUnit}
                          onValueChange={(val) =>
                            updateField("weightUnit", val)
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label
                        htmlFor="countryOfOrigin"
                        className="text-xs text-muted-foreground"
                      >
                        Country of origin
                      </Label>
                      <Input
                        id="countryOfOrigin"
                        value={form.countryOfOrigin}
                        onChange={(e) =>
                          updateField("countryOfOrigin", e.target.value)
                        }
                        className="mt-1.5"
                        placeholder="e.g. US"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="harmonizedSystemCode"
                        className="text-xs text-muted-foreground"
                      >
                        Harmonized System (HS) code
                      </Label>
                      <Input
                        id="harmonizedSystemCode"
                        value={form.harmonizedSystemCode}
                        onChange={(e) =>
                          updateField("harmonizedSystemCode", e.target.value)
                        }
                        className="mt-1.5 font-mono text-sm"
                        placeholder="e.g. 6109.10"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ---- Metafields ---- */}
          <MetafieldsEditor entityType="variants" entityId={variant.id} />
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN (Sidebar)                                         */}
        {/* ============================================================== */}
        <div className="space-y-6">
          {/* ---- Variant Images ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Variant images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VariantImagesManager
                variantId={variant.id}
                images={variant.variantImages ?? []}
                onImagesChange={loadVariant}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
