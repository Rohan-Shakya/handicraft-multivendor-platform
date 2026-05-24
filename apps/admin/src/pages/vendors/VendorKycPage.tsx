import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ShieldCheck,
  FileText,
  Eye,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type KycStatus = "pending" | "under_review" | "approved" | "rejected";

interface KycDocument {
  id: string;
  vendorKycId: string;
  documentType: string;
  fileId: string;
  createdAt: string;
}

interface KycSubmission {
  id: string;
  vendorId: string;
  status: KycStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  documents: KycDocument[];
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export function VendorKycPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Review sheet
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Approve confirm
  const [approveDialog, setApproveDialog] = useState<KycSubmission | null>(
    null
  );
  const [approveSaving, setApproveSaving] = useState(false);

  // Reject dialog with reason
  const [rejectDialog, setRejectDialog] = useState<KycSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const queryString = params.toString();
      const url = queryString ? `/admin/kyc?${queryString}` : "/admin/kyc";
      const res = await apiFetch<KycSubmission[] | { data: KycSubmission[] }>(
        url,
        { signal }
      );
      // Handle both bare array and paginated { data: [...] } response
      const data = Array.isArray(res) ? res : res.data;
      setSubmissions(data);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load KYC submissions",
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
    load(controller.signal);
    return () => controller.abort();
  }, [statusFilter]);

  function openReview(kyc: KycSubmission) {
    setSelectedKyc(kyc);
    setSheetOpen(true);
  }

  async function handleApprove() {
    if (!approveDialog) return;
    setApproveSaving(true);
    try {
      await apiFetch(`/admin/kyc/${approveDialog.id}/approve`, {
        method: "POST",
      });
      toast({ title: "KYC approved" });
      setApproveDialog(null);
      setSheetOpen(false);
      load();
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
        description: "Please provide a reason for rejecting this KYC.",
        variant: "destructive",
      });
      return;
    }
    setRejectSaving(true);
    try {
      await apiFetch(`/admin/kyc/${rejectDialog.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      toast({ title: "KYC rejected" });
      setRejectDialog(null);
      setRejectReason("");
      setSheetOpen(false);
      load();
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

  const canReview = (status: string) =>
    status === "pending" || status === "under_review";

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
          title="KYC Reviews"
          description="Review and verify vendor KYC submissions."
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" size="sm" aria-label="Filter KYC submissions by status">
            <SelectValue placeholder="Filter by status" />
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

      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No KYC submissions"
            description="There are no KYC submissions matching the current filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Vendor ID</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Submitted</TableHead>
                <TableHead className="font-semibold text-right">
                  Documents
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((kyc) => (
                <TableRow
                  key={kyc.id}
                  className="group cursor-pointer"
                  tabIndex={0}
                  role="link"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openReview(kyc);
                    }
                  }}
                  onClick={() => openReview(kyc)}
                >
                  <TableCell>
                    <p className="text-sm font-medium font-mono truncate max-w-[200px]">
                      {kyc.vendorId}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={kyc.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {kyc.submittedAt
                      ? new Date(kyc.submittedAt).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )
                      : "---"}
                  </TableCell>
                  <TableCell className="text-sm text-right font-medium">
                    {kyc.documents.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openReview(kyc);
                      }}
                    >
                      <Eye className="size-4 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* KYC Review Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>KYC Review</SheetTitle>
            <SheetDescription>
              {selectedKyc
                ? `Reviewing KYC submission ${selectedKyc.id}`
                : "Review vendor KYC documents"}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {selectedKyc && (
              <div className="space-y-6">
                {/* KYC Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Status</h4>
                  <StatusBadge status={selectedKyc.status} />
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1">Vendor ID</h4>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedKyc.vendorId}
                  </p>
                </div>

                {selectedKyc.submittedAt && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Submitted</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedKyc.submittedAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                )}

                {selectedKyc.reviewedAt && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Reviewed</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedKyc.reviewedAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                )}

                {/* Documents List */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">
                    Documents ({selectedKyc.documents.length})
                  </h4>
                  {selectedKyc.documents.length === 0 ? (
                    <div className="py-6 text-center border rounded-lg">
                      <FileText className="size-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No documents uploaded
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedKyc.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <div className="rounded-lg bg-muted p-2 shrink-0">
                            <FileText className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium capitalize">
                              {doc.documentType.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              File: {doc.fileId}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick link to vendor detail */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSheetOpen(false);
                    navigate(`/vendors/${selectedKyc.vendorId}`);
                  }}
                >
                  View Vendor
                </Button>
              </div>
            )}
          </SheetBody>
          {selectedKyc && canReview(selectedKyc.status) && (
            <SheetFooter>
              <Button
                variant="destructive"
                onClick={() => {
                  setRejectReason("");
                  setRejectDialog(selectedKyc);
                }}
              >
                <XCircle className="size-4 mr-1" />
                Reject
              </Button>
              <Button onClick={() => setApproveDialog(selectedKyc)}>
                <CheckCircle className="size-4 mr-1" />
                Approve
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve Confirm Dialog */}
      <Dialog
        open={!!approveDialog}
        onOpenChange={(open) => !open && setApproveDialog(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve KYC</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this KYC submission?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog(null)}
              disabled={approveSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveSaving}>
              {approveSaving ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Reject KYC</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this KYC submission. This reason
              will be shared with the vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)..."
              rows={3}
              maxLength={1000}
            />
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
