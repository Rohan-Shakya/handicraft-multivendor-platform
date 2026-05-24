import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeftIcon,
  PackageIcon,
  TruckIcon,
  UserIcon,
  MapPinIcon,
  CreditCardIcon,
  XCircleIcon,
  TagIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshCwIcon,
  BoxIcon,
  ExternalLinkIcon,
  ActivityIcon,
  CircleDotIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";

// --- Types -------------------------------------------------------------------

interface OrderAddress {
  id: string;
  orderId: string;
  type: "shipping" | "billing";
  firstName: string;
  lastName: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string | null;
  country: string;
  zip: string;
  phone: string | null;
}

interface OrderItemDetail {
  id: string;
  orderId: string;
  vendorOrderId: string;
  vendorId: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  fulfilledQuantity: number;
  refundedQuantity: number;
  unitPrice: string;
  lineSubtotal: string;
  discountTotal: string;
  taxTotal: string;
  totalPrice: string;
  requiresShipping: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AppliedDiscount {
  id: string;
  title: string;
  code: string | null;
  type: string;
  value: string;
  amount: string;
}

interface VendorOrder {
  id: string;
  orderId: string;
  vendorId: string;
  vendorOrderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotalPrice: string;
  totalPrice: string;
}

interface OrderDetail {
  id: string;
  cartId: string | null;
  customerId: string | null;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  deliveryStatus: string;
  currencyCode: string;
  customerEmail: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  itemCount: number;
  subtotalPrice: string;
  discountTotal: string;
  shippingPrice: string;
  taxTotal: string;
  totalPrice: string;
  totalPaid: string;
  totalRefunded: string;
  note: string | null;
  placedAt: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDetail[];
  addresses: OrderAddress[];
  appliedDiscounts: AppliedDiscount[];
  vendorOrders: VendorOrder[];
}

interface Fulfillment {
  id: string;
  vendorOrderId: string;
  fulfillmentNumber: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: FulfillmentItem[];
  createdAt: string;
}

interface FulfillmentItem {
  id: string;
  orderItemId: string;
  quantity: number;
}

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: string | null;
  actorId: string | null;
  actorFirstName: string | null;
  actorLastName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// --- Helpers -----------------------------------------------------------------

function fmt(value: string, currency?: string | null): string {
  const n = parseFloat(value);
  return formatPrice(isNaN(n) ? 0 : n, currency);
}

function toNum(value: string): number {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    "order.created": "Order created",
    "order.status_updated": "Order status updated",
    "order.cancelled": "Order cancelled",
    "order.payment_captured": "Payment captured",
    "order.payment_refunded": "Payment refunded",
    "order.fulfillment_created": "Fulfillment created",
    "order.fulfillment_updated": "Fulfillment updated",
    "vendor_order.created": "Vendor order created",
    "vendor_order.status_updated": "Vendor order status updated",
    "vendor_order.delivery_status_updated": "Delivery status updated",
    "vendor_order.fulfillment_created": "Fulfillment created",
  };
  if (map[action]) return map[action];
  // Fallback: replace dots/underscores, capitalize
  return action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionIcon(action: string) {
  if (action.includes("cancel")) return <XCircleIcon className="size-4 text-red-500" />;
  if (action.includes("payment") || action.includes("refund")) return <CreditCardIcon className="size-4 text-blue-500" />;
  if (action.includes("fulfillment")) return <BoxIcon className="size-4 text-green-500" />;
  if (action.includes("delivery") || action.includes("ship")) return <TruckIcon className="size-4 text-purple-500" />;
  if (action.includes("created")) return <CheckCircleIcon className="size-4 text-green-500" />;
  if (action.includes("status")) return <RefreshCwIcon className="size-4 text-yellow-500" />;
  return <CircleDotIcon className="size-4 text-muted-foreground" />;
}

// --- Component ---------------------------------------------------------------

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Status update
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Draft order actions
  const [draftActionBusy, setDraftActionBusy] = useState<"convert" | "invoice" | null>(null);
  const [convertConfirmOpen, setConvertConfirmOpen] = useState(false);

