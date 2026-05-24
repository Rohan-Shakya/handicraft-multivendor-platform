import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Customer, CustomerAddress, Order } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MetafieldsEditor } from "@/components/MetafieldsEditor";
import { TagsEditor } from "@/components/TagsEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  ShoppingBagIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  PackageIcon,
} from "lucide-react";

interface CustomerDetail extends Customer {
  state?: string;
  totalOrders?: number;
  totalSpent?: string | number;
  lastOrderAt?: string | null;
  emailMarketingSubscribed?: boolean;
  smsMarketingSubscribed?: boolean;
  notes?: string | null;
  orders?: Order[];
  language?: string | null;
  lastLoginAt?: string | Date | null;
  companyName?: string | null;
  taxStatus?: string;
  vatNumber?: string | null;
  storeCreditBalance?: string | number;
  tags: string[];
  addresses?: CustomerAddress[];
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    loadCustomer(controller.signal);
    return () => controller.abort();
  }, [id]);

  async function loadCustomer(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const customerRes = await apiFetch<CustomerDetail>(`/admin/customers/${id}`, { signal });
      setCustomer(customerRes);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e.message);
        toast({ title: "Failed to load customer", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/customers/${id}`, { method: "DELETE" });
      toast({ title: "Customer deleted" });
      navigate("/customers");
    } catch (e: any) {
      toast({ title: "Failed to delete customer", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  function formatCurrency(amount: string | number | undefined, currency?: string | null): string {
    if (amount == null) return formatPrice(0, currency);
    return formatPrice(amount, currency);
  }

  function formatDate(date: string | Date | null | undefined): string {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}>
          <ArrowLeftIcon className="size-4 mr-1" /> Back to Customers
        </Button>
        <EmptyState
          icon={UserIcon}
          title="Customer not found"
          description={error ?? "The requested customer could not be loaded."}
        />
      </div>
    );
  }

  const fullName =
    customer.firstName || customer.lastName
      ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim()
      : "Unknown Customer";

  const totalSpentNum = typeof customer.totalSpent === "string" ? parseFloat(customer.totalSpent) : (customer.totalSpent ?? 0);
  const avgOrderValue =
    customer.totalOrders && customer.totalOrders > 0
      ? totalSpentNum / customer.totalOrders
      : 0;

  function formatRelativeTime(date: string | Date | null | undefined): string {
    if (!date) return "N/A";
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return "Today";
    if (diffDays === 1) return "1 day";
    if (diffDays < 30) return `${diffDays} days`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears > 1 ? "s" : ""}`;
  }

  function formatDateTime(date: string | Date | null | undefined): string {
    if (!date) return "N/A";
    return new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const lastOrder =
    customer.orders && customer.orders.length > 0
      ? [...customer.orders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
      : null;

  const addresses = customer.addresses ?? [];
  const defaultAddress = addresses.find((a) => a.isDefaultShipping) ?? addresses[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="size-8 mt-1" aria-label="Back to customers" onClick={() => navigate("/customers")}>
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
              {(customer.firstName?.[0] ?? customer.email[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{fullName}</h1>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={customer.state ?? "enabled"} />
          <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${id}/edit`)}>
            <PencilIcon className="size-3.5 mr-1.5" />
            Edit
          </Button>
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete customer"
            description={`Are you sure you want to delete ${fullName}? This action cannot be undone.`}
            confirmLabel="Delete"
            variant="destructive"
            loading={deleting}
            onConfirm={handleDelete}
          />
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/5" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon className="size-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Amount spent</p>
          <p className="text-lg font-semibold">{formatCurrency(customer.totalSpent)}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Orders</p>
          <p className="text-lg font-semibold">{customer.totalOrders ?? 0}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Customer since</p>
          <p className="text-lg font-semibold">{formatRelativeTime(customer.createdAt)}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Avg. order</p>
          <p className="text-lg font-semibold">{formatCurrency(avgOrderValue)}</p>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Last order card */}
          {lastOrder && (
            <Card className="overflow-hidden border shadow-none bg-muted/30">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <PackageIcon className="size-4 text-muted-foreground" />
                  Last order placed
                </h3>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/orders?customer=${id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View all orders
                  </Link>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <Link
                      to={`/orders/${lastOrder.id}`}
                      className="text-sm font-semibold font-mono hover:underline"
                    >
                      #{lastOrder.orderNumber}
                    </Link>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={lastOrder.status} />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="size-3" />
                      {formatDateTime(lastOrder.createdAt)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold">{formatCurrency(lastOrder.totalPrice)}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Orders card */}
          <Card className="overflow-hidden border shadow-none">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-sm font-semibold">Orders</h3>
              <Link to="/orders" className="text-sm text-primary hover:underline">
                View all orders
              </Link>
            </div>
            {!customer.orders || customer.orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBagIcon}
                title="No orders"
                description="This customer has no orders yet."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Order</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <TableCell className="font-medium font-mono text-sm">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground text-right">
                        {formatCurrency(order.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Addresses card */}
          <Card className="overflow-hidden border shadow-none">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-sm font-semibold">Addresses</h3>
              <Link to={`/customers/${id}/edit`} className="text-sm text-primary hover:underline">
                Manage addresses
              </Link>
            </div>
            {addresses.length === 0 ? (
              <EmptyState
                icon={MapPinIcon}
                title="No addresses"
                description="This customer has no saved addresses."
              />
            ) : (
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {addresses.map((addr) => (
                  <div key={addr.id} className="rounded-lg border p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {addr.firstName} {addr.lastName}
                      </p>
                      <div className="flex gap-1">
                        {addr.isDefaultShipping && (
                          <Badge variant="secondary" className="text-xs">Default shipping</Badge>
                        )}
                        {addr.isDefaultBilling && (
                          <Badge variant="secondary" className="text-xs">Default billing</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{addr.address1}</p>
                    {addr.address2 && <p className="text-sm text-muted-foreground">{addr.address2}</p>}
                    <p className="text-sm text-muted-foreground">
                      {[addr.city, addr.province, addr.zip].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground">{addr.country}</p>
                    {addr.phone && (
                      <p className="text-xs text-muted-foreground mt-1">{addr.phone}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Metafields card */}
          <Card className="overflow-hidden border shadow-none">
            <div className="px-6 py-4 border-b">
              <h3 className="text-sm font-semibold">Metafields</h3>
            </div>
            <div className="p-6">
              <MetafieldsEditor entityType="customers" entityId={id!} />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Customer</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium truncate ml-4">{customer.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{customer.phone ?? <span className="italic text-muted-foreground/60">Not set</span>}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Company</span>
                <span className="font-medium">{customer.companyName ?? <span className="italic text-muted-foreground/60">Not set</span>}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium">{customer.language ?? "Default"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registered</span>
                <span className="font-medium">{formatDate(customer.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last login</span>
                <span className="font-medium">{formatDate(customer.lastLoginAt)}</span>
              </div>
            </div>
          </Card>

          {/* Marketing card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Marketing</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email marketing</span>
                {customer.emailMarketingSubscribed ? (
                  <Badge variant="default" className="text-xs">Subscribed</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not subscribed</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SMS marketing</span>
                {customer.smsMarketingSubscribed ? (
                  <Badge variant="default" className="text-xs">Subscribed</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not subscribed</Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Tax & billing card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tax & Billing</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax status</span>
                {customer.taxStatus === "exempt" ? (
                  <Badge variant="secondary" className="text-xs">Exempt</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Taxable</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">VAT number</span>
                <span className="font-medium">{customer.vatNumber ?? <span className="italic text-muted-foreground/60">Not set</span>}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Store credit</span>
                <span className="font-medium">{formatCurrency(customer.storeCreditBalance)}</span>
              </div>
            </div>
          </Card>

          {/* Tags card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tags</h3>
            <TagsEditor
              tags={customer.tags ?? []}
              onAdd={async (newTags) => {
                await apiFetch(`/admin/customers/${id}/tags`, {
                  method: "POST",
                  body: JSON.stringify({ tags: newTags }),
                });
                loadCustomer();
              }}
              onRemove={async (tag) => {
                await apiFetch(`/admin/customers/${id}/tags/${encodeURIComponent(tag)}`, {
                  method: "DELETE",
                });
                loadCustomer();
              }}
            />
          </Card>

          {/* Default address card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Default address</h3>
            {defaultAddress ? (
              <div className="text-sm space-y-0.5">
                <p className="font-medium">
                  {defaultAddress.firstName} {defaultAddress.lastName}
                </p>
                {defaultAddress.company && (
                  <p className="text-muted-foreground">{defaultAddress.company}</p>
                )}
                <p className="text-muted-foreground">{defaultAddress.address1}</p>
                {defaultAddress.address2 && (
                  <p className="text-muted-foreground">{defaultAddress.address2}</p>
                )}
                <p className="text-muted-foreground">
                  {[defaultAddress.city, defaultAddress.province, defaultAddress.zip]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-muted-foreground">{defaultAddress.country}</p>
                {defaultAddress.phone && (
                  <p className="text-muted-foreground mt-1">{defaultAddress.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No address on file</p>
            )}
          </Card>

          {/* Notes card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Notes</h3>
            {customer.notes ? (
              <p className="text-sm leading-relaxed">{customer.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes</p>
            )}
          </Card>

          {/* Stats card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total orders</span>
                <span className="font-medium">{customer.totalOrders ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total spent</span>
                <span className="font-medium">{formatCurrency(customer.totalSpent)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Average order value</span>
                <span className="font-medium">{formatCurrency(avgOrderValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last order date</span>
                <span className="font-medium">{formatDate(customer.lastOrderAt)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}
