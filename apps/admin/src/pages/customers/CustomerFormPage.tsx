import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Customer, CustomerAddress } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { FormField } from "@/components/FormField";
import { MetafieldsEditor } from "@/components/MetafieldsEditor";
import { TagsEditor } from "@/components/TagsEditor";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  SaveIcon,
  XIcon,
  PlusIcon,
  MapPinIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CustomerDetail extends Customer {
  companyName?: string | null;
  language?: string;
  state?: string;
  notes?: string | null;
  taxStatus?: string;
  vatNumber?: string | null;
  emailMarketingSubscribed?: boolean;
  smsMarketingSubscribed?: boolean;
  storeCreditBalance?: string | number;
  segments?: Array<{ id: string; name: string; type: string }>;
  tags?: string[];
}

type AddressDetail = CustomerAddress;

interface CustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  language: string;
  notes: string;
  taxStatus: string;
  vatNumber: string;
  emailMarketingSubscribed: boolean;
  smsMarketingSubscribed: boolean;
  // Create-only fields
  password: string;
  // Edit-only fields
  state: string;
}

interface AddressForm {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  zip: string;
  phone: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

const INITIAL_FORM: CustomerForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  companyName: "",
  language: "en",
  notes: "",
  taxStatus: "collect",
  vatNumber: "",
  emailMarketingSubscribed: false,
  smsMarketingSubscribed: false,
  password: "",
  state: "enabled",
};

const INITIAL_ADDRESS: AddressForm = {
  firstName: "",
  lastName: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  country: "",
  countryCode: "",
  zip: "",
  phone: "",
  isDefaultShipping: true,
  isDefaultBilling: true,
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ko", label: "Korean" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
] as const;

const TAX_STATUS_OPTIONS = [
  { value: "collect", label: "Collect tax" },
  { value: "exempt", label: "Exempt" },
  { value: "reverse_charge", label: "Reverse charge" },
] as const;

