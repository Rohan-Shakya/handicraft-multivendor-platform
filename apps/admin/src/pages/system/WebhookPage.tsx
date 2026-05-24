import { Fragment, useEffect, useState } from "react";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { FormField } from "@/components/FormField";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  WebhookIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SendIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
} from "lucide-react";

const LIMIT = 20;

// ---- Types ----

interface WebhookEndpoint {
  id: string;
  targetUrl: string;
  subscribedEvents: string[];
  status: "active" | "disabled";
  secret?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface WebhookEvent {
  id: string;
  endpointId: string;
  endpointUrl?: string;
  event: string;
  payload: Record<string, unknown>;
  status: "delivered" | "failed" | "pending";
  statusCode?: number;
  attempts: number;
  lastAttemptAt: string;
  createdAt: string;
}

// ---- Endpoint form ----

interface EndpointFormData {
  targetUrl: string;
  secret: string;
  subscribedEvents: string;
  status: "active" | "disabled";
}

const EMPTY_ENDPOINT_FORM: EndpointFormData = { targetUrl: "", secret: "", subscribedEvents: "", status: "active" };

const WEBHOOK_EVENTS = [
  "order.created",
  "order.updated",
  "order.cancelled",
  "product.created",
  "product.updated",
  "product.deleted",
  "customer.created",
  "customer.updated",
  "vendor.created",
  "vendor.updated",
  "refund.created",
  "payout.created",
];

function DeliveryStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "delivered":
      return <CheckCircle2Icon className="size-4 text-green-600" />;
    case "failed":
      return <XCircleIcon className="size-4 text-red-600" />;
    default:
      return <ClockIcon className="size-4 text-yellow-600" />;
  }
}

