import { useEffect, useState } from "react";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
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
import { RotateCcwIcon, MoreHorizontalIcon } from "lucide-react";

const LIMIT = 20;
const RETURN_STATUSES = ["requested", "approved", "rejected", "received", "cancelled"] as const;

interface ReturnRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  status: string;
  itemCount: number;
  reason: string | null;
  createdAt: string;
}

export function ReturnListPage() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Action dialog
  const [actionTarget, setActionTarget] = useState<ReturnRow | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "receive" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiFetch<PaginatedResponse<ReturnRow>>(`/admin/returns?${params}`, { signal });
      setReturns(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load returns", description: e.message, variant: "destructive" });
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

  async function handleAction() {
    if (!actionTarget || !actionType) return;
    setActionLoading(true);
    try {
      const endpoint = actionType === "receive" ? "received" : actionType;
      await apiFetch(`/admin/returns/${actionTarget.id}/${endpoint}`, { method: "POST" });
      toast({ title: `Return ${actionType === "receive" ? "marked as received" : actionType + "d"}` });
      setActionTarget(null);
      setActionType(null);
      load(page);
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  function openAction(ret: ReturnRow, type: "approve" | "reject" | "receive") {
    setActionTarget(ret);
    setActionType(type);
  }

  const actionLabels: Record<string, { title: string; desc: string; confirm: string }> = {
    approve: { title: "Approve Return", desc: "Are you sure you want to approve this return request?", confirm: "Approve" },
    reject: { title: "Reject Return", desc: "Are you sure you want to reject this return request?", confirm: "Reject" },
    receive: { title: "Mark as Received", desc: "Confirm that the returned items have been received?", confirm: "Mark Received" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns"
        description="Manage product return requests."
      />

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by return status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RETURN_STATUSES.map((s) => (
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
        ) : returns.length === 0 ? (
          <EmptyState
            icon={RotateCcwIcon}
            title="No returns found"
            description={statusFilter !== "all" ? "Try a different status filter." : "Return requests will appear here."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Return ID</TableHead>
                  <TableHead className="font-semibold">Order #</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Items</TableHead>
                  <TableHead className="font-semibold">Requested</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-bold font-mono">#{r.orderNumber}</TableCell>
                    <TableCell className="text-sm">{r.customerName ?? "Guest"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-center text-sm">{r.itemCount}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="w-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for return ${r.id.slice(0, 8)}`}>
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.status === "requested" && (
                            <>
                              <DropdownMenuItem onClick={() => openAction(r, "approve")}>
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAction(r, "reject")}>
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {r.status === "approved" && (
                            <DropdownMenuItem onClick={() => openAction(r, "receive")}>
                              Mark Received
                            </DropdownMenuItem>
                          )}
                          {!["requested", "approved"].includes(r.status) && (
                            <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Action dialog */}
      {actionType && (
        <ConfirmDialog
          open={!!actionTarget}
          onOpenChange={(open) => { if (!open) { setActionTarget(null); setActionType(null); } }}
          title={actionLabels[actionType].title}
          description={actionLabels[actionType].desc}
          confirmLabel={actionLabels[actionType].confirm}
          variant={actionType === "reject" ? "destructive" : "default"}
          loading={actionLoading}
          onConfirm={handleAction}
        />
      )}
    </div>
  );
}