const CUSTOMER_STATE_OPTIONS = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
  { value: "invited", label: "Invited" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<CustomerForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerForm, string>>>({});

  // Edit mode state
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [addresses, setAddresses] = useState<AddressDetail[]>([]);

  // Address dialog
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(INITIAL_ADDRESS);
  const [addressSaving, setAddressSaving] = useState(false);

  // ---- Data Loading ----

  useEffect(() => {
    if (isEdit) {
      const controller = new AbortController();
      loadCustomer(controller.signal);
      loadAddresses(controller.signal);
      return () => controller.abort();
    }
  }, [id]);

  async function loadCustomer(signal?: AbortSignal) {
    setLoading(true);
    try {
      const res = await apiFetch<CustomerDetail>(`/admin/customers/${id}`, { signal });
      setCustomer(res);
      setForm({
        firstName: res.firstName ?? "",
        lastName: res.lastName ?? "",
        email: res.email ?? "",
        phone: res.phone ?? "",
        companyName: res.companyName ?? "",
        language: res.language ?? "en",
        notes: res.notes ?? "",
        taxStatus: res.taxStatus ?? "collect",
        vatNumber: res.vatNumber ?? "",
        emailMarketingSubscribed: res.emailMarketingSubscribed ?? false,
        smsMarketingSubscribed: res.smsMarketingSubscribed ?? false,
        password: "",
        state: res.state ?? "enabled",
      });
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load customer",
          description: e.message,
          variant: "destructive",
        });
        navigate("/customers");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadAddresses(signal?: AbortSignal) {
    try {
      const res = await apiFetch<AddressDetail[]>(
        `/admin/customers/${id}/addresses`,
        { signal }
      );
      setAddresses(Array.isArray(res) ? res : []);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // non-blocking
      }
    }
  }

  // ---- Field Updates ----

  function updateField<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function updateAddressField<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setAddressForm((prev) => ({ ...prev, [key]: value }));
  }

  // ---- Validation ----

  function validate(): boolean {
    const errs: Partial<Record<keyof CustomerForm, string>> = {};
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = "Enter a valid email address";
    if (!isEdit && !form.password) errs.password = "Password is required";
    if (!isEdit && form.password && form.password.length < 8)
      errs.password = "Password must be at least 8 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ---- Submit ----

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        phone: form.phone.trim() || null,
        companyName: form.companyName.trim() || null,
        language: form.language,
        notes: form.notes.trim() || null,
        taxStatus: form.taxStatus,
        vatNumber: form.vatNumber.trim() || null,
        emailMarketingSubscribed: form.emailMarketingSubscribed,
        smsMarketingSubscribed: form.smsMarketingSubscribed,
      };

      if (isEdit) {
        body.state = form.state;
        await apiFetch(`/admin/customers/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Customer updated" });
        await loadCustomer();
      } else {
        body.email = form.email.trim().toLowerCase();
        body.password = form.password;
        const created = await apiFetch<{ id: string }>("/admin/customers", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Customer created" });
        navigate(`/customers/${created.id}/edit`);
      }
    } catch (e: any) {
      toast({
        title: "Failed to save customer",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // ---- Address Dialog ----

  function openAddressDialog() {
    setAddressForm({
      ...INITIAL_ADDRESS,
      firstName: form.firstName,
      lastName: form.lastName,
      company: form.companyName,
    });
    setAddressDialogOpen(true);
  }

  async function handleSaveAddress() {
    if (!addressForm.address1.trim() || !addressForm.city.trim() || !addressForm.country.trim()) {
      toast({
        title: "Missing required fields",
        description: "Address, city, and country are required.",
        variant: "destructive",
      });
      return;
    }

    setAddressSaving(true);
    try {
      await apiFetch(`/admin/customers/${id}/addresses`, {
        method: "POST",
        body: JSON.stringify({
          firstName: addressForm.firstName.trim() || null,
          lastName: addressForm.lastName.trim() || null,
          company: addressForm.company.trim() || null,
          address1: addressForm.address1.trim(),
          address2: addressForm.address2.trim() || null,
          city: addressForm.city.trim(),
          province: addressForm.province.trim() || null,
          country: addressForm.country.trim(),
          countryCode: addressForm.countryCode.trim().toUpperCase() || null,
          zip: addressForm.zip.trim() || null,
          phone: addressForm.phone.trim() || null,
          isDefaultShipping: addressForm.isDefaultShipping,
          isDefaultBilling: addressForm.isDefaultBilling,
        }),
      });
      toast({ title: "Address added" });
      setAddressDialogOpen(false);
      await loadAddresses();
    } catch (e: any) {
      toast({
        title: "Failed to save address",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setAddressSaving(false);
    }
  }

  // ---- Helpers ----

  const defaultShippingAddress = addresses.find(
    (a) => a.isDefaultShipping
  );

  function formatAddress(addr: AddressDetail): string {
    const parts = [
      [addr.firstName, addr.lastName].filter(Boolean).join(" "),
      addr.company,
      addr.address1,
      addr.address2,
      [addr.city, addr.province, addr.zip].filter(Boolean).join(", "),
      addr.country,
    ].filter(Boolean);
    return parts.join("\n");
  }

  function formatCurrency(amount: string | number | undefined, currency?: string | null): string {
    if (amount == null) return formatPrice(0, currency);
    return formatPrice(amount, currency);
  }

  const pageTitle = isEdit
    ? `Edit: ${[customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || customer?.email || "Customer"}`
    : "Add customer";

  // ---- Loading State ----

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
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Back to customers"
            onClick={() => navigate("/customers")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/customers")}
          >
            <XIcon className="size-4 mr-1" />
            Discard
          </Button>
          <Button type="submit" form="customer-form" disabled={saving}>
            <SaveIcon className="size-4 mr-1" />
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create customer"}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <form
        id="customer-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* ---- LEFT COLUMN ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Customer overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* First + Last name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="First name" htmlFor="firstName">
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="First name"
                  />
                </FormField>
                <FormField label="Last name" htmlFor="lastName">
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="Last name"
                  />
                </FormField>
              </div>

              {/* Language */}
              <FormField label="Language" htmlFor="language">
                <Select
                  value={form.language}
                  onValueChange={(v) => updateField("language", v)}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <Separator />

              {/* Email */}
              <FormField
                label="Email"
                htmlFor="email"
                required={!isEdit}
                error={errors.email}
              >
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="email@example.com"
                  readOnly={isEdit}
                  className={isEdit ? "bg-muted cursor-not-allowed" : ""}
                />
                {isEdit && (
                  <p className="text-muted-foreground text-xs">
                    Email address cannot be changed after creation.
                  </p>
                )}
              </FormField>

              {/* Phone */}
              <FormField label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </FormField>

              {/* Company */}
              <FormField label="Company" htmlFor="companyName">
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  placeholder="Company name"
                />
              </FormField>

              <Separator />

              {/* Marketing consent checkboxes */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Marketing</Label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.emailMarketingSubscribed}
                    onChange={(e) =>
                      updateField("emailMarketingSubscribed", e.target.checked)
                    }
                    className="mt-0.5 size-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm">
                    Customer agreed to receive marketing emails
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.smsMarketingSubscribed}
                    onChange={(e) =>
                      updateField("smsMarketingSubscribed", e.target.checked)
                    }
                    className="mt-0.5 size-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm">
                    Customer agreed to receive SMS marketing
                  </span>
                </label>
                <p className="text-muted-foreground text-xs">
                  You should ask your customers for permission before you
                  subscribe them to your marketing emails or SMS.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Default Address (edit mode only) */}
          {isEdit && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPinIcon className="size-4" />
                    Default address
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openAddressDialog}
                  >
                    <PlusIcon className="size-4 mr-1" />
                    Add address
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {defaultShippingAddress ? (
                  <div className="text-sm whitespace-pre-line text-muted-foreground">
                    {formatAddress(defaultShippingAddress)}
                  </div>
                ) : addresses.length > 0 ? (
                  <div className="text-sm whitespace-pre-line text-muted-foreground">
                    {formatAddress(addresses[0])}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No address on file. Click "Add address" to add one.
                  </p>
                )}

                {addresses.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {addresses.length} addresses on file
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tax Details */}
          <Card>
            <CardHeader>
              <CardTitle>Tax details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                label="PAN / VAT number"
                htmlFor="vatNumber"
                hint="Customer's Permanent Account Number (Nepal) or VAT/Tax ID for international buyers."
              >
                <Input
                  id="vatNumber"
                  value={form.vatNumber}
                  onChange={(e) => updateField("vatNumber", e.target.value)}
                  placeholder="e.g. 301234567 (PAN) or country-issued tax ID"
                />
              </FormField>
              <FormField label="Tax settings" htmlFor="taxStatus">
                <Select
                  value={form.taxStatus}
                  onValueChange={(v) => updateField("taxStatus", v)}
                >
                  <SelectTrigger id="taxStatus">
                    <SelectValue placeholder="Select tax status" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>

          {/* Metafields (edit mode only) */}
          {isEdit && id && <MetafieldsEditor entityType="customers" entityId={id} />}
        </div>

        {/* ---- RIGHT COLUMN (SIDEBAR) ---- */}
        <div className="lg:col-span-1 space-y-6">
          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Add a note about this customer..."
                rows={4}
              />
              <p className="text-muted-foreground text-xs">
                Notes are private and won't be shared with the customer.
              </p>
            </CardContent>
          </Card>

          {/* Customer State (edit mode only) */}
          {isEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Customer state</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Account status" htmlFor="customerState">
                  <Select
                    value={form.state}
                    onValueChange={(v) => updateField("state", v)}
                  >
                    <SelectTrigger id="customerState">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_STATE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">
                    Store credit balance
                  </Label>
                  <span className="text-sm font-medium">
                    {formatCurrency(customer?.storeCreditBalance)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {isEdit && id && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <TagsEditor
                  tags={customer?.tags ?? []}
                  onAdd={async (newTags) => {
                    await apiFetch(`/admin/customers/${id}/tags`, {
                      method: "POST",
                      body: JSON.stringify({ tags: newTags }),
                    });
                    loadCustomer();
                  }}
                  onRemove={async (tag) => {
                    await apiFetch(
                      `/admin/customers/${id}/tags/${encodeURIComponent(tag)}`,
                      { method: "DELETE" }
                    );
                    loadCustomer();
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Segments (edit mode) */}
          {isEdit && customer?.segments && customer.segments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {customer.segments.map((seg) => (
                    <Badge key={seg.id} variant="secondary">
                      {seg.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Password (create mode only) */}
          {!isEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  label="Password"
                  htmlFor="password"
                  required
                  error={errors.password}
                >
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                  />
                </FormField>
              </CardContent>
            </Card>
          )}
        </div>
      </form>

      {/* ---- Address Dialog ---- */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add address</DialogTitle>
            <DialogDescription>
              Enter the customer's address details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First name" htmlFor="addr-firstName">
                <Input
                  id="addr-firstName"
                  value={addressForm.firstName}
                  onChange={(e) =>
                    updateAddressField("firstName", e.target.value)
                  }
                />
              </FormField>
              <FormField label="Last name" htmlFor="addr-lastName">
                <Input
                  id="addr-lastName"
                  value={addressForm.lastName}
                  onChange={(e) =>
                    updateAddressField("lastName", e.target.value)
                  }
                />
              </FormField>
            </div>

            <FormField label="Company" htmlFor="addr-company">
              <Input
                id="addr-company"
                value={addressForm.company}
                onChange={(e) => updateAddressField("company", e.target.value)}
              />
            </FormField>

            <FormField label="Address" htmlFor="addr-address1" required>
              <Input
                id="addr-address1"
                value={addressForm.address1}
                onChange={(e) => updateAddressField("address1", e.target.value)}
                placeholder="Street address"
              />
            </FormField>

            <FormField label="Apartment, suite, etc." htmlFor="addr-address2">
              <Input
                id="addr-address2"
                value={addressForm.address2}
                onChange={(e) => updateAddressField("address2", e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="City" htmlFor="addr-city" required>
                <Input
                  id="addr-city"
                  value={addressForm.city}
                  onChange={(e) => updateAddressField("city", e.target.value)}
                />
              </FormField>
              <FormField label="Province / State" htmlFor="addr-province">
                <Input
                  id="addr-province"
                  value={addressForm.province}
                  onChange={(e) =>
                    updateAddressField("province", e.target.value)
                  }
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Country" htmlFor="addr-country" required>
                <Input
                  id="addr-country"
                  value={addressForm.country}
                  onChange={(e) =>
                    updateAddressField("country", e.target.value)
                  }
                  placeholder="e.g. United States"
                />
              </FormField>
              <FormField label="Country code" htmlFor="addr-countryCode">
                <Input
                  id="addr-countryCode"
                  value={addressForm.countryCode}
                  onChange={(e) =>
                    updateAddressField("countryCode", e.target.value)
                  }
                  placeholder="e.g. US"
                  maxLength={2}
                />
              </FormField>
            </div>

            <FormField label="ZIP / Postal code" htmlFor="addr-zip">
              <Input
                id="addr-zip"
                value={addressForm.zip}
                onChange={(e) => updateAddressField("zip", e.target.value)}
              />
            </FormField>

            <FormField label="Phone" htmlFor="addr-phone">
              <Input
                id="addr-phone"
                type="tel"
                value={addressForm.phone}
                onChange={(e) => updateAddressField("phone", e.target.value)}
              />
            </FormField>

            <Separator />

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressForm.isDefaultShipping}
                  onChange={(e) =>
                    updateAddressField("isDefaultShipping", e.target.checked)
                  }
                  className="size-4 rounded border-input accent-primary"
                />
                <span className="text-sm">Set as default shipping address</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressForm.isDefaultBilling}
                  onChange={(e) =>
                    updateAddressField("isDefaultBilling", e.target.checked)
                  }
                  className="size-4 rounded border-input accent-primary"
                />
                <span className="text-sm">Set as default billing address</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddressDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAddress}
              disabled={addressSaving}
            >
              {addressSaving ? "Saving…" : "Save address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