  // Fulfillments per vendor order
  const [fulfillmentsByVO, setFulfillmentsByVO] = useState<Record<string, Fulfillment[]>>({});

  // Fulfillment creation sheet
  const [fulfillmentSheetOpen, setFulfillmentSheetOpen] = useState(false);
  const [fulfillmentVOId, setFulfillmentVOId] = useState<string | null>(null);
  const [fulfillmentItems, setFulfillmentItems] = useState<Record<string, number>>({});
  const [fulfillmentCarrier, setFulfillmentCarrier] = useState("");
  const [fulfillmentTrackingNumber, setFulfillmentTrackingNumber] = useState("");
  const [fulfillmentTrackingUrl, setFulfillmentTrackingUrl] = useState("");
  const [fulfillmentSubmitting, setFulfillmentSubmitting] = useState(false);

  // Delivery status updates (per vendor order, track loading state)
  const [deliveryUpdating, setDeliveryUpdating] = useState<Record<string, boolean>>({});

  // Refund sheet
  const [refundSheetOpen, setRefundSheetOpen] = useState(false);
  const [refundItems, setRefundItems] = useState<Record<string, number>>({});
  const [refundReason, setRefundReason] = useState("customer_request");
  const [refundNote, setRefundNote] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // Timeline
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // --- Data fetching ---

