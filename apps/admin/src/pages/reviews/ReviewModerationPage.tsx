import { useEffect, useState } from "react";
import type { Review, ReviewStatus, PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ImageIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LIMIT = 20;

const STATUS_OPTIONS: Array<{ value: ReviewStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
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
            i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating}/5</span>
    </span>
  );
}

export function ReviewModerationPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Per-row moderation loading state
  const [moderating, setModerating] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeReview, setActiveReview] = useState<Review | null>(null);

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiFetch<PaginatedResponse<Review>>(`/admin/reviews?${params}`, { signal });
      setReviews(res.data);
      setTotal(res.total);
      setSelected(new Set());
    } catch (e: any) {
      if ((e as any)?.name !== "AbortError") {
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

  async function moderate(reviewId: string, status: "published" | "rejected") {
    setModerating((prev) => ({ ...prev, [reviewId]: true }));
    try {
      await apiFetch(`/admin/reviews/${reviewId}/moderate`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({
        title: status === "published" ? "Review approved" : "Review rejected",
        description: `Review has been ${status}.`,
      });
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
      );
      // Update active review if open in drawer
      if (activeReview?.id === reviewId) {
        setActiveReview((prev) => (prev ? { ...prev, status } : prev));
      }
    } catch (e: any) {
      toast({ title: "Moderation failed", description: e.message, variant: "destructive" });
    } finally {
      setModerating((prev) => ({ ...prev, [reviewId]: false }));
    }
  }

  async function bulkModerate(status: "published" | "rejected") {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) =>
          apiFetch(`/admin/reviews/${id}/moderate`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
          })
        )
      );
      const succeeded = ids.filter((_, i) => results[i].status === "fulfilled");
      const failed = ids.length - succeeded.length;
      if (succeeded.length > 0) {
        const succeededSet = new Set(succeeded);
        setReviews((prev) =>
          prev.map((r) => (succeededSet.has(r.id) ? { ...r, status } : r))
        );
      }
      if (failed > 0) {
        toast({
          title: `${succeeded.length} ${status}, ${failed} failed`,
          description: "Some reviews could not be moderated.",
          variant: "destructive",
        });
      } else {
        toast({
          title: `${ids.length} review(s) ${status}`,
          description: "Bulk moderation complete.",
        });
      }
      setSelected(new Set());
    } catch (e: any) {
      toast({ title: "Bulk moderation failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === reviews.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(reviews.map((r) => r.id)));
    }
  }

  function openDetail(review: Review) {
    setActiveReview(review);
    setDrawerOpen(true);
  }

  const allSelected = reviews.length > 0 && selected.size === reviews.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Moderation"
        description="Moderate customer product reviews. Approve or reject reviews individually or in bulk."
      />

      {/* Filters + bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as ReviewStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by review status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button
              size="sm"
              onClick={() => bulkModerate("published")}
              disabled={bulkLoading}
            >
              <CheckCircleIcon className="size-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => bulkModerate("rejected")}
              disabled={bulkLoading}
            >
              <XCircleIcon className="size-4" /> Reject
            </Button>
          </div>
        )}
      </div>

      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={StarIcon}
            title="No reviews found"
            description={
              statusFilter !== "all"
                ? "Try a different status filter."
                : "Reviews will appear here once customers submit them."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all reviews"
                      className="size-4 rounded border-gray-300 accent-primary"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Rating</TableHead>
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => {
                  const isBusy = moderating[r.id] ?? false;
                  return (
                    <TableRow key={r.id} className="group">
                      <TableCell className="w-10">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          aria-label={`Select review by ${(r as any).customerName ?? "customer"}`}
                          className="size-4 rounded border-gray-300 accent-primary"
                        />
                      </TableCell>
                      <TableCell
                        className="text-sm cursor-pointer hover:underline"
                        onClick={() => openDetail(r)}
                      >
                        {(r as any).productName ?? r.productId.slice(0, 8) + "..."}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(r as any).customerName ?? (r as any).customerId?.slice(0, 8) + "..."}
                      </TableCell>
                      <TableCell>
                        <StarRating rating={r.rating} />
                      </TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {r.title ?? <span className="text-muted-foreground italic">--</span>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="w-24">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {r.status !== "published" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => moderate(r.id, "published")}
                              disabled={isBusy}
                              title="Approve"
                              aria-label="Approve review"
                            >
                              <CheckCircleIcon className="size-4" />
                            </Button>
                          )}
                          {r.status !== "rejected" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => moderate(r.id, "rejected")}
                              disabled={isBusy}
                              title="Reject"
                              aria-label="Reject review"
                            >
                              <XCircleIcon className="size-4" />
                            </Button>
                          )}
                        </div>
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

      {/* Review Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Review Detail</SheetTitle>
            <SheetDescription>Full review information and moderation actions.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            {activeReview && (
              <div className="space-y-6">
                {/* Status + verified badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={activeReview.status} />
                  {(activeReview as any).verifiedPurchase && (
                    <Badge variant="outline" className="gap-1 text-green-700 border-green-200 bg-green-50">
                      <ShieldCheckIcon className="size-3" /> Verified Purchase
                    </Badge>
                  )}
                </div>

                {/* Rating */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Rating
                  </p>
                  <StarRating rating={activeReview.rating} />
                </div>

                {/* Title */}
                {activeReview.title && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Title
                    </p>
                    <p className="text-sm font-medium">{activeReview.title}</p>
                  </div>
                )}

                {/* Comment */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Comment
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {(activeReview as any).comment || (activeReview as any).body || "No comment provided."}
                  </p>
                </div>

                {/* Media attachments */}
                {(activeReview as any).media && (activeReview as any).media.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Media Attachments
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(activeReview as any).media.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square rounded-md border overflow-hidden bg-muted flex items-center justify-center hover:opacity-80 transition-opacity"
                        >
                          <img src={url} alt={`Attachment ${i + 1}`} className="object-cover w-full h-full" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {(!((activeReview as any).media) || (activeReview as any).media?.length === 0) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="size-4" />
                    No media attachments
                  </div>
                )}

                {/* Product + Customer links */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Product</span>
                    <a
                      href={`/products/${activeReview.productId}`}
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {(activeReview as any).productName ?? activeReview.productId.slice(0, 8) + "..."}
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Customer</span>
                    <a
                      href={`/customers/${(activeReview as any).customerId}`}
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {(activeReview as any).customerName ?? (activeReview as any).customerId?.slice(0, 8) + "..."}
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="text-sm">
                      {new Date(activeReview.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  {activeReview.status !== "published" && (
                    <Button
                      onClick={() => moderate(activeReview.id, "published")}
                      disabled={moderating[activeReview.id] ?? false}
                      className="flex-1"
                    >
                      <CheckCircleIcon className="size-4" /> Approve
                    </Button>
                  )}
                  {activeReview.status !== "rejected" && (
                    <Button
                      variant="destructive"
                      onClick={() => moderate(activeReview.id, "rejected")}
                      disabled={moderating[activeReview.id] ?? false}
                      className="flex-1"
                    >
                      <XCircleIcon className="size-4" /> Reject
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
