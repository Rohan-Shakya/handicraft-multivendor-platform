import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TagsEditor } from "@/components/TagsEditor";
import { MetafieldsEditor } from "@/components/MetafieldsEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SafeHtml } from "@/components/SafeHtml";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeftIcon,
  Package,
  ImageIcon,
  PencilIcon,
  Trash2Icon,
  StarIcon,
  GlobeIcon,
  TagIcon,
  LayersIcon,
  BoxIcon,
  StoreIcon,
  SearchIcon,
  ExternalLinkIcon,
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

interface ProductVariant {
  id: string;
  vendorId: string;
  productId: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  status: string;
  price: number;
  compareAtPrice: number | null;
  costPerItem: number | null;
  taxable: boolean;
  inventoryTracked: boolean;
  inventoryPolicy: string | null;
  requiresShipping: boolean;
  weightValue: number | null;
  weightUnit: string | null;
  countryOfOrigin: string | null;
  harmonizedSystemCode: string | null;
  featuredFileId: string | null;
  position: number;
  selectedOptions: SelectedOption[];
  inventoryItem: InventoryItem | null;
}

interface ProductOptionValue {
  id: string;
  optionId: string;
  value: string;
  swatchColor: string | null;
  position: number;
}

interface ProductOption {
  id: string;
  productId: string;
  name: string;
  displayType: string | null;
  position: number;
  values: ProductOptionValue[];
}

interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  position: number;
  isFeatured: boolean;
}

interface ProductCollection {
  id: string;
  title: string;
  handle: string;
}

