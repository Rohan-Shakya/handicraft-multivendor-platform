import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";

type VendorOrderStatus = "draft" | "open" | "completed" | "cancelled" | "archived";

interface VendorOrderAddress {
  id: string;
  vendorOrderId: string;
  type: "shipping" | "billing";
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  address1: string;
  address2: string | null;
  city: string;
  province: string | null;
  country: string;
  zip: string;
}

interface VendorOrderItem {
  id: string;
  orderId: string;
  vendorOrderId: string;
  productId: string | null;
  variantId: string | null;
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
  status: string;
}

interface VendorOrderDetail {
  id: string;
  orderId: string;
  vendorOrderNumber: string;
  status: VendorOrderStatus;
  paymentStatus: string;
  fulfillmentStatus: string;
  deliveryStatus: string;
  currencyCode: string;
  itemCount: number;
  subtotalPrice: string;
  discountTotal: string;
  shippingPrice: string;
  taxTotal: string;
  totalPrice: string;
  note: string | null;
  placedAt: string | Date;
  createdAt: string | Date;
  items: VendorOrderItem[];
  addresses: VendorOrderAddress[];
}

interface Fulfillment {
  id: string;
  vendorOrderId: string;
  status: string;
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

const NEXT_STATUSES: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["completed", "cancelled"],
  completed: ["archived"],
  cancelled: [],
  archived: [],
};

