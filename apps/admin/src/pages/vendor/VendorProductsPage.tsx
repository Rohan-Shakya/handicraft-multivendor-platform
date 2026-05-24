import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Product, PaginatedResponse, ProductStatus, ProductOption, Variant } from "@repo/types";

/** Extra columns the list endpoint returns alongside the bare Product type. */
type ProductRow = Product & {
  featuredImageUrl?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  totalInventory?: number | null;
  currencyCode?: string | null;
};

function formatPriceRange(p: ProductRow): string {
  const currency = p.currencyCode ?? "NPR";
  if (p.priceMin == null && p.priceMax == null) return "—";
  if (p.priceMin === p.priceMax) return formatPrice((p.priceMin ?? 0) / 100, currency);
  return `${formatPrice((p.priceMin ?? 0) / 100, currency)} – ${formatPrice((p.priceMax ?? 0) / 100, currency)}`;
}
import { apiFetch, getAccessToken } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Package, MoreHorizontalIcon, SearchIcon, PlusIcon, Trash2Icon, ImageIcon, DownloadIcon, UploadIcon, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImagePicker, type ImagePickerValue } from "@/components/ImagePicker";

const LIMIT = 20;
const STATUS_OPTIONS: ProductStatus[] = ["draft", "active", "archived"];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProductFormData {
  title: string;
  handle: string;
  description: string;
  status: ProductStatus;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY_FORM: ProductFormData = {
  title: "", handle: "", description: "", status: "draft", seoTitle: "", seoDescription: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Option form ─────────────────────────────────────────────────────────────

interface OptionFormData { name: string; values: string[] }

export function OptionsTab({ productId }: { productId: string }) {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<OptionFormData>({ name: "", values: [""] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await apiFetch<ProductOption[]>(`/vendor/products/${productId}/options`, { signal });
      setOptions(data);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function addValueField() {
    setForm((f) => ({ ...f, values: [...f.values, ""] }));
  }

  function setValueAt(idx: number, val: string) {
    setForm((f) => {
      const values = [...f.values];
      values[idx] = val;
      return { ...f, values };
    });
  }

  function removeValueAt(idx: number) {
    setForm((f) => ({ ...f, values: f.values.filter((_, i) => i !== idx) }));
  }

  async function handleAddOption() {
    const vals = form.values.map((v) => v.trim()).filter(Boolean);
    if (!form.name.trim() || vals.length === 0) {
      toast({ title: "Option name and at least one value required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/vendor/products/${productId}/options`, {
        method: "POST",
        body: JSON.stringify({ name: form.name.trim(), values: vals.map((value) => ({ value })) }),
      });
      toast({ title: "Option added" });
      setForm({ name: "", values: [""] });
      load();
    } catch (e: any) {
      toast({ title: "Failed to add option", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing options */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No options yet. Options let customers choose variants (e.g. Color, Size).
        </p>
      ) : (
        <div className="space-y-3">
          {options.map((opt) => (
            <div key={opt.id} className="rounded-lg border p-4">
              <p className="text-sm font-semibold mb-2">{opt.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {opt.values.map((v) => (
                  <Badge key={v.id} variant="secondary">{v.value}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Add option form */}
      <div className="space-y-4">
        <p className="text-sm font-medium">Add new option</p>
        <FormField label="Option name" htmlFor="opt-name">
          <Input
            id="opt-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Color, Size, Material"
          />
        </FormField>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Values</Label>
          {form.values.map((v, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={v}
                onChange={(e) => setValueAt(idx, e.target.value)}
                placeholder={`Value ${idx + 1}`}
                className="flex-1"
              />
              {form.values.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Remove value"
                  onClick={() => removeValueAt(idx)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addValueField}>
            <PlusIcon className="size-3.5" /> Add Value
          </Button>
        </div>

        <Button onClick={handleAddOption} disabled={saving} className="w-full">
          {saving ? "Adding…" : "Add Option"}
        </Button>
      </div>
    </div>
  );
}

// ─── Variants tab ─────────────────────────────────────────────────────────────

interface VariantFormData {
  sku: string;
  price: string;
  compareAtPrice: string;
  inventoryQuantity: string;
}

const EMPTY_VARIANT: VariantFormData = { sku: "", price: "", compareAtPrice: "", inventoryQuantity: "0" };

export function VariantsTab({ productId }: { productId: string }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<VariantFormData>(EMPTY_VARIANT);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await apiFetch<Variant[]>(`/vendor/products/${productId}/variants`, { signal });
      setVariants(data);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const f = (field: keyof VariantFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleAddVariant() {
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) {
      toast({ title: "A valid price is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/vendor/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          sku: form.sku || undefined,
          price,
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
          inventoryQuantity: parseInt(form.inventoryQuantity) || 0,
          selectedOptions: [],
        }),
      });
      toast({ title: "Variant added" });
      setForm(EMPTY_VARIANT);
      load();
    } catch (e: any) {
      toast({ title: "Failed to add variant", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(variant: Variant) {
    const newStatus = variant.status === "active" ? "inactive" : "active";
    setUpdatingId(variant.id);
    try {
      await apiFetch(`/vendor/variants/${variant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setVariants((prev) => prev.map((v) => v.id === variant.id ? { ...v, status: newStatus } : v));
    } catch (e: any) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleInventoryUpdate(variant: Variant, qty: number) {
    try {
      await apiFetch(`/vendor/variants/${variant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ inventoryQuantity: qty }),
      });
      setVariants((prev) => prev.map((v) => v.id === variant.id ? { ...v, inventoryQuantity: qty } : v));
      toast({ title: "Inventory updated" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing variants */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : variants.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No variants yet. Each variant represents a purchasable version of your product.
        </p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Stock</TableHead>
                <TableHead className="font-semibold">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {v.sku ?? <span className="italic">—</span>}
                  </TableCell>
                  <TableCell className="font-semibold">{formatPrice(Number(v.price))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        defaultValue={v.inventoryQuantity}
                        className="h-7 w-20 text-sm"
                        onBlur={(e) => {
                          const qty = parseInt(e.target.value);
                          if (!isNaN(qty) && qty !== v.inventoryQuantity) {
                            handleInventoryUpdate(v, qty);
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">units</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={v.status === "active"}
                      disabled={updatingId === v.id}
                      onCheckedChange={() => handleToggleStatus(v)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Separator />

      {/* Add variant */}
      <div className="space-y-4">
        <p className="text-sm font-medium">Add variant</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="SKU" htmlFor="var-sku">
            <Input id="var-sku" value={form.sku} onChange={f("sku")} placeholder="SKU-001" />
          </FormField>
          <FormField label="Price *" htmlFor="var-price">
            <Input id="var-price" type="number" min={0} step={0.01} value={form.price} onChange={f("price")} placeholder="29.99" />
          </FormField>
          <FormField label="Compare-at Price" htmlFor="var-cmp">
            <Input id="var-cmp" type="number" min={0} step={0.01} value={form.compareAtPrice} onChange={f("compareAtPrice")} placeholder="39.99" />
          </FormField>
          <FormField label="Stock Quantity" htmlFor="var-inv">
            <Input id="var-inv" type="number" min={0} value={form.inventoryQuantity} onChange={f("inventoryQuantity")} placeholder="100" />
          </FormField>
        </div>
        <Button onClick={handleAddVariant} disabled={saving} className="w-full">
          {saving ? "Adding…" : "Add Variant"}
        </Button>
      </div>
    </div>
  );
}

// ─── Images tab ───────────────────────────────────────────────────────────────

interface ImageRow { id: string; url: string; altText: string | null; isFeatured: boolean }

export function ImagesTab({ productId }: { productId: string }) {
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerValue, setPickerValue] = useState<ImagePickerValue | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await apiFetch<ImageRow[]>(`/vendor/products/${productId}/images`, { signal });
      setImages(data);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function handleAddImage() {
    if (!pickerValue?.url) {
      toast({ title: "Please upload or select an image first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/vendor/products/${productId}/images`, {
        method: "POST",
        body: JSON.stringify({ url: pickerValue.url, altText: pickerValue.altText || undefined, isFeatured }),
      });
      toast({ title: "Image added" });
      setPickerValue(null);
      setIsFeatured(false);
      load();
    } catch (e: any) {
      toast({ title: "Failed to add image", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(imageId: string) {
    try {
      await apiFetch(`/vendor/products/${productId}/images/${imageId}`, { method: "DELETE" });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast({ title: "Image removed" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ImageIcon className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No images yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
              <img
                src={img.url}
                alt={img.altText ?? ""}
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {img.isFeatured && (
                <div className="absolute top-1.5 left-1.5">
                  <Badge className="text-[10px] py-0">Featured</Badge>
                </div>
              )}
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-1.5 right-1.5 hidden group-hover:flex size-7 items-center justify-center rounded-md bg-destructive/90 text-white transition-all"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-medium">Add image</p>
        <ImagePicker value={pickerValue} onChange={setPickerValue} />
        <div className="flex items-center gap-2">
          <Switch id="img-featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
          <Label htmlFor="img-featured" className="text-sm cursor-pointer">Set as featured image</Label>
        </div>
        <Button onClick={handleAddImage} disabled={saving || !pickerValue} className="w-full">
          {saving ? "Adding…" : "Add Image"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VendorProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");

  // Create/Edit sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Import / export
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importCsvText, setImportCsvText] = useState("");
  const [importResult, setImportResult] = useState<{
    total: number;
    created: number;
    skipped: number;
    failed: number;
    results: Array<{ row: number; handle?: string; ok: boolean; message?: string }>;
  } | null>(null);

  async function handleExport() {
    try {
      const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:4000") as string;
      const token = getAccessToken();
      const res = await fetch(`${apiUrl}/vendor/products/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Export failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Products exported", description: "CSV saved to your Downloads folder." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast({ title: "Export failed", description: message, variant: "destructive" });
    }
  }

  async function handleDownloadTemplate() {
    // Template is unauthenticated — just navigate to it; the browser will save it.
    const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:4000") as string;
    const a = document.createElement("a");
    a.href = `${apiUrl}/vendor/products/import-template`;
    a.download = "products-template.csv";
    a.click();
  }

  function onPickFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setImportCsvText(String(reader.result ?? ""));
      setImportResult(null);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importCsvText.trim()) {
      toast({ title: "Choose a CSV file first", variant: "destructive" });
      return;
    }
    setImportBusy(true);
    setImportResult(null);
    try {
      const result = await apiFetch<{
        total: number; created: number; skipped: number; failed: number;
        results: Array<{ row: number; handle?: string; ok: boolean; message?: string }>;
      }>("/vendor/products/import", {
        method: "POST",
        body: JSON.stringify({ csv: importCsvText }),
      });
      setImportResult(result);
      if (result.created > 0) {
        toast({
          title: `Imported ${result.created} product${result.created === 1 ? "" : "s"}`,
          description:
            result.failed > 0
              ? `${result.failed} row${result.failed === 1 ? "" : "s"} failed — see details below.`
              : result.skipped > 0
                ? `${result.skipped} skipped (duplicate handles).`
                : undefined,
        });
        await load(1);
      } else if (result.failed > 0) {
        toast({
          title: "Import had errors",
          description: `${result.failed} row${result.failed === 1 ? "" : "s"} failed.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Nothing to import", description: `${result.skipped} skipped (duplicates).` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      toast({ title: "Import failed", description: message, variant: "destructive" });
    } finally {
      setImportBusy(false);
    }
  }

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await apiFetch<PaginatedResponse<Product>>(`/vendor/products?${params}`, { signal });
      setProducts(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load products", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(page, controller.signal);
    return () => controller.abort();
  }, [page, statusFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(1);
  }

  function openCreate() {
    navigate("/vendor/products/new");
  }

  function openEdit(product: Product) {
    navigate(`/vendor/products/${product.id}`);
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      handle: editing ? f.handle : slugify(title),
    }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.handle.trim()) {
      toast({ title: "Title and handle are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let saved: Product;
      if (editing) {
        saved = await apiFetch<Product>(`/vendor/products/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: form.title,
            description: form.description || null,
            status: form.status,
            seoTitle: form.seoTitle || null,
            seoDescription: form.seoDescription || null,
          }),
        });
        toast({ title: "Product updated" });
        setEditing(saved);
      } else {
        saved = await apiFetch<Product>("/vendor/products", {
          method: "POST",
          body: JSON.stringify({
            title: form.title,
            handle: form.handle,
            description: form.description || undefined,
            seoTitle: form.seoTitle || undefined,
            seoDescription: form.seoDescription || undefined,
          }),
        });
        toast({ title: "Product created — now add options, variants, and images" });
        setEditing(saved);
        setActiveTab("options");
      }
      load(page);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(product: Product) {
    try {
      await apiFetch(`/vendor/products/${product.id}`, { method: "DELETE" });
      toast({ title: "Product archived" });
      load(page);
    } catch (e: any) {
      toast({ title: "Failed to archive", description: e.message, variant: "destructive" });
    }
  }

  async function handleQuickStatus(product: Product, status: ProductStatus) {
    try {
      await apiFetch(`/vendor/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: `Set to ${status}` });
      load(page);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog."
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={loading || total === 0}
              title="Download all your products as CSV"
            >
              <DownloadIcon className="size-4" /> Export
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setImportCsvText("");
                setImportResult(null);
                setImportOpen(true);
              }}
            >
              <UploadIcon className="size-4" /> Import
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" /> New Product
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search products"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as ProductStatus | "all"); setPage(1); }}
        >
          <SelectTrigger className="w-40" aria-label="Filter by product status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Create your first product to start selling."
            action={<Button onClick={openCreate}><PlusIcon className="size-4" /> New Product</Button>}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Price</TableHead>
                  <TableHead className="font-semibold text-right">Inventory</TableHead>
                  <TableHead className="font-semibold">Updated</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const row = p as ProductRow;
                  const priceLabel = formatPriceRange(row);
                  const inv = row.totalInventory ?? 0;
                  return (
                  <TableRow
                    key={p.id}
                    className="group cursor-pointer"
                    onClick={() => openEdit(p)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {row.featuredImageUrl ? (
                          <img
                            src={row.featuredImageUrl}
                            alt={p.title}
                            className="size-10 shrink-0 rounded border object-cover"
                          />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded border bg-muted">
                            <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium leading-tight">{p.title}</p>
                          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">/{p.handle}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {priceLabel}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      <span className={inv === 0 ? "text-rose-600 dark:text-rose-400" : inv <= 3 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                        {inv}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.updatedAt).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                            aria-label="Product actions"
                          >
                            <MoreHorizontalIcon className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}>Edit & Manage</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {p.status !== "active" && (
                            <DropdownMenuItem onClick={() => handleQuickStatus(p, "active")}>
                              Publish
                            </DropdownMenuItem>
                          )}
                          {p.status === "active" && (
                            <DropdownMenuItem onClick={() => handleQuickStatus(p, "draft")}>
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleArchive(p)}
                          >
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => !open && setSheetOpen(false)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editing ? editing.title : "New Product"}</SheetTitle>
            <SheetDescription>
              {editing ? `/${editing.handle}` : "Fill in the details to create a new product."}
            </SheetDescription>
          </SheetHeader>

          <SheetBody>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-1">
              <TabsList className={cn("grid w-full", editing ? "grid-cols-4" : "grid-cols-1")}>
                <TabsTrigger value="details">Details</TabsTrigger>
                {editing && <TabsTrigger value="options">Options</TabsTrigger>}
                {editing && <TabsTrigger value="variants">Variants</TabsTrigger>}
                {editing && <TabsTrigger value="images">Images</TabsTrigger>}
              </TabsList>

              {/* ── Details tab ── */}
              <TabsContent value="details" className="mt-4 space-y-4">
                <FormField label="Title *" htmlFor="p-title">
                  <Input
                    id="p-title"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Premium Wireless Headphones"
                  />
                </FormField>

                <FormField label="Handle *" htmlFor="p-handle">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">/</span>
                    <Input
                      id="p-handle"
                      value={form.handle}
                      onChange={(e) => setForm((f) => ({ ...f, handle: slugify(e.target.value) }))}
                      placeholder="premium-wireless-headphones"
                      disabled={!!editing}
                      className={cn(editing && "opacity-60 cursor-not-allowed")}
                    />
                  </div>
                  {editing && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Handle cannot be changed after creation.
                    </p>
                  )}
                </FormField>

                <FormField label="Description" htmlFor="p-desc">
                  <Textarea
                    id="p-desc"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe your product…"
                    rows={4}
                  />
                </FormField>

                <FormField label="Status" htmlFor="p-status">
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProductStatus }))}
                  >
                    <SelectTrigger id="p-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active (visible on store)</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <Separator />

                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SEO</p>

                <FormField label="Meta Title" htmlFor="p-seo-title">
                  <Input
                    id="p-seo-title"
                    value={form.seoTitle}
                    onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                    placeholder="Premium Wireless Headphones | YourStore"
                    maxLength={255}
                  />
                </FormField>

                <FormField label="Meta Description" htmlFor="p-seo-desc">
                  <Textarea
                    id="p-seo-desc"
                    value={form.seoDescription}
                    onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                    placeholder="Shop our best-selling wireless headphones…"
                    rows={3}
                    maxLength={500}
                  />
                </FormField>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
                </Button>
              </TabsContent>

              {/* ── Options tab ── */}
              {editing && (
                <TabsContent value="options" className="mt-4">
                  <OptionsTab productId={editing.id} />
                </TabsContent>
              )}

              {/* ── Variants tab ── */}
              {editing && (
                <TabsContent value="variants" className="mt-4">
                  <VariantsTab productId={editing.id} />
                </TabsContent>
              )}

              {/* ── Images tab ── */}
              {editing && (
                <TabsContent value="images" className="mt-4">
                  <ImagesTab productId={editing.id} />
                </TabsContent>
              )}
            </Tabs>
          </SheetBody>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Import CSV dialog ───────────────────────────────────────────── */}
      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          if (importBusy) return;
          setImportOpen(o);
          if (!o) {
            setImportCsvText("");
            setImportResult(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" aria-hidden />
              Import products from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV to bulk-create products. Each row creates one product
              with a default variant. Rows with duplicate handles are skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <p className="font-semibold text-foreground">Required columns</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                title · handle · price
              </p>
              <p className="mt-2 font-semibold text-foreground">Optional</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                description · status · sku · compare_at_price · inventory_quantity · image_url · alt_text
              </p>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-2 h-auto p-0 text-xs font-semibold"
                onClick={handleDownloadTemplate}
              >
                <DownloadIcon className="mr-1 size-3" aria-hidden />
                Download sample template
              </Button>
            </div>

            <div>
              <Label htmlFor="csv-file" className="text-sm font-medium">
                CSV file
              </Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                disabled={importBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPickFile(file);
                }}
                className="mt-1.5 cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-semibold"
              />
              {importCsvText && !importResult && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Ready to import — {importCsvText.split("\n").filter((l) => l.trim()).length - 1} data row{importCsvText.split("\n").filter((l) => l.trim()).length - 1 === 1 ? "" : "s"}.
                </p>
              )}
            </div>

            {importResult && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg border bg-card p-2">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold tabular-nums">{importResult.total}</p>
                  </div>
                  <div className="rounded-lg border bg-emerald-50 p-2 dark:bg-emerald-950/30">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">Created</p>
                    <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {importResult.created}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-amber-50 p-2 dark:bg-amber-950/30">
                    <p className="text-xs text-amber-700 dark:text-amber-400">Skipped</p>
                    <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
                      {importResult.skipped}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-rose-50 p-2 dark:bg-rose-950/30">
                    <p className="text-xs text-rose-700 dark:text-rose-400">Failed</p>
                    <p className="text-lg font-bold tabular-nums text-rose-700 dark:text-rose-300">
                      {importResult.failed}
                    </p>
                  </div>
                </div>
                {importResult.failed > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-2 text-xs">
                    <p className="mb-1 font-semibold">Failed rows</p>
                    <ul className="space-y-0.5">
                      {importResult.results
                        .filter((r) => !r.ok)
                        .map((r) => (
                          <li key={`${r.row}-${r.handle}`} className="text-rose-700 dark:text-rose-400">
                            <span className="font-mono">Row {r.row}</span>
                            {r.handle ? <> · <span className="font-mono">{r.handle}</span></> : null}
                            {r.message ? ` — ${r.message}` : ""}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportOpen(false)}
              disabled={importBusy}
            >
              {importResult ? "Done" : "Cancel"}
            </Button>
            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={!importCsvText.trim() || importBusy}
              >
                {importBusy ? "Importing…" : "Import products"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
