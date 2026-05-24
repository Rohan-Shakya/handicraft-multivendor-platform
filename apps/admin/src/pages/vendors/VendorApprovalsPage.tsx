import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Vendor, PaginatedResponse, VendorStatus } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  ArrowLeft,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Eye,
} from "lucide-react";

const LIMIT = 20;

interface VendorWithMeta extends Vendor {
  email?: string;
  country?: string;
}

export function VendorApprovalsPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<VendorWithMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Approve confirm dialog
  const [approveDialog, setApproveDialog] = useState<VendorWithMeta | null>(null);
  const [approveSaving, setApproveSaving] = useState(false);

  // Reject dialog with reason
  const [rejectDialog, setRejectDialog] = useState<VendorWithMeta | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(LIMIT),
        status: "pending",
      });
      const res = await apiFetch<PaginatedResponse<VendorWithMeta>>(
        `/admin/vendors?${params}`,
        { signal }
      );
      setVendors(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load approvals",
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
    load(page, controller.signal);
    return () => controller.abort();
  }, [page]);

  async function handleApprove() {
    if (!approveDialog) return;
    setApproveSaving(true);
    try {
      await apiFetch(`/admin/vendors/${approveDialog.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
      toast({ title: "Vendor approved" });
      setApproveDialog(null);
      load(page);
    } catch (e: any) {
      toast({
        title: "Action failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setApproveSaving(false);
    }
  }

  async function handleReject() {
    if (!rejectDialog) return;
    if (!rejectReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejecting this vendor.",
        variant: "destructive",
      });
      return;
    }
    setRejectSaving(true);
    try {
      await apiFetch(`/admin/vendors/${rejectDialog.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "rejected" as VendorStatus,
          reason: rejectReason.trim(),
        }),
      });
      toast({ title: "Vendor rejected" });
      setRejectDialog(null);
      setRejectReason("");
      load(page);
    } catch (e: any) {
      toast({
        title: "Action failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setRejectSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Back to vendors"
          onClick={() => navigate("/vendors")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader
          title="Vendor Approvals"
          description={`${total} vendor${total !== 1 ? "s" : ""} pending review.`}
        />
      </div>

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
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No pending approvals"
            description="All vendor applications have been reviewed. Check back later."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Vendor Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Country</TableHead>
                  <TableHead className="font-semibold">Applied</TableHead>
                  <TableHead className="font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id} className="group">
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
                    <TableCell className="text-sm text-muted-foreground">
                      {v.email ?? "---"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.country ?? "---"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/vendors/${v.id}`)}
                        >
                          <Eye className="size-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setApproveDialog(v)}
                        >
                          <CheckCircle className="size-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setRejectReason("");
                            setRejectDialog(v);
                          }}
                        >
                          <XCircle className="size-4 mr-1" />
                          Reject
                        </Button>
                      </div>
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

      {/* Approve Confirm Dialog */}
      <ConfirmDialog
        open={!!approveDialog}
        onOpenChange={(open) => !open && setApproveDialog(null)}
        title="Approve Vendor"
        description={`Are you sure you want to approve "${approveDialog?.name}"? They will be able to start selling on the marketplace.`}
        confirmLabel="Approve"
        variant="default"
        loading={approveSaving}
        onConfirm={handleApprove}
      />

      {/* Reject Dialog with Reason */}
      <Dialog
        open={!!rejectDialog}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject "{rejectDialog?.name}"? Their
              application will be rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <FormField label="Rejection reason" htmlFor="reject-reason">
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for the rejection (required)..."
                rows={3}
                maxLength={1000}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog(null);
                setRejectReason("");
              }}
              disabled={rejectSaving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectSaving || !rejectReason.trim()}
            >
              {rejectSaving ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
