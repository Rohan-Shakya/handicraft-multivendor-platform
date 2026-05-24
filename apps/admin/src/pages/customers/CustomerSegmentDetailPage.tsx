import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeftIcon, UsersIcon, SearchIcon, CheckIcon, SaveIcon, XIcon,
} from "lucide-react";

const LIMIT = 50;

interface Segment {
  id: string;
  name: string;
  type: "manual" | "dynamic";
  description?: string | null;
  customerCount?: number;
  isSystem?: boolean;
  createdAt: string | Date;
}

interface CustomerRow {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  totalOrders?: number;
  totalSpent?: string | number;
  emailMarketingSubscribed?: boolean;
}

export function CustomerSegmentDetailPage() {
  const { segmentId } = useParams<{ segmentId: string }>();
  const navigate = useNavigate();

  const [segment, setSegment] = useState<Segment | null>(null);
  const [loading, setLoading] = useState(true);

  // All customers list (paginated)
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [customersLoading, setCustomersLoading] = useState(true);

  // Member IDs — the set of customer IDs currently in this segment
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [originalMemberIds, setOriginalMemberIds] = useState<Set<string>>(new Set());

  // Saving state
  const [saving, setSaving] = useState(false);

  // Load segment + members
  async function loadSegment(signal?: AbortSignal) {
    if (!segmentId) return;
    setLoading(true);
    try {
      const seg = await apiFetch<Segment>(`/admin/customer-segments/${segmentId}`, { signal });
      setSegment(seg);

      const members = await apiFetch<CustomerRow[]>(
        `/admin/customer-segments/${segmentId}/members`,
        { signal }
      );
      const ids = new Set((Array.isArray(members) ? members : []).map((m) => m.id));
      setMemberIds(ids);
      setOriginalMemberIds(new Set(ids));
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load segment", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  // Load customers list
  async function loadCustomers(p = page, signal?: AbortSignal) {
    setCustomersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (search.trim()) params.set("search", search.trim());
      const res = await apiFetch<PaginatedResponse<CustomerRow>>(
        `/admin/customers?${params}`,
        { signal }
      );
      setCustomers(res.data);
      setTotalCustomers(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load customers", description: e.message, variant: "destructive" });
      }
    } finally {
      setCustomersLoading(false);
    }
  }

  useEffect(() => { const controller = new AbortController(); loadSegment(controller.signal); return () => controller.abort(); }, [segmentId]);
  useEffect(() => { const controller = new AbortController(); loadCustomers(page, controller.signal); return () => controller.abort(); }, [page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadCustomers(1);
  }

  function toggleCustomer(id: string) {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setMemberIds((prev) => {
      const next = new Set(prev);
      customers.forEach((c) => next.add(c.id));
      return next;
    });
  }

  function deselectAll() {
    setMemberIds((prev) => {
      const next = new Set(prev);
      customers.forEach((c) => next.delete(c.id));
      return next;
    });
  }

  // Compute changes
  const toAdd = [...memberIds].filter((id) => !originalMemberIds.has(id));
  const toRemove = [...originalMemberIds].filter((id) => !memberIds.has(id));
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;
  const allOnPageSelected = customers.length > 0 && customers.every((c) => memberIds.has(c.id));

  async function handleSave() {
    if (!segmentId || !hasChanges) return;
    setSaving(true);
    try {
      // Add new members
      await Promise.all(
        toAdd.map((customerId) =>
          apiFetch(`/admin/customer-segments/${segmentId}/members`, {
            method: "POST",
            body: JSON.stringify({ customerId }),
          })
        )
      );
      // Remove members
      await Promise.all(
        toRemove.map((customerId) =>
          apiFetch(`/admin/customer-segments/${segmentId}/members/${customerId}`, {
            method: "DELETE",
          })
        )
      );
      toast({ title: "Segment updated", description: `${toAdd.length} added, ${toRemove.length} removed` });
      setOriginalMemberIds(new Set(memberIds));
      loadSegment(); // refresh counts
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setMemberIds(new Set(originalMemberIds));
  }

  function formatMoney(amount: string | number | undefined, currency?: string | null): string {
    if (amount == null) return formatPrice(0, currency);
    return formatPrice(amount, currency);
  }

  function getName(c: CustomerRow): string {
    return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/customers/segments")}>
          <ArrowLeftIcon className="size-4 mr-1" /> Back to Segments
        </Button>
        <EmptyState icon={UsersIcon} title="Segment not found" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Back to segments" onClick={() => navigate("/customers/segments")}>
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{segment.name}</h1>
              {segment.type === "dynamic" && <Badge variant="secondary" className="text-[10px]">Auto</Badge>}
            </div>
            {segment.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{segment.description}</p>
            )}
          </div>
        </div>

        {/* Save/Discard bar */}
        {hasChanges ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDiscard}>
              <XIcon className="size-3.5 mr-1" /> Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <SaveIcon className="size-3.5 mr-1" />
              {saving ? "Saving…" : `Save (${toAdd.length + toRemove.length} changes)`}
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {memberIds.size} customer{memberIds.size !== 1 ? "s" : ""} in segment
          </div>
        )}
      </div>

      {/* Search + info bar */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>

        <div className="text-sm text-muted-foreground shrink-0">
          Showing {customers.length} of {totalCustomers.toLocaleString()} customers
        </div>
      </div>

      {/* Customer table with checkboxes */}
      <Card className="overflow-hidden border shadow-none">
        {customersLoading ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-4 w-40 flex-1" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No customers found" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10">
                    <button
                      type="button"
                      className={`size-5 rounded border flex items-center justify-center transition-colors ${
                        allOnPageSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input hover:border-primary/50"
                      }`}
                      onClick={allOnPageSelected ? deselectAll : selectAll}
                    >
                      {allOnPageSelected && <CheckIcon className="size-3" />}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">Customer name</TableHead>
                  <TableHead className="font-semibold">Email subscription</TableHead>
                  <TableHead className="font-semibold text-right">Orders</TableHead>
                  <TableHead className="font-semibold text-right">Amount spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const selected = memberIds.has(c.id);
                  const wasOriginal = originalMemberIds.has(c.id);
                  const isNew = selected && !wasOriginal;
                  const isRemoved = !selected && wasOriginal;

                  return (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer transition-colors ${
                        isNew ? "bg-emerald-50/50" : isRemoved ? "bg-red-50/50" : ""
                      }`}
                      onClick={() => toggleCustomer(c.id)}
                    >
                      <TableCell className="w-10">
                        <div
                          className={`size-5 rounded border flex items-center justify-center transition-colors ${
                            selected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input"
                          }`}
                        >
                          {selected && <CheckIcon className="size-3" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{getName(c)}</span>
                      </TableCell>
                      <TableCell>
                        {c.emailMarketingSubscribed ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[11px]">
                            Subscribed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">Not subscribed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground text-right">
                        {c.totalOrders ?? 0} order{(c.totalOrders ?? 0) !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-right">
                        {formatMoney(c.totalSpent)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination page={page} total={totalCustomers} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Sticky save bar at bottom when changes exist */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-background border-t py-3 px-4 -mx-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {toAdd.length > 0 && <span className="text-emerald-600 font-medium">+{toAdd.length} to add</span>}
            {toAdd.length > 0 && toRemove.length > 0 && ", "}
            {toRemove.length > 0 && <span className="text-destructive font-medium">-{toRemove.length} to remove</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDiscard}>Discard</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
