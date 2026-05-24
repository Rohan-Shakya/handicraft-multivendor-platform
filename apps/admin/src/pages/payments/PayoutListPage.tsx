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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletIcon, MoreHorizontalIcon, SearchIcon } from "lucide-react";

const LIMIT = 20;
const PAYOUT_STATUSES = ["pending", "scheduled", "paid", "failed", "cancelled"] as const;

interface PayoutRow {
  id: string;
  vendorId: string;
  status: string;
  currencyCode: string;
  totalAmount: string;
  reference: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Safely format a string money value for display */
function formatMoney(value: string | null | undefined): string {
  if (value == null) return "0.00";
  const num = parseFloat(value);
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

export function PayoutListPage() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorSearch, setVendorSearch] = useState("");

  // Status update
  const [actionTarget, setActionTarget] = useState<PayoutRow | null>(null);
  const [actionType, setActionType] = useState<"process" | "complete" | "cancel" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (vendorSearch.trim()) params.set("vendorId", vendorSearch.trim());
      const res = await apiFetch<PaginatedResponse<PayoutRow>>(`/admin/payouts?${params}`, { signal });
      setPayouts(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if ((e as any)?.name !== "AbortError") {
        toast({ title: "Failed to load payouts", description: e.message, variant: "destructive" });
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

  async function handleAction() {
    if (!actionTarget || !actionType) return;
    setActionLoading(true);
    const statusMap: Record<string, string> = {
      process: "scheduled",
      complete: "paid",
      cancel: "cancelled",
    };
    try {
      await apiFetch(`/admin/payouts/${actionTarget.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusMap[actionType] }),
      });
      const labels: Record<string, string> = {
        process: "Payout scheduled",
        complete: "Payout marked as paid",
        cancel: "Payout cancelled",
      };
      toast({ title: labels[actionType] });
      setActionTarget(null);
      setActionType(null);
      load(page);
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  function openAction(payout: PayoutRow, type: "process" | "complete" | "cancel") {
    setActionTarget(payout);
    setActionType(type);
  }

  const actionLabels: Record<string, { title: string; desc: string; confirm: string }> = {
    process: { title: "Schedule payout", desc: "Mark this payout as scheduled? It will move to 'Paid' once funds clear.", confirm: "Schedule" },
    complete: { title: "Mark as paid", desc: "Confirm this payout has been sent to the vendor?", confirm: "Mark paid" },
    cancel: { title: "Cancel payout", desc: "Are you sure you want to cancel this payout? This can't be undone.", confirm: "Cancel payout" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        description="Manage vendor payouts and disbursements."
      />

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by vendor ID..."
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            className="pl-8 w-52"
            aria-label="Search payouts by vendor ID"
          />
        </form>

        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by payout status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PAYOUT_STATUSES.map((s) => (
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
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="No payouts found"
            description={statusFilter !== "all" ? "Try adjusting your filters." : "Vendor payouts will appear here."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Payout ID</TableHead>
                  <TableHead className="font-semibold">Vendor ID</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Reference</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Paid</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}...</TableCell>
                    <TableCell className="text-sm font-mono">{p.vendorId.slice(0, 8)}...</TableCell>
                    <TableCell className="text-right font-bold">
                      ${formatMoney(p.totalAmount)}
                      <span className="text-xs text-muted-foreground ml-1 uppercase">{p.currencyCode}</span>
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.reference ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="w-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for payout ${p.id.slice(0, 8)}`}>
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {p.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => openAction(p, "process")}>
                                Schedule payout
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAction(p, "cancel")}>
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {p.status === "scheduled" && (
                            <>
                              <DropdownMenuItem onClick={() => openAction(p, "complete")}>
                                Mark as paid
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAction(p, "cancel")}>
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {!["pending", "scheduled"].includes(p.status) && (
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
          variant={actionType === "cancel" ? "destructive" : "default"}
          loading={actionLoading}
          onConfirm={handleAction}
        />
      )}
    </div>
  );
}
