import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatPrice, getPlatformCurrency } from "@/lib/format";
import { FormField } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  SaveIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";

interface VendorOption {
  id: string;
  name: string;
  slug: string;
}

interface VariantOption {
  id: string;
  title: string | null;
  sku: string | null;
  price: string;
}

interface ProductPickerResult {
  id: string;
  title: string;
  vendorId: string;
  vendor?: { name?: string | null } | null;
  variants?: VariantOption[];
  defaultVariantId?: string | null;
  lowestPrice?: string | null;
}

type LineItemDraft =
  | {
      kind: "catalog";
      key: string;
      variantId: string;
      productId: string | null;
      vendorId: string;
      title: string;
      sku: string | null;
      quantity: number;
      unitPrice: string;
    }
  | {
      kind: "custom";
      key: string;
      vendorId: string;
      title: string;
      sku: string;
      quantity: number;
      unitPrice: string;
    };

interface AddressDraft {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  zip: string;
}

const EMPTY_ADDRESS: AddressDraft = {
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  country: "",
  countryCode: "",
  zip: "",
};

function toCents(value: string | number): number {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function uniqueKey() {
  return Math.random().toString(36).slice(2);
}

interface ExistingOrderForEdit {
  id: string;
  currencyCode: string;
  customerEmail: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  shippingPrice: string;
  taxTotal: string;
  discountTotal: string;
  note: string | null;
  status: string;
  items: Array<{
    id: string;
    variantId: string | null;
    productId: string | null;
    vendorId: string;
    title: string;
    sku: string | null;
    quantity: number;
    unitPrice: string;
  }>;
  addresses: Array<{
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
    countryCode: string;
    zip: string;
  }>;
}

export function DraftOrderFormPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEdit = !!editId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [currencyCode, setCurrencyCode] = useState(getPlatformCurrency());

  // Customer
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Addresses
  const [shipping, setShipping] = useState<AddressDraft>(EMPTY_ADDRESS);

  // Line items
  const [items, setItems] = useState<LineItemDraft[]>([]);

  // Totals — admin overrides
  const [shippingPrice, setShippingPrice] = useState("0");
  const [taxTotal, setTaxTotal] = useState("0");
  const [discountTotal, setDiscountTotal] = useState("0");

  // Note
  const [note, setNote] = useState("");

  // Catalog picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerResults, setPickerResults] = useState<ProductPickerResult[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerExpandedId, setPickerExpandedId] = useState<string | null>(null);
  const pickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load vendors + (for edit) existing order
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const vendorRes = await apiFetch<{ data: VendorOption[] }>(
          "/admin/vendors?limit=100",
          { signal: controller.signal }
        );
        setVendors(vendorRes.data ?? []);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast({
            title: "Failed to load vendors",
            description: e.message,
            variant: "destructive",
          });
        }
      }

      if (isEdit && editId) {
        try {
          const order = await apiFetch<ExistingOrderForEdit>(
            `/admin/orders/${editId}`,
            { signal: controller.signal }
          );
          if (order.status !== "draft") {
            toast({
              title: "Only draft orders can be edited",
              description: `Order is currently "${order.status}".`,
              variant: "destructive",
            });
            navigate(`/orders/${editId}`);
            return;
          }
          setCurrencyCode(order.currencyCode);
          setCustomerEmail(order.customerEmail ?? "");
          setCustomerFirstName(order.customerFirstName ?? "");
          setCustomerLastName(order.customerLastName ?? "");
          setCustomerPhone(order.customerPhone ?? "");
          setShippingPrice(order.shippingPrice);
          setTaxTotal(order.taxTotal);
          setDiscountTotal(order.discountTotal);
          setNote(order.note ?? "");

          const ship = order.addresses.find((a) => a.type === "shipping");
          if (ship) {
            setShipping({
              firstName: ship.firstName ?? "",
              lastName: ship.lastName ?? "",
              company: ship.company ?? "",
              phone: ship.phone ?? "",
              address1: ship.address1,
              address2: ship.address2 ?? "",
              city: ship.city,
              province: ship.province ?? "",
              country: ship.country,
              countryCode: ship.countryCode,
              zip: ship.zip,
            });
          }

          setItems(
            order.items.map((i) =>
              i.variantId
                ? {
                    kind: "catalog" as const,
                    key: i.id,
                    variantId: i.variantId,
                    productId: i.productId,
                    vendorId: i.vendorId,
                    title: i.title,
                    sku: i.sku,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                  }
                : {
                    kind: "custom" as const,
                    key: i.id,
                    vendorId: i.vendorId,
                    title: i.title,
                    sku: i.sku ?? "",
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                  }
            )
          );
        } catch (e: any) {
          if (e?.name !== "AbortError") {
            toast({
              title: "Failed to load draft",
              description: e.message,
              variant: "destructive",
            });
            navigate("/orders");
          }
        } finally {
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [isEdit, editId, navigate]);

  // Debounced product search
  const runPickerSearch = useCallback((query: string) => {
    if (pickerDebounceRef.current) clearTimeout(pickerDebounceRef.current);
    pickerDebounceRef.current = setTimeout(async () => {
      setPickerLoading(true);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (query.trim()) params.set("search", query.trim());
        const res = await apiFetch<{ data: ProductPickerResult[] }>(
          `/admin/products?${params}`
        );
        setPickerResults(res.data ?? []);
      } catch (e: any) {
        toast({
          title: "Product search failed",
          description: e.message,
          variant: "destructive",
        });
        setPickerResults([]);
      } finally {
        setPickerLoading(false);
      }
    }, 250);
  }, []);

  function openCatalogPicker() {
    setPickerOpen(true);
    setPickerSearch("");
    setPickerExpandedId(null);
    runPickerSearch("");
  }

  function addCatalogVariant(product: ProductPickerResult, variant: VariantOption) {
    setItems((prev) => [
      ...prev,
      {
        kind: "catalog",
        key: uniqueKey(),
        variantId: variant.id,
        productId: product.id,
        vendorId: product.vendorId,
        title: product.title,
        sku: variant.sku,
        quantity: 1,
        unitPrice: variant.price,
      },
    ]);
    setPickerOpen(false);
  }

  function addCustomLine() {
    if (vendors.length === 0) {
      toast({
        title: "No vendors available",
        description: "Create a vendor first.",
        variant: "destructive",
      });
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        kind: "custom",
        key: uniqueKey(),
        vendorId: vendors[0].id,
        title: "",
        sku: "",
        quantity: 1,
        unitPrice: "0.00",
      },
    ]);
  }

  function updateItem(key: string, patch: Partial<LineItemDraft>) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? ({ ...i, ...patch } as LineItemDraft) : i))
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  // Compute totals
  const subtotalCents = useMemo(
    () => items.reduce((s, i) => s + toCents(i.unitPrice) * i.quantity, 0),
    [items]
  );
  const totalCents = Math.max(
    0,
    subtotalCents - toCents(discountTotal) + toCents(shippingPrice) + toCents(taxTotal)
  );

  // Validation
  function validate(): string | null {
    if (!customerEmail.trim()) return "Customer email is required";
    if (items.length === 0) return "Add at least one line item";
    for (const item of items) {
      if (item.quantity < 1) return "Quantity must be at least 1";
      if (item.kind === "custom") {
        if (!item.title.trim()) return "Every custom line needs a title";
        if (!item.vendorId) return "Every custom line needs a vendor";
        if (toCents(item.unitPrice) < 0) return "Custom item price cannot be negative";
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Cannot save draft", description: err, variant: "destructive" });
      return;
    }

    const payload: Record<string, unknown> = {
      customerEmail: customerEmail.trim(),
      customerFirstName: customerFirstName.trim() || undefined,
      customerLastName: customerLastName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      currencyCode,
      items: items.map((i) =>
        i.kind === "catalog"
          ? {
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            }
          : {
              vendorId: i.vendorId,
              title: i.title.trim(),
              sku: i.sku.trim() || undefined,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            }
      ),
      shippingPrice,
      taxTotal,
      discountTotal,
      note: note.trim() || undefined,
    };

    if (shipping.address1.trim() && shipping.city.trim() && shipping.country.trim()) {
      payload.shippingAddress = {
        firstName: shipping.firstName.trim() || undefined,
        lastName: shipping.lastName.trim() || undefined,
        company: shipping.company.trim() || undefined,
        phone: shipping.phone.trim() || undefined,
        address1: shipping.address1.trim(),
        address2: shipping.address2.trim() || undefined,
        city: shipping.city.trim(),
        province: shipping.province.trim() || undefined,
        country: shipping.country.trim(),
        countryCode: shipping.countryCode.trim().toUpperCase(),
        zip: shipping.zip.trim(),
      };
    }

    setSaving(true);
    try {
      if (isEdit && editId) {
        await apiFetch(`/admin/orders/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Draft updated" });
        navigate(`/orders/${editId}`);
      } else {
        const created = await apiFetch<{ id: string; orderNumber: string }>(
          "/admin/orders/draft",
          { method: "POST", body: JSON.stringify(payload) }
        );
        toast({ title: `Draft created — #${created.orderNumber}` });
        navigate(`/orders/${created.id}`);
      }
    } catch (e: any) {
      toast({
        title: "Failed to save draft",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Back"
            onClick={() => navigate(isEdit && editId ? `/orders/${editId}` : "/orders")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <PageHeader
            title={isEdit ? "Edit draft order" : "New draft order"}
            description={
              isEdit
                ? "Update line items, customer, or totals while the order is still in draft."
                : "Build an order for a customer to review and pay later — useful for custom commissions, B2B orders, or phone orders."
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit && editId ? `/orders/${editId}` : "/orders")}
            disabled={saving}
          >
            <XIcon className="size-4 mr-1" /> Discard
          </Button>
          <Button type="submit" form="draft-order-form" disabled={saving}>
            <SaveIcon className="size-4 mr-1" />
            {saving ? "Saving…" : isEdit ? "Save changes" : "Save draft"}
          </Button>
        </div>
      </div>

      <form
        id="draft-order-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Line items</CardTitle>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={openCatalogPicker}>
                  <PlusIcon className="size-3.5 mr-1" /> Catalog item
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={addCustomLine}>
                  <PlusIcon className="size-3.5 mr-1" /> Custom item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No items yet. Add a catalog product or a one-off custom line (e.g. a bespoke sculpture).
                </p>
              ) : (
                items.map((item) => (
                  <LineItemRow
                    key={item.key}
                    item={item}
                    vendors={vendors}
                    currencyCode={currencyCode}
                    onChange={(patch) => updateItem(item.key, patch)}
                    onRemove={() => removeItem(item.key)}
                  />
                ))
              )}

              {pickerOpen && (
                <div className="mt-4 border rounded-md p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="relative flex-1">
                      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Search products by title…"
                        value={pickerSearch}
                        onChange={(e) => {
                          setPickerSearch(e.target.value);
                          runPickerSearch(e.target.value);
                        }}
                        className="pl-8 h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setPickerOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y border-t">
                    {pickerLoading ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">Loading…</p>
                    ) : pickerResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        No products match.
                      </p>
                    ) : (
                      pickerResults.map((p) => (
                        <ProductPickerRow
                          key={p.id}
                          product={p}
                          expanded={pickerExpandedId === p.id}
                          onToggle={() =>
                            setPickerExpandedId((prev) => (prev === p.id ? null : p.id))
                          }
                          onPickVariant={(v) => addCatalogVariant(p, v)}
                          currencyCode={currencyCode}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Email" htmlFor="customerEmail" required>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                />
              </FormField>
              <FormField label="Phone" htmlFor="customerPhone">
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+977 98 0000 0000"
                />
              </FormField>
              <FormField label="First name" htmlFor="customerFirstName">
                <Input
                  id="customerFirstName"
                  value={customerFirstName}
                  onChange={(e) => setCustomerFirstName(e.target.value)}
                />
              </FormField>
              <FormField label="Last name" htmlFor="customerLastName">
                <Input
                  id="customerLastName"
                  value={customerLastName}
                  onChange={(e) => setCustomerLastName(e.target.value)}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Address line 1" htmlFor="ship-address1" className="sm:col-span-2">
                <Input
                  id="ship-address1"
                  value={shipping.address1}
                  onChange={(e) => setShipping({ ...shipping, address1: e.target.value })}
                />
              </FormField>
              <FormField label="Address line 2" htmlFor="ship-address2" className="sm:col-span-2">
                <Input
                  id="ship-address2"
                  value={shipping.address2}
                  onChange={(e) => setShipping({ ...shipping, address2: e.target.value })}
                />
              </FormField>
              <FormField label="City" htmlFor="ship-city">
                <Input
                  id="ship-city"
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                />
              </FormField>
              <FormField label="Province / state" htmlFor="ship-province">
                <Input
                  id="ship-province"
                  value={shipping.province}
                  onChange={(e) => setShipping({ ...shipping, province: e.target.value })}
                />
              </FormField>
              <FormField label="Country" htmlFor="ship-country">
                <Input
                  id="ship-country"
                  value={shipping.country}
                  onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
                  placeholder="Nepal"
                />
              </FormField>
              <FormField label="Country code" htmlFor="ship-country-code" hint="ISO 2-letter, e.g. NP">
                <Input
                  id="ship-country-code"
                  value={shipping.countryCode}
                  onChange={(e) =>
                    setShipping({ ...shipping, countryCode: e.target.value.toUpperCase() })
                  }
                  maxLength={2}
                />
              </FormField>
              <FormField label="ZIP / postal code" htmlFor="ship-zip">
                <Input
                  id="ship-zip"
                  value={shipping.zip}
                  onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Note */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Note</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Pay-on-delivery agreed; statue to be ready by August…"
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField label="Currency" htmlFor="currency">
                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["NPR", "USD", "EUR", "GBP", "INR"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatPrice(fromCents(subtotalCents), currencyCode)}
                </span>
              </div>

              <FormField label="Discount" htmlFor="discount">
                <Input
                  id="discount"
                  inputMode="decimal"
                  value={discountTotal}
                  onChange={(e) => setDiscountTotal(e.target.value)}
                />
              </FormField>
              <FormField label="Shipping" htmlFor="shipping">
                <Input
                  id="shipping"
                  inputMode="decimal"
                  value={shippingPrice}
                  onChange={(e) => setShippingPrice(e.target.value)}
                />
              </FormField>
              <FormField label="Tax" htmlFor="tax">
                <Input
                  id="tax"
                  inputMode="decimal"
                  value={taxTotal}
                  onChange={(e) => setTaxTotal(e.target.value)}
                />
              </FormField>

              <div className="flex items-center justify-between text-base font-bold pt-3 border-t">
                <span>Total</span>
                <span>{formatPrice(fromCents(totalCents), currencyCode)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Payment stays <strong>pending</strong> after conversion — the customer can pay later
                via the invoice link.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function LineItemRow({
  item,
  vendors,
  currencyCode,
  onChange,
  onRemove,
}: {
  item: LineItemDraft;
  vendors: VendorOption[];
  currencyCode: string;
  onChange: (patch: Partial<LineItemDraft>) => void;
  onRemove: () => void;
}) {
  const lineTotalCents = toCents(item.unitPrice) * item.quantity;
  return (
    <div className="border rounded-md p-3 flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="flex-1 space-y-1">
        {item.kind === "custom" ? (
          <>
            <Input
              value={item.title}
              onChange={(e) => onChange({ title: e.target.value } as Partial<LineItemDraft>)}
              placeholder="Custom 18-inch bronze Buddha — antique finish"
              className="font-medium"
            />
            <div className="flex gap-2">
              <Select
                value={item.vendorId}
                onValueChange={(v) => onChange({ vendorId: v } as Partial<LineItemDraft>)}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={item.sku}
                onChange={(e) => onChange({ sku: e.target.value } as Partial<LineItemDraft>)}
                placeholder="SKU (optional)"
                className="h-8 text-xs flex-1"
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.sku ? `SKU ${item.sku} · ` : ""}variant {item.variantId.slice(0, 12)}…
            </p>
          </>
        )}
      </div>
      <div className="flex items-end gap-2">
        <div className="w-20">
          <label className="text-xs text-muted-foreground block mb-1">Qty</label>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) =>
              onChange({ quantity: Math.max(1, Number(e.target.value) || 1) } as Partial<LineItemDraft>)
            }
            className="h-8"
          />
        </div>
        <div className="w-28">
          <label className="text-xs text-muted-foreground block mb-1">Unit price</label>
          <Input
            inputMode="decimal"
            value={item.unitPrice}
            onChange={(e) => onChange({ unitPrice: e.target.value } as Partial<LineItemDraft>)}
            className="h-8 text-right"
          />
        </div>
        <div className="w-28 text-right">
          <label className="text-xs text-muted-foreground block mb-1">Total</label>
          <p className="h-8 flex items-center justify-end text-sm font-bold">
            {formatPrice(fromCents(lineTotalCents), currencyCode)}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="size-8 text-destructive"
          aria-label="Remove line"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ProductPickerRow({
  product,
  expanded,
  onToggle,
  onPickVariant,
  currencyCode,
}: {
  product: ProductPickerResult;
  expanded: boolean;
  onToggle: () => void;
  onPickVariant: (variant: VariantOption) => void;
  currencyCode: string;
}) {
  const variants = product.variants ?? [];
  const hasMany = variants.length > 1;
  return (
    <div className="py-2 px-1">
      <button
        type="button"
        onClick={() => {
          if (!hasMany && variants.length === 1) {
            onPickVariant(variants[0]);
          } else {
            onToggle();
          }
        }}
        className="w-full text-left flex items-center justify-between hover:bg-muted/50 rounded px-2 py-1"
      >
        <div>
          <p className="text-sm font-medium">{product.title}</p>
          <p className="text-xs text-muted-foreground">
            {product.vendor?.name ?? "Unknown vendor"}
            {variants.length > 0 && ` · ${variants.length} variant${variants.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {product.lowestPrice
            ? formatPrice(product.lowestPrice, currencyCode)
            : variants[0]?.price
              ? formatPrice(variants[0].price, currencyCode)
              : ""}
        </span>
      </button>
      {expanded && hasMany && (
        <div className="mt-1 ml-3 border-l pl-3 space-y-1">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onPickVariant(v)}
              className="w-full text-left flex items-center justify-between text-xs hover:bg-muted/50 rounded px-2 py-1"
            >
              <span>
                {v.title ?? v.sku ?? v.id.slice(0, 8)}
                {v.sku && v.title && (
                  <span className="text-muted-foreground"> · {v.sku}</span>
                )}
              </span>
              <span className="text-muted-foreground">
                {formatPrice(v.price, currencyCode)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
