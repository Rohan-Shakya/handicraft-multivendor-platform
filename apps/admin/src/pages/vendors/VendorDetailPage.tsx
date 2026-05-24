import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import type { VendorStatus } from "@repo/types";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Edit,
  Trash2,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Percent,
  Mail,
  Phone,
  MapPin,
  Shield,
  FileText,
  Store,
  Globe,
  CheckCircle,
  XCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VendorAddress {
  id: string;
  type: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
}

interface KycDocument {
  id: string;
  type?: string | null;
  fileName?: string | null;
  url?: string | null;
  uploadedAt?: string | null;
}

interface VendorKyc {
  id: string;
  status: string;
  submittedAt?: string;
  documents: KycDocument[];
}

interface VendorOrder {
  id: string;
  vendorOrderNumber?: string;
  orderNumber?: string;
  totalPrice: number;
  status: string;
  createdAt: string;
}

interface VendorMembership {
  id: string;
  userId: string;
  role: string;
  status: string;
  userEmail: string;
  userFirstName?: string | null;
  userLastName?: string | null;
}

interface VendorDetail {
  id: string;
  name: string;
  slug: string;
  status: VendorStatus;
  bio: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryEmail: string | null;
  supportEmail: string | null;
  billingEmail: string | null;
  primaryPhone: string | null;
  supportPhone: string | null;
  countryCode: string | null;
  currencyCode: string | null;
  timezone: string | null;
  legalName: string | null;
  vatNumber: string | null;
  taxId: string | null;
  registrationNumber: string | null;
  commissionBps: number;
  seoTitle: string | null;
  seoDescription: string | null;
  approvedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  // Statistics
  productCount: number;
  totalOrders: number;
  totalRevenue: string;
  memberCount: number;
  kycStatus: string | null;
  // Related data
  addresses: VendorAddress[];
  kyc: VendorKyc | null;
  recentOrders: VendorOrder[];
  memberships: VendorMembership[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: string | number, currency?: string | null): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return formatPrice(0, currency);
  return formatPrice(num, currency);
}

