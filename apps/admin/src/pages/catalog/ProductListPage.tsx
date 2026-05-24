import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Product, PaginatedResponse, ProductStatus, Vendor } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useUrlState } from "@/hooks/useUrlState";
import { formatPrice as formatPriceMoney } from "@/lib/format";
import { brand } from "@/config/brand";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, SearchIcon, ImageIcon, PlusIcon, Trash2Icon, DownloadIcon, ArchiveIcon } from "lucide-react";

const LIMIT = 20;
const STATUS_OPTIONS: ProductStatus[] = ["draft", "active", "archived"];

interface ProductListItem extends Product {
  priceMin?: number;
  priceMax?: number;
  totalInventory?: number;
  featuredImageUrl?: string | null;
  vendor?: { id: string; name: string; currencyCode?: string | null };
}

export function ProductListPage() {
  const navigate = useNavigate();

  // ── URL-synced filter state ─────────────────────────────────────────────
  // Persists across refresh / deep links so users can bookmark filtered views.
  const [page, setPage] = useUrlState<number>("page", 1, {
    parse: (raw) => Math.max(1, parseInt(raw, 10) || 1),
  });
  const [search, setSearch] = useUrlState<string>("q", "");
  const [statusFilter, setStatusFilter] = useUrlState<ProductStatus | "all">("status", "all");
  const [vendorFilter, setVendorFilter] = useUrlState<string>("vendor", "all");

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Bulk selection state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"archive" | "delete" | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Controlled local value for the search input (debounced on submit)
  const [searchInput, setSearchInput] = useState(search);

  // Vendor list for filter dropdown
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorMap, setVendorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    loadVendors(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // Keep the input synced if the URL changes via back/forward navigation.
    setSearchInput(search);
  }, [search]);

  async function loadVendors(signal?: AbortSignal) {
    try {
      const res = await apiFetch<PaginatedResponse<Vendor>>("/admin/vendors?limit=100", { signal });
      setVendors(res.data);
      const map: Record<string, string> = {};
      res.data.forEach((v) => (map[v.id] = v.name));
      setVendorMap(map);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // Non-critical, vendors dropdown just won't populate
      }
    }
  }

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (vendorFilter !== "all") params.set("vendorId", vendorFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await apiFetch<PaginatedResponse<ProductListItem>>(`/admin/products?${params}`, { signal });
      setProducts(res.data);
      setTotal(res.total);
      // Clear selection whenever the result set changes.
      setSelectedIds(new Set());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, vendorFilter, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function priceRange(p: ProductListItem): string {
    const currency =
      (p as { currencyCode?: string | null }).currencyCode ??
      p.vendor?.currencyCode ??
      "NPR";
    if (p.priceMin != null && p.priceMax != null) {
      if (p.priceMin === p.priceMax) return formatPriceMoney(p.priceMin / 100, currency);
      return `${formatPriceMoney(p.priceMin / 100, currency)} - ${formatPriceMoney(p.priceMax / 100, currency)}`;
    }
    return "N/A";
  }

  const allSelected = useMemo(
    () => products.length > 0 && products.every((p) => selectedIds.has(p.id)),
    [products, selectedIds]
  );
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(action: "archive" | "delete") {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      if (action === "archive") {
        await apiFetch("/admin/products/bulk-update", {
          method: "POST",
          body: JSON.stringify({ ids, patch: { status: "archived" } }),
        });
        toast({ title: `Archived ${ids.length} product${ids.length === 1 ? "" : "s"}` });
      } else {
        await apiFetch("/admin/products/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast({ title: `Deleted ${ids.length} product${ids.length === 1 ? "" : "s"}` });
      }
      setSelectedIds(new Set());
      load(page);
    } catch (e: any) {
      toast({
        title: `Bulk ${action} failed`,
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setBulkBusy(false);
      setBulkAction(null);
    }
  }

  async function exportCsv() {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (vendorFilter !== "all") params.set("vendorId", vendorFilter);
      if (search.trim()) params.set("search", search.trim());
      if (selectedIds.size > 0) params.set("ids", [...selectedIds].join(","));
      // Backend exposes /admin/products/export; keep consistent with audit item.
      const res = await apiFetch<{ url: string } | { csv: string }>(
        `/admin/products/export?${params}`
      );
      if ("url" in res) {
        window.open(res.url, "_blank");
      } else if ("csv" in res) {
        const blob = new Blob([res.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "products.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`All ${brand.productNounPlural} across vendors.`}
        action={
          <Button onClick={() => navigate('/catalog/products/new')}>
            <PlusIcon className="size-4" />
            Add product
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              aria-label="Search products"
              disabled={loading}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={loading}>Search</Button>
        </form>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as ProductStatus | "all");
            setPage(1);
          }}
          disabled={loading}
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
        <Select
          value={vendorFilter}
          onValueChange={(v) => {
            setVendorFilter(v);
            setPage(1);
          }}
          disabled={loading}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk-action toolbar */}
      {selectedIds.size > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk product actions"
          className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm"
        >
          <span className="font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={bulkBusy}
            >
              <DownloadIcon className="size-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAction("archive")}
              disabled={bulkBusy}
            >
              <ArchiveIcon className="size-4" /> Archive
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkAction("delete")}
              disabled={bulkBusy}
            >
              <Trash2Icon className="size-4" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="size-10 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try adjusting your filters or search term."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected || (someSelected ? "indeterminate" : false)}
                      onCheckedChange={toggleAll}
                      aria-label={allSelected ? "Deselect all" : "Select all products"}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Price</TableHead>
                  <TableHead className="font-semibold text-right">Inventory</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const isChecked = selectedIds.has(p.id);
                  return (
                    <TableRow
                      key={p.id}
                      className="group"
                      data-state={isChecked ? "selected" : undefined}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(p.id)}
                          aria-label={`Select ${p.title}`}
                        />
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => navigate(`/catalog/products/${p.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          {p.featuredImageUrl ? (
                            <img
                              src={p.featuredImageUrl}
                              alt={p.title}
                              className="size-10 rounded object-cover border"
                            />
                          ) : (
                            <div className="flex size-10 shrink-0 items-center justify-center rounded border bg-muted">
                              <ImageIcon className="size-4 text-muted-foreground" />
                            </div>
                          )}
                          <p className="font-medium leading-tight">{p.title}</p>
                        </div>
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground cursor-pointer"
                        onClick={() => navigate(`/catalog/products/${p.id}`)}
                      >
                        {p.vendor?.name ?? vendorMap[p.vendorId] ?? p.vendorId.slice(0, 8)}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => navigate(`/catalog/products/${p.id}`)}
                      >
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground text-right cursor-pointer"
                        onClick={() => navigate(`/catalog/products/${p.id}`)}
                      >
                        {priceRange(p)}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground text-right cursor-pointer"
                        onClick={() => navigate(`/catalog/products/${p.id}`)}
                      >
                        {p.totalInventory ?? 0}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground cursor-pointer"
                        onClick={() => navigate(`/catalog/products/${p.id}`)}
                      >
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
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

      <ConfirmDialog
        open={bulkAction !== null}
        onOpenChange={(v) => !v && setBulkAction(null)}
        title={
          bulkAction === "archive"
            ? `Archive ${selectedIds.size} product${selectedIds.size === 1 ? "" : "s"}?`
            : `Delete ${selectedIds.size} product${selectedIds.size === 1 ? "" : "s"}?`
        }
        description={
          bulkAction === "archive"
            ? "Archived products are hidden from storefronts but can be restored later."
            : "This permanently deletes the selected products. This action cannot be undone."
        }
        confirmLabel={bulkAction === "archive" ? "Archive" : "Delete"}
        variant={bulkAction === "archive" ? "default" : "destructive"}
        onConfirm={() => bulkAction && runBulk(bulkAction)}
        loading={bulkBusy}
      />
    </div>
  );
}