interface ProductDetail {
  id: string;
  vendorId: string;
  title: string;
  handle: string;
  description: string | null;
  excerpt: string | null;
  status: string;
  productType: string | null;
  brand: string | null;
  featuredFileId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoCanonicalUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariant[];
  options: ProductOption[];
  images: ProductImage[];
  tags: string[];
  collections: ProductCollection[];
  vendor?: { id: string; name: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Variant.price arrives as a decimal string in major units (e.g. "131500.00" =
 * Rs 131,500). Pass it straight to formatPrice — no cents math.
 */
function formatMoney(amount: number | string | null | undefined, currency?: string | null): string {
  if (amount == null || amount === "") return "N/A";
  return formatPrice(amount, currency);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Build a human-readable variant name from its selected options.
 * e.g. "Black / M" for a variant with Color=Black, Size=M
 */
function getVariantOptionLabel(
  variant: ProductVariant,
  options: ProductOption[]
): string {
  if (variant.selectedOptions.length === 0) {
    return variant.title || "Default";
  }

  const parts: string[] = [];
  // Sort by option position to keep consistent order
  const sortedSelected = [...variant.selectedOptions].sort((a, b) => {
    const optA = options.find((o) => o.id === a.optionId);
    const optB = options.find((o) => o.id === b.optionId);
    return (optA?.position ?? 0) - (optB?.position ?? 0);
  });

  for (const sel of sortedSelected) {
    const opt = options.find((o) => o.id === sel.optionId);
    if (!opt) continue;
    const val = opt.values.find((v) => v.id === sel.optionValueId);
    parts.push(val?.value ?? "?");
  }

  return parts.length > 0 ? parts.join(" / ") : variant.title || "Default";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-5 w-16 mb-4" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="aspect-square rounded-lg" />
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-5 w-20 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <Skeleton className="h-5 w-16 mb-3" />
            <Skeleton className="h-8 w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ---- Fetch ----

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    loadProduct(controller.signal);
    return () => controller.abort();
  }, [id]);

  async function loadProduct(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ProductDetail>(`/admin/products/${id}`, { signal });
      setProduct(res);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e.message);
        toast({
          title: "Failed to load product",
          description: e.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // ---- Delete ----

  async function handleDelete() {
    if (!product) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/products/${product.id}`, { method: "DELETE" });
      toast({ title: "Product deleted" });
      navigate("/catalog/products");
    } catch (e: any) {
      toast({
        title: "Failed to delete product",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  // ---- Tags handlers ----

  async function handleAddTags(newTags: string[]) {
    if (!product) return;
    await apiFetch(`/admin/products/${product.id}/tags`, {
      method: "POST",
      body: JSON.stringify({ tags: newTags }),
    });
    loadProduct();
  }

  async function handleRemoveTag(tag: string) {
    if (!product) return;
    await apiFetch(
      `/admin/products/${product.id}/tags/${encodeURIComponent(tag)}`,
      { method: "DELETE" }
    );
    loadProduct();
  }

  // ---- Computed values ----

  const totalInventory = useMemo(() => {
    if (!product?.variants) return 0;
    return product.variants.reduce((sum, v) => {
      return sum + (v.inventoryItem?.availableQuantity ?? 0);
    }, 0);
  }, [product?.variants]);

  const totalReserved = useMemo(() => {
    if (!product?.variants) return 0;
    return product.variants.reduce((sum, v) => {
      return sum + (v.inventoryItem?.reservedQuantity ?? 0);
    }, 0);
  }, [product?.variants]);

  const sortedImages = useMemo(() => {
    if (!product?.images) return [];
    return [...product.images].sort((a, b) => {
      // Featured first, then by position
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return a.position - b.position;
    });
  }, [product?.images]);

  // ---- Render states ----

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/catalog/products")}
        >
          <ArrowLeftIcon className="size-4 mr-1" /> Back to Products
        </Button>
        <EmptyState
          icon={Package}
          title="Product not found"
          description={error ?? "The requested product could not be loaded."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            aria-label="Back to products"
            onClick={() => navigate("/catalog/products")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {product.title}
              </h1>
              <StatusBadge status={product.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              /{product.handle}
              {product.publishedAt && (
                <span className="ml-2">
                  &middot; Published {formatDate(product.publishedAt)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(`/catalog/products/${product.id}/edit`)
            }
          >
            <PencilIcon className="size-3.5 mr-1.5" />
            Edit product
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2Icon className="size-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MAIN GRID                                                          */}
      {/* ================================================================== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* -------------------------------------------------------------- */}
        {/* LEFT COLUMN (2/3)                                               */}
        {/* -------------------------------------------------------------- */}
        <div className="space-y-6 lg:col-span-2">
          {/* ---- Description Card ---- */}
          <DescriptionCard
            description={product.description}
            excerpt={product.excerpt}
          />

          {/* ---- Media Card ---- */}
          <MediaCard images={sortedImages} />

          {/* ---- Variants Card ---- */}
          <VariantsCard
            variants={product.variants}
            options={product.options}
            totalInventory={totalInventory}
            totalReserved={totalReserved}
            productId={product.id}
          />

          {/* ---- Metafields ---- */}
          <MetafieldsEditor entityType="products" entityId={product.id} />
        </div>

        {/* -------------------------------------------------------------- */}
        {/* SIDEBAR (1/3)                                                   */}
        {/* -------------------------------------------------------------- */}
        <div className="space-y-6">
          {/* ---- Status Card ---- */}
          <StatusCard
            status={product.status}
            createdAt={product.createdAt}
            updatedAt={product.updatedAt}
            publishedAt={product.publishedAt}
          />

          {/* ---- Product Organization ---- */}
          <OrganizationCard
            productType={product.productType}
            brand={product.brand}
            vendorId={product.vendorId}
            vendorName={product.vendor?.name ?? null}
            collections={product.collections}
            tags={product.tags}
            onAddTags={handleAddTags}
            onRemoveTag={handleRemoveTag}
          />

          {/* ---- SEO Preview ---- */}
          <SeoCard
            seoTitle={product.seoTitle}
            seoDescription={product.seoDescription}
            seoCanonicalUrl={product.seoCanonicalUrl}
            handle={product.handle}
            title={product.title}
          />
        </div>
      </div>

      {/* ---- Delete Confirmation ---- */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete product"
        description={`Are you sure you want to delete "${product.title}"? This action cannot be undone. All variants, images, and related data will be permanently removed.`}
        confirmLabel="Delete product"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ===========================================================================
// SUB-COMPONENTS
// ===========================================================================

// ---------------------------------------------------------------------------
// Description Card
// ---------------------------------------------------------------------------

function DescriptionCard({
  description,
  excerpt,
}: {
  description: string | null;
  excerpt: string | null;
}) {
  const hasContent = description || excerpt;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Description</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasContent ? (
          <p className="text-sm text-muted-foreground italic">
            No description provided.
          </p>
        ) : (
          <div className="space-y-4">
            {description && (
              <SafeHtml
                className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                html={description}
              />
            )}
            {excerpt && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Excerpt
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {excerpt}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Media Card
// ---------------------------------------------------------------------------

function MediaCard({ images }: { images: ProductImage[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Media</CardTitle>
          {images.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {images.length} image{images.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No images"
            description="This product has no images yet."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="group relative">
                <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={img.url}
                    alt={img.altText ?? "Product image"}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {img.isFeatured && (
                    <div className="absolute top-1.5 left-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-full bg-yellow-500 p-1 shadow-sm">
                              <StarIcon className="size-3 text-white fill-white" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Featured image</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                {img.altText && (
                  <p className="mt-1.5 text-xs text-muted-foreground truncate">
                    {img.altText}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Variants Card
// ---------------------------------------------------------------------------

function VariantsCard({
  variants,
  options,
  totalInventory,
  totalReserved,
  productId,
}: {
  variants: ProductVariant[];
  options: ProductOption[];
  totalInventory: number;
  totalReserved: number;
  productId: string;
}) {
  const nav = useNavigate();
  const sortedVariants = useMemo(() => {
    return [...variants].sort((a, b) => a.position - b.position);
  }, [variants]);

  // Simple product: 1 variant with no options
  const isSimple = variants.length === 1 && options.length === 0;
  const singleVariant = isSimple ? variants[0] : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {isSimple ? "Pricing & Inventory" : "Variants"}
          </CardTitle>
          {!isSimple && (
            <span className="text-xs text-muted-foreground">
              {variants.length} variant{variants.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ---- Simple product: inline pricing/inventory ---- */}
        {isSimple && singleVariant ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Price
                </p>
                <p className="text-lg font-semibold">
                  {formatMoney(singleVariant.price)}
                </p>
              </div>
              {singleVariant.compareAtPrice != null && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Compare at price
                  </p>
                  <p className="text-lg font-semibold text-muted-foreground line-through">
                    {formatMoney(singleVariant.compareAtPrice)}
                  </p>
                </div>
              )}
              {singleVariant.costPerItem != null && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Cost per item
                  </p>
                  <p className="text-sm">{formatMoney(singleVariant.costPerItem)}</p>
                </div>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  SKU
                </p>
                <p className="text-sm font-mono">
                  {singleVariant.sku ?? <span className="text-muted-foreground italic">Not set</span>}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Barcode
                </p>
                <p className="text-sm font-mono">
                  {singleVariant.barcode ?? <span className="text-muted-foreground italic">Not set</span>}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Available
                </p>
                {singleVariant.inventoryItem ? (
                  <p className={cn(
                    "text-sm font-medium",
                    singleVariant.inventoryItem.availableQuantity === 0
                      ? "text-destructive"
                      : singleVariant.inventoryItem.availableQuantity <= 5
                        ? "text-yellow-600 dark:text-yellow-500"
                        : ""
                  )}>
                    {singleVariant.inventoryItem.availableQuantity}
                    {singleVariant.inventoryItem.reservedQuantity > 0 && (
                      <span className="text-muted-foreground font-normal">
                        {" "}({singleVariant.inventoryItem.reservedQuantity} reserved)
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not tracked</p>
                )}
              </div>
            </div>
            {singleVariant.taxable && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  This product is taxable
                  {singleVariant.requiresShipping ? " and requires shipping" : ""}.
                </p>
              </>
            )}
          </div>
        ) : variants.length === 0 ? (
          /* ---- No variants ---- */
          <EmptyState
            icon={LayersIcon}
            title="No variants"
            description="This product has no variants yet."
          />
        ) : (
          /* ---- Multi-variant: option badges + table ---- */
          <>
            {/* Option summary badges */}
            {options.length > 0 && (
              <div className="space-y-2">
                {options
                  .sort((a, b) => a.position - b.position)
                  .map((opt) => (
                    <div key={opt.id} className="flex items-start gap-2">
                      <span className="text-xs font-medium text-muted-foreground mt-0.5 shrink-0 min-w-[60px]">
                        {opt.name}:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {opt.values
                          .sort((a, b) => a.position - b.position)
                          .map((val) => (
                            <Badge
                              key={val.id}
                              variant="secondary"
                              className="text-xs font-normal rounded-full"
                            >
                              {val.swatchColor && (
                                <span
                                  className="inline-block size-2.5 rounded-full mr-1 border"
                                  style={{ backgroundColor: val.swatchColor }}
                                />
                              )}
                              {val.value}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  ))}
                <Separator className="mt-3" />
              </div>
            )}

            {/* Variant table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Variant</TableHead>
                    <TableHead className="min-w-[100px]">SKU</TableHead>
                    <TableHead className="text-right min-w-[90px]">
                      Price
                    </TableHead>
                    <TableHead className="text-right min-w-[90px]">
                      Available
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVariants.map((variant) => {
                    const label = getVariantOptionLabel(variant, options);
                    const qty =
                      variant.inventoryItem?.availableQuantity ?? null;
                    const isLowStock = qty !== null && qty > 0 && qty <= 5;
                    const isOutOfStock = qty !== null && qty === 0;

                    return (
                      <TableRow
                        key={variant.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          nav(
                            `/catalog/products/${productId}/variants/${variant.id}`
                          )
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {variant.sku ?? "---"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatMoney(variant.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {qty === null ? (
                            <span className="text-xs text-muted-foreground">
                              Not tracked
                            </span>
                          ) : (
                            <span
                              className={
                                isOutOfStock
                                  ? "text-sm font-medium text-destructive"
                                  : isLowStock
                                    ? "text-sm font-medium text-yellow-600 dark:text-yellow-500"
                                    : "text-sm font-medium"
                              }
                            >
                              {qty}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Inventory summary */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <BoxIcon className="size-3.5" />
                <span>
                  Total inventory:{" "}
                  <span className="font-medium text-foreground">
                    {totalInventory} available
                  </span>
                </span>
              </div>
              {totalReserved > 0 && (
                <span>
                  &middot;{" "}
                  <span className="font-medium text-yellow-600 dark:text-yellow-500">
                    {totalReserved} reserved
                  </span>
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status Card
// ---------------------------------------------------------------------------

function StatusCard({
  status,
  createdAt,
  updatedAt,
  publishedAt,
}: {
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <StatusBadge status={status} />
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDateTime(createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{formatDateTime(updatedAt)}</span>
          </div>
          {publishedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Published</span>
              <span>{formatDateTime(publishedAt)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Organization Card
// ---------------------------------------------------------------------------

function OrganizationCard({
  productType,
  brand,
  vendorId,
  vendorName,
  collections,
  tags,
  onAddTags,
  onRemoveTag,
}: {
  productType: string | null;
  brand: string | null;
  vendorId: string;
  vendorName: string | null;
  collections: ProductCollection[];
  tags: string[];
  onAddTags: (tags: string[]) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Product organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Product type
          </p>
          <p className="text-sm">
            {productType || (
              <span className="text-muted-foreground italic">Not set</span>
            )}
          </p>
        </div>

        {/* Vendor */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Vendor
          </p>
          <Link
            to={`/vendors/${vendorId}`}
            className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            <StoreIcon className="size-3.5" />
            {vendorName ?? vendorId}
          </Link>
        </div>

        {/* Brand */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Brand
          </p>
          <p className="text-sm">
            {brand || (
              <span className="text-muted-foreground italic">Not set</span>
            )}
          </p>
        </div>

        <Separator />

        {/* Collections */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Collections
          </p>
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No collections
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {collections.map((col) => (
                <Link key={col.id} to={`/catalog/collections/${col.id}`}>
                  <Badge
                    variant="secondary"
                    className="rounded-full text-xs font-normal hover:bg-secondary/80 cursor-pointer"
                  >
                    {col.title}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <TagIcon className="size-3" />
            Tags
          </p>
          <TagsEditor
            tags={tags}
            onAdd={onAddTags}
            onRemove={onRemoveTag}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SEO Preview Card
// ---------------------------------------------------------------------------

function SeoCard({
  seoTitle,
  seoDescription,
  seoCanonicalUrl,
  handle,
  title,
}: {
  seoTitle: string | null;
  seoDescription: string | null;
  seoCanonicalUrl: string | null;
  handle: string;
  title: string;
}) {
  const displayTitle = seoTitle || title;
  const displayUrl = seoCanonicalUrl || `/products/${handle}`;
  const displayDescription =
    seoDescription || "No meta description set for this product.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-1.5">
          <SearchIcon className="size-4" />
          Search engine listing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Google-style preview */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 line-clamp-1">
            {displayTitle}
          </p>
          <p className="text-xs text-green-700 dark:text-green-500 truncate flex items-center gap-1">
            <GlobeIcon className="size-3 shrink-0" />
            {displayUrl}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {displayDescription}
          </p>
        </div>

        {/* Raw values */}
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              SEO Title
            </span>
            <p className="mt-0.5">
              {seoTitle || (
                <span className="text-muted-foreground italic">
                  Not set (using product title)
                </span>
              )}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Meta description
            </span>
            <p className="mt-0.5">
              {seoDescription || (
                <span className="text-muted-foreground italic">Not set</span>
              )}
            </p>
          </div>
          {seoCanonicalUrl && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Canonical URL
              </span>
              <p className="mt-0.5 flex items-center gap-1">
                <ExternalLinkIcon className="size-3 shrink-0" />
                <span className="truncate font-mono text-xs">
                  {seoCanonicalUrl}
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
