import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { formatPrice, currencySymbol } from "@/lib/format";
import { brand } from "@/config/brand";
import { toast } from "@/hooks/use-toast";
import { FormField } from "@/components/FormField";
import { MetafieldsEditor } from "@/components/MetafieldsEditor";
import { TagsEditor } from "@/components/TagsEditor";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeftIcon,
  SaveIcon,
  XIcon,
  PlusIcon,
  Trash2Icon,
  ImageIcon,
  PackageIcon,
  GripVerticalIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UploadIcon,
} from "lucide-react";
import { ProductMediaCard } from "./product-form/ProductMediaCard";
import { VariantEditSheet } from "./product-form/VariantEditSheet";
import {
  type VariantDetail,
  type ProductDetail,
  type VendorOption,
  type ProductForm,
  type DefaultVariantForm,
  INITIAL_PRODUCT,
  INITIAL_DEFAULT_VARIANT,
  STATUS_OPTIONS,
  WEIGHT_UNITS,
  INVENTORY_POLICIES,
  slugify,
  toDisplayPrice,
  variantDisplayName,
  groupVariantsByFirstOption,
  buildVariantPayload,
} from "./product-form/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// helpers slugify, toDisplayPrice, variantDisplayName, groupVariantsByFirstOption
// are imported from ./product-form/types

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Product-level form
  const [form, setForm] = useState<ProductForm>(INITIAL_PRODUCT);
  // Default variant form (shown inline when no options exist)
  const [dvForm, setDvForm] = useState<DefaultVariantForm>(INITIAL_DEFAULT_VARIANT);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Product data for edit mode
  const [product, setProduct] = useState<ProductDetail | null>(null);

  // Vendors list for create mode
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  // Options (create mode)
  const [newOptions, setNewOptions] = useState<Array<{ name: string; values: string }>>([]);

  // Options (edit mode)
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValues, setNewOptionValues] = useState("");
  const [addingOption, setAddingOption] = useState(false);

  // Variant edit sheet
  const [editingVariant, setEditingVariant] = useState<VariantDetail | null>(null);

  // Variant table: expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // Auto-generate handle from title
  const [handleTouched, setHandleTouched] = useState(false);

  // Derived: does product have options?
  const hasOptions = isEdit
    ? (product?.options?.length ?? 0) > 0
    : newOptions.some((o) => o.name.trim() && o.values.trim());

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  useEffect(() => {
    const controller = new AbortController();
    if (isEdit) {
      loadProduct(controller.signal);
    } else {
      loadVendors(controller.signal);
    }
    return () => controller.abort();
  }, [id]);

  const loadProduct = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await apiFetch<ProductDetail>(`/admin/products/${id}`, { signal });
      setProduct(res);

      setForm({
        title: res.title ?? "",
        handle: res.handle ?? "",
        description: res.description ?? "",
        status: res.status ?? "draft",
        productType: res.productType ?? "",
        brand: res.brand ?? "",
        vendorId: res.vendorId ?? "",
        seoTitle: res.seoTitle ?? "",
        seoDescription: res.seoDescription ?? "",
        excerpt: res.excerpt ?? "",
      });

      // Populate default variant form from first variant
      const dv = res.variants?.[0];
      if (dv) {
        setDvForm({
          price: toDisplayPrice(dv.price),
          compareAtPrice: toDisplayPrice(dv.compareAtPrice),
          costPerItem: toDisplayPrice(dv.costPerItem),
          taxable: dv.taxable ?? true,
          sku: dv.sku ?? "",
          barcode: dv.barcode ?? "",
          tracked: dv.inventoryTracked ?? true,
          quantity: dv.inventoryQuantity != null ? String(dv.inventoryQuantity) : "",
          inventoryPolicy: dv.inventoryPolicy ?? "deny",
          requiresShipping: dv.requiresShipping ?? true,
          weight: toDisplayPrice(dv.weightValue),
          weightUnit: dv.weightUnit ?? "kg",
          countryOfOrigin: dv.countryOfOrigin ?? "",
          hsCode: dv.harmonizedSystemCode ?? "",
        });
      }
      setHandleTouched(true);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load product", description: e.message, variant: "destructive" });
        navigate("/catalog/products");
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  async function loadVendors(signal?: AbortSignal) {
    setVendorsLoading(true);
    try {
      const res = await apiFetch<{ data: VendorOption[] }>("/admin/vendors?limit=100", { signal });
      setVendors(res.data ?? []);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // non-blocking
      }
    } finally {
      setVendorsLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Field updates
  // -----------------------------------------------------------------------

  function updateField<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function updateDv<K extends keyof DefaultVariantForm>(key: K, value: DefaultVariantForm[K]) {
    setDvForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // Auto-handle generation
  useEffect(() => {
    if (!handleTouched && form.title) {
      setForm((prev) => ({ ...prev, handle: slugify(prev.title) }));
    }
  }, [form.title, handleTouched]);

  // -----------------------------------------------------------------------
  // Options (create mode)
  // -----------------------------------------------------------------------

  function addNewOption() {
    setNewOptions((prev) => [...prev, { name: "", values: "" }]);
  }

  function updateNewOption(index: number, field: "name" | "values", value: string) {
    setNewOptions((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }

  function removeNewOption(index: number) {
    setNewOptions((prev) => prev.filter((_, i) => i !== index));
  }

  // Variant combinations preview
  const variantPreview = useMemo(() => {
    const validOptions = newOptions.filter((o) => o.name.trim() && o.values.trim());
    if (validOptions.length === 0) return [];
    const optionValues = validOptions.map((o) => ({
      name: o.name.trim(),
      values: o.values.split(",").map((v) => v.trim()).filter(Boolean),
    }));
    function cartesian(arrays: string[][]): string[][] {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restCombos = cartesian(rest);
      return first.flatMap((v) => restCombos.map((combo) => [v, ...combo]));
    }
    const combos = cartesian(optionValues.map((o) => o.values));
    return combos.map((combo) => optionValues.map((opt, i) => ({ option: opt.name, value: combo[i] })));
  }, [newOptions]);

  // -----------------------------------------------------------------------
  // Options (edit mode)
  // -----------------------------------------------------------------------

  async function handleAddOption() {
    if (!newOptionName.trim() || !newOptionValues.trim() || !product) return;
    setAddingOption(true);
    try {
      const values = newOptionValues
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => ({ value: v }));
      await apiFetch(`/admin/products/${product.id}/options`, {
        method: "POST",
        body: JSON.stringify({ name: newOptionName.trim(), values }),
      });
      toast({ title: "Option added" });
      setNewOptionName("");
      setNewOptionValues("");
      setShowAddOption(false);
      await loadProduct();
    } catch (e: any) {
      toast({ title: "Failed to add option", description: e.message, variant: "destructive" });
    } finally {
      setAddingOption(false);
    }
  }

  // -----------------------------------------------------------------------
  // Tags (edit mode)
  // -----------------------------------------------------------------------

  async function handleAddTags(tags: string[]) {
    if (!product) return;
    await apiFetch(`/admin/products/${product.id}/tags`, {
      method: "POST",
      body: JSON.stringify({ tags }),
    });
    await loadProduct();
  }

  async function handleRemoveTag(tag: string) {
    if (!product) return;
    await apiFetch(`/admin/products/${product.id}/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    });
    await loadProduct();
  }

  // -----------------------------------------------------------------------
  // Variant table expand/collapse
  // -----------------------------------------------------------------------

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllExpanded() {
    if (allExpanded) {
      setExpandedGroups(new Set());
      setAllExpanded(false);
    } else {
      const groups = groupVariantsByFirstOption(product?.variants ?? []);
      setExpandedGroups(new Set(groups.keys()));
      setAllExpanded(true);
    }
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  function validate(): boolean {
    const errs: Partial<Record<string, string>> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.handle.trim()) errs.handle = "Handle is required";
    if (!isEdit && !form.vendorId) errs.vendorId = "Vendor is required";
    if (!hasOptions && dvForm.price.trim()) {
      const p = parseFloat(dvForm.price);
      if (isNaN(p) || p < 0) errs.price = "Must be a valid positive number";
    }
    if (!hasOptions && dvForm.compareAtPrice.trim()) {
      const p = parseFloat(dvForm.compareAtPrice);
      if (isNaN(p) || p < 0) errs.compareAtPrice = "Must be a valid positive number";
    }
    if (form.seoTitle.length > 70) errs.seoTitle = "SEO title should be under 70 characters";
    if (form.seoDescription.length > 320) errs.seoDescription = "SEO description should be under 320 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit) {
        // Update product (product-level fields only)
        const productBody: Record<string, unknown> = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          seoTitle: form.seoTitle.trim() || null,
          seoDescription: form.seoDescription.trim() || null,
          productType: form.productType.trim() || null,
          brand: form.brand.trim() || null,
          excerpt: form.excerpt.trim() || null,
        };
        await apiFetch(`/admin/products/${id}`, {
          method: "PATCH",
          body: JSON.stringify(productBody),
        });

        // If simple product (no options), update default variant inline
        const isSimple = !product?.options || product.options.length === 0;
        if (isSimple) {
          const defaultVariant = product?.variants?.[0];
          if (defaultVariant) {
            await apiFetch(`/admin/variants/${defaultVariant.id}`, {
              method: "PATCH",
              body: JSON.stringify(buildVariantPayload(dvForm)),
            });
          }
        }

        toast({ title: "Product updated" });
        await loadProduct();
      } else {
        // Create product (product-level fields only)
        const body: Record<string, unknown> = {
          vendorId: form.vendorId,
          title: form.title.trim(),
          handle: form.handle.trim(),
          description: form.description.trim() || null,
          status: form.status,
          productType: form.productType.trim() || null,
          brand: form.brand.trim() || null,
          excerpt: form.excerpt.trim() || null,
          seoTitle: form.seoTitle.trim() || null,
          seoDescription: form.seoDescription.trim() || null,
        };

        const created = await apiFetch<{ id: string }>("/admin/products", {
          method: "POST",
          body: JSON.stringify(body),
        });
        const productId = created.id;

        // Create options if defined
        for (const opt of newOptions) {
          if (!opt.name.trim() || !opt.values.trim()) continue;
          const values = opt.values.split(",").map((v) => v.trim()).filter(Boolean).map((v) => ({ value: v }));
          try {
            await apiFetch(`/admin/products/${productId}/options`, {
              method: "POST",
              body: JSON.stringify({ name: opt.name.trim(), values }),
            });
          } catch (e: any) {
            toast({ title: `Failed to create option "${opt.name}"`, description: e.message, variant: "destructive" });
          }
        }

        // Update default variant with pricing/inventory/shipping
        try {
          const prodDetail = await apiFetch<ProductDetail>(`/admin/products/${productId}`);
          const defaultVariant = prodDetail.variants?.[0];
          if (defaultVariant) {
            await apiFetch(`/admin/variants/${defaultVariant.id}`, {
              method: "PATCH",
              body: JSON.stringify(buildVariantPayload(dvForm)),
            });
          }
        } catch {
          // Non-blocking
        }

        toast({ title: "Product created" });
        navigate(`/catalog/products/${productId}`);
      }
    } catch (e: any) {
      toast({ title: "Failed to save product", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const pageTitle = isEdit ? `Edit: ${product?.title ?? "Product"}` : "Add product";
  const seoPreviewTitle = form.seoTitle || form.title || "Page title";
  const seoPreviewHandle = form.handle || "page-handle";
  const seoPreviewDesc = form.seoDescription || form.excerpt || "No description provided.";

  // For multi-variant edit mode: group variants by first option value
  const variantGroups = useMemo(() => {
    if (!isEdit || !product?.variants || !product.options || product.options.length === 0) return null;
    return groupVariantsByFirstOption(product.variants);
  }, [isEdit, product]);

  const totalInventory = useMemo(() => {
    if (!product?.variants) return 0;
    return product.variants.reduce((sum, v) => sum + (v.inventoryQuantity ?? 0), 0);
  }, [product?.variants]);

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Back to products"
            onClick={() => navigate(isEdit ? `/catalog/products/${id}` : "/catalog/products")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/catalog/products")}>
            <XIcon className="size-4 mr-1" />
            Discard
          </Button>
          <Button type="submit" form="product-form" disabled={saving}>
            <SaveIcon className="size-4 mr-1" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ================================================================ */}
        {/* MAIN COLUMN                                                      */}
        {/* ================================================================ */}
        <div className="lg:col-span-2 space-y-6">
          {/* ---- 1. Title & Description ---- */}
          <Card>
            <CardHeader>
              <CardTitle>Title</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Title" htmlFor="title" error={errors.title} required>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder={brand.placeholders.productTitle}
                />
              </FormField>
              <div>
                <Label className="mb-1.5 block">Description</Label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => updateField("description", html)}
                  placeholder="Write a product description..."
                />
              </div>
            </CardContent>
          </Card>

          {/* ---- 2. Media (edit mode) ---- */}
          {isEdit && product && (
            <ProductMediaCard
              productId={product.id}
              images={product.images ?? []}
              onReload={loadProduct}
            />
          )}

          {/* Media placeholder (create mode) */}
          {!isEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <UploadIcon className="size-8 mb-2" />
                  <p className="text-sm">Images can be uploaded after the product is created.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- 3. Variants Card ---- */}
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* =========================================================== */}
              {/* SIMPLE PRODUCT: inline pricing/inventory/shipping            */}
              {/* Shown when product has NO options                            */}
              {/* =========================================================== */}
              {!hasOptions && (
                <>
                  {/* -- Pricing -- */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Pricing</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField label="Price" htmlFor="dv-price" error={errors.price}>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol()}</span>
                          <Input
                            id="dv-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={dvForm.price}
                            onChange={(e) => updateDv("price", e.target.value)}
                            placeholder="0.00"
                            className="pl-9"
                          />
                        </div>
                      </FormField>
                      <FormField label="Compare-at price" htmlFor="dv-compare" error={errors.compareAtPrice}>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol()}</span>
                          <Input
                            id="dv-compare"
                            type="number"
                            min="0"
                            step="0.01"
                            value={dvForm.compareAtPrice}
                            onChange={(e) => updateDv("compareAtPrice", e.target.value)}
                            placeholder="0.00"
                            className="pl-9"
                          />
                        </div>
                      </FormField>
                      <FormField label="Cost per item" htmlFor="dv-cost">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol()}</span>
                          <Input
                            id="dv-cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={dvForm.costPerItem}
                            onChange={(e) => updateDv("costPerItem", e.target.value)}
                            placeholder="0.00"
                            className="pl-9"
                          />
                        </div>
                      </FormField>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="dv-taxable"
                        checked={dvForm.taxable}
                        onCheckedChange={(v) => updateDv("taxable", v)}
                      />
                      <Label htmlFor="dv-taxable" className="text-sm">Charge tax</Label>
                    </div>
                  </div>

                  <Separator />

                  {/* -- Inventory -- */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Inventory</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="SKU (Stock Keeping Unit)" htmlFor="dv-sku">
                        <Input
                          id="dv-sku"
                          value={dvForm.sku}
                          onChange={(e) => updateDv("sku", e.target.value)}
                          placeholder="SKU-001"
                        />
                      </FormField>
                      <FormField label="Barcode (ISBN, UPC, GTIN, etc.)" htmlFor="dv-barcode">
                        <Input
                          id="dv-barcode"
                          value={dvForm.barcode}
                          onChange={(e) => updateDv("barcode", e.target.value)}
                          placeholder="123456789012"
                        />
                      </FormField>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="dv-tracked" className="text-sm font-medium">Track quantity</Label>
                        <p className="text-xs text-muted-foreground">Track inventory levels for this product.</p>
                      </div>
                      <Switch id="dv-tracked" checked={dvForm.tracked} onCheckedChange={(v) => updateDv("tracked", v)} />
                    </div>
                    {dvForm.tracked && (
                      <FormField label="Quantity" htmlFor="dv-quantity">
                        <Input
                          id="dv-quantity"
                          type="number"
                          min="0"
                          step="1"
                          value={dvForm.quantity}
                          onChange={(e) => updateDv("quantity", e.target.value)}
                          placeholder="0"
                          className="w-32"
                        />
                      </FormField>
                    )}
                    <FormField label="Inventory policy" htmlFor="dv-inv-policy">
                      <Select value={dvForm.inventoryPolicy} onValueChange={(v) => updateDv("inventoryPolicy", v)}>
                        <SelectTrigger id="dv-inv-policy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVENTORY_POLICIES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <Separator />

                  {/* -- Shipping -- */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Shipping</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="dv-shipping" className="text-sm font-medium">Physical product</Label>
                        <p className="text-xs text-muted-foreground">This product requires shipping.</p>
                      </div>
                      <Switch
                        id="dv-shipping"
                        checked={dvForm.requiresShipping}
                        onCheckedChange={(v) => updateDv("requiresShipping", v)}
                      />
                    </div>
                    {dvForm.requiresShipping && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Weight" htmlFor="dv-weight">
                            <div className="flex gap-2">
                              <Input
                                id="dv-weight"
                                type="number"
                                min="0"
                                step="0.001"
                                value={dvForm.weight}
                                onChange={(e) => updateDv("weight", e.target.value)}
                                placeholder="0.0"
                                className="flex-1"
                              />
                              <Select value={dvForm.weightUnit} onValueChange={(v) => updateDv("weightUnit", v)}>
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {WEIGHT_UNITS.map((u) => (
                                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </FormField>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Country of origin" htmlFor="dv-country">
                            <Input
                              id="dv-country"
                              value={dvForm.countryOfOrigin}
                              onChange={(e) => updateDv("countryOfOrigin", e.target.value)}
                              placeholder={brand.countryCode}
                              maxLength={2}
                            />
                          </FormField>
                          <FormField label="HS (Harmonized System) code" htmlFor="dv-hs">
                            <Input
                              id="dv-hs"
                              value={dvForm.hsCode}
                              onChange={(e) => updateDv("hsCode", e.target.value)}
                              placeholder="6109.10"
                            />
                          </FormField>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* =========================================================== */}
              {/* OPTIONS & VARIANT TABLE (multi-variant)                      */}
              {/* =========================================================== */}

              {/* Options display (edit mode with existing options) */}
              {isEdit && product?.options && product.options.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Options</p>
                  {product.options.map((opt) => (
                    <div key={opt.id} className="flex items-start gap-3">
                      <span className="text-sm font-medium min-w-[80px] pt-0.5">{opt.name}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {opt.values.map((v) => (
                          <Badge key={v.id} variant="secondary" className="text-xs">{v.value}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add option form (edit mode) */}
              {isEdit && (
                <>
                  {showAddOption ? (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                      <p className="text-sm font-medium">New option</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField label="Option name" htmlFor="new-option-name">
                          <Input
                            id="new-option-name"
                            value={newOptionName}
                            onChange={(e) => setNewOptionName(e.target.value)}
                            placeholder="Size, Color, Material..."
                          />
                        </FormField>
                        <FormField label="Values (comma-separated)" htmlFor="new-option-values">
                          <Input
                            id="new-option-values"
                            value={newOptionValues}
                            onChange={(e) => setNewOptionValues(e.target.value)}
                            placeholder="Small, Medium, Large"
                          />
                        </FormField>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddOption}
                          disabled={!newOptionName.trim() || !newOptionValues.trim() || addingOption}
                        >
                          {addingOption ? "Adding..." : "Add option"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setShowAddOption(false); setNewOptionName(""); setNewOptionValues(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddOption(true)}>
                      <PlusIcon className="size-4 mr-1" />
                      Add another option
                    </Button>
                  )}
                </>
              )}

              {/* Options builder (create mode) */}
              {!isEdit && (
                <div className="space-y-4">
                  {hasOptions && <Separator />}
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                      <GripVerticalIcon className="size-4 mt-2 text-muted-foreground shrink-0" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                        <FormField label="Option name" htmlFor={`opt-name-${idx}`}>
                          <Input
                            id={`opt-name-${idx}`}
                            value={opt.name}
                            onChange={(e) => updateNewOption(idx, "name", e.target.value)}
                            placeholder="Size, Color, Material..."
                          />
                        </FormField>
                        <FormField label="Values (comma-separated)" htmlFor={`opt-values-${idx}`}>
                          <Input
                            id={`opt-values-${idx}`}
                            value={opt.values}
                            onChange={(e) => updateNewOption(idx, "values", e.target.value)}
                            placeholder="Small, Medium, Large"
                          />
                        </FormField>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 mt-6 shrink-0"
                        aria-label="Remove option"
                        onClick={() => removeNewOption(idx)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addNewOption}>
                    <PlusIcon className="size-4 mr-1" />
                    {newOptions.length === 0 ? "Add options like Size or Color" : "Add another option"}
                  </Button>

                  {/* Variant preview (create mode) */}
                  {variantPreview.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          {variantPreview.length} variant{variantPreview.length !== 1 ? "s" : ""} will be created
                        </p>
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {variantPreview[0]?.map((col) => (
                                  <TableHead key={col.option}>{col.option}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {variantPreview.slice(0, 20).map((combo, i) => (
                                <TableRow key={i}>
                                  {combo.map((cell) => (
                                    <TableCell key={cell.option}>
                                      <Badge variant="outline" className="text-xs">{cell.value}</Badge>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                              {variantPreview.length > 20 && (
                                <TableRow>
                                  <TableCell colSpan={variantPreview[0]?.length ?? 1} className="text-center text-sm text-muted-foreground">
                                    ...and {variantPreview.length - 20} more variants
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Multi-variant table (edit mode with options) */}
              {isEdit && variantGroups && variantGroups.size > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Variants</span>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={toggleAllExpanded}
                        >
                          {allExpanded ? "Collapse all" : "Expand all"}
                        </button>
                      </div>
                      <div className="flex items-center gap-6 text-xs font-medium text-muted-foreground">
                        <span className="w-24 text-right">Price</span>
                        <span className="w-20 text-right">Available</span>
                      </div>
                    </div>

                    {/* Grouped rows */}
                    <div className="rounded-md border overflow-hidden divide-y">
                      {Array.from(variantGroups.entries()).map(([groupKey, variants]) => {
                        const isExpanded = expandedGroups.has(groupKey);
                        const groupHasMultiple = product!.options!.length > 1;
                        const priceRange = variants.length > 1
                          ? (() => {
                              const prices = variants.map((v) => parseFloat(String(v.price))).filter((p) => !isNaN(p));
                              const min = Math.min(...prices);
                              const max = Math.max(...prices);
                              return min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`;
                            })()
                          : formatPrice(toDisplayPrice(variants[0].price));
                        const groupInventory = variants.reduce((s, v) => s + (v.inventoryQuantity ?? 0), 0);

                        if (!groupHasMultiple) {
                          // Single option: show flat variant list
                          return variants.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => setEditingVariant(v)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{variantDisplayName(v)}</span>
                              </div>
                              <div className="flex items-center gap-6">
                                <span className="w-24 text-right text-sm font-mono">{formatPrice(toDisplayPrice(v.price))}</span>
                                <span className="w-20 text-right text-sm">{v.inventoryQuantity ?? "--"}</span>
                                <PencilIcon className="size-3.5 text-muted-foreground" />
                              </div>
                            </div>
                          ));
                        }

                        return (
                          <div key={groupKey}>
                            {/* Group header */}
                            <div
                              className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => toggleGroup(groupKey)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                                )}
                                <span className="text-sm font-medium">{groupKey}</span>
                              </div>
                              <div className="flex items-center gap-6">
                                <span className="w-24 text-right text-sm font-mono text-muted-foreground">{priceRange}</span>
                                <span className="w-20 text-right text-sm text-muted-foreground">{groupInventory}</span>
                                <span className="w-3.5" />
                              </div>
                            </div>
                            {/* Expanded children */}
                            {isExpanded &&
                              variants.map((v) => (
                                <div
                                  key={v.id}
                                  className="flex items-center justify-between pl-9 pr-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors border-t border-dashed"
                                  onClick={() => setEditingVariant(v)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {v.selectedOptions
                                        ?.slice(1)
                                        .map((o) => o.value ?? o.optionValueId)
                                        .join(" / ") || variantDisplayName(v)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <span className="w-24 text-right text-sm font-mono">{formatPrice(toDisplayPrice(v.price))}</span>
                                    <span className="w-20 text-right text-sm">{v.inventoryQuantity ?? "--"}</span>
                                    <PencilIcon className="size-3.5 text-muted-foreground" />
                                  </div>
                                </div>
                              ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* Total inventory */}
                    <p className="text-xs text-muted-foreground pt-1">
                      Total inventory: {totalInventory} available at {product?.variants?.length ?? 0} variant
                      {(product?.variants?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </>
              )}

              {/* Empty state when no options and no variants (edit mode) */}
              {isEdit && (!product?.options || product.options.length === 0) && (!product?.variants || product.variants.length <= 1) && !hasOptions && (
                <div className="pt-2">
                  <Separator />
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <PackageIcon className="size-6 mx-auto mb-1.5 opacity-50" />
                    <p>This is a simple product with one default variant.</p>
                    <p className="text-xs">Add options above to create multiple variants.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---- 4. Metafields (edit mode) ---- */}
          {isEdit && product && (
            <MetafieldsEditor entityType="products" entityId={product.id} />
          )}
        </div>

        {/* ================================================================ */}
        {/* SIDEBAR                                                          */}
        {/* ================================================================ */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-4 lg:self-start">
          {/* ---- 1. Status ---- */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* ---- 2. Product organization ---- */}
          <Card>
            <CardHeader>
              <CardTitle>Product organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Product type" htmlFor="productType">
                <Input
                  id="productType"
                  value={form.productType}
                  onChange={(e) => updateField("productType", e.target.value)}
                  placeholder={brand.placeholders.productType}
                />
              </FormField>

              <FormField label="Brand" htmlFor="brand">
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(e) => updateField("brand", e.target.value)}
                  placeholder={brand.placeholders.brand}
                />
              </FormField>

              {/* Vendor */}
              {!isEdit ? (
                <FormField label="Vendor" htmlFor="vendorId" required error={errors.vendorId}>
                  <Select value={form.vendorId} onValueChange={(v) => updateField("vendorId", v)}>
                    <SelectTrigger id="vendorId">
                      <SelectValue placeholder={vendorsLoading ? "Loading..." : "Select a vendor"} />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : (
                <div className="grid gap-1.5">
                  <Label className="text-sm">Vendor</Label>
                  {product?.vendor ? (
                    <Link to={`/vendors/${product.vendor.id}`} className="text-sm text-primary hover:underline">
                      {product.vendor.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">{product?.vendorId ?? "--"}</span>
                  )}
                </div>
              )}

              {/* Collections */}
              {isEdit && product?.collections && product.collections.length > 0 && (
                <div className="grid gap-1.5">
                  <Label className="text-sm">Collections</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {product.collections.map((col) => (
                      <Link key={col.id} to={`/catalog/collections/${col.id}`}>
                        <Badge variant="outline" className="text-xs hover:bg-accent cursor-pointer">
                          {col.title}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {isEdit && product && (
                <div className="grid gap-1.5">
                  <Label className="text-sm">Tags</Label>
                  <TagsEditor
                    tags={product.tags ?? []}
                    onAdd={handleAddTags}
                    onRemove={handleRemoveTag}
                    placeholder="Add product tags"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---- 3. SEO ---- */}
          <Card>
            <CardHeader>
              <CardTitle>Search engine listing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Handle" htmlFor="handle" error={errors.handle} required>
                <Input
                  id="handle"
                  value={form.handle}
                  onChange={(e) => { setHandleTouched(true); updateField("handle", e.target.value); }}
                  placeholder={brand.placeholders.productHandle}
                  readOnly={isEdit}
                  className={isEdit ? "bg-muted cursor-not-allowed" : ""}
                />
                {!isEdit && (
                  <p className="text-xs text-muted-foreground">Auto-generated from title. Lowercase with dashes.</p>
                )}
              </FormField>

              <FormField label="SEO title" htmlFor="seoTitle" error={errors.seoTitle}>
                <Input
                  id="seoTitle"
                  value={form.seoTitle}
                  onChange={(e) => updateField("seoTitle", e.target.value)}
                  placeholder={form.title || "Page title"}
                  maxLength={70}
                />
                <div className="flex justify-end">
                  <span className={`text-xs ${form.seoTitle.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                    {form.seoTitle.length}/70
                  </span>
                </div>
              </FormField>

              <FormField label="SEO description" htmlFor="seoDescription" error={errors.seoDescription}>
                <Textarea
                  id="seoDescription"
                  value={form.seoDescription}
                  onChange={(e) => updateField("seoDescription", e.target.value)}
                  placeholder="Brief description for search engines..."
                  rows={3}
                  maxLength={320}
                />
                <div className="flex justify-end">
                  <span className={`text-xs ${form.seoDescription.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                    {form.seoDescription.length}/320
                  </span>
                </div>
              </FormField>

              {/* Search engine preview */}
              <div className="rounded-lg border p-4 bg-muted/30 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Search engine preview</p>
                <p className="text-sm text-primary font-medium leading-tight truncate">{seoPreviewTitle}</p>
                <p className="text-xs text-green-700 dark:text-green-500 truncate">
                  /products/{seoPreviewHandle}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">{seoPreviewDesc}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* ================================================================ */}
      {/* VARIANT EDIT SHEET                                                */}
      {/* ================================================================ */}
      <VariantEditSheet
        variant={editingVariant}
        onClose={() => setEditingVariant(null)}
        onSaved={() => { setEditingVariant(null); loadProduct(); }}
      />
    </div>
  );
}
