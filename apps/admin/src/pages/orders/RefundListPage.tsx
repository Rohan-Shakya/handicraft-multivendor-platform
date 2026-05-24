import { useEffect, useState } from "react";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { BanknoteIcon, MoreHorizontalIcon } from "lucide-react";

const LIMIT = 20;
const REFUND_STATUSES = ["pending", "processed", "failed", "cancelled"] as const;

interface RefundRow {
  id: string;
  orderId: string;
  orderNumber: string | null;
  totalAmount: string;
  currency: string | null;
  status: string;
  reason: string | null;
  createdAt: string;
}

export function RefundListPage() {
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Process refund dialog
  const [processTarget, setProcessTarget] = useState<RefundRow | null>(null);
  const [processLoading, setProcessLoading] = useState(false);

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiFetch<PaginatedResponse<RefundRow>>(`/admin/refunds?${params}`, { signal });
      setRefunds(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load refunds", description: e.message, variant: "destructive" });
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

  async function handleProcess() {
    if (!processTarget) return;
    setProcessLoading(true);
    try {
      await apiFetch(`/admin/refunds/${processTarget.id}/process`, { method: "POST" });
      toast({ title: "Refund processed successfully" });
      setProcessTarget(null);
      load(page);
    } catch (e: any) {
      toast({ title: "Failed to process refund", description: e.message, variant: "destructive" });
    } finally {
      setProcessLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refunds"
        description="Track and process customer refunds."
      />

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by refund status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {REFUND_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
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
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : refunds.length === 0 ? (
          <EmptyState
            icon={BanknoteIcon}
            title="No refunds found"
            description={statusFilter !== "all" ? "Try a different status filter." : "Refund records will appear here."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Refund ID</TableHead>
                  <TableHead className="font-semibold">Order #</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Reason</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-bold font-mono">#{r.orderNumber ?? "—"}</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatPrice(parseFloat(r.totalAmount))}
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {r.reason ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="w-10">
                      {r.status === "pending" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for refund ${r.id.slice(0, 8)}`}>
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setProcessTarget(r)}>
                              Process Refund
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Process refund dialog */}
      <ConfirmDialog
        open={!!processTarget}
        onOpenChange={(open) => { if (!open) setProcessTarget(null); }}
        title="Process Refund"
        description={
          processTarget
            ? `Process refund of ${formatPrice(parseFloat(processTarget.totalAmount))} for order #${processTarget.orderNumber ?? processTarget.orderId.slice(0, 8)}?`
            : ""
        }
        confirmLabel="Process"
        variant="default"
        loading={processLoading}
        onConfirm={handleProcess}
      />
    </div>
  );
}
