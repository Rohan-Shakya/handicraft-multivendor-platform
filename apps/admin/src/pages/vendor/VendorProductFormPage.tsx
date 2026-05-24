import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  ImageIcon,
  ListTreeIcon,
  PackageIcon,
  Trash2Icon,
} from "lucide-react";

import type { Product, ProductStatus } from "@repo/types";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

import { ImagesTab, OptionsTab, VariantsTab } from "./VendorProductsPage";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface ProductFormData {
  title: string;
  handle: string;
  description: string;
  status: ProductStatus;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY_FORM: ProductFormData = {
  title: "",
  handle: "",
  description: "",
  status: "draft",
  seoTitle: "",
  seoDescription: "",
};

export function VendorProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isNew = !id || id === "new";

  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "details" | "options" | "variants" | "images"
  >("details");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fetched = await apiFetch<Product>(`/vendor/products/${id}`);
      setProduct(fetched);
      setForm({
        title: fetched.title,
        handle: fetched.handle,
        description: fetched.description ?? "",
        status: fetched.status,
        seoTitle: fetched.seoTitle ?? "",
        seoDescription: fetched.seoDescription ?? "",
      });
    } catch (e: any) {
      toast({
        title: "Failed to load product",
        description: e?.body?.title ?? e?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      handle: product ? f.handle : slugify(title),
    }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.handle.trim()) {
      toast({
        title: "Title and handle are required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      if (product) {
        const saved = await apiFetch<Product>(`/vendor/products/${product.id}`, {
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
        setProduct(saved);
      } else {
        const created = await apiFetch<Product>("/vendor/products", {
          method: "POST",
          body: JSON.stringify({
            title: form.title,
            handle: form.handle,
            description: form.description || undefined,
            seoTitle: form.seoTitle || undefined,
            seoDescription: form.seoDescription || undefined,
          }),
        });
        toast({
          title: "Product created",
          description: "Now add options, variants, and images.",
        });
        // Redirect to the canonical edit URL so reloads keep state.
        navigate(`/vendor/products/${created.id}`, { replace: true });
      }
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.body?.title ?? e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!product) return;
    setDeleteOpen(false);
    try {
      await apiFetch(`/vendor/products/${product.id}`, { method: "DELETE" });
      toast({ title: "Product archived" });
      navigate("/vendor/products");
    } catch (e: any) {
      toast({
        title: "Failed to archive",
        description: e?.body?.title ?? e?.message,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Back to products"
            onClick={() => navigate("/vendor/products")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {product ? product.title : "New product"}
              </h1>
              {product && <StatusBadge status={product.status} />}
            </div>
            {product && (
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                /{product.handle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {product && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                disabled={saving}
              >
                <Trash2Icon className="mr-1 size-4" /> Archive
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={`/products/${product.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="mr-1 size-4" /> View on store
                </a>
              </Button>
            </>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : product ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className={cn("grid w-full", product ? "grid-cols-4" : "grid-cols-1")}>
          <TabsTrigger value="details">
            <PackageIcon className="mr-1 size-4" /> Details
          </TabsTrigger>
          {product && (
            <>
              <TabsTrigger value="options">
                <ListTreeIcon className="mr-1 size-4" /> Options
              </TabsTrigger>
              <TabsTrigger value="variants">Variants</TabsTrigger>
              <TabsTrigger value="images">
                <ImageIcon className="mr-1 size-4" /> Images
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="overflow-hidden border shadow-none">
                <div className="border-b bg-muted/30 px-6 py-4">
                  <h2 className="text-sm font-semibold">Basic information</h2>
                </div>
                <div className="space-y-5 p-6">
                  <FormField label="Title *" htmlFor="p-title">
                    <Input
                      id="p-title"
                      value={form.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Premium Brass Buddha Statue"
                    />
                  </FormField>

                  <FormField label="Handle *" htmlFor="p-handle">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">/</span>
                      <Input
                        id="p-handle"
                        value={form.handle}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, handle: slugify(e.target.value) }))
                        }
                        placeholder="premium-brass-buddha-statue"
                        disabled={!!product}
                        className={cn(product && "cursor-not-allowed opacity-60")}
                      />
                    </div>
                    {product && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Handle cannot be changed after creation.
                      </p>
                    )}
                  </FormField>

                  <FormField label="Description" htmlFor="p-desc">
                    <Textarea
                      id="p-desc"
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="Describe your product…"
                      rows={6}
                    />
                  </FormField>
                </div>
              </Card>

              <Card className="overflow-hidden border shadow-none">
                <div className="border-b bg-muted/30 px-6 py-4">
                  <h2 className="text-sm font-semibold">Search engine listing</h2>
                </div>
                <div className="space-y-5 p-6">
                  <FormField label="Meta title" htmlFor="p-seo-title">
                    <Input
                      id="p-seo-title"
                      value={form.seoTitle}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, seoTitle: e.target.value }))
                      }
                      placeholder="Premium Brass Buddha Statue | Himalayan Crafts"
                      maxLength={255}
                    />
                  </FormField>

                  <FormField label="Meta description" htmlFor="p-seo-desc">
                    <Textarea
                      id="p-seo-desc"
                      value={form.seoDescription}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, seoDescription: e.target.value }))
                      }
                      placeholder="Shop our hand-cast brass Buddha statues…"
                      rows={3}
                      maxLength={500}
                    />
                  </FormField>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden border shadow-none">
                <div className="border-b bg-muted/30 px-6 py-4">
                  <h2 className="text-sm font-semibold">Visibility</h2>
                </div>
                <div className="p-6">
                  <FormField label="Status" htmlFor="p-status">
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, status: v as ProductStatus }))
                      }
                    >
                      <SelectTrigger id="p-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Only <strong>active</strong> products are visible on the storefront.
                    </p>
                  </FormField>
                </div>
              </Card>

              {!product && (
                <Card className="overflow-hidden border bg-amber-50/50 shadow-none dark:bg-amber-950/20">
                  <div className="p-6 text-sm">
                    <p className="font-semibold">Next steps</p>
                    <p className="mt-1 text-muted-foreground">
                      After creating this product, you'll be able to add{" "}
                      <strong>options</strong> (size, color), <strong>variants</strong> with
                      pricing and inventory, and <strong>images</strong>.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <Separator className="my-6" />
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? "Saving…" : product ? "Save changes" : "Create product"}
            </Button>
          </div>
        </TabsContent>

        {product && (
          <TabsContent value="options" className="mt-6">
            <Card className="overflow-hidden border shadow-none">
              <div className="border-b bg-muted/30 px-6 py-4">
                <h2 className="text-sm font-semibold">Product options</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Define variant axes like size, color, or material. Each option creates a
                  combination of variants.
                </p>
              </div>
              <div className="p-6">
                <OptionsTab productId={product.id} />
              </div>
            </Card>
          </TabsContent>
        )}

        {product && (
          <TabsContent value="variants" className="mt-6">
            <Card className="overflow-hidden border shadow-none">
              <div className="border-b bg-muted/30 px-6 py-4">
                <h2 className="text-sm font-semibold">Variants</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  SKU-level pricing and inventory for this product.
                </p>
              </div>
              <div className="p-6">
                <VariantsTab productId={product.id} />
              </div>
            </Card>
          </TabsContent>
        )}

        {product && (
          <TabsContent value="images" className="mt-6">
            <Card className="overflow-hidden border shadow-none">
              <div className="border-b bg-muted/30 px-6 py-4">
                <h2 className="text-sm font-semibold">Product images</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  First image is the featured one. Drag to reorder.
                </p>
              </div>
              <div className="p-6">
                <ImagesTab productId={product.id} />
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Archive this product?"
        description={`Archive "${product?.title}"? It will no longer be visible on the storefront. You can re-enable it later by setting status back to active.`}
        confirmLabel="Archive product"
        variant="destructive"
        onConfirm={handleArchive}
      />
    </div>
  );
}
