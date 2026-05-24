import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  PercentIcon,
  PlusIcon,
  SearchIcon,
  TicketIcon,
  ZapIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Constants & Types                                                          */
/* -------------------------------------------------------------------------- */

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
] as const;

interface Discount {
  id: string;
  title: string;
  description: string | null;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: string;
  scope: string;
  targetType: string;
  status: string;
  usageCount: number;
  usageLimit: number | null;
  oncePerCustomer: boolean;
  firstOrderOnly: boolean;
  minimumSubtotal: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

interface DiscountCode {
  id: string;
  code: string;
  discountId: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDiscountValue(d: Discount): string {
  const v = parseFloat(d.value);
  if (d.type === "percentage") return `${v}% off`;
  if (d.type === "fixed_amount") return `${formatPrice(v)} off`;
  return "Free shipping";
}

function getTypeLabel(d: Discount): string {
  if (d.type === "free_shipping") return "Free shipping";
  if (d.targetType === "order") return "Amount off order";
  return "Amount off order";
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function DiscountListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") || "all";
  const pageParam = Number(searchParams.get("page")) || 1;

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [codes, setCodes] = useState<Record<string, DiscountCode[]>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(pageParam);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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

      const res = await apiFetch<PaginatedResponse<Discount>>(
        `/admin/discounts?${params}`,
        { signal }
      );

      // Client-side search filter (API doesn't have search param yet)
      let filtered = res.data;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.description?.toLowerCase().includes(q)
        );
      }

      setDiscounts(filtered);
      setTotal(search ? filtered.length : res.total);

      // Load codes for all displayed discounts in parallel
      // Note: Consider adding a batch codes endpoint to reduce N+1 requests
      if (filtered.length > 0) {
        const codeMap: Record<string, DiscountCode[]> = {};
        await Promise.allSettled(
          filtered.map(async (d) => {
            try {
              const c = await apiFetch<DiscountCode[]>(
                `/admin/discounts/${d.id}/codes`,
                { signal }
              );
              codeMap[d.id] = c;
            } catch (err: any) {
              if (err?.name !== "AbortError") {
                codeMap[d.id] = [];
              }
            }
          })
        );
        setCodes(codeMap);
      } else {
        setCodes({});
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load discounts",
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts"
        description="Create and manage discount codes and automatic promotions."
        action={
          <Button onClick={() => navigate("/discounts/new")}>
            <PlusIcon className="size-4" /> Create discount
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search discounts..."
            aria-label="Search discounts"
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
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : discounts.length === 0 ? (
          <EmptyState
            icon={PercentIcon}
            title="No discounts found"
            description={
              status !== "all" || search
                ? "Try adjusting your filters or search."
                : "Create your first discount to start offering promotions."
            }
            action={
              !search && status === "all" ? (
                <Button size="sm" onClick={() => navigate("/discounts/new")}>
                  <PlusIcon className="size-4" /> Create discount
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Method</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold text-right">
                    Value
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    Used
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((d) => {
                  const discountCodes = codes[d.id] ?? [];
                  const hasCode = discountCodes.length > 0;
                  const primaryCode = discountCodes[0]?.code;

                  return (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      role="link"
                      onClick={() => navigate(`/discounts/${d.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/discounts/${d.id}`);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {hasCode && primaryCode && (
                              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono font-medium tracking-wide">
                                {primaryCode}
                              </span>
                            )}
                            <span className="font-medium truncate">
                              {d.title}
                            </span>
                          </div>
                          {d.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                              {d.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} />
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          {hasCode ? (
                            <>
                              <TicketIcon className="size-3.5" /> Code
                            </>
                          ) : (
                            <>
                              <ZapIcon className="size-3.5" /> Automatic
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getTypeLabel(d)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-semibold text-sm">
                          {formatDiscountValue(d)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {d.usageCount}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
    </div>
  );
}