export function WebhookPage() {
  const [activeTab, setActiveTab] = useState("endpoints");

  // ---- Endpoints ----
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [endpointsTotal, setEndpointsTotal] = useState(0);
  const [endpointsPage, setEndpointsPage] = useState(1);
  const [endpointsLoading, setEndpointsLoading] = useState(true);

  const [endpointSheetOpen, setEndpointSheetOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpoint | null>(null);
  const [endpointForm, setEndpointForm] = useState<EndpointFormData>(EMPTY_ENDPOINT_FORM);
  const [endpointSaving, setEndpointSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---- Events ----
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [redelivering, setRedelivering] = useState<Record<string, boolean>>({});
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // ---- Load endpoints ----
  async function loadEndpoints(p = endpointsPage, signal?: AbortSignal) {
    setEndpointsLoading(true);
    try {
      const res = await apiFetch<WebhookEndpoint[] | PaginatedResponse<WebhookEndpoint>>(
        `/admin/webhooks/endpoints?page=${p}&limit=${LIMIT}`,
        { signal }
      );
      if (Array.isArray(res)) {
        setEndpoints(res);
        setEndpointsTotal(res.length);
      } else {
        setEndpoints(res.data);
        setEndpointsTotal(res.total);
      }
    } catch (e: any) {
      if ((e as any)?.name !== "AbortError") {
        toast({ title: "Failed to load endpoints", description: e.message, variant: "destructive" });
      }
    } finally {
      setEndpointsLoading(false);
    }
  }

  // ---- Load events ----
  async function loadEvents(p = eventsPage, signal?: AbortSignal) {
    setEventsLoading(true);
    try {
      const res = await apiFetch<WebhookEvent[] | PaginatedResponse<WebhookEvent>>(
        `/admin/webhooks/events?page=${p}&limit=${LIMIT}`,
        { signal }
      );
      if (Array.isArray(res)) {
        setEvents(res);
        setEventsTotal(res.length);
      } else {
        setEvents(res.data);
        setEventsTotal(res.total);
      }
    } catch (e: any) {
      if ((e as any)?.name !== "AbortError") {
        toast({ title: "Failed to load events", description: e.message, variant: "destructive" });
      }
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadEndpoints(endpointsPage, controller.signal);
    return () => controller.abort();
  }, [endpointsPage]);

  useEffect(() => {
    if (activeTab === "events") {
      const controller = new AbortController();
      loadEvents(eventsPage, controller.signal);
      return () => controller.abort();
    }
  }, [eventsPage, activeTab]);

  // ---- Endpoint CRUD ----
  function openCreateEndpoint() {
    setEditingEndpoint(null);
    setEndpointForm(EMPTY_ENDPOINT_FORM);
    setEndpointSheetOpen(true);
  }

  function openEditEndpoint(ep: WebhookEndpoint) {
    setEditingEndpoint(ep);
    setEndpointForm({
      targetUrl: ep.targetUrl,
      secret: "",
      subscribedEvents: ep.subscribedEvents.join(", "),
      status: ep.status,
    });
    setEndpointSheetOpen(true);
  }

  async function handleSaveEndpoint() {
    if (!endpointForm.targetUrl.trim()) {
      toast({ title: "URL is required", variant: "destructive" });
      return;
    }
    if (!editingEndpoint && endpointForm.secret.length < 16) {
      toast({ title: "Secret must be at least 16 characters", variant: "destructive" });
      return;
    }
    setEndpointSaving(true);
    try {
      const subscribedEvents = endpointForm.subscribedEvents
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      if (editingEndpoint) {
        const body: Record<string, unknown> = {
          targetUrl: endpointForm.targetUrl,
          subscribedEvents,
          status: endpointForm.status,
        };
        if (endpointForm.secret) body.secret = endpointForm.secret;
        await apiFetch(`/admin/webhooks/endpoints/${editingEndpoint.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Endpoint updated" });
      } else {
        await apiFetch("/admin/webhooks/endpoints", {
          method: "POST",
          body: JSON.stringify({
            targetUrl: endpointForm.targetUrl,
            secret: endpointForm.secret,
            subscribedEvents,
          }),
        });
        toast({ title: "Endpoint created" });
      }
      setEndpointSheetOpen(false);
      loadEndpoints(endpointsPage);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setEndpointSaving(false);
    }
  }

  async function handleDeleteEndpoint() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/webhooks/endpoints/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Endpoint deleted" });
      setDeleteTarget(null);
      loadEndpoints(endpointsPage);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  // ---- Redeliver event ----
  async function redeliverEvent(eventId: string) {
    setRedelivering((prev) => ({ ...prev, [eventId]: true }));
    try {
      await apiFetch(`/admin/webhooks/events/${eventId}/redeliver`, { method: "POST" });
      toast({ title: "Event redelivery triggered" });
      loadEvents(eventsPage);
    } catch (e: any) {
      toast({ title: "Redelivery failed", description: e.message, variant: "destructive" });
    } finally {
      setRedelivering((prev) => ({ ...prev, [eventId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Manage webhook endpoints and monitor event deliveries."
        action={
          <Button onClick={openCreateEndpoint}>
            <PlusIcon className="size-4" /> New Endpoint
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        {/* ---- Endpoints Tab ---- */}
        <TabsContent value="endpoints">
          <Card className="overflow-hidden border shadow-none">
            {endpointsLoading ? (
              <div className="divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-60" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                ))}
              </div>
            ) : endpoints.length === 0 ? (
              <EmptyState
                icon={WebhookIcon}
                title="No webhook endpoints"
                description="Create your first endpoint to start receiving webhooks."
                action={
                  <Button onClick={openCreateEndpoint}>
                    <PlusIcon className="size-4" /> New Endpoint
                  </Button>
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">URL</TableHead>
                      <TableHead className="font-semibold">Events</TableHead>
                      <TableHead className="font-semibold">Active</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endpoints.map((ep) => (
                      <TableRow key={ep.id} className="group">
                        <TableCell>
                          <p className="font-medium font-mono text-sm truncate max-w-[300px]">{ep.targetUrl}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ep.subscribedEvents.length > 0 ? ep.subscribedEvents.slice(0, 3).join(", ") : "All"}
                          {ep.subscribedEvents.length > 3 && ` +${ep.subscribedEvents.length - 3} more`}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ep.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ep.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="w-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Endpoint actions"
                              >
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditEndpoint(ep)}>Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget(ep)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  page={endpointsPage}
                  total={endpointsTotal}
                  limit={LIMIT}
                  onPageChange={setEndpointsPage}
                />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ---- Events Tab ---- */}
        <TabsContent value="events">
          <Card className="overflow-hidden border shadow-none">
            {eventsLoading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-60" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                icon={SendIcon}
                title="No webhook events"
                description="Webhook events will appear here once they are triggered."
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-10" />
                      <TableHead className="font-semibold">Event</TableHead>
                      <TableHead className="font-semibold">Endpoint</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Attempts</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev) => {
                      const isExpanded = expandedEventId === ev.id;
                      return (
                        <Fragment key={ev.id}>
                          <TableRow
                            className="group cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                            aria-expanded={isExpanded}
                          >
                            <TableCell className="w-10">
                              <DeliveryStatusIcon status={ev.status} />
                            </TableCell>
                            <TableCell className="text-sm font-medium font-mono">{ev.event}</TableCell>
                            <TableCell className="text-sm text-muted-foreground font-mono truncate max-w-[200px]">
                              {ev.endpointUrl ?? ev.endpointId.slice(0, 8) + "..."}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={ev.status === "delivered" ? "active" : ev.status === "failed" ? "rejected" : "pending"} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground font-mono">
                              {ev.statusCode ?? "--"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{ev.attempts}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(ev.createdAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                aria-label="Redeliver event"
                                onClick={() => redeliverEvent(ev.id)}
                                disabled={redelivering[ev.id] ?? false}
                              >
                                <RefreshCwIcon className="size-4" aria-hidden />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/20">
                              <TableCell colSpan={8} className="p-0">
                                <div className="px-4 py-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-muted-foreground">
                                      Payload sent to {ev.endpointUrl ?? "endpoint"}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigator.clipboard?.writeText(JSON.stringify(ev.payload, null, 2))}
                                    >
                                      Copy JSON
                                    </Button>
                                  </div>
                                  <pre className="text-xs font-mono bg-background border rounded-md p-3 overflow-x-auto max-h-80">
                                    {JSON.stringify(ev.payload, null, 2)}
                                  </pre>
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
                  page={eventsPage}
                  total={eventsTotal}
                  limit={LIMIT}
                  onPageChange={setEventsPage}
                />
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---- Endpoint Create/Edit Sheet ---- */}
      <Sheet open={endpointSheetOpen} onOpenChange={setEndpointSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingEndpoint ? "Edit Endpoint" : "New Endpoint"}</SheetTitle>
            <SheetDescription>Configure your webhook endpoint.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-5">
              <FormField label="URL" htmlFor="wh-url" required>
                <Input
                  id="wh-url"
                  value={endpointForm.targetUrl}
                  onChange={(e) => setEndpointForm((prev) => ({ ...prev, targetUrl: e.target.value }))}
                  placeholder="https://example.com/webhooks"
                  type="url"
                />
              </FormField>
              <FormField label="Secret" htmlFor="wh-secret" required={!editingEndpoint}>
                <Input
                  id="wh-secret"
                  value={endpointForm.secret}
                  onChange={(e) => setEndpointForm((prev) => ({ ...prev, secret: e.target.value }))}
                  placeholder={editingEndpoint ? "Leave blank to keep existing" : "Min 16 characters"}
                  type="password"
                />
              </FormField>
              <FormField label="Events" htmlFor="wh-events">
                <Select
                  value=""
                  onValueChange={(v) => {
                    setEndpointForm((prev) => {
                      const current = prev.subscribedEvents
                        .split(",")
                        .map((e) => e.trim())
                        .filter(Boolean);
                      if (!current.includes(v)) {
                        return { ...prev, subscribedEvents: [...current, v].join(", ") };
                      }
                      return prev;
                    });
                  }}
                >
                  <SelectTrigger id="wh-events" aria-label="Add event subscription">
                    <SelectValue placeholder="Add event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WEBHOOK_EVENTS.map((ev) => (
                      <SelectItem key={ev} value={ev}>
                        {ev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {endpointForm.subscribedEvents && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {endpointForm.subscribedEvents
                      .split(",")
                      .map((e) => e.trim())
                      .filter(Boolean)
                      .map((ev) => (
                        <span
                          key={ev}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() =>
                            setEndpointForm((prev) => ({
                              ...prev,
                              subscribedEvents: prev.subscribedEvents
                                .split(",")
                                .map((e) => e.trim())
                                .filter((e) => e !== ev)
                                .join(", "),
                            }))
                          }
                          title="Click to remove"
                        >
                          {ev} x
                        </span>
                      ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to receive all events.
                </p>
              </FormField>
              <FormField label="Status" htmlFor="wh-status">
                <div className="flex items-center gap-2">
                  <Switch
                    id="wh-status"
                    checked={endpointForm.status === "active"}
                    onCheckedChange={(checked) =>
                      setEndpointForm((prev) => ({ ...prev, status: checked ? "active" : "disabled" }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {endpointForm.status === "active" ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </FormField>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEndpointSheetOpen(false)} disabled={endpointSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEndpoint} disabled={endpointSaving}>
              {endpointSaving ? "Saving…" : editingEndpoint ? "Save changes" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ---- Delete Confirmation ---- */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete endpoint"
        description={`Are you sure you want to delete this webhook endpoint? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteEndpoint}
      />
    </div>
  );
}
