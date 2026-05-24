import { useEffect, useState, useCallback, Fragment } from "react";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  ScrollTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

const LIMIT = 20;

/** Matches the shape returned by the API (service.ts joins with users table) */
interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorFirstName: string | null;
  actorLastName: string | null;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson: unknown;
  afterJson: unknown;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Filter options                                                             */
/* -------------------------------------------------------------------------- */

const ENTITY_TYPES = [
  { value: "all", label: "All entities" },
  { value: "auth", label: "Auth / Login" },
  { value: "user", label: "User" },
  { value: "vendor", label: "Vendor" },
  { value: "vendor_membership", label: "Vendor Membership" },
  { value: "vendor_kyc", label: "Vendor KYC" },
  { value: "product", label: "Product" },
  { value: "collection", label: "Collection" },
  { value: "order", label: "Order" },
  { value: "vendor_order", label: "Vendor Order" },
  { value: "customer", label: "Customer" },
  { value: "customer_segment", label: "Customer Segment" },
  { value: "discount", label: "Discount" },
  { value: "payment", label: "Payment" },
  { value: "refund", label: "Refund" },
  { value: "return", label: "Return" },
  { value: "payout", label: "Payout" },
  { value: "fulfillment", label: "Fulfillment" },
  { value: "review", label: "Review" },
  { value: "page", label: "Page" },
  { value: "blog", label: "Blog" },
  { value: "blog_post", label: "Blog Post" },
  { value: "settings", label: "Settings" },
  { value: "commission_rule", label: "Commission Rule" },
  { value: "webhook", label: "Webhook" },
  { value: "search_index", label: "Search Index" },
];

