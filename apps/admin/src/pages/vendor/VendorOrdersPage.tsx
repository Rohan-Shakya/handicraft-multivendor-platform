import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShoppingCart, MoreHorizontalIcon } from "lucide-react";
import { formatPrice } from "@/lib/format";

const LIMIT = 20;

type VendorOrderStatus = "draft" | "open" | "completed" | "cancelled" | "archived";

interface VendorOrder {
  id: string;
  orderId: string;
  vendorOrderNumber: string;
  status: VendorOrderStatus;
  paymentStatus: string;
  fulfillmentStatus: string;
  deliveryStatus: string;
  itemCount: number;
  subtotalPrice: string;
  totalPrice: string;
  placedAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

const ALL_STATUSES: VendorOrderStatus[] = [
  "open",
  "completed",
  "cancelled",
  "archived",
];

// Statuses a vendor is allowed to transition to
const NEXT_STATUSES: Record<string, VendorOrderStatus[]> = {
  draft:     ["open", "cancelled"],
  open:      ["completed", "cancelled"],
  completed: ["archived"],
  cancelled: [],
  archived:  [],
};

const STATUS_LABEL: Record<string, string> = {
  draft:     "Draft",
  open:      "Open",
  completed: "Completed",
  cancelled: "Cancelled",
  archived:  "Archived",
};

export function VendorOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<VendorOrderStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiFetch<PaginatedResponse<VendorOrder>>(`/vendor/orders?${params}`, { signal });
      setOrders(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load orders", description: e.message, variant: "destructive" });
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

  async function handleUpdateStatus(order: VendorOrder, status: VendorOrderStatus) {
    setUpdatingId(order.id);
    try {
      await apiFetch(`/vendor/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: `Status updated to "${STATUS_LABEL[status]}"` });
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status } : o));
    } catch (e: any) {
      toast({ title: "Failed to update status", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Manage orders for your products."
      />

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as VendorOrderStatus | "all"); setPage(1); }}
        >
          <SelectTrigger className="w-48" aria-label="Filter by order status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
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
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders found"
            description={statusFilter !== "all" ? "Try a different filter." : "Orders for your products will appear here."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Order #</TableHead>
                  <TableHead className="font-semibold">Items</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Fulfillment</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
                  const isBusy = updatingId === order.id;
                  return (
                    <TableRow
                      key={order.id}
                      className="group cursor-pointer"
                      onClick={() => navigate(`/vendor/orders/${order.id}`)}
                    >
                      <TableCell className="font-medium text-sm">
                        <Link
                          to={`/vendor/orders/${order.id}`}
                          className="hover:text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.vendorOrderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatPrice(Number(order.totalPrice))}
                      </TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell><StatusBadge status={order.fulfillmentStatus} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.placedAt).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        {nextStatuses.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Order actions"
                                disabled={isBusy}
                              >
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Update status</p>
                              <DropdownMenuSeparator />
                              {nextStatuses.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleUpdateStatus(order, s)}
                                  disabled={isBusy}
                                  variant={s === "cancelled" ? "destructive" : "default"}
                                >
                                  {STATUS_LABEL[s]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
    </div>
  );
}
