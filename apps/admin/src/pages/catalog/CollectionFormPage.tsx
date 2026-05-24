import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { PaginatedResponse, Vendor } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { FormField } from "@/components/FormField";
import { StatusBadge } from "@/components/StatusBadge";
import { MetafieldsEditor } from "@/components/MetafieldsEditor";
import { ImagePicker, type ImagePickerValue } from "@/components/ImagePicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  XIcon,
  ImageIcon,
  PlusIcon,
  SearchIcon,
  GripVertical,
  Globe,
} from "lucide-react";

type CollectionStatus = "draft" | "active" | "archived";
type CollectionType = "manual" | "smart";

interface CollectionForm {
  vendorId: string;
  title: string;
  handle: string;
  description: string;
  status: CollectionStatus;
  type: CollectionType;
  seoTitle: string;
  seoDescription: string;
}

const INITIAL_FORM: CollectionForm = {
  vendorId: "",
  title: "",
  handle: "",
  description: "",
  status: "draft",
  type: "manual",
  seoTitle: "",
  seoDescription: "",
};

interface CollectionProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  featuredImageUrl?: string | null;
  position?: number;
}

interface SearchProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  featuredImageUrl?: string | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function CollectionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<CollectionForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [handleManual, setHandleManual] = useState(false);

  // Image
  const [collectionImage, setCollectionImage] = useState<ImagePickerValue | null>(null);

  // Vendors
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Products (edit mode only)
  const [products, setProducts] = useState<CollectionProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Add product dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadVendors(controller.signal);
    if (isEdit) {
      loadCollection(controller.signal);
    }
    return () => controller.abort();
  }, [id]);

  async function loadVendors(signal?: AbortSignal) {
    try {
      const res = await apiFetch<PaginatedResponse<Vendor>>("/admin/vendors?limit=100", { signal });
      setVendors(res.data);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // Non-critical
      }
    }
  }

  async function loadCollection(signal?: AbortSignal) {
    setLoading(true);
    try {
      const c = await apiFetch<any>(`/admin/collections/${id}`, { signal });
      setForm({
        vendorId: c.vendorId ?? "",
        title: c.title ?? "",
        handle: c.handle ?? "",
        description: c.description ?? "",
        status: c.status ?? "draft",
        type: c.type ?? "manual",
        seoTitle: c.seoTitle ?? "",
        seoDescription: c.seoDescription ?? "",
      });
      setHandleManual(true);

      // Load collection image
      if (c.imageFileId && c.imageUrl) {
        setCollectionImage({
          fileId: c.imageFileId,
          url: c.imageUrl,
          altText: c.imageAlt ?? "",
        });
      }

      // Products come embedded in the response now
      if (c.products) {
        setProducts(c.products);
      } else {
        loadProducts(signal);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load collection", description: e.message, variant: "destructive" });
        navigate("/catalog/collections");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts(signal?: AbortSignal) {
    setProductsLoading(true);
    try {
      const res = await apiFetch<{ data: CollectionProduct[] }>(
        `/admin/collections/${id}/products`,
        { signal }
      );
      setProducts(res.data);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // Products may not be available
      }
    } finally {
      setProductsLoading(false);
    }
  }

  function updateField<K extends keyof CollectionForm>(key: K, value: CollectionForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !handleManual) {
        next.handle = slugify(value as string);
      }
      return next;
    });
  }

  async function handleRemoveProduct(productId: string) {
    try {
      await apiFetch(`/admin/collections/${id}/products/${productId}`, {
        method: "DELETE",
      });
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast({ title: "Product removed from collection" });
    } catch (e: any) {
      toast({ title: "Failed to remove product", description: e.message, variant: "destructive" });
    }
  }

  async function handleSearchProducts(e: React.FormEvent) {
    e.preventDefault();
    if (!productSearch.trim()) return;
    setSearchLoading(true);
    try {
      const res = await apiFetch<{ data: SearchProduct[] }>(
        `/admin/products?search=${encodeURIComponent(productSearch.trim())}&limit=20`
      );
      // Filter out products already in the collection
      const existingIds = new Set(products.map((p) => p.id));
      setSearchResults((res.data ?? []).filter((p) => !existingIds.has(p.id)));
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleAddProduct(productId: string) {
    try {
      await apiFetch(`/admin/collections/${id}/products`, {
        method: "POST",
        body: JSON.stringify({ productId }),
      });
      // Move product from search results to collection
      const product = searchResults.find((p) => p.id === productId);
      if (product) {
        setProducts((prev) => [
          ...prev,
          { ...product, position: prev.length },
        ]);
        setSearchResults((prev) => prev.filter((p) => p.id !== productId));
      }
      toast({ title: "Product added to collection" });
    } catch (e: any) {
      toast({ title: "Failed to add product", description: e.message, variant: "destructive" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim() || !form.handle.trim()) {
      toast({ title: "Title and handle are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        handle: form.handle.trim(),
        status: form.status,
        type: form.type,
        description: form.description || undefined,
        imageFileId: collectionImage?.fileId || null,
        imageAlt: collectionImage?.altText?.trim() || null,
        seoTitle: form.seoTitle.trim() || undefined,
        seoDescription: form.seoDescription.trim() || undefined,
      };

      if (form.vendorId) {
        body.vendorId = form.vendorId;
      }

      if (isEdit) {
        await apiFetch(`/admin/collections/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Collection updated" });
      } else {
        await apiFetch("/admin/collections", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Collection created" });
      }
      navigate("/catalog/collections");
    } catch (e: any) {
      toast({ title: "Failed to save collection", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // SEO preview values
  const seoPreviewTitle = form.seoTitle || form.title || "Page title";
  const seoPreviewHandle = form.handle || "page-handle";
  const seoPreviewDescription =
    form.seoDescription || "Add a meta description for better search engine results.";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-lg lg:col-span-2" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Back to collections"
            onClick={() => navigate("/catalog/collections")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? form.title : "Create collection"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/catalog/collections")}>
            Discard
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save" : "Create collection"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ============ MAIN COLUMN ============ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Description */}
            <Card className="border shadow-none p-6 space-y-4">
              <FormField label="Title" htmlFor="col-title" required>
                <Input
                  id="col-title"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Summer Collection"
                />
              </FormField>

              <FormField label="Description" htmlFor="col-description">
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                  placeholder="Describe this collection..."
                />
              </FormField>
            </Card>

            {/* Products section (edit mode, manual type only) */}
            {isEdit && form.type === "manual" && (
              <Card className="border shadow-none p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Products</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProductSearch("");
                      setSearchResults([]);
                      setAddDialogOpen(true);
                    }}
                  >
                    <PlusIcon className="size-3.5 mr-1" /> Browse products
                  </Button>
                </div>

                {productsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed py-10 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      No products in this collection yet.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProductSearch("");
                        setSearchResults([]);
                        setAddDialogOpen(true);
                      }}
                    >
                      <PlusIcon className="size-3.5 mr-1" /> Browse products
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border divide-y">
                    {products.map((p, index) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5 group hover:bg-muted/50 transition-colors"
                      >
                        {/* Position indicator */}
                        <div className="flex items-center gap-1 shrink-0">
                          <GripVertical className="size-4 text-muted-foreground/40" />
                          <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">
                            {index + 1}
                          </span>
                        </div>

                        {/* Product image */}
                        {p.featuredImageUrl ? (
                          <img
                            src={p.featuredImageUrl}
                            alt={p.title}
                            className="size-10 rounded object-cover border shrink-0"
                          />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded border bg-muted">
                            <ImageIcon className="size-4 text-muted-foreground" />
                          </div>
                        )}

                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none truncate">
                            {p.title}
                          </p>
                        </div>

                        {/* Status badge */}
                        <StatusBadge status={p.status} />

                        {/* Remove button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          aria-label="Remove product from collection"
                          onClick={() => handleRemoveProduct(p.id)}
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Smart collection notice */}
            {isEdit && form.type === "smart" && (
              <Card className="border shadow-none p-6">
                <p className="text-sm text-muted-foreground">
                  Smart collections automatically include products based on matching rules.
                  Products cannot be manually added or removed.
                </p>
              </Card>
            )}

            {/* Metafields (edit mode only) */}
            {isEdit && id && (
              <MetafieldsEditor entityType="collections" entityId={id} />
            )}
          </div>

          {/* ============ SIDEBAR ============ */}
          <div className="space-y-6">
            {/* Status */}
            <Card className="border shadow-none p-6 space-y-4">
              <h2 className="text-sm font-semibold">Status</h2>
              <FormField label="Collection status" htmlFor="col-status">
                <Select
                  value={form.status}
                  onValueChange={(v) => updateField("status", v as CollectionStatus)}
                >
                  <SelectTrigger id="col-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </Card>

            {/* Collection Type */}
            <Card className="border shadow-none p-6 space-y-4">
              <h2 className="text-sm font-semibold">Collection type</h2>
              {isEdit ? (
                <div className="flex items-center gap-2">
                  <StatusBadge status={form.type} />
                  <span className="text-xs text-muted-foreground">
                    (cannot be changed after creation)
                  </span>
                </div>
              ) : (
                <FormField label="Type" htmlFor="col-type">
                  <Select
                    value={form.type}
                    onValueChange={(v) => updateField("type", v as CollectionType)}
                  >
                    <SelectTrigger id="col-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="smart">Smart</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </Card>

            {/* Collection Image */}
            <Card className="border shadow-none p-6">
              <ImagePicker
                label="Collection image"
                value={collectionImage}
                onChange={setCollectionImage}
              />
            </Card>

            {/* Vendor */}
            <Card className="border shadow-none p-6 space-y-4">
              <h2 className="text-sm font-semibold">Vendor</h2>
              <FormField label="Assign to vendor" htmlFor="col-vendor">
                <Select
                  value={form.vendorId || "none"}
                  onValueChange={(v) => updateField("vendorId", v === "none" ? "" : v)}
                >
                  <SelectTrigger id="col-vendor">
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </Card>

            {/* SEO */}
            <Card className="border shadow-none p-6 space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Globe className="size-4" />
                Search engine listing
              </h2>

              {/* SEO Preview */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">
                  {seoPreviewTitle}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 font-mono truncate">
                  /collections/{seoPreviewHandle}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {seoPreviewDescription}
                </p>
              </div>

              <Separator />

              <FormField label="Handle" htmlFor="col-handle" required>
                <Input
                  id="col-handle"
                  value={form.handle}
                  onChange={(e) => {
                    setHandleManual(true);
                    updateField("handle", e.target.value);
                  }}
                  placeholder="summer-collection"
                  className="font-mono"
                />
              </FormField>

              <FormField label="SEO title" htmlFor="col-seo-title">
                <Input
                  id="col-seo-title"
                  value={form.seoTitle}
                  onChange={(e) => updateField("seoTitle", e.target.value)}
                  placeholder={form.title || "SEO title"}
                  maxLength={70}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.seoTitle.length}/70 characters
                </p>
              </FormField>

              <FormField label="Meta description" htmlFor="col-seo-desc">
                <Input
                  id="col-seo-desc"
                  value={form.seoDescription}
                  onChange={(e) => updateField("seoDescription", e.target.value)}
                  placeholder="Short description for search engines..."
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.seoDescription.length}/160 characters
                </p>
              </FormField>
            </Card>
          </div>
        </div>
      </form>

      {/* ============ ADD PRODUCT DIALOG ============ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add products</DialogTitle>
            <DialogDescription>
              Search for products to add to this collection.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSearchProducts} className="flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" variant="secondary" disabled={searchLoading}>
              {searchLoading ? "Searching..." : "Search"}
            </Button>
          </form>

          <div className="max-h-80 overflow-y-auto">
            {searchResults.length > 0 ? (
              <div className="divide-y rounded-lg border">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    {p.featuredImageUrl ? (
                      <img
                        src={p.featuredImageUrl}
                        alt={p.title}
                        className="size-9 rounded object-cover border shrink-0"
                      />
                    ) : (
                      <div className="flex size-9 shrink-0 items-center justify-center rounded border bg-muted">
                        <ImageIcon className="size-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        /{p.handle}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddProduct(p.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : productSearch && !searchLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No products found matching your search.
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