const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
  { value: "archived", label: "Archived" },
  { value: "login", label: "Login" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function getActorLabel(log: AuditLog): string {
  if (log.actorFirstName || log.actorLastName) {
    return [log.actorFirstName, log.actorLastName].filter(Boolean).join(" ");
  }
  if (log.actorEmail) return log.actorEmail;
  if (log.actorUserId) return log.actorUserId.slice(0, 8) + "…";
  return "System";
}

/** Extract the verb portion of the action (e.g. "discount.created" → "created") */
function getActionVerb(action: string): string {
  const parts = action.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : action;
}

/** Human-readable entity type */
function formatEntityType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getActionColor(action: string): string {
  const verb = getActionVerb(action);
  if (verb.includes("created") || verb.includes("login"))
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (verb.includes("updated") || verb.includes("status"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  if (
    verb.includes("deleted") ||
    verb.includes("archived") ||
    verb.includes("cancelled") ||
    verb.includes("removed")
  )
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (verb.includes("approved"))
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (verb.includes("rejected"))
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
  return "bg-muted text-muted-foreground";
}

/* -------------------------------------------------------------------------- */
/*  Diff viewer                                                                */
/* -------------------------------------------------------------------------- */

function BeforeAfterDiff({
  beforeJson,
  afterJson,
}: {
  beforeJson: unknown;
  afterJson: unknown;
}) {
  const hasBefore =
    beforeJson !== null && beforeJson !== undefined;
  const hasAfter =
    afterJson !== null && afterJson !== undefined;

  if (!hasBefore && !hasAfter) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No change data recorded.
      </p>
    );
  }

  // If both are objects, compute per-field diff
  if (
    hasBefore &&
    hasAfter &&
    typeof beforeJson === "object" &&
    typeof afterJson === "object" &&
    !Array.isArray(beforeJson) &&
    !Array.isArray(afterJson)
  ) {
    const before = beforeJson as Record<string, unknown>;
    const after = afterJson as Record<string, unknown>;
    const allKeys = Array.from(
      new Set([...Object.keys(before), ...Object.keys(after)])
    ).sort();
    const changedKeys = allKeys.filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
    );

    if (changedKeys.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">
          No field-level changes detected.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {changedKeys.map((key) => (
          <div key={key} className="rounded-md border overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {key}
            </div>
            <div className="grid grid-cols-2 divide-x text-xs font-mono">
              <div className="p-3">
                <p className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wide font-sans font-semibold">
                  Before
                </p>
                <pre className="whitespace-pre-wrap break-all text-red-600 dark:text-red-400">
                  {formatJson(before[key])}
                </pre>
              </div>
              <div className="p-3">
                <p className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wide font-sans font-semibold">
                  After
                </p>
                <pre className="whitespace-pre-wrap break-all text-green-600 dark:text-green-400">
                  {formatJson(after[key])}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: show raw before/after
  return (
    <div className="grid grid-cols-2 gap-4">
      {hasBefore && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Before
          </p>
          <pre className="text-xs font-mono bg-red-50 dark:bg-red-950/20 rounded-md p-3 whitespace-pre-wrap break-all text-red-600 dark:text-red-400 max-h-60 overflow-auto">
            {formatJson(beforeJson)}
          </pre>
        </div>
      )}
      {hasAfter && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {hasBefore ? "After" : "Data"}
          </p>
          <pre className="text-xs font-mono bg-green-50 dark:bg-green-950/20 rounded-md p-3 whitespace-pre-wrap break-all text-green-600 dark:text-green-400 max-h-60 overflow-auto">
            {formatJson(afterJson)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Expanded rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const hasFilters =
    entityFilter !== "all" || actionFilter !== "all" || dateFrom || dateTo;

  /* -- Load ---------------------------------------------------------------- */

  const load = useCallback(
    async (p = page, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(LIMIT),
        });
        if (entityFilter !== "all") params.set("entityType", entityFilter);
        if (actionFilter !== "all") params.set("action", actionFilter);
        if (dateFrom) params.set("startDate", dateFrom);
        if (dateTo) params.set("endDate", dateTo);

        const res = await apiFetch<PaginatedResponse<AuditLog>>(
          `/admin/audit-logs?${params}`,
          { signal }
        );
        setLogs(res.data);
        setTotal(res.total);
      } catch (e: any) {
        if ((e as any)?.name !== "AbortError") {
          toast({
            title: "Failed to load audit logs",
            description: e.message,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [page, entityFilter, actionFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(page, controller.signal);
    return () => controller.abort();
  }, [page, entityFilter, actionFilter, dateFrom, dateTo]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setEntityFilter("all");
    setActionFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  /* -- Render -------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Read-only log of all system actions and changes for transparency."
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={entityFilter}
          onValueChange={(v) => {
            setEntityFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by entity type">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={actionFilter}
          onValueChange={(v) => {
            setActionFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36" aria-label="Filter by action">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <label htmlFor="audit-from" className="text-xs text-muted-foreground shrink-0">
            From
          </label>
          <Input
            id="audit-from"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-36"
            aria-label="Start date"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor="audit-to" className="text-xs text-muted-foreground shrink-0">
            To
          </label>
          <Input
            id="audit-to"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-36"
            aria-label="End date"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon className="size-3.5 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Results */}
      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollTextIcon}
            title={hasFilters ? "No logs match your filters" : "No audit logs yet"}
            description={
              hasFilters
                ? "Try adjusting your filters or date range."
                : "Audit logs will appear here as actions are performed in the system."
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-8">
                    <span className="sr-only">Expand</span>
                  </TableHead>
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">Actor</TableHead>
                  <TableHead className="font-semibold">Action</TableHead>
                  <TableHead className="font-semibold">Entity</TableHead>
                  <TableHead className="font-semibold">Entity ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const isExpanded = expanded.has(log.id);
                  const hasData =
                    log.beforeJson !== null ||
                    log.afterJson !== null ||
                    (log.metadata &&
                      Object.keys(log.metadata).length > 0);

                  return (
                    <Fragment key={log.id}>
                      <TableRow
                        className={cn(
                          "group",
                          hasData &&
                            "cursor-pointer hover:bg-muted/30"
                        )}
                        onClick={() => hasData && toggleExpand(log.id)}
                        aria-expanded={hasData ? isExpanded : undefined}
                      >
                        <TableCell className="w-8">
                          {hasData ? (
                            isExpanded ? (
                              <ChevronDownIcon className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRightIcon className="size-4 text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium">
                            {getActorLabel(log)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              getActionColor(log.action)
                            )}
                            title={log.action}
                          >
                            {getActionVerb(log.action).replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatEntityType(log.entityType)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          <span title={log.entityId}>
                            {log.entityId.length > 12
                              ? log.entityId.slice(0, 12) + "…"
                              : log.entityId}
                          </span>
                        </TableCell>
                      </TableRow>

                      {isExpanded && hasData && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="bg-muted/20 px-8 py-5"
                          >
                            <div className="space-y-4">
                              {/* Before/After diff */}
                              {(log.beforeJson !== null ||
                                log.afterJson !== null) && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                                    Changes
                                  </p>
                                  <BeforeAfterDiff
                                    beforeJson={log.beforeJson}
                                    afterJson={log.afterJson}
                                  />
                                </div>
                              )}

                              {/* Metadata */}
                              {log.metadata &&
                                Object.keys(log.metadata).length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                                      Metadata
                                    </p>
                                    <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 whitespace-pre-wrap break-all max-h-40 overflow-auto">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
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
