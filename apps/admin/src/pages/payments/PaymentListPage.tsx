import { useEffect, useState } from "react";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCardIcon } from "lucide-react";

const LIMIT = 20;
const PAYMENT_STATUSES = ["pending", "authorized", "captured", "partially_refunded", "refunded", "failed", "cancelled"] as const;
const PROVIDERS = ["stripe", "paypal", "esewa", "khalti", "cod", "manual"] as const;

interface PaymentRow {
  id: string;
  orderId: string;
  customerId: string;
  provider: string;
  providerPaymentId: string | null;
  currencyCode: string;
  status: string;
  amountAuthorized: string;
  amountCaptured: string;
  amountRefunded: string;
  isTest: boolean;
  metadata: Record<string, any> | null;
  authorizedAt: string | null;
  capturedAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Safely format a string money value in the given currency. */
function formatMoney(value: string | null | undefined, currency?: string | null): string {
  if (value == null) return formatPrice(0, currency);
  const num = parseFloat(value);
  return formatPrice(isNaN(num) ? 0 : num, currency);
}

export function PaymentListPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");

  // Detail sheet
  const [viewing, setViewing] = useState<PaymentRow | null>(null);

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (providerFilter !== "all") params.set("provider", providerFilter);
      const res = await apiFetch<PaginatedResponse<PaymentRow>>(`/admin/payments?${params}`, { signal });
      setPayments(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if ((e as any)?.name !== "AbortError") {
        toast({ title: "Failed to load payments", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(page, controller.signal);
    return () => controller.abort();
  }, [page, statusFilter, providerFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="View all payment transactions."
      />

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by payment status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={providerFilter}
          onValueChange={(v) => { setProviderFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40" aria-label="Filter by payment provider">
            <SelectValue placeholder="All providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {PROVIDERS.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">
                {p.charAt(0).toUpperCase() + p.slice(1)}
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
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCardIcon}
            title="No payments found"
            description={statusFilter !== "all" ? "Try adjusting your filters." : "Payment records will appear here."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Payment ID</TableHead>
                  <TableHead className="font-semibold">Order</TableHead>
                  <TableHead className="font-semibold">Provider</TableHead>
                  <TableHead className="font-semibold text-right">Captured</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => setViewing(p)}
                  >
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">{p.orderId.slice(0, 8)}...</TableCell>
                    <TableCell className="capitalize text-sm">{p.provider}</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatMoney(p.amountCaptured, p.currencyCode)}
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Payment Detail Sheet */}
      <Sheet open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Payment Details</SheetTitle>
            <SheetDescription>Transaction information</SheetDescription>
          </SheetHeader>
          <SheetBody>
            {viewing && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Payment ID" value={viewing.id} mono />
                  <DetailField label="Order ID" value={viewing.orderId} mono />
                  <DetailField label="Customer ID" value={viewing.customerId} mono />
                  <DetailField label="Status">
                    <StatusBadge status={viewing.status} />
                  </DetailField>
                  <DetailField label="Provider" value={viewing.provider} capitalize />
                  <DetailField label="Provider Payment ID" value={viewing.providerPaymentId ?? "-"} mono />
                  <DetailField label="Authorized" value={formatMoney(viewing.amountAuthorized, viewing.currencyCode)} bold />
                  <DetailField label="Captured" value={formatMoney(viewing.amountCaptured, viewing.currencyCode)} bold />
                  <DetailField label="Refunded" value={formatMoney(viewing.amountRefunded, viewing.currencyCode)} />
                  <DetailField label="Test Payment" value={viewing.isTest ? "Yes" : "No"} />
                  <DetailField label="Authorized At" value={viewing.authorizedAt ? new Date(viewing.authorizedAt).toLocaleString() : "-"} />
                  <DetailField label="Captured At" value={viewing.capturedAt ? new Date(viewing.capturedAt).toLocaleString() : "-"} />
                  <DetailField label="Failed At" value={viewing.failedAt ? new Date(viewing.failedAt).toLocaleString() : "-"} />
                  <DetailField label="Created" value={new Date(viewing.createdAt).toLocaleString()} />
                </div>

                {viewing.metadata && Object.keys(viewing.metadata).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Metadata
                      </p>
                      <div className="rounded-md border bg-muted/30 p-3">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {JSON.stringify(viewing.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
  bold,
  capitalize: cap,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  bold?: boolean;
  capitalize?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {children ? (
        <div className="mt-1">{children}</div>
      ) : (
        <p
          className={`mt-1 text-sm ${mono ? "font-mono" : ""} ${bold ? "font-bold" : "font-medium"} ${cap ? "capitalize" : ""}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}
