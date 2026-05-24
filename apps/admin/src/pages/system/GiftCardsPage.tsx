import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Gift,
  PlusIcon,
  SearchIcon,
  MoreHorizontal,
  ArrowUpCircle,
  ArrowDownCircle,
  Ban,
  CheckCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Constants & Types                                                          */
/* -------------------------------------------------------------------------- */

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
  { value: "depleted", label: "Depleted" },
] as const;

interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  currencyCode: string;
  status: "active" | "disabled" | "depleted";
  customerId: string | null;
  issuedByUserId: string | null;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  orderId: string | null;
  note: string | null;
  createdAt: string;
}

interface GiftCardDetail extends GiftCard {
  transactions: GiftCardTransaction[];
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatMoney(cents: number, currency?: string | null): string {
  return formatPrice(cents / 100, currency);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function GiftCardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") || "all";
  const pageParam = Number(searchParams.get("page")) || 1;

  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(pageParam);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCardDetail | null>(null);

  // Create form
  const [createBalance, setCreateBalance] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createCustomerId, setCreateCustomerId] = useState("");
  const [createExpiresAt, setCreateExpiresAt] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Credit form
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);

      const res = await apiFetch<PaginatedResponse<GiftCard>>(
        `/admin/gift-cards?${params}`,
        { signal }
      );

      setGiftCards(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if ((e as any)?.name !== "AbortError") {
        toast({
          title: "Failed to load gift cards",
          description: e.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Sync URL params
  function setStatus(v: string) {
    const next = new URLSearchParams(searchParams);
    if (v === "all") next.delete("status");
    else next.set("status", v);
    next.delete("page");
    setSearchParams(next, { replace: true });
    setPage(1);
  }

  function handlePageChange(p: number) {
    setPage(p);
    const next = new URLSearchParams(searchParams);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    setSearchParams(next, { replace: true });
  }

  // ── Open detail dialog ──────────────────────────────────────────────────
  async function openDetail(id: string) {
    try {
      const card = await apiFetch<GiftCardDetail>(`/admin/gift-cards/${id}`);
      setSelectedCard(card);
      setDetailOpen(true);
    } catch (e: any) {
      toast({
        title: "Failed to load gift card",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  // ── Create gift card ────────────────────────────────────────────────────
  async function handleCreate() {
    const balanceCents = Math.round(parseFloat(createBalance) * 100);
    if (!balanceCents || balanceCents <= 0) {
      toast({ title: "Enter a valid balance", variant: "destructive" });
      return;
    }

    setCreateSubmitting(true);
    try {
      await apiFetch("/admin/gift-cards", {
        method: "POST",
        body: JSON.stringify({
          initialBalance: balanceCents,
          ...(createCode ? { code: createCode } : {}),
          ...(createCustomerId ? { customerId: createCustomerId } : {}),
          ...(createExpiresAt ? { expiresAt: new Date(createExpiresAt).toISOString() } : {}),
          ...(createNote ? { note: createNote } : {}),
        }),
      });
      toast({ title: "Gift card created" });
      setCreateOpen(false);
      resetCreateForm();
      load();
    } catch (e: any) {
      toast({
        title: "Failed to create gift card",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setCreateSubmitting(false);
    }
  }

  function resetCreateForm() {
    setCreateBalance("");
    setCreateCode("");
    setCreateCustomerId("");
    setCreateExpiresAt("");
    setCreateNote("");
  }

  // ── Credit gift card ────────────────────────────────────────────────────
  async function handleCredit() {
    if (!selectedCard) return;
    const amountCents = Math.round(parseFloat(creditAmount) * 100);
    if (!amountCents || amountCents <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    setCreditSubmitting(true);
    try {
      await apiFetch(`/admin/gift-cards/${selectedCard.id}/credit`, {
        method: "POST",
        body: JSON.stringify({
          amount: amountCents,
          ...(creditNote ? { note: creditNote } : {}),
        }),
      });
      toast({ title: "Funds added" });
      setCreditOpen(false);
      setCreditAmount("");
      setCreditNote("");
      // Refresh detail if open
      await openDetail(selectedCard.id);
      load();
    } catch (e: any) {
      toast({
        title: "Failed to add funds",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setCreditSubmitting(false);
    }
  }

  // ── Toggle status ───────────────────────────────────────────────────────
  async function toggleStatus(card: GiftCard) {
    const newStatus = card.status === "active" ? "disabled" : "active";
    try {
      await apiFetch(`/admin/gift-cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast({ title: `Gift card ${newStatus}` });
      load();
    } catch (e: any) {
      toast({
        title: "Failed to update status",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gift Cards"
        description="Create and manage gift cards for your store."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" /> Create gift card
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by code..."
            aria-label="Search gift cards"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
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
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : giftCards.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No gift cards found"
            description={
              status !== "all" || search
                ? "Try adjusting your filters or search."
                : "Create your first gift card to get started."
            }
            action={
              !search && status === "all" ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <PlusIcon className="size-4" /> Create gift card
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Initial</TableHead>
                  <TableHead className="font-semibold text-right">Balance</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Expires</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {giftCards.map((gc) => (
                  <TableRow
                    key={gc.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="link"
                    onClick={() => openDetail(gc.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetail(gc.id);
                      }
                    }}
                  >
                    <TableCell>
                      <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono font-medium tracking-wide">
                        {gc.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={gc.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatMoney(gc.initialBalance, gc.currencyCode)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {formatMoney(gc.currentBalance, gc.currencyCode)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {gc.customerId ? gc.customerId.slice(0, 8) + "..." : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {gc.expiresAt ? formatDate(gc.expiresAt) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(gc.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Gift card actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(gc.id).then(() => {
                                setCreditOpen(true);
                              });
                            }}
                          >
                            <ArrowUpCircle className="size-4 mr-2" />
                            Add funds
                          </DropdownMenuItem>
                          {gc.status !== "depleted" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStatus(gc);
                              }}
                            >
                              {gc.status === "active" ? (
                                <>
                                  <Ban className="size-4 mr-2" /> Disable
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="size-4 mr-2" /> Enable
                                </>
                              )}
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
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Card>

      {/* ── Create Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create gift card</DialogTitle>
            <DialogDescription>
              Issue a new gift card. A unique code will be auto-generated if not provided.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gc-balance">Initial balance ($) *</Label>
              <Input
                id="gc-balance"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="50.00"
                value={createBalance}
                onChange={(e) => setCreateBalance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gc-code">Code (optional)</Label>
              <Input
                id="gc-code"
                placeholder="Auto-generated if empty"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gc-customer">Customer ID (optional)</Label>
              <Input
                id="gc-customer"
                placeholder="Leave empty for unassigned"
                value={createCustomerId}
                onChange={(e) => setCreateCustomerId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gc-expires">Expiry date (optional)</Label>
              <Input
                id="gc-expires"
                type="date"
                value={createExpiresAt}
                onChange={(e) => setCreateExpiresAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gc-note">Note (optional)</Label>
              <Input
                id="gc-note"
                placeholder="Internal note"
                value={createNote}
                onChange={(e) => setCreateNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createSubmitting}>
              {createSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gift className="size-5" />
                  <span className="font-mono">{selectedCard.code}</span>
                </DialogTitle>
                <DialogDescription>Gift card details and transaction history</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <div className="mt-0.5">
                      <StatusBadge status={selectedCard.status} />
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Currency</span>
                    <p className="font-medium mt-0.5">{selectedCard.currencyCode}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Initial balance</span>
                    <p className="font-medium tabular-nums mt-0.5">
                      {formatMoney(selectedCard.initialBalance, selectedCard.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current balance</span>
                    <p className="font-semibold tabular-nums mt-0.5 text-base">
                      {formatMoney(selectedCard.currentBalance, selectedCard.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer</span>
                    <p className="font-medium mt-0.5">
                      {selectedCard.customerId ?? "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expires</span>
                    <p className="font-medium mt-0.5">
                      {selectedCard.expiresAt
                        ? formatDate(selectedCard.expiresAt)
                        : "Never"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Note</span>
                    <p className="font-medium mt-0.5">
                      {selectedCard.note || "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p className="text-xs mt-0.5">{formatDateTime(selectedCard.createdAt)}</p>
                  </div>
                </div>

                {/* Transactions */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Transactions</h4>
                  {selectedCard.transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transactions yet.</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="text-xs text-right">Balance</TableHead>
                            <TableHead className="text-xs">Note</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedCard.transactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    tx.type === "credit" || tx.type === "refund"
                                      ? "text-green-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  {tx.type === "credit" || tx.type === "refund" ? (
                                    <ArrowUpCircle className="size-3" />
                                  ) : (
                                    <ArrowDownCircle className="size-3" />
                                  )}
                                  {tx.type}
                                </span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                {tx.amount > 0 ? "+" : ""}
                                {formatMoney(Math.abs(tx.amount), selectedCard?.currencyCode)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                {formatMoney(tx.balanceAfter, selectedCard?.currencyCode)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                                {tx.note || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDateTime(tx.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreditOpen(true);
                  }}
                >
                  <ArrowUpCircle className="size-4" /> Add funds
                </Button>
                {selectedCard.status !== "depleted" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      toggleStatus(selectedCard);
                      setDetailOpen(false);
                    }}
                  >
                    {selectedCard.status === "active" ? (
                      <>
                        <Ban className="size-4" /> Disable
                      </>
                    ) : (
                      <>
                        <CheckCircle className="size-4" /> Enable
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Credit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add funds</DialogTitle>
            <DialogDescription>
              Add balance to gift card{" "}
              <span className="font-mono font-medium">{selectedCard?.code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount ($) *</Label>
              <Input
                id="credit-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="25.00"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-note">Note (optional)</Label>
              <Input
                id="credit-note"
                placeholder="Reason for credit"
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCredit} disabled={creditSubmitting}>
              {creditSubmitting ? "Adding..." : "Add funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
