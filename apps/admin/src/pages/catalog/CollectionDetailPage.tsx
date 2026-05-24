import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { MetafieldsEditor } from "@/components/MetafieldsEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SafeHtml } from "@/components/SafeHtml";
import {
  ArrowLeftIcon,
  Layers,
  PencilIcon,
  Package,
  ImageIcon,
  Globe,
} from "lucide-react";

interface CollectionProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  featuredImageUrl?: string | null;
  position?: number;
}

interface CollectionDetail {
  id: string;
  vendorId: string;
  title: string;
  handle: string;
  type: "manual" | "smart";
  status: "draft" | "active" | "archived";
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoCanonicalUrl: string | null;
  productCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  vendor: { id: string; name: string } | null;
  products: CollectionProduct[];
}

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    loadCollection(controller.signal);
    return () => controller.abort();
  }, [id]);

  async function loadCollection(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<CollectionDetail>(`/admin/collections/${id}`, { signal });
      setCollection(res);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e.message);
        toast({ title: "Failed to load collection", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-lg lg:col-span-2" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/catalog/collections")}>
          <ArrowLeftIcon className="size-4 mr-1" /> Back to Collections
        </Button>
        <EmptyState
          icon={Layers}
          title="Collection not found"
          description={error ?? "The requested collection could not be loaded."}
        />
      </div>
    );
  }

  const products = collection.products ?? [];

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
          <PageHeader
            title={collection.title}
            description={`/${collection.handle}`}
            action={
              <div className="flex items-center gap-2">
                <StatusBadge status={collection.status} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/catalog/collections/${id}/edit`)}
                >
                  <PencilIcon className="size-3.5 mr-1" /> Edit
                </Button>
              </div>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============ MAIN COLUMN ============ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {collection.description && (
            <Card className="border shadow-none p-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Description
              </h2>
              <SafeHtml
                className="prose prose-sm dark:prose-invert max-w-none"
                html={collection.description}
              />
            </Card>
          )}

          {/* Products */}
          <Card className="border shadow-none p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Products ({products.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/catalog/collections/${id}/edit`)}
              >
                <PencilIcon className="size-3.5 mr-1" /> Manage
              </Button>
            </div>

            {products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products"
                description="This collection has no products yet."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/catalog/collections/${id}/edit`)}
                  >
                    <PencilIcon className="size-3.5 mr-1" /> Add products
                  </Button>
                }
              />
            ) : (
              <div className="rounded-lg border divide-y">
                {products.map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/catalog/products/${p.id}`)}
                  >
                    <span className="text-xs text-muted-foreground w-5 text-right tabular-nums shrink-0">
                      {index + 1}
                    </span>

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

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {p.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground font-mono truncate">
                        /{p.handle}
                      </p>
                    </div>

                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Metafields */}
          {id && <MetafieldsEditor entityType="collections" entityId={id} />}
        </div>

        {/* ============ SIDEBAR ============ */}
        <div className="space-y-6">
          {/* Overview */}
          <Card className="border shadow-none p-6 space-y-4">
            <h2 className="text-sm font-semibold">Details</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={collection.status} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <StatusBadge status={collection.type} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Products</span>
                <span className="text-sm font-medium tabular-nums">
                  {collection.productCount}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vendor</span>
                <span className="text-sm font-medium">
                  {collection.vendor?.name ?? "All vendors"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {new Date(collection.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Updated</span>
                <span className="text-sm">
                  {new Date(collection.updatedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </Card>

          {/* Image */}
          <Card className="border shadow-none p-6 space-y-3">
            <h2 className="text-sm font-semibold">Image</h2>
            {collection.imageUrl ? (
              <img
                src={collection.imageUrl}
                alt={collection.imageAlt || collection.title}
                className="w-full aspect-square rounded-lg border object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center">
                <ImageIcon className="size-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No image set</p>
              </div>
            )}
          </Card>

          {/* SEO */}
          {(collection.seoTitle || collection.seoDescription || collection.handle) && (
            <Card className="border shadow-none p-6 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Globe className="size-4" />
                Search engine listing
              </h2>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">
                  {collection.seoTitle || collection.title}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 font-mono truncate">
                  /collections/{collection.handle}
                </p>
                {collection.seoDescription && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {collection.seoDescription}
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
