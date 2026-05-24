import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Vendor, PaginatedResponse, VendorStatus } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Store,
  Eye,
  Pencil,
  CheckCircle,
  XCircle,
  Ban,
} from "lucide-react";

const LIMIT = 20;
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

interface VendorWithMeta extends Vendor {
  primaryEmail?: string | null;
  countryCode?: string | null;
  commissionBps?: number | null;
  productCount?: number;
}

export function VendorListPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<VendorWithMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Status change dialog
  const [statusDialog, setStatusDialog] = useState<{
    vendor: VendorWithMeta;
    status: VendorStatus;
  } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusReason, setStatusReason] = useState("");

  async function load(p = page, status = statusFilter, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(LIMIT),
      });
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);

      const res = await apiFetch<PaginatedResponse<VendorWithMeta>>(
        `/admin/vendors?${params}`,
        { signal }
      );
      setVendors(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load vendors",
          description: e.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(page, statusFilter, controller.signal);
    return () => controller.abort();
  }, [page, statusFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(1, statusFilter);
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  async function handleStatusChange() {
    if (!statusDialog) return;
    const needsReason =
      statusDialog.status === "suspended" || statusDialog.status === "rejected";
    if (needsReason && !statusReason.trim()) {
      toast({
        title: "Reason required",
        description: `Tell the vendor why their account is being ${statusDialog.status}.`,
        variant: "destructive",
      });
      return;
    }
    setStatusSaving(true);
    try {
      await apiFetch(`/admin/vendors/${statusDialog.vendor.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: statusDialog.status,
          ...(needsReason ? { reason: statusReason.trim() } : {}),
        }),
      });
      toast({ title: `${statusDialog.vendor.name} ${statusDialog.status}` });
      setStatusDialog(null);
      setStatusReason("");
      load(page, statusFilter);
    } catch (e: any) {
      toast({
        title: "Couldn't update status",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Manage marketplace sellers and their accounts."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/vendors/approvals")}>
              <CheckCircle className="size-4" />
              Review Approvals
            </Button>
            <Button onClick={() => navigate("/vendors/new")}>
              <PlusIcon className="size-4" />
              Add Vendor
            </Button>
          </div>
        }
      />

      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search vendors by name or email"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[160px]" aria-label="Filter vendors by status">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No vendors found"
            description={
              search || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "No vendors have been added yet."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Vendor Name</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Country</TableHead>
                  <TableHead className="font-semibold text-right">Commission %</TableHead>
                  <TableHead className="font-semibold text-right">Products</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow
                    key={v.id}
                    className="group cursor-pointer"
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/vendors/${v.id}`);
                      }
                    }}
                    onClick={() => navigate(`/vendors/${v.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {v.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium leading-none truncate">
                            {v.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground truncate">
                            /{v.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={v.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.primaryEmail ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.countryCode ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {v.commissionBps != null ? `${(v.commissionBps / 100).toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {v.productCount ?? 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="w-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Vendor actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/vendors/${v.id}`);
                            }}
                          >
                            <Eye className="size-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/vendors/${v.id}/edit`);
                            }}
                          >
                            <Pencil className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* State machine:
                              - pending  → Approve | Reject
                              - active   → Suspend
                              - suspended/rejected → Reactivate (Approve) */}
                          {(v.status === "pending" || v.status === "suspended" || v.status === "rejected") && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusDialog({ vendor: v, status: "active" });
                              }}
                            >
                              <CheckCircle className="size-4 mr-2" />
                              {v.status === "pending" ? "Approve" : "Reactivate"}
                            </DropdownMenuItem>
                          )}
                          {v.status === "active" && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusDialog({ vendor: v, status: "suspended" });
                              }}
                            >
                              <Ban className="size-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          {v.status === "pending" && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusDialog({
                                  vendor: v,
                                  status: "rejected" as VendorStatus,
                                });
                              }}
                            >
                              <XCircle className="size-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              total={total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Status change dialog — reason required for suspend/reject */}
      <Dialog
        open={!!statusDialog}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDialog(null);
            setStatusReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusDialog?.status === "active"
                ? statusDialog.vendor.status === "pending"
                  ? "Approve vendor"
                  : "Reactivate vendor"
                : statusDialog?.status === "suspended"
                  ? "Suspend vendor"
                  : "Reject vendor"}
            </DialogTitle>
            <DialogDescription>
              {statusDialog?.status === "active"
                ? `Allow "${statusDialog.vendor.name}" to log in and sell on the marketplace.`
                : statusDialog?.status === "suspended"
                  ? `Hide "${statusDialog?.vendor.name}"'s products and block sign-in. They'll see the reason below in their dashboard.`
                  : `Reject "${statusDialog?.vendor.name}"'s application. Tell them why so they can address it.`}
            </DialogDescription>
          </DialogHeader>
          {(statusDialog?.status === "suspended" || statusDialog?.status === "rejected") && (
            <div className="space-y-2">
              <label htmlFor="vendor-status-reason" className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="vendor-status-reason"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={
                  statusDialog.status === "suspended"
                    ? "e.g. repeated policy violations on dropshipping rules"
                    : "e.g. KYC documents don't match the registered business name"
                }
                rows={4}
                autoFocus
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusDialog(null);
                setStatusReason("");
              }}
              disabled={statusSaving}
            >
              Cancel
            </Button>
            <Button
              variant={statusDialog?.status === "active" ? "default" : "destructive"}
              onClick={handleStatusChange}
              disabled={statusSaving}
            >
              {statusSaving
                ? "Saving…"
                : statusDialog?.status === "active"
                  ? statusDialog.vendor.status === "pending" ? "Approve" : "Reactivate"
                  : statusDialog?.status === "suspended"
                    ? "Suspend"
                    : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
