import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useUrlState } from "@/hooks/useUrlState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { MegaphoneIcon, PlusIcon } from "lucide-react";

const LIMIT = 20;
const STATUSES = ["draft", "scheduled", "active", "ended", "archived"] as const;

interface CampaignRow {
  id: string;
  handle: string;
  title: string;
  headline: string | null;
  status: (typeof STATUSES)[number];
  priority: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

function formatRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameYear = start.getFullYear() === end.getFullYear();
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : { year: "numeric", month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} → ${end.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`;
}

export function CampaignListPage() {
  const navigate = useNavigate();
  const { actor } = useAuth();
  const canManage = actor ? hasPermission(actor, "campaign:manage:any") : false;

  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useUrlState<number>("page", 1, { parse: Number });
  const [statusFilter, setStatusFilter] = useUrlState<string>("status", "all");

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(LIMIT),
        });
        if (statusFilter !== "all") params.set("status", statusFilter);
        const res = await apiFetch<{ data: CampaignRow[]; total: number }>(
          `/admin/campaigns?${params}`,
          { signal: ctrl.signal }
        );
        setRows(res.data);
        setTotal(res.total);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast({
            title: "Failed to load campaigns",
            description: e.message,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [page, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Run scheduled sales — automatic discounts, hero banners, and conversion analytics."
        action={
          canManage ? (
            <Button onClick={() => navigate("/marketing/campaigns/new")}>
              <PlusIcon className="size-4 mr-1" /> New campaign
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.charAt(0).toUpperCase() + s.slice(1)}
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
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={MegaphoneIcon}
            title="No campaigns yet"
            description={
              statusFilter !== "all"
                ? "Try a different status filter."
                : "Create your first sale event — 11.11, Black Friday, year-end clearance."
            }
            action={
              canManage ? (
                <Button onClick={() => navigate("/marketing/campaigns/new")}>
                  <PlusIcon className="size-4 mr-1" /> New campaign
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
                  <TableHead className="font-semibold">Window</TableHead>
                  <TableHead className="font-semibold text-right">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow
                    key={c.id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => navigate(`/marketing/campaigns/${c.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/marketing/campaigns/${c.id}`);
                      }
                    }}
                  >
                    <TableCell>
                      <div>
                        <p className="text-sm font-semibold">{c.title}</p>
                        {c.headline && (
                          <p className="text-xs text-muted-foreground">{c.headline}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRange(c.startsAt, c.endsAt)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{c.priority}</TableCell>
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
    </div>
  );
}
