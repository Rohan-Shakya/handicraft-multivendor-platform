import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { formatPrice, currencySymbol } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { FormField } from "@/components/FormField";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftIcon,
  Loader2Icon,
  DicesIcon,
  Trash2Icon,
  TicketIcon,
  ZapIcon,
  CheckIcon,
  InfoIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface DiscountDetail {
  id: string;
  title: string;
  description: string | null;
  scope: "platform" | "vendor" | "targeted_vendors";
  vendorId: string | null;
  status: "draft" | "active" | "expired" | "archived";
  type: "percentage" | "fixed_amount" | "free_shipping";
  targetType: "order" | "shipping";
  value: string;
  minimumSubtotal: string | null;
  usageLimit: number | null;
  usageCount: number;
  oncePerCustomer: boolean;
  firstOrderOnly: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  productIds?: string[];
  collectionIds?: string[];
}

interface PickerItem {
  id: string;
  title: string;
  status?: string;
}

interface DiscountCode {
  id: string;
  code: string;
  status: string;
  usageLimit: number | null;
  usageCount: number;
}

interface DiscountForm {
  title: string;
  description: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  targetType: "order" | "shipping";
  scope: "platform" | "vendor" | "targeted_vendors";
  value: string;
  status: "draft" | "active";
  // Code
  method: "code" | "automatic";
  code: string;
  // Conditions
  minimumRequirement: "none" | "amount";
  minimumSubtotal: string;
  // Usage
  hasUsageLimit: boolean;
  usageLimit: string;
  oncePerCustomer: boolean;
  firstOrderOnly: boolean;
  // Dates
  startsAt: string;
  hasEndDate: boolean;
  endsAt: string;
  // Vendor targeting
  vendorId: string;
  // Product / collection targeting
  appliesTo: "all" | "products" | "collections";
}

