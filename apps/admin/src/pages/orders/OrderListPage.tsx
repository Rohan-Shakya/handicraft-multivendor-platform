import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUrlState } from "@/hooks/useUrlState";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { ShoppingCartIcon, SearchIcon, PlusIcon } from "lucide-react";

const LIMIT = 20;

const ORDER_STATUSES = ["draft", "open", "completed", "cancelled", "archived"] as const;
const PAYMENT_STATUSES = ["pending", "authorized", "partially_paid", "paid", "partially_refunded", "refunded", "voided", "failed"] as const;
const FULFILLMENT_STATUSES = ["unfulfilled", "partially_fulfilled", "fulfilled", "returned", "cancelled"] as const;
const DATE_RANGES = [
  { label: "All time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
] as const;

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  itemCount: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
}

export function OrderListPage() {
  const navigate = useNavigate();
  const { actor } = useAuth();
  const canCreateDraft = actor ? hasPermission(actor, "order:create:any") : false;
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters — URL-synced so refresh / share / back-button preserve view.
  const [page, setPage] = useUrlState<number>("page", 1, { parse: Number });
  const [search, setSearch] = useUrlState<string>("search", "");
  const [statusFilter, setStatusFilter] = useUrlState<string>("status", "all");
  const [paymentFilter, setPaymentFilter] = useUrlState<string>("paymentStatus", "all");
  const [fulfillmentFilter, setFulfillmentFilter] = useUrlState<string>("fulfillmentStatus", "all");
  const [dateRange, setDateRange] = useUrlState<string>("dateRange", "all");

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
      if (fulfillmentFilter !== "all") params.set("fulfillmentStatus", fulfillmentFilter);
      if (dateRange !== "all") params.set("dateRange", dateRange);
      const res = await apiFetch<PaginatedResponse<OrderRow>>(`/admin/orders?${params}`, { signal });
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
  }, [page, statusFilter, paymentFilter, fulfillmentFilter, dateRange]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="View and manage all customer orders."
        action={
          canCreateDraft ? (
            <Button onClick={() => navigate("/orders/new")}>
              <PlusIcon className="size-4 mr-1" /> New draft order
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-56"
            aria-label="Search by order number"
          />
        </form>

        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40" aria-label="Filter by order status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentFilter}
          onValueChange={(v) => { setPaymentFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by payment status">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={fulfillmentFilter}
          onValueChange={(v) => { setFulfillmentFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-48" aria-label="Filter by fulfillment status">
            <SelectValue placeholder="Fulfillment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fulfillment</SelectItem>
            {FULFILLMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={dateRange}
          onValueChange={(v) => { setDateRange(v); setPage(1); }}
        >
          <SelectTrigger className="w-36" aria-label="Filter by date range">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
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
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCartIcon}
            title="No orders found"
            description={
              search || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "Orders will appear here once customers start purchasing."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Order #</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold text-center">Items</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold">Payment</TableHead>
                  <TableHead className="font-semibold">Fulfillment</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/orders/${o.id}`);
                      }
                    }}
                    onClick={() => navigate(`/orders/${o.id}`)}
                  >
                    <TableCell className="font-bold font-mono">#{o.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{o.customerName ?? "Guest"}</p>
                        {o.customerEmail && (
                          <p className="text-xs text-muted-foreground">{o.customerEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{o.itemCount}</TableCell>
                    <TableCell className="text-right font-bold">{formatPrice(o.totalPrice)}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.fulfillmentStatus} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