const DELIVERY_STATUSES = [
  { value: "not_shipped", label: "Not shipped" },
  { value: "in_transit", label: "In transit" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
  { value: "failed", label: "Failed" },
] as const;

export function VendorOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<VendorOrderDetail | null>(null);
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deliveryUpdating, setDeliveryUpdating] = useState(false);
  const [shipBusy, setShipBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, fulfillmentsRes] = await Promise.all([
        apiFetch<VendorOrderDetail>(`/vendor/orders/${id}`),
        apiFetch<Fulfillment[]>(`/vendor/orders/${id}/fulfillments`).catch(() => []),
      ]);
      setOrder(detail);
      setFulfillments(Array.isArray(fulfillmentsRes) ? fulfillmentsRes : []);
    } catch (e: any) {
      toast({
        title: "Failed to load order",
        description: e?.body?.title ?? e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(next: VendorOrderStatus) {
    if (!order) return;
    setStatusUpdating(true);
    try {
      await apiFetch(`/vendor/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      toast({ title: `Order status updated to "${next}".` });
      setOrder({ ...order, status: next });
    } catch (e: any) {
      toast({
        title: "Failed to update status",
        description: e?.body?.title ?? e?.message,
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleDeliveryStatusChange(next: string) {
    if (!order) return;
    setDeliveryUpdating(true);
    try {
      const updated = await apiFetch<VendorOrderDetail>(
        `/vendor/orders/${order.id}/delivery-status`,
        { method: "PATCH", body: JSON.stringify({ status: next }) }
      );
      toast({ title: `Delivery status updated to "${next.replace(/_/g, " ")}".` });
      setOrder({ ...order, deliveryStatus: updated.deliveryStatus ?? next });
    } catch (e: any) {
      toast({
        title: "Failed to update delivery status",
        description: e?.body?.title ?? e?.message,
        variant: "destructive",
      });
    } finally {
      setDeliveryUpdating(false);
    }
  }

  async function handleMarkAsShipped() {
    if (!order) return;
    setShipBusy(true);
    try {
      const body: Record<string, string> = {};
      if (carrier.trim()) body.carrier = carrier.trim();
      if (trackingNumber.trim()) body.trackingNumber = trackingNumber.trim();
      if (trackingUrl.trim()) body.trackingUrl = trackingUrl.trim();
      await apiFetch(`/vendor/orders/${order.id}/ship`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast({ title: "Marked as shipped." });
      setCarrier("");
      setTrackingNumber("");
      setTrackingUrl("");
      await load();
    } catch (e: any) {
      toast({
        title: "Failed to mark as shipped",
        description: e?.body?.title ?? e?.message,
        variant: "destructive",
      });
    } finally {
      setShipBusy(false);
    }
  }

  async function handleMarkAsDelivered() {
    if (!order) return;
    setShipBusy(true);
    try {
      await apiFetch(`/vendor/orders/${order.id}/deliver`, { method: "POST" });
      toast({ title: "Marked as delivered." });
      await load();
    } catch (e: any) {
      toast({
        title: "Failed to mark as delivered",
        description: e?.body?.title ?? e?.message,
        variant: "destructive",
      });
    } finally {
      setShipBusy(false);
    }
  }

  async function handleCancelOrder() {
    if (!order) return;
    setCancelOpen(false);
    await handleStatusChange("cancelled");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/vendor/orders")}>
          <ArrowLeftIcon className="mr-1 size-4" /> Back to orders
        </Button>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  const shipping = order.addresses.find((a) => a.type === "shipping");
  const billing = order.addresses.find((a) => a.type === "billing");
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
  const canCancel = order.status === "open" || order.status === "draft";
  const isShippable = order.deliveryStatus === "not_shipped";
  const isInTransit = ["in_transit", "out_for_delivery"].includes(order.deliveryStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Back to orders"
            onClick={() => navigate("/vendor/orders")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Order #{order.vendorOrderNumber}
              </h1>
              <StatusBadge status={order.status} />
              <StatusBadge status={order.fulfillmentStatus} />
              <StatusBadge status={order.paymentStatus} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Placed{" "}
              {new Date(order.placedAt).toLocaleDateString("en-US", {
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
          {nextStatuses.length > 0 && (
            <Select
              value={order.status}
              onValueChange={(v) => handleStatusChange(v as VendorOrderStatus)}
              disabled={statusUpdating}
            >
              <SelectTrigger className="w-[160px]" aria-label="Order status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={order.status} disabled>
                  {order.status}
                </SelectItem>
                {nextStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCancelOpen(true)}
              disabled={statusUpdating}
            >
              <XCircleIcon className="mr-1 size-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden border shadow-none">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-4">
              <PackageIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Items</h2>
              <span className="text-xs text-muted-foreground">
                ({order.items.length})
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="text-center font-semibold">Qty</TableHead>
                  <TableHead className="text-right font-semibold">Unit</TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium">
                        {it.productId ? (
                          <Link
                            to={`/vendor/products?highlight=${it.productId}`}
                            className="hover:text-primary hover:underline"
                          >
                            {it.title}
                          </Link>
                        ) : (
                          it.title
                        )}
                      </div>
                      {it.variantTitle && (
                        <div className="text-xs text-muted-foreground">
                          {it.variantTitle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {it.sku ?? "—"}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {it.fulfilledQuantity}/{it.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(Number(it.unitPrice))}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatPrice(Number(it.totalPrice))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={it.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="overflow-hidden border shadow-none">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-4">
              <TruckIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Shipping & fulfillment</h2>
              <span className="ml-auto">
                <StatusBadge status={order.deliveryStatus} />
              </span>
            </div>
            <div className="space-y-5 p-6">
              {fulfillments.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fulfillments ({fulfillments.length})
                  </h3>
                  <div className="space-y-2">
                    {fulfillments.map((f) => (
                      <div
                        key={f.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <StatusBadge status={f.status} />
                          {f.carrier && (
                            <span className="text-muted-foreground">
                              {f.carrier}
                              {f.service ? ` · ${f.service}` : ""}
                            </span>
                          )}
                        </div>
                        {f.trackingNumber && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {f.trackingNumber}
                            </span>
                            {f.trackingUrl && (
                              <a
                                href={f.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                Track <ExternalLinkIcon className="size-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isShippable && (
                <div className="space-y-3 rounded-md border border-dashed p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Mark as shipped</h3>
                    <span className="text-xs text-muted-foreground">
                      Tracking info is optional
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="carrier" className="text-xs">
                        Carrier
                      </Label>
                      <Input
                        id="carrier"
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        placeholder="e.g. DHL"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tracking-number" className="text-xs">
                        Tracking #
                      </Label>
                      <Input
                        id="tracking-number"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="123456789"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tracking-url" className="text-xs">
                        Tracking URL
                      </Label>
                      <Input
                        id="tracking-url"
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        placeholder="https://…"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleMarkAsShipped}
                    disabled={shipBusy}
                  >
                    <TruckIcon className="mr-1 size-4" />
                    {shipBusy ? "Saving…" : "Mark as shipped"}
                  </Button>
                </div>
              )}

              {isInTransit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkAsDelivered}
                  disabled={shipBusy}
                >
                  <CheckCircleIcon className="mr-1 size-4" />
                  {shipBusy ? "Saving…" : "Mark as delivered"}
                </Button>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Label className="text-xs text-muted-foreground">
                  Update delivery status manually
                </Label>
                <Select
                  value={order.deliveryStatus}
                  onValueChange={handleDeliveryStatusChange}
                  disabled={deliveryUpdating}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border shadow-none">
            <div className="border-b bg-muted/30 px-6 py-4">
              <h2 className="text-sm font-semibold">Summary</h2>
            </div>
            <div className="space-y-2 p-6 text-sm">
              <Row label="Subtotal" value={formatPrice(Number(order.subtotalPrice))} />
              {Number(order.discountTotal) > 0 && (
                <Row
                  label="Discount"
                  value={`− ${formatPrice(Number(order.discountTotal))}`}
                />
              )}
              {Number(order.shippingPrice) > 0 && (
                <Row label="Shipping" value={formatPrice(Number(order.shippingPrice))} />
              )}
              {Number(order.taxTotal) > 0 && (
                <Row label="Tax" value={formatPrice(Number(order.taxTotal))} />
              )}
              <div className="my-2 h-px bg-border" />
              <Row
                label="Total"
                value={formatPrice(Number(order.totalPrice))}
                emphasis
              />
            </div>
          </Card>

          {shipping && (
            <Card className="overflow-hidden border shadow-none">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-4">
                <MapPinIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Ship to</h2>
              </div>
              <div className="space-y-0.5 p-6 text-sm">
                <p className="font-semibold">
                  {[shipping.firstName, shipping.lastName].filter(Boolean).join(" ") ||
                    "—"}
                </p>
                {shipping.company && (
                  <p className="text-muted-foreground">{shipping.company}</p>
                )}
                <p>{shipping.address1}</p>
                {shipping.address2 && <p>{shipping.address2}</p>}
                <p>
                  {shipping.city}
                  {shipping.province ? `, ${shipping.province}` : ""} {shipping.zip}
                </p>
                <p>{shipping.country}</p>
                {shipping.phone && (
                  <p className="pt-2 text-muted-foreground">{shipping.phone}</p>
                )}
              </div>
            </Card>
          )}

          {billing && (
            <Card className="overflow-hidden border shadow-none">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-4">
                <UserIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Bill to</h2>
              </div>
              <div className="space-y-0.5 p-6 text-sm">
                <p className="font-semibold">
                  {[billing.firstName, billing.lastName].filter(Boolean).join(" ") ||
                    "—"}
                </p>
                {billing.company && (
                  <p className="text-muted-foreground">{billing.company}</p>
                )}
                <p>{billing.address1}</p>
                {billing.address2 && <p>{billing.address2}</p>}
                <p>
                  {billing.city}
                  {billing.province ? `, ${billing.province}` : ""} {billing.zip}
                </p>
                <p>{billing.country}</p>
              </div>
            </Card>
          )}

          {order.note && (
            <Card className="overflow-hidden border shadow-none">
              <div className="border-b bg-muted/30 px-6 py-4">
                <h2 className="text-sm font-semibold">Note</h2>
              </div>
              <p className="whitespace-pre-wrap p-6 text-sm text-muted-foreground">
                {order.note}
              </p>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this order?"
        description={`Cancel order #${order.vendorOrderNumber}? This cannot be undone.`}
        confirmLabel="Cancel order"
        variant="destructive"
        onConfirm={handleCancelOrder}
      />
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        emphasis ? "text-base font-semibold" : ""
      }`}
    >
      <span className={emphasis ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
