import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Customer, PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsersIcon, SearchIcon, PlusIcon, ArrowUpDownIcon } from "lucide-react";

const LIMIT = 20;

interface CustomerListItem extends Customer {
  state?: string;
  totalOrders?: number;
  totalSpent?: string | number;
  lastOrderAt?: string | null;
  emailMarketingSubscribed?: boolean;
  smsMarketingSubscribed?: boolean;
}

export function CustomerListPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");

  async function load(p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (search.trim()) params.set("search", search.trim());
      const res = await apiFetch<PaginatedResponse<CustomerListItem>>(
        `/admin/customers?${params}`,
        { signal }
      );
      setCustomers(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load customers", description: e.message, variant: "destructive" });
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(1);
  }

  function getInitials(customer: CustomerListItem): string {
    const first = customer.firstName?.[0] ?? customer.email[0];
    const last = customer.lastName?.[0] ?? "";
    return (first + last).toUpperCase();
  }

  function formatMoney(amount: string | number | undefined, currency?: string | null): string {
    if (amount == null) return formatPrice(0, currency);
    return formatPrice(amount, currency);
  }

  // Client-side sort (API doesn't support sort params yet)
  const sorted = [...customers].sort((a, b) => {
    switch (sortBy) {
      case "spent_desc": return (parseFloat(String(b.totalSpent ?? 0)) - parseFloat(String(a.totalSpent ?? 0)));
      case "spent_asc": return (parseFloat(String(a.totalSpent ?? 0)) - parseFloat(String(b.totalSpent ?? 0)));
      case "orders_desc": return (b.totalOrders ?? 0) - (a.totalOrders ?? 0);
      case "orders_asc": return (a.totalOrders ?? 0) - (b.totalOrders ?? 0);
      case "created_asc": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "created_desc":
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const SORT_OPTIONS = [
    { value: "created_desc", label: "Newest first" },
    { value: "created_asc", label: "Oldest first" },
    { value: "spent_desc", label: "Highest spend" },
    { value: "spent_asc", label: "Lowest spend" },
    { value: "orders_desc", label: "Most orders" },
    { value: "orders_asc", label: "Fewest orders" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage all registered customers on the platform."
        action={
          <Button onClick={() => navigate("/customers/new")}>
            <PlusIcon className="size-4 mr-1" />
            Add customer
          </Button>
        }
      />

      {/* Total count bar */}
      {!loading && (
        <div className="text-sm text-muted-foreground">
          {total.toLocaleString()} customer{total !== 1 ? "s" : ""}
        </div>
      )}

      {/* Search + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search customers"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowUpDownIcon className="size-3.5" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No customers found"
            description="Customers will appear here once they register."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Customer name</TableHead>
                  <TableHead className="font-semibold">Email subscription</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Orders</TableHead>
                  <TableHead className="font-semibold text-right">Amount spent</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c) => (
                  <TableRow
                    key={c.id}
                    className="group cursor-pointer"
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/customers/${c.id}`);
                      }
                    }}
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {getInitials(c)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-sm">
                            {c.firstName || c.lastName
                              ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                              : c.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.emailMarketingSubscribed ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium text-[11px]">
                          Subscribed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-medium text-[11px]">
                          Not subscribed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.state ?? "enabled"} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground text-right">
                      {c.totalOrders ?? 0} order{(c.totalOrders ?? 0) !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-right">
                      {formatMoney(c.totalSpent)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
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
