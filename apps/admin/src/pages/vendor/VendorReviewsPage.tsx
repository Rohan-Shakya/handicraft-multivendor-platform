import { useEffect, useState } from "react";
import type { Review, ReviewStatus, PaginatedResponse, Product } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LIMIT = 20;

const STATUS_OPTIONS: Array<{ value: ReviewStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          className={cn(
            "size-3.5",
            i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating}/5</span>
    </span>
  );
}

export function VendorReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");

  // Product map for name lookup
  const [productMap, setProductMap] = useState<Record<string, string>>({});

  // Detail sheet
  const [viewing, setViewing] = useState<Review | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Fetch vendor's products for name mapping
    apiFetch<{ data: Product[] }>("/vendor/products?limit=100", { signal: controller.signal })
      .then((res) => {
        const map: Record<string, string> = {};
        res.data.forEach((p) => (map[p.id] = p.title));
        setProductMap(map);
      })
      .catch((err) => { if (err?.name !== "AbortError") { /* ignore */ } });
    return () => controller.abort();
  }, []);

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiFetch<PaginatedResponse<Review>>(`/vendor/reviews?${params}`, { signal });
      setReviews(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load reviews", description: e.message, variant: "destructive" });
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Customer reviews for your products."
      />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as ReviewStatus | "all"); setPage(1); }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by review status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={StarIcon}
            title="No reviews yet"
            description={statusFilter !== "all" ? "Try a different filter." : "Customer reviews for your products will appear here."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Rating</TableHead>
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow
                    key={r.id}
                    className="group cursor-pointer"
                    onClick={() => setViewing(r)}
                  >
                    <TableCell className="font-medium text-sm">
                      {productMap[r.productId] ?? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {r.productId.slice(0, 8)}…
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StarRating rating={r.rating} />
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">
                      {r.title ?? <span className="text-muted-foreground italic">No title</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="w-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="View review"
                        onClick={(e) => { e.stopPropagation(); setViewing(r); }}
                      >
                        <StarIcon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Review detail sheet */}
      <Sheet open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Review Detail</SheetTitle>
            <SheetDescription>
              {viewing && productMap[viewing.productId]
                ? `Review for "${productMap[viewing.productId]}"`
                : "Customer review"}
            </SheetDescription>
          </SheetHeader>
          {viewing && (
            <SheetBody>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rating</p>
                    <div className="mt-2">
                      <StarRating rating={viewing.rating} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                    <div className="mt-2">
                      <StatusBadge status={viewing.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product</p>
                    <p className="mt-1.5 text-sm font-medium">
                      {productMap[viewing.productId] ?? viewing.productId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="mt-1.5 text-sm font-medium">
                      {new Date(viewing.createdAt).toLocaleDateString(undefined, {
                        month: "long", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {viewing.title && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Title</p>
                      <p className="text-sm font-semibold">{viewing.title}</p>
                    </div>
                  </>
                )}

                {viewing.body && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Review</p>
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {viewing.body}
                      </p>
                    </div>
                  </>
                )}

                {viewing.status === "pending" && (
                  <>
                    <Separator />
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      This review is pending admin moderation before it appears on the storefront.
                    </div>
                  </>
                )}
              </div>
            </SheetBody>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