  const loadOrder = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<OrderDetail>(`/admin/orders/${id}`, { signal });
      setOrder(res);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e.message);
        toast({ title: "Failed to load order", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadFulfillments = useCallback(async (vendorOrders: VendorOrder[], signal?: AbortSignal) => {
    const results: Record<string, Fulfillment[]> = {};
    await Promise.all(
      vendorOrders.map(async (vo) => {
        try {
          const res = await apiFetch<{ data: Fulfillment[] } | Fulfillment[]>(
            `/admin/vendor-orders/${vo.id}/fulfillments`,
            { signal }
          );
          results[vo.id] = Array.isArray(res) ? res : res.data ?? [];
        } catch (err: any) {
          if (err?.name !== "AbortError") {
            results[vo.id] = [];
          }
        }
      })
    );
    setFulfillmentsByVO(results);
  }, []);

  const loadTimeline = useCallback(async (orderData: OrderDetail, signal?: AbortSignal) => {
    setTimelineLoading(true);
    try {
      const promises: Promise<AuditLogEntry[]>[] = [];

      // Order audit logs
      promises.push(
        apiFetch<{ data: AuditLogEntry[] } | AuditLogEntry[]>(
          `/admin/audit-logs?entityType=order&entityId=${orderData.id}&limit=50`,
          { signal }
        ).then((res) => (Array.isArray(res) ? res : res.data ?? []))
          .catch((err) => { if (err?.name === "AbortError") throw err; return []; })
      );

      // Vendor order audit logs
      for (const vo of orderData.vendorOrders) {
        promises.push(
          apiFetch<{ data: AuditLogEntry[] } | AuditLogEntry[]>(
            `/admin/audit-logs?entityType=vendor_order&entityId=${vo.id}&limit=50`,
            { signal }
          ).then((res) => (Array.isArray(res) ? res : res.data ?? []))
            .catch((err) => { if (err?.name === "AbortError") throw err; return []; })
        );
      }

      const allResults = await Promise.all(promises);
      const merged = allResults
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAuditLogs(merged);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // silently fail for timeline
      }
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    loadOrder(controller.signal);
    return () => controller.abort();
  }, [id, loadOrder]);

  useEffect(() => {
    if (!order) return;
    const controller = new AbortController();
    loadFulfillments(order.vendorOrders, controller.signal);
    loadTimeline(order, controller.signal);
    return () => controller.abort();
  }, [order, loadFulfillments, loadTimeline]);

  // --- Handlers: Cancel / Status ---

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    try {
      await apiFetch(`/admin/orders/${order.id}/cancel`, { method: "POST" });
      toast({ title: "Order cancelled" });
      setCancelOpen(false);
      loadOrder();
    } catch (e: any) {
      toast({ title: "Failed to cancel order", description: e.message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!order) return;
    if (newStatus === order.status) return;

    if (newStatus === "cancelled") {
      setCancelOpen(true);
      return;
    }

    setStatusUpdating(true);
    try {
      await apiFetch(`/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast({ title: `Order marked as ${newStatus}` });
      loadOrder();
    } catch (e: any) {
      toast({ title: "Failed to update order status", description: e.message, variant: "destructive" });
    } finally {
      setStatusUpdating(false);
    }
  }

  // --- Handlers: Draft order ---

  async function handleConvertDraft() {
    if (!order) return;
    setDraftActionBusy("convert");
    try {
      await apiFetch(`/admin/orders/${order.id}/convert`, { method: "POST" });
      toast({ title: "Draft converted", description: "Order is now open and ready to fulfill." });
      setConvertConfirmOpen(false);
      loadOrder();
    } catch (e: any) {
      toast({
        title: "Failed to convert draft",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDraftActionBusy(null);
    }
  }

  async function handleSendInvoice() {
    if (!order) return;
    setDraftActionBusy("invoice");
    try {
      const res = await apiFetch<{ sent: boolean; to: string }>(
        `/admin/orders/${order.id}/send-invoice`,
        { method: "POST" }
      );
      toast({ title: "Invoice sent", description: `Emailed to ${res.to}` });
    } catch (e: any) {
      toast({
        title: "Failed to send invoice",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDraftActionBusy(null);
    }
  }

  // --- Handlers: Fulfillment ---

  function openFulfillmentSheet(voId: string) {
    setFulfillmentVOId(voId);
    setFulfillmentItems({});
    setFulfillmentCarrier("");
    setFulfillmentTrackingNumber("");
    setFulfillmentTrackingUrl("");
    setFulfillmentSheetOpen(true);
  }

  async function handleCreateFulfillment() {
    if (!fulfillmentVOId) return;
    const items = Object.entries(fulfillmentItems)
      .filter(([, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    if (items.length === 0) {
      toast({ title: "Select at least one item to fulfill", variant: "destructive" });
      return;
    }

    setFulfillmentSubmitting(true);
    try {
      await apiFetch("/admin/fulfillments", {
        method: "POST",
        body: JSON.stringify({
          vendorOrderId: fulfillmentVOId,
          items,
          ...(fulfillmentCarrier && { carrier: fulfillmentCarrier }),
          ...(fulfillmentTrackingNumber && { trackingNumber: fulfillmentTrackingNumber }),
          ...(fulfillmentTrackingUrl && { trackingUrl: fulfillmentTrackingUrl }),
        }),
      });
      toast({ title: "Fulfillment created" });
      setFulfillmentSheetOpen(false);
      loadOrder();
    } catch (e: any) {
      toast({ title: "Failed to create fulfillment", description: e.message, variant: "destructive" });
    } finally {
      setFulfillmentSubmitting(false);
    }
  }

  async function handleDeliveryStatus(voId: string, status: string) {
    setDeliveryUpdating((prev) => ({ ...prev, [voId]: true }));
    try {
      await apiFetch(`/admin/vendor-orders/${voId}/delivery-status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: `Marked as ${status.replace(/_/g, " ")}` });
      loadOrder();
    } catch (e: any) {
      toast({ title: "Failed to update delivery status", description: e.message, variant: "destructive" });
    } finally {
      setDeliveryUpdating((prev) => ({ ...prev, [voId]: false }));
    }
  }

  // --- Handlers: Refund ---

  function openRefundSheet() {
    setRefundItems({});
    setRefundReason("customer_request");
    setRefundNote("");
    setRefundSheetOpen(true);
  }

  function getRefundTotal(): number {
    if (!order) return 0;
    let total = 0;
    for (const [itemId, qty] of Object.entries(refundItems)) {
      if (qty <= 0) continue;
      const item = order.items.find((i) => i.id === itemId);
      if (item) {
        total += toNum(item.unitPrice) * qty;
      }
    }
    return total;
  }

  async function handleCreateRefund() {
    if (!order) return;
    const items = Object.entries(refundItems)
      .filter(([, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => {
        const item = order.items.find((i) => i.id === orderItemId);
        const amount = item ? toNum(item.unitPrice) * quantity : 0;
        return { orderItemId, quantity, amount };
      });

    if (items.length === 0) {
      toast({ title: "Select at least one item to refund", variant: "destructive" });
      return;
    }

    setRefundSubmitting(true);
    try {
      await apiFetch("/admin/refunds", {
        method: "POST",
        body: JSON.stringify({
          orderId: order.id,
          reason: refundReason,
          ...(refundNote && { note: refundNote }),
          items,
        }),
      });
      toast({ title: "Refund created" });
      setRefundSheetOpen(false);
      loadOrder();
    } catch (e: any) {
      toast({ title: "Failed to create refund", description: e.message, variant: "destructive" });
    } finally {
      setRefundSubmitting(false);
    }
  }

  // --- Timeline helpers ---

  function toggleLogExpanded(logId: string) {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }

  // --- Loading state ---------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error state -----------------------------------------------------------

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
          <ArrowLeftIcon className="size-4 mr-1" /> Back to Orders
        </Button>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{error ?? "Order not found"}</p>
        </Card>
      </div>
    );
  }

  const isDraft = order.status === "draft";
  const canCancel = !["cancelled", "refunded", "draft"].includes(order.status);
  const canChangeStatus = !["cancelled", "refunded", "draft"].includes(order.status);
  const canRefund = toNum(order.totalPaid) > toNum(order.totalRefunded);

  // Extract addresses by type
  const shippingAddress = order.addresses.find((a) => a.type === "shipping") ?? null;
  const billingAddress = order.addresses.find((a) => a.type === "billing") ?? null;

  // Group items by vendorOrderId for vendor order sections
  const itemsByVendorOrder = new Map<string, OrderItemDetail[]>();
  for (const item of order.items) {
    const key = item.vendorOrderId;
    if (!itemsByVendorOrder.has(key)) {
      itemsByVendorOrder.set(key, []);
    }
    itemsByVendorOrder.get(key)!.push(item);
  }

  // Build customer display name
  const customerName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || "Guest";

  // Items available for fulfillment in the current sheet
  const fulfillableItems = fulfillmentVOId
    ? (itemsByVendorOrder.get(fulfillmentVOId) ?? []).filter(
        (item) => item.fulfilledQuantity < item.quantity
      )
    : [];

  // --- Render ----------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Back to orders" onClick={() => navigate("/orders")}>
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDraft ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/orders/${order.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendInvoice}
                disabled={draftActionBusy !== null || !order.customerEmail}
                title={!order.customerEmail ? "Add a customer email to send the invoice" : undefined}
              >
                {draftActionBusy === "invoice" ? "Sending…" : "Send invoice"}
              </Button>
              <Button
                size="sm"
                onClick={() => setConvertConfirmOpen(true)}
                disabled={draftActionBusy !== null}
              >
                {draftActionBusy === "convert" ? "Converting…" : "Convert to order"}
              </Button>
            </>
          ) : (
            <>
              {canChangeStatus && (
                <Select
                  value={order.status}
                  onValueChange={handleStatusChange}
                  disabled={statusUpdating}
                >
                  <SelectTrigger className="w-[160px]" aria-label="Order status">
                    <SelectValue placeholder="Update status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {canCancel && (
                <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                  <XCircleIcon className="size-4 mr-1" /> Cancel Order
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* -- Main column ------------------------------------------------- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card className="overflow-hidden border shadow-none">
            <div className="flex items-center gap-2 px-6 py-4 border-b bg-muted/30">
              <PackageIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Order Items</h2>
              <span className="text-xs text-muted-foreground">({order.items.length})</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="font-semibold text-center">Qty</TableHead>
                  <TableHead className="font-semibold text-right">Unit Price</TableHead>
                  <TableHead className="font-semibold text-right">Discount</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.variantTitle && (
                          <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.sku ?? "-"}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {toNum(item.discountTotal) > 0 ? `-${fmt(item.discountTotal)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(item.totalPrice)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Vendor Orders Breakdown (enhanced with fulfillment management) */}
          {order.vendorOrders.length > 0 && (
            <Card className="overflow-hidden border shadow-none">
              <div className="flex items-center gap-2 px-6 py-4 border-b bg-muted/30">
                <PackageIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Vendor Orders</h2>
              </div>
              <div className="divide-y">
                {order.vendorOrders.map((vo) => {
                  const voItems = itemsByVendorOrder.get(vo.id) ?? [];
                  const voFulfillments = fulfillmentsByVO[vo.id] ?? [];
                  const canFulfill = vo.fulfillmentStatus !== "fulfilled";
                  const isDeliveryUpdating = deliveryUpdating[vo.id] ?? false;

                  return (
                    <div key={vo.id} className="px-6 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-mono">#{vo.vendorOrderNumber}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={vo.status} />
                            <StatusBadge status={vo.fulfillmentStatus} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Delivery status quick actions */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isDeliveryUpdating}
                            onClick={() => handleDeliveryStatus(vo.id, "in_transit")}
                          >
                            <TruckIcon className="size-3.5 mr-1" />
                            Mark Shipped
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isDeliveryUpdating}
                            onClick={() => handleDeliveryStatus(vo.id, "delivered")}
                          >
                            <CheckCircleIcon className="size-3.5 mr-1" />
                            Mark Delivered
                          </Button>
                          {canFulfill && (
                            <Button
                              size="sm"
                              onClick={() => openFulfillmentSheet(vo.id)}
                            >
                              <BoxIcon className="size-3.5 mr-1" />
                              Create Fulfillment
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Vendor order items table */}
                      {voItems.length > 0 && (
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-semibold text-xs">Product</TableHead>
                                <TableHead className="font-semibold text-xs text-center">Qty</TableHead>
                                <TableHead className="font-semibold text-xs text-center">Fulfilled</TableHead>
                                <TableHead className="font-semibold text-xs text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {voItems.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-sm">
                                    {item.title}
                                    {item.variantTitle && (
                                      <span className="text-xs text-muted-foreground ml-1">({item.variantTitle})</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                                  <TableCell className="text-center text-sm">
                                    <span className={item.fulfilledQuantity >= item.quantity ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                      {item.fulfilledQuantity}/{item.quantity}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    {fmt(item.totalPrice)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Existing fulfillments */}
                      {voFulfillments.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fulfillments</p>
                          {voFulfillments.map((ful) => (
                            <div key={ful.id} className="rounded-md border bg-muted/20 px-4 py-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <BoxIcon className="size-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{ful.fulfillmentNumber}</span>
                                  <StatusBadge status={ful.status} />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {relativeTime(ful.createdAt)}
                                </span>
                              </div>
                              {(ful.carrier || ful.trackingNumber) && (
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {ful.carrier && <span>Carrier: {ful.carrier}</span>}
                                  {ful.trackingNumber && (
                                    <span>
                                      Tracking: {ful.trackingUrl ? (
                                        <a
                                          href={ful.trackingUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                                        >
                                          {ful.trackingNumber}
                                          <ExternalLinkIcon className="size-3" />
                                        </a>
                                      ) : (
                                        ful.trackingNumber
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                              {ful.items.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {ful.items.map((fi) => {
                                    const orderItem = order.items.find((oi) => oi.id === fi.orderItemId);
                                    return (
                                      <span key={fi.id} className="mr-3">
                                        {orderItem?.title ?? "Item"} x{fi.quantity}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmt(vo.totalPrice)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Applied Discounts */}
          {order.appliedDiscounts.length > 0 && (
            <Card className="overflow-hidden border shadow-none">
              <div className="flex items-center gap-2 px-6 py-4 border-b bg-muted/30">
                <TagIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Applied Discounts</h2>
              </div>
              <div className="divide-y">
                {order.appliedDiscounts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {d.code && (
                          <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {d.code}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">
                          {d.type === "percentage" ? `${d.value}% off` : `${formatPrice(d.value, order.currencyCode)} off`}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-red-600">-{fmt(d.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* --- Activity Timeline --- */}
          <Card className="overflow-hidden border shadow-none">
            <div className="flex items-center gap-2 px-6 py-4 border-b bg-muted/30">
              <ActivityIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Activity</h2>
            </div>
            <div className="px-6 py-4">
              {timelineLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="size-6 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet.</p>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />

                  <div className="space-y-0">
                    {auditLogs.map((log, idx) => {
                      const isExpanded = expandedLogs.has(log.id);
                      const hasDiff = log.before || log.after;
                      const actorName = [log.actorFirstName, log.actorLastName].filter(Boolean).join(" ") || "System";

                      return (
                        <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                          {/* Dot */}
                          <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-background border">
                            {actionIcon(log.action)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">{humanizeAction(log.action)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {actorName} &middot; {relativeTime(log.createdAt)}
                                </p>
                              </div>
                              {hasDiff && (
                                <button
                                  type="button"
                                  onClick={() => toggleLogExpanded(log.id)}
                                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0"
                                >
                                  {isExpanded ? (
                                    <ChevronDownIcon className="size-3.5" />
                                  ) : (
                                    <ChevronRightIcon className="size-3.5" />
                                  )}
                                  Details
                                </button>
                              )}
                            </div>

                            {/* Expanded diff */}
                            {isExpanded && hasDiff && (
                              <div className="mt-2 rounded-md border bg-muted/30 p-3 text-xs font-mono space-y-2 overflow-x-auto">
                                {log.before && (
                                  <div>
                                    <p className="text-muted-foreground font-sans font-medium mb-1">Before:</p>
                                    <pre className="whitespace-pre-wrap break-all text-red-600/80">
                                      {JSON.stringify(log.before, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.after && (
                                  <div>
                                    <p className="text-muted-foreground font-sans font-medium mb-1">After:</p>
                                    <pre className="whitespace-pre-wrap break-all text-green-600/80">
                                      {JSON.stringify(log.after, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* -- Sidebar ----------------------------------------------------- */}
        <div className="space-y-6">
          {/* Customer */}
          <Card className="border shadow-none">
            <div className="flex items-center gap-2 px-6 py-4 border-b bg-muted/30">
              <UserIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Customer</h2>
            </div>
            <div className="px-6 py-4 space-y-2">
              <p className="text-sm font-medium">{customerName}</p>
              {order.customerEmail && (
                <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
              )}
              {order.customerPhone && (
                <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
              )}
              {order.customerId && (
                <Link
                  to={`/customers/${order.customerId}`}
                  className="text-xs text-primary hover:underline"
                >
                  View customer
                </Link>
              )}
            </div>
          </Card>

          {/* Shipping Address */}
          {shippingAddress && (
            <Card className="border shadow-none">
              <div className="flex items-center gap-2 px-6 py-4 border-b bg-muted/30">
                <MapPinIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Shipping Address</h2>
              </div>
              <div className="px-6 py-4">
                <AddressBlock address={shippingAddress} />
              </div>
            </Card>
          )}

          {/* Billing Address */}
          {billingAddress && (
            <Card className="border shadow-none">
              <div className="flex items-center gap-2 px-6 py-4 border-b bg-muted/30">
                <CreditCardIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Billing Address</h2>
              </div>
              <div className="px-6 py-4">
                <AddressBlock address={billingAddress} />
              </div>
            </Card>
          )}

          {/* Payment Summary (enhanced with Refund button) */}
          <Card className="border shadow-none">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Payment Summary</h2>
              </div>
              {canRefund && (
                <Button variant="outline" size="sm" onClick={openRefundSheet}>
                  <RefreshCwIcon className="size-3.5 mr-1" />
                  Refund
                </Button>
              )}
            </div>
            <div className="px-6 py-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={order.paymentStatus} />
                <StatusBadge status={order.fulfillmentStatus} />
                <StatusBadge status={order.deliveryStatus} />
              </div>
              <SummaryRow label="Subtotal" value={fmt(order.subtotalPrice)} />
              {toNum(order.discountTotal) > 0 && (
                <SummaryRow label="Discount" value={`-${fmt(order.discountTotal)}`} className="text-red-600" />
              )}
              <SummaryRow label="Shipping" value={fmt(order.shippingPrice)} />
              <SummaryRow label="Tax" value={fmt(order.taxTotal)} />
              <Separator />
              <SummaryRow label="Total" value={fmt(order.totalPrice)} bold />
              <Separator />
              <SummaryRow label="Paid" value={fmt(order.totalPaid)} />
              {toNum(order.totalRefunded) > 0 && (
                <SummaryRow label="Refunded" value={fmt(order.totalRefunded)} className="text-orange-600" />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Cancel dialog */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Order"
        description={`Are you sure you want to cancel order #${order.orderNumber}? This action cannot be undone.`}
        confirmLabel="Cancel Order"
        variant="destructive"
        loading={cancelling}
        onConfirm={handleCancel}
      />

      {/* Convert draft → open confirmation */}
      <ConfirmDialog
        open={convertConfirmOpen}
        onOpenChange={setConvertConfirmOpen}
        title="Convert draft to order"
        description={`Convert draft #${order.orderNumber} to an open order? Inventory will be reserved for catalog items. Payment status stays "pending" so the customer can pay later.`}
        confirmLabel="Convert"
        loading={draftActionBusy === "convert"}
        onConfirm={handleConvertDraft}
      />

      {/* --- Fulfillment Sheet --- */}
      <Sheet open={fulfillmentSheetOpen} onOpenChange={setFulfillmentSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Fulfillment</SheetTitle>
            <SheetDescription>
              Select items and quantities to fulfill, then optionally add tracking information.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-6">
              {/* Item selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Items to Fulfill</Label>
                {fulfillableItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All items are already fulfilled.</p>
                ) : (
                  <div className="space-y-2">
                    {fulfillableItems.map((item) => {
                      const maxQty = item.quantity - item.fulfilledQuantity;
                      const selected = (fulfillmentItems[item.id] ?? 0) > 0;
                      return (
                        <div key={item.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              setFulfillmentItems((prev) => ({
                                ...prev,
                                [item.id]: e.target.checked ? maxQty : 0,
                              }));
                            }}
                            className="size-4 rounded border-gray-300"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            {item.variantTitle && (
                              <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {item.fulfilledQuantity} of {item.quantity} fulfilled
                            </p>
                          </div>
                          <div className="w-20">
                            <Input
                              type="number"
                              min={0}
                              max={maxQty}
                              value={fulfillmentItems[item.id] ?? 0}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(maxQty, parseInt(e.target.value) || 0));
                                setFulfillmentItems((prev) => ({ ...prev, [item.id]: val }));
                              }}
                              className="text-center h-8 text-sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* Tracking info */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Tracking Information (optional)</Label>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="ful-carrier" className="text-xs text-muted-foreground">Carrier</Label>
                    <Input
                      id="ful-carrier"
                      placeholder="e.g. UPS, FedEx, USPS"
                      value={fulfillmentCarrier}
                      onChange={(e) => setFulfillmentCarrier(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ful-tracking" className="text-xs text-muted-foreground">Tracking Number</Label>
                    <Input
                      id="ful-tracking"
                      placeholder="Tracking number"
                      value={fulfillmentTrackingNumber}
                      onChange={(e) => setFulfillmentTrackingNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ful-url" className="text-xs text-muted-foreground">Tracking URL</Label>
                    <Input
                      id="ful-url"
                      placeholder="https://..."
                      value={fulfillmentTrackingUrl}
                      onChange={(e) => setFulfillmentTrackingUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setFulfillmentSheetOpen(false)} disabled={fulfillmentSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateFulfillment} disabled={fulfillmentSubmitting}>
              {fulfillmentSubmitting ? "Creating..." : "Create Fulfillment"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* --- Refund Sheet --- */}
      <Sheet open={refundSheetOpen} onOpenChange={setRefundSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Refund</SheetTitle>
            <SheetDescription>
              Select items and quantities to refund. The refund amount is calculated automatically.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-6">
              {/* Item selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Items to Refund</Label>
                <div className="space-y-2">
                  {order.items.map((item) => {
                    const maxQty = item.quantity - item.refundedQuantity;
                    if (maxQty <= 0) return null;
                    const selected = (refundItems[item.id] ?? 0) > 0;
                    const qty = refundItems[item.id] ?? 0;
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            setRefundItems((prev) => ({
                              ...prev,
                              [item.id]: e.target.checked ? maxQty : 0,
                            }));
                          }}
                          className="size-4 rounded border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          {item.variantTitle && (
                            <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {fmt(item.unitPrice)} each &middot; max {maxQty}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <Input
                              type="number"
                              min={0}
                              max={maxQty}
                              value={qty}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(maxQty, parseInt(e.target.value) || 0));
                                setRefundItems((prev) => ({ ...prev, [item.id]: val }));
                              }}
                              className="text-center h-8 text-sm"
                            />
                          </div>
                          {qty > 0 && (
                            <span className="text-xs font-medium w-16 text-right">
                              {fmt(String(toNum(item.unitPrice) * qty))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Refund total */}
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-3">
                <span className="text-sm font-semibold">Refund Total</span>
                <span className="text-sm font-bold">{fmt(String(getRefundTotal()))}</span>
              </div>

              <Separator />

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="refund-reason" className="text-sm font-semibold">Reason</Label>
                <Select value={refundReason} onValueChange={setRefundReason}>
                  <SelectTrigger id="refund-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer_request">Customer Request</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="shipping_failure">Shipping Failure</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="refund-note" className="text-sm font-semibold">Note (optional)</Label>
                <Textarea
                  id="refund-note"
                  placeholder="Internal note about this refund..."
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setRefundSheetOpen(false)} disabled={refundSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCreateRefund}
              disabled={refundSubmitting || getRefundTotal() <= 0}
            >
              {refundSubmitting ? "Processing..." : `Refund ${fmt(String(getRefundTotal()))}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// --- Helper components -------------------------------------------------------

function AddressBlock({ address }: { address: OrderAddress }) {
  return (
    <div className="text-sm space-y-0.5">
      <p className="font-medium">{address.firstName} {address.lastName}</p>
      <p className="text-muted-foreground">{address.address1}</p>
      {address.address2 && <p className="text-muted-foreground">{address.address2}</p>}
      <p className="text-muted-foreground">
        {address.city}{address.province ? `, ${address.province}` : ""} {address.zip}
      </p>
      <p className="text-muted-foreground">{address.country}</p>
      {address.phone && <p className="text-muted-foreground">{address.phone}</p>}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold" : "font-medium"} ${className ?? ""}`}>{value}</span>
    </div>
  );
}