function formatDate(
  date: string | Date,
  style: "short" | "long" = "short"
): string {
  const d = new Date(date);
  if (style === "long") {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCommission(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

function formatAddress(address: VendorAddress): string {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function memberDisplayName(m: VendorMembership): string {
  const parts = [m.userFirstName, m.userLastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : m.userEmail;
}

// ─── Muted placeholder for empty values ─────────────────────────────────────

function MutedText({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

function FieldValue({ value }: { value: string | null | undefined }) {
  if (!value) return <MutedText>Not set</MutedText>;
  return <>{value}</>;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-muted p-2">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sidebar Detail Row ─────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && (
        <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function VendorDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="flex-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Two column skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // KYC action dialog
  const [kycAction, setKycAction] = useState<"approved" | "rejected" | null>(
    null
  );
  const [kycSaving, setKycSaving] = useState(false);

  // Status dialog
  const [statusDialog, setStatusDialog] = useState<{
    status: VendorStatus;
  } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadVendor(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<VendorDetail>(`/admin/vendors/${id}`, { signal });
      setVendor(data);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e.message ?? "Failed to load vendor");
        toast({
          title: "Failed to load vendor",
          description: e.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      const controller = new AbortController();
      loadVendor(controller.signal);
      return () => controller.abort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange() {
    if (!statusDialog || !vendor) return;
    setStatusSaving(true);
    try {
      await apiFetch(`/admin/vendors/${vendor.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusDialog.status }),
      });
      toast({ title: `Vendor ${statusDialog.status}` });
      setStatusDialog(null);
      loadVendor();
    } catch (e: any) {
      toast({
        title: "Failed to update status",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleKycAction() {
    if (!kycAction || !vendor?.kyc) return;
    setKycSaving(true);
    try {
      const endpoint = kycAction === "approved" ? "approve" : "reject";
      await apiFetch(`/admin/kyc/${vendor.kyc.id}/${endpoint}`, {
        method: "POST",
        body: kycAction === "rejected" ? JSON.stringify({}) : undefined,
      });
      toast({
        title: `KYC ${kycAction === "approved" ? "approved" : "rejected"}`,
      });
      setKycAction(null);
      loadVendor();
    } catch (e: any) {
      toast({
        title: "Failed to update KYC status",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setKycSaving(false);
    }
  }

  async function handleDelete() {
    if (!vendor) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/vendors/${vendor.id}`, { method: "DELETE" });
      toast({ title: "Vendor deleted" });
      navigate("/vendors");
    } catch (e: any) {
      toast({
        title: "Failed to delete vendor",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return <VendorDetailSkeleton />;
  }

  // ─── Error / Not Found ──────────────────────────────────────────────────────

  if (error || !vendor) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/vendors")}
        >
          <ArrowLeft className="size-4 mr-1" />
          Back to Vendors
        </Button>
        <Card className="border shadow-none">
          <CardContent className="py-12">
            <EmptyState
              icon={Store}
              title="Vendor not found"
              description={
                error ?? "The vendor you're looking for doesn't exist."
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeMemberships = vendor.memberships.filter(
    (m) => m.status === "active"
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Back to vendors"
            onClick={() => navigate("/vendors")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold truncate">{vendor.name}</h1>
              <StatusBadge status={vendor.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              /{vendor.slug}
              <span className="mx-2">·</span>
              Joined {formatDate(vendor.createdAt, "long")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-11 sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
          >
            <Edit className="size-4 mr-1.5" />
            Edit vendor
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* ── Suspension / Rejection Banner ───────────────────────────────────── */}
      {vendor.status === "suspended" && vendor.suspensionReason && (
        <Card className="border-red-200 bg-red-50 shadow-none dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-400">
              Suspended
              {vendor.suspendedAt && (
                <span className="font-normal">
                  {" "}
                  on {formatDate(vendor.suspendedAt)}
                </span>
              )}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {vendor.suspensionReason}
            </p>
          </CardContent>
        </Card>
      )}

      {vendor.status === "pending" && vendor.rejectionReason && (
        <Card className="border-orange-200 bg-orange-50 shadow-none dark:border-orange-900 dark:bg-orange-950/30">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-400">
              Previously rejected
              {vendor.rejectedAt && (
                <span className="font-normal">
                  {" "}
                  on {formatDate(vendor.rejectedAt)}
                </span>
              )}
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              {vendor.rejectionReason}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Bar ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={formatCurrency(vendor.totalRevenue)}
        />
        <StatCard
          icon={ShoppingCart}
          label="Orders"
          value={vendor.totalOrders}
        />
        <StatCard
          icon={Package}
          label="Products"
          value={vendor.productCount}
        />
        <StatCard
          icon={Users}
          label="Members"
          value={vendor.memberCount}
        />
        <StatCard
          icon={Percent}
          label="Commission"
          value={formatCommission(vendor.commissionBps)}
        />
      </div>

      {/* ── Two-Column Grid ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main Column ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Orders */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Recent Orders</CardTitle>
                {vendor.recentOrders.length > 0 && (
                  <Button variant="link" size="sm" className="h-auto p-0" asChild>
                    <Link to={`/orders?vendor=${vendor.id}`}>
                      View all orders
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {vendor.recentOrders.length > 0 ? (
                <div className="overflow-x-auto -mx-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold pl-6">
                          Order
                        </TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">
                          Total
                        </TableHead>
                        <TableHead className="font-semibold pr-6">
                          Date
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendor.recentOrders.slice(0, 5).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm font-bold pl-6">
                            #{order.vendorOrderNumber ?? order.orderNumber ?? order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-right">
                            {formatCurrency(order.totalPrice)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground pr-6">
                            {formatDate(order.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={ShoppingCart}
                  title="No orders yet"
                  description="Orders from this vendor will appear here."
                />
              )}
            </CardContent>
          </Card>

          {/* KYC Verification */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">KYC Verification</CardTitle>
                {vendor.kyc?.status && (
                  <StatusBadge status={vendor.kyc.status} />
                )}
              </div>
              {vendor.kyc?.submittedAt && (
                <p className="text-xs text-muted-foreground">
                  Submitted {formatDate(vendor.kyc.submittedAt, "long")}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {vendor.kyc &&
              vendor.kyc.documents &&
              vendor.kyc.documents.length > 0 ? (
                <>
                  <div className="overflow-x-auto -mx-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold pl-6">
                            Document
                          </TableHead>
                          <TableHead className="font-semibold">Type</TableHead>
                          <TableHead className="font-semibold pr-6">
                            Uploaded
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendor.kyc.documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="text-sm font-medium pl-6">
                              <div className="flex items-center gap-2">
                                <FileText className="size-4 text-muted-foreground shrink-0" />
                                {doc.url ? (
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {doc.fileName ?? "Untitled document"}
                                  </a>
                                ) : (
                                  doc.fileName ?? "Untitled document"
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground capitalize">
                              {(doc.type ?? "—").replace(/_/g, " ")}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground pr-6">
                              {doc.uploadedAt ? formatDate(doc.uploadedAt) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Approve / Reject buttons when KYC is under_review */}
                  {vendor.kyc.status === "under_review" && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        onClick={() => setKycAction("approved")}
                      >
                        <CheckCircle className="size-4 mr-1.5" />
                        Approve KYC
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setKycAction("rejected")}
                      >
                        <XCircle className="size-4 mr-1.5" />
                        Reject KYC
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={Shield}
                  title="No KYC submitted"
                  description="KYC documents will appear here once the vendor submits them."
                />
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Team Members</CardTitle>
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link to={`/vendors/${vendor.id}/memberships`}>
                    Manage memberships
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeMemberships.length > 0 ? (
                <div className="overflow-x-auto -mx-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold pl-6">
                          Name
                        </TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="font-semibold pr-6">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeMemberships.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="text-sm font-medium pl-6">
                            {memberDisplayName(member)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {member.userEmail}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {member.role.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6">
                            <StatusBadge status={member.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No team members"
                  description="This vendor has no active team members."
                />
              )}
            </CardContent>
          </Card>

          {/* Metafields Placeholder */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">Metafields</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Metafields will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Contact Details */}
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contact Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                <DetailRow
                  icon={Mail}
                  label="Primary email"
                  value={<FieldValue value={vendor.primaryEmail} />}
                />
                <DetailRow
                  icon={Mail}
                  label="Support email"
                  value={<FieldValue value={vendor.supportEmail} />}
                />
                <DetailRow
                  icon={Phone}
                  label="Primary phone"
                  value={<FieldValue value={vendor.primaryPhone} />}
                />
                <DetailRow
                  icon={Globe}
                  label="Country"
                  value={<FieldValue value={vendor.countryCode} />}
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Business Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                <DetailRow
                  icon={Store}
                  label="Legal name"
                  value={<FieldValue value={vendor.legalName} />}
                />
                <DetailRow
                  icon={FileText}
                  label="VAT number"
                  value={<FieldValue value={vendor.vatNumber} />}
                />
                <DetailRow
                  icon={FileText}
                  label="Tax ID"
                  value={<FieldValue value={vendor.taxId} />}
                />
                <DetailRow
                  icon={FileText}
                  label="Registration number"
                  value={<FieldValue value={vendor.registrationNumber} />}
                />
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              {vendor.addresses.length > 0 ? (
                <div className="space-y-3">
                  {vendor.addresses.map((address) => (
                    <div
                      key={address.id}
                      className="rounded-md border p-3 text-sm"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs capitalize">
                          {address.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {formatAddress(address)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No addresses added.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Bio */}
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bio</CardTitle>
            </CardHeader>
            <CardContent>
              {vendor.bio ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {vendor.bio}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No bio added.</p>
              )}
            </CardContent>
          </Card>

          {/* SEO */}
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SEO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Title</p>
                  <p className="text-sm">
                    <FieldValue value={vendor.seoTitle} />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Description
                  </p>
                  <p className="text-sm">
                    <FieldValue value={vendor.seoDescription} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}

      {/* Status Confirm Dialog */}
      <ConfirmDialog
        open={!!statusDialog}
        onOpenChange={(open) => !open && setStatusDialog(null)}
        title={`${
          statusDialog?.status === "active"
            ? "Approve"
            : statusDialog?.status === "suspended"
              ? "Suspend"
              : "Reject"
        } Vendor`}
        description={`Are you sure you want to ${
          statusDialog?.status === "active"
            ? "approve"
            : statusDialog?.status === "suspended"
              ? "suspend"
              : "reject"
        } "${vendor.name}"? This action will take effect immediately.`}
        confirmLabel="Confirm"
        variant={statusDialog?.status === "active" ? "default" : "destructive"}
        loading={statusSaving}
        onConfirm={handleStatusChange}
      />

      {/* KYC Confirm Dialog */}
      <ConfirmDialog
        open={!!kycAction}
        onOpenChange={(open) => !open && setKycAction(null)}
        title={`${kycAction === "approved" ? "Approve" : "Reject"} KYC`}
        description={`Are you sure you want to ${
          kycAction === "approved" ? "approve" : "reject"
        } the KYC submission for "${vendor.name}"?`}
        confirmLabel={kycAction === "approved" ? "Approve" : "Reject"}
        variant={kycAction === "approved" ? "default" : "destructive"}
        loading={kycSaving}
        onConfirm={handleKycAction}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Vendor"
        description={`Are you sure you want to delete "${vendor.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