const INITIAL_FORM: DiscountForm = {
  title: "",
  description: "",
  type: "percentage",
  targetType: "order",
  scope: "platform",
  value: "",
  status: "active",
  method: "code",
  code: "",
  minimumRequirement: "none",
  minimumSubtotal: "",
  hasUsageLimit: false,
  usageLimit: "",
  oncePerCustomer: false,
  firstOrderOnly: false,
  startsAt: "",
  hasEndDate: false,
  endsAt: "",
  vendorId: "",
  appliesTo: "all",
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function generateRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getTypeTitle(form: DiscountForm): string {
  if (form.type === "free_shipping") return "Free shipping";
  if (form.targetType === "order") return "Amount off order";
  return "Amount off order";
}

function formatSummaryValue(form: DiscountForm): string {
  if (form.type === "free_shipping") return "Free shipping";
  if (form.type === "percentage") return `${form.value || 0}%`;
  return formatPrice(parseFloat(form.value || "0"));
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function DiscountFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";

  const [form, setForm] = useState<DiscountForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Existing discount data for edit mode
  const [discount, setDiscount] = useState<DiscountDetail | null>(null);
  const [existingCodes, setExistingCodes] = useState<DiscountCode[]>([]);
  const [addingCode, setAddingCode] = useState(false);

  // Product / collection picker state
  const [selectedProducts, setSelectedProducts] = useState<PickerItem[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<PickerItem[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerResults, setPickerResults] = useState<PickerItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  // Delete dialog
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* -- Load existing discount ------------------------------------------- */

  const loadDiscount = useCallback(async (signal?: AbortSignal) => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const [d, codes] = await Promise.all([
        apiFetch<DiscountDetail>(`/admin/discounts/${id}`, { signal }),
        apiFetch<DiscountCode[]>(`/admin/discounts/${id}/codes`, { signal }),
      ]);
      setDiscount(d);
      setExistingCodes(codes);

      const hasCode = codes.length > 0;
      // Determine applies-to scope
      const hasProducts = d.productIds && d.productIds.length > 0;
      const hasCollections = d.collectionIds && d.collectionIds.length > 0;
      const appliesTo: DiscountForm["appliesTo"] = hasProducts
        ? "products"
        : hasCollections
          ? "collections"
          : "all";

      setForm({
        title: d.title ?? "",
        description: d.description ?? "",
        type: d.type,
        targetType: d.targetType,
        scope: d.scope,
        value: d.type === "free_shipping" ? "" : d.value,
        status: d.status === "active" ? "active" : "draft",
        method: hasCode ? "code" : "automatic",
        code: codes[0]?.code ?? "",
        minimumRequirement:
          d.minimumSubtotal && parseFloat(d.minimumSubtotal) > 0
            ? "amount"
            : "none",
        minimumSubtotal: d.minimumSubtotal ?? "",
        hasUsageLimit: d.usageLimit != null && d.usageLimit > 0,
        usageLimit: d.usageLimit != null ? String(d.usageLimit) : "",
        oncePerCustomer: d.oncePerCustomer,
        firstOrderOnly: d.firstOrderOnly,
        startsAt: d.startsAt ? d.startsAt.slice(0, 16) : "",
        hasEndDate: !!d.endsAt,
        endsAt: d.endsAt ? d.endsAt.slice(0, 16) : "",
        vendorId: d.vendorId ?? "",
        appliesTo,
      });

      // Fetch product/collection titles for selected IDs
      if (hasProducts && d.productIds) {
        const products = await Promise.all(
          d.productIds.map(async (pid) => {
            try {
              const p = await apiFetch<{ id: string; title: string; status?: string }>(
                `/admin/products/${pid}`,
                { signal }
              );
              return { id: p.id, title: p.title, status: p.status };
            } catch (err: any) {
              if (err?.name === "AbortError") throw err;
              return { id: pid, title: pid };
            }
          })
        );
        setSelectedProducts(products);
      }

      if (hasCollections && d.collectionIds) {
        const collections = await Promise.all(
          d.collectionIds.map(async (cid) => {
            try {
              const c = await apiFetch<{ id: string; title: string; status?: string }>(
                `/admin/collections/${cid}`,
                { signal }
              );
              return { id: c.id, title: c.title, status: c.status };
            } catch (err: any) {
              if (err?.name === "AbortError") throw err;
              return { id: cid, title: cid };
            }
          })
        );
        setSelectedCollections(collections);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load discount",
          description: e.message,
          variant: "destructive",
        });
        navigate("/discounts");
      }
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    loadDiscount(controller.signal);
    return () => controller.abort();
  }, [loadDiscount]);

  /* -- Field helpers ----------------------------------------------------- */

  function updateField<K extends keyof DiscountForm>(
    key: K,
    value: DiscountForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  /* -- Picker search ------------------------------------------------------ */

  function handlePickerSearch(query: string) {
    setPickerSearch(query);
    if (pickerDebounceRef.current) clearTimeout(pickerDebounceRef.current);

    if (!query.trim()) {
      setPickerResults([]);
      setPickerOpen(false);
      return;
    }

    pickerDebounceRef.current = setTimeout(async () => {
      setPickerLoading(true);
      try {
        const endpoint =
          form.appliesTo === "products"
            ? `/admin/products?search=${encodeURIComponent(query)}&limit=10`
            : `/admin/collections?search=${encodeURIComponent(query)}&limit=10`;
        const res = await apiFetch<{ data: PickerItem[] } | PickerItem[]>(endpoint);
        const items = Array.isArray(res) ? res : res.data;
        // Filter out already-selected items
        const selectedIds = new Set(
          form.appliesTo === "products"
            ? selectedProducts.map((p) => p.id)
            : selectedCollections.map((c) => c.id)
        );
        setPickerResults(items.filter((item) => !selectedIds.has(item.id)));
        setPickerOpen(true);
      } catch {
        setPickerResults([]);
      } finally {
        setPickerLoading(false);
      }
    }, 300);
  }

  function addPickerItem(item: PickerItem) {
    if (form.appliesTo === "products") {
      setSelectedProducts((prev) => [...prev, item]);
    } else {
      setSelectedCollections((prev) => [...prev, item]);
    }
    setPickerSearch("");
    setPickerResults([]);
    setPickerOpen(false);
  }

  function removePickerItem(itemId: string) {
    if (form.appliesTo === "products") {
      setSelectedProducts((prev) => prev.filter((p) => p.id !== itemId));
    } else {
      setSelectedCollections((prev) => prev.filter((c) => c.id !== itemId));
    }
  }

  // Close picker dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        pickerContainerRef.current &&
        !pickerContainerRef.current.contains(e.target as Node)
      ) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset picker state when appliesTo changes
  function handleAppliesToChange(value: DiscountForm["appliesTo"]) {
    updateField("appliesTo", value);
    setPickerSearch("");
    setPickerResults([]);
    setPickerOpen(false);
  }

  /* -- Validation -------------------------------------------------------- */

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";

    if (form.type !== "free_shipping") {
      const val = parseFloat(form.value);
      if (!form.value || isNaN(val) || val <= 0)
        errs.value = "Value must be greater than 0";
      if (form.type === "percentage" && val > 100)
        errs.value = "Percentage cannot exceed 100";
    }

    if (form.method === "code" && !isEdit && !form.code.trim())
      errs.code = "Discount code is required";

    if (form.minimumRequirement === "amount") {
      const min = parseFloat(form.minimumSubtotal);
      if (!form.minimumSubtotal || isNaN(min) || min <= 0)
        errs.minimumSubtotal = "Enter a minimum amount";
    }

    if (form.hasUsageLimit) {
      const lim = parseInt(form.usageLimit);
      if (!form.usageLimit || isNaN(lim) || lim <= 0)
        errs.usageLimit = "Enter a usage limit";
    }

    if (form.hasEndDate && form.startsAt && form.endsAt) {
      if (new Date(form.endsAt) <= new Date(form.startsAt))
        errs.endsAt = "End date must be after start date";
    }

    // Scope-specific validation: vendor-scoped discounts need a vendorId.
    // targeted_vendors scope is not yet supported in the UI — fail loudly
    // instead of silently creating an unusable discount.
    if (form.scope === "vendor" && !form.vendorId.trim()) {
      errs.vendorId = "A vendor is required for vendor-scoped discounts";
    }
    if (form.scope === "targeted_vendors") {
      errs.scope = "Targeted-vendor discounts require the targeting UI (not yet implemented)";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* -- Submit ------------------------------------------------------------ */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        targetType: form.type === "free_shipping" ? "shipping" : form.targetType,
        scope: form.scope,
        value: form.type === "free_shipping" ? 0 : Number(form.value),
        status: form.status,
        minimumSubtotal:
          form.minimumRequirement === "amount"
            ? Number(form.minimumSubtotal)
            : null,
        usageLimit: form.hasUsageLimit ? Number(form.usageLimit) : null,
        oncePerCustomer: form.oncePerCustomer,
        firstOrderOnly: form.firstOrderOnly,
        startsAt: form.startsAt
          ? new Date(form.startsAt).toISOString()
          : null,
        endsAt:
          form.hasEndDate && form.endsAt
            ? new Date(form.endsAt).toISOString()
            : null,
      };

      if (form.scope === "vendor" && form.vendorId.trim()) {
        body.vendorId = form.vendorId.trim();
      }

      // Product / collection targeting
      if (form.appliesTo === "products" && selectedProducts.length > 0) {
        body.productIds = selectedProducts.map((p) => p.id);
      } else if (form.appliesTo === "collections" && selectedCollections.length > 0) {
        body.collectionIds = selectedCollections.map((c) => c.id);
      }

      let discountId = id;

      if (isEdit) {
        await apiFetch(`/admin/discounts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Discount updated" });
      } else {
        const created = await apiFetch<{ id: string }>("/admin/discounts", {
          method: "POST",
          body: JSON.stringify(body),
        });
        discountId = created.id;

        // Create code if method is "code"
        if (form.method === "code" && form.code.trim()) {
          await apiFetch(`/admin/discounts/${discountId}/codes`, {
            method: "POST",
            body: JSON.stringify({ code: form.code.trim().toUpperCase() }),
          });
        }

        toast({ title: "Discount created" });
      }

      navigate("/discounts");
    } catch (e: any) {
      toast({
        title: "Failed to save discount",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* -- Add code to existing discount ------------------------------------ */

  async function handleAddCode() {
    if (!form.code.trim() || !isEdit) return;
    setAddingCode(true);
    try {
      const newCode = await apiFetch<DiscountCode>(
        `/admin/discounts/${id}/codes`,
        {
          method: "POST",
          body: JSON.stringify({ code: form.code.trim().toUpperCase() }),
        }
      );
      setExistingCodes((prev) => [...prev, newCode]);
      updateField("code", "");
      toast({ title: "Code added" });
    } catch (e: any) {
      toast({
        title: "Failed to add code",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setAddingCode(false);
    }
  }

  /* -- Delete ------------------------------------------------------------ */

  async function handleDelete() {
    if (!isEdit) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/discounts/${id}`, { method: "DELETE" });
      toast({ title: "Discount archived" });
      navigate("/discounts");
    } catch (e: any) {
      toast({
        title: "Failed to archive discount",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  /* -- Loading state ----------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-7 w-56" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  /* -- Render ------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => navigate("/discounts")}
            aria-label="Back to discounts"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {isEdit ? discount?.title ?? "Edit Discount" : "Create discount"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {getTypeTitle(form)}
            </p>
          </div>
        </div>
        {isEdit && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2Icon className="size-3.5 mr-1" /> Archive
          </Button>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start"
      >
        {/* ---- MAIN COLUMN ---- */}
        <div className="space-y-6">
          {/* Discount type & method */}
          {!isEdit && (
            <Card className="border shadow-none">
              <CardContent className="pt-6 space-y-4">
                <FormField label="Discount type" htmlFor="disc-type" required>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      updateField("type", v as DiscountForm["type"])
                    }
                  >
                    <SelectTrigger id="disc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed_amount">Fixed amount</SelectItem>
                      <SelectItem value="free_shipping">
                        Free shipping
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <fieldset>
                  <legend className="text-sm font-medium mb-2">Method</legend>
                  <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Discount method">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={form.method === "code"}
                      onClick={() => updateField("method", "code")}
                      className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                        form.method === "code"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <TicketIcon className="size-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Discount code</p>
                        <p className="text-xs text-muted-foreground">
                          Customers enter a code
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={form.method === "automatic"}
                      onClick={() => updateField("method", "automatic")}
                      className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                        form.method === "automatic"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <ZapIcon className="size-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Automatic</p>
                        <p className="text-xs text-muted-foreground">
                          Applied at checkout
                        </p>
                      </div>
                    </button>
                  </div>
                </fieldset>
              </CardContent>
            </Card>
          )}

          {/* Discount code (if code method) */}
          {form.method === "code" && (
            <Card className="border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Discount code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEdit && existingCodes.length > 0 && (
                  <div className="space-y-2">
                    {existingCodes.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                      >
                        <span className="font-mono text-sm font-medium tracking-wider">
                          {c.code}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Used: {c.usageCount}
                            {c.usageLimit ? `/${c.usageLimit}` : ""}
                          </span>
                          <StatusBadgeInline status={c.status} />
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Add another code:
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <FormField
                    label={isEdit && existingCodes.length > 0 ? "Add code" : "Code"}
                    htmlFor="disc-code"
                    error={errors.code}
                    required={!isEdit}
                  >
                    <Input
                      id="disc-code"
                      value={form.code}
                      onChange={(e) =>
                        updateField("code", e.target.value.toUpperCase())
                      }
                      placeholder="e.g. SUMMER25"
                      className="font-mono uppercase tracking-wider"
                    />
                  </FormField>
                  <div className="pt-[22px] flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateField("code", generateRandomCode())}
                      title="Generate random code"
                      aria-label="Generate random code"
                    >
                      <DicesIcon className="size-4" />
                    </Button>
                    {isEdit && form.code.trim() && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCode}
                        disabled={addingCode}
                      >
                        {addingCode ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Customers must enter this code at checkout.
                </p>
              </CardContent>
            </Card>
          )}

          {/* General info */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                label="Title"
                htmlFor="disc-title"
                error={errors.title}
                required
              >
                <Input
                  id="disc-title"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. 25% off entire order"
                />
              </FormField>
              <FormField label="Description" htmlFor="disc-desc">
                <Textarea
                  id="disc-desc"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Internal note about this discount..."
                  rows={2}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Discount value */}
          {form.type !== "free_shipping" && (
            <Card className="border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Discount value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  {isEdit ? (
                    <p className="text-sm text-muted-foreground pt-2 shrink-0">
                      {form.type === "percentage" ? "Percentage" : "Fixed amount"}
                    </p>
                  ) : null}
                  <FormField
                    label={
                      form.type === "percentage"
                        ? "Percentage off"
                        : "Amount off ($)"
                    }
                    htmlFor="disc-value"
                    error={errors.value}
                    required
                  >
                    <div className="relative">
                      <Input
                        id="disc-value"
                        type="number"
                        min="0"
                        max={form.type === "percentage" ? "100" : undefined}
                        step={form.type === "percentage" ? "1" : "0.01"}
                        value={form.value}
                        onChange={(e) => updateField("value", e.target.value)}
                        placeholder={
                          form.type === "percentage" ? "25" : "10.00"
                        }
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {form.type === "percentage" ? "%" : currencySymbol()}
                      </span>
                    </div>
                  </FormField>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applies to */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Applies to</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="appliesTo"
                  checked={form.appliesTo === "all"}
                  onChange={() => handleAppliesToChange("all")}
                  className="size-4 accent-primary"
                />
                <span className="text-sm">All products</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="appliesTo"
                  checked={form.appliesTo === "products"}
                  onChange={() => handleAppliesToChange("products")}
                  className="size-4 accent-primary"
                />
                <span className="text-sm">Specific products</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="appliesTo"
                  checked={form.appliesTo === "collections"}
                  onChange={() => handleAppliesToChange("collections")}
                  className="size-4 accent-primary"
                />
                <span className="text-sm">Specific collections</span>
              </label>

              {/* Product / Collection picker */}
              {form.appliesTo !== "all" && (
                <div className="pl-7 space-y-3">
                  <div ref={pickerContainerRef} className="relative">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        value={pickerSearch}
                        onChange={(e) => handlePickerSearch(e.target.value)}
                        placeholder={
                          form.appliesTo === "products"
                            ? "Search products..."
                            : "Search collections..."
                        }
                        className="pl-9"
                      />
                    </div>

                    {/* Dropdown results */}
                    {pickerOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                        {pickerLoading ? (
                          <div className="flex items-center justify-center py-3">
                            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : pickerResults.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            No results found
                          </p>
                        ) : (
                          pickerResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => addPickerItem(item)}
                              className="flex items-center justify-between w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                            >
                              <span className="truncate">{item.title}</span>
                              {item.status && (
                                <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                                  {item.status}
                                </Badge>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected items as tags */}
                  {form.appliesTo === "products" && selectedProducts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedProducts.map((item) => (
                        <Badge
                          key={item.id}
                          variant="secondary"
                          className="flex items-center gap-1 pl-2 pr-1 py-1"
                        >
                          <span className="text-xs">{item.title}</span>
                          <button
                            type="button"
                            onClick={() => removePickerItem(item.id)}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                            aria-label={`Remove ${item.title}`}
                          >
                            <XIcon className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {form.appliesTo === "collections" && selectedCollections.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCollections.map((item) => (
                        <Badge
                          key={item.id}
                          variant="secondary"
                          className="flex items-center gap-1 pl-2 pr-1 py-1"
                        >
                          <span className="text-xs">{item.title}</span>
                          <button
                            type="button"
                            onClick={() => removePickerItem(item.id)}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                            aria-label={`Remove ${item.title}`}
                          >
                            <XIcon className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {form.appliesTo === "products"
                      ? "Discount will only apply to the selected products."
                      : "Discount will only apply to products in the selected collections."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Minimum purchase requirements */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Minimum purchase requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="minReq"
                  checked={form.minimumRequirement === "none"}
                  onChange={() => updateField("minimumRequirement", "none")}
                  className="size-4 accent-primary"
                />
                <span className="text-sm">No minimum requirements</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="minReq"
                  checked={form.minimumRequirement === "amount"}
                  onChange={() => updateField("minimumRequirement", "amount")}
                  className="size-4 accent-primary"
                />
                <span className="text-sm">Minimum purchase amount ($)</span>
              </label>
              {form.minimumRequirement === "amount" && (
                <div className="pl-7">
                  <FormField
                    label="Minimum amount"
                    htmlFor="disc-min-subtotal"
                    error={errors.minimumSubtotal}
                  >
                    <Input
                      id="disc-min-subtotal"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minimumSubtotal}
                      onChange={(e) =>
                        updateField("minimumSubtotal", e.target.value)
                      }
                      placeholder="50.00"
                      className="max-w-[200px]"
                    />
                  </FormField>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maximum discount uses */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Maximum discount uses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasUsageLimit}
                  onChange={(e) =>
                    updateField("hasUsageLimit", e.target.checked)
                  }
                  aria-label="Limit total usage"
                  className="size-4 mt-0.5 rounded accent-primary"
                />
                <div>
                  <span className="text-sm">
                    Limit number of times this discount can be used in total
                  </span>
                  {form.hasUsageLimit && (
                    <div className="mt-2">
                      <FormField label="Total usage limit" htmlFor="disc-limit" error={errors.usageLimit}>
                        <Input
                          id="disc-limit"
                          type="number"
                          min="1"
                          value={form.usageLimit}
                          onChange={(e) =>
                            updateField("usageLimit", e.target.value)
                          }
                          placeholder="e.g. 100"
                          className="max-w-[200px]"
                        />
                      </FormField>
                    </div>
                  )}
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.oncePerCustomer}
                  onChange={(e) =>
                    updateField("oncePerCustomer", e.target.checked)
                  }
                  aria-label="Limit to one use per customer"
                  className="size-4 rounded accent-primary"
                />
                <span className="text-sm">Limit to one use per customer</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.firstOrderOnly}
                  onChange={(e) =>
                    updateField("firstOrderOnly", e.target.checked)
                  }
                  aria-label="First order only"
                  className="size-4 rounded accent-primary"
                />
                <span className="text-sm">First order only</span>
              </label>
            </CardContent>
          </Card>

          {/* Active dates */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Start date" htmlFor="disc-starts">
                  <Input
                    id="disc-starts"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => updateField("startsAt", e.target.value)}
                  />
                </FormField>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasEndDate}
                  onChange={(e) => updateField("hasEndDate", e.target.checked)}
                  aria-label="Set end date"
                  className="size-4 rounded accent-primary"
                />
                <span className="text-sm">Set end date</span>
              </label>

              {form.hasEndDate && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="End date"
                    htmlFor="disc-ends"
                    error={errors.endsAt}
                  >
                    <Input
                      id="disc-ends"
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => updateField("endsAt", e.target.value)}
                    />
                  </FormField>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---- SIDEBAR ---- */}
        <div className="space-y-6">
          {/* Summary */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {form.title ? (
                <div>
                  <p className="font-semibold">{form.title}</p>
                  {form.method === "code" && form.code && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Code:{" "}
                      <span className="font-mono font-medium">
                        {form.code}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  No title yet
                </p>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckIcon className="size-3.5 text-green-600" />
                  <span>{getTypeTitle(form)}</span>
                </div>
                {form.type !== "free_shipping" && form.value && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>{formatSummaryValue(form)} off</span>
                  </div>
                )}
                {form.appliesTo === "all" && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>Applies to all products</span>
                  </div>
                )}
                {form.appliesTo === "products" && selectedProducts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>
                      Applies to {selectedProducts.length} product
                      {selectedProducts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {form.appliesTo === "collections" && selectedCollections.length > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>
                      Applies to {selectedCollections.length} collection
                      {selectedCollections.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {form.minimumRequirement === "amount" &&
                  form.minimumSubtotal && (
                    <div className="flex items-center gap-2">
                      <CheckIcon className="size-3.5 text-green-600" />
                      <span>
                        Minimum purchase of $
                        {(parseFloat(form.minimumSubtotal) || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                {form.minimumRequirement === "none" && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>No minimum purchase requirement</span>
                  </div>
                )}
                {form.hasUsageLimit && form.usageLimit && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>
                      Limited to {form.usageLimit} total uses
                    </span>
                  </div>
                )}
                {!form.hasUsageLimit && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>No usage limits</span>
                  </div>
                )}
                {form.oncePerCustomer && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>One use per customer</span>
                  </div>
                )}
                {form.firstOrderOnly && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>First order only</span>
                  </div>
                )}
                {form.startsAt && (
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-green-600" />
                    <span>
                      Active from{" "}
                      {new Date(form.startsAt).toLocaleDateString()}
                      {form.hasEndDate && form.endsAt
                        ? ` to ${new Date(form.endsAt).toLocaleDateString()}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              {isEdit && discount && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Performance</p>
                    <p className="font-medium">
                      {discount.usageCount} used
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  updateField("status", v as "draft" | "active")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              {form.status === "draft" && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <InfoIcon className="size-3.5" />
                  Draft discounts are not visible to customers.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Scope (advanced) */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={form.scope}
                onValueChange={(v) =>
                  updateField("scope", v as DiscountForm["scope"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">
                    Platform-wide (all vendors)
                  </SelectItem>
                  <SelectItem value="vendor">Vendor-specific</SelectItem>
                  <SelectItem value="targeted_vendors">
                    Targeted vendors
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.scope === "vendor" && (
                <FormField
                  label="Vendor ID"
                  htmlFor="disc-vendor"
                >
                  <Input
                    id="disc-vendor"
                    value={form.vendorId}
                    onChange={(e) => updateField("vendorId", e.target.value)}
                    placeholder="Vendor UUID"
                    className="font-mono text-xs"
                  />
                </FormField>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---- BOTTOM ACTIONS (full width) ---- */}
        <div className="lg:col-span-2 flex items-center justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/discounts")}
          >
            Discard
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2Icon className="size-4 animate-spin mr-1" />}
            {saving
              ? "Saving…"
              : isEdit
                ? "Save"
                : "Create discount"}
          </Button>
        </div>
      </form>

      {/* Delete dialog */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Archive discount"
        description={`Are you sure you want to archive "${discount?.title ?? form.title}"? Customers will no longer be able to use this discount.`}
        confirmLabel="Archive"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inline status badge for codes                                              */
/* -------------------------------------------------------------------------- */

function StatusBadgeInline({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color}`}
    >
      {status}
    </span>
  );
}
