"use client";

import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import * as React from "react";

import { CustomerShell } from "@/components/CustomerShell";
import { Button } from "@/components/ui/button";
import { confirm as confirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  type ShippingAddressInput,
  validateShippingAddress,
} from "@/lib/validation";

interface CustomerAddress {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  provinceCode?: string | null;
  country: string;
  countryCode: string;
  zip: string;
  isDefault?: boolean;
}

interface AddressForm extends Omit<CustomerAddress, "id" | "isDefault"> {
  isDefault?: boolean;
}

const EMPTY_FORM: AddressForm = {
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  provinceCode: "",
  country: "",
  countryCode: "",
  zip: "",
  isDefault: false,
};

export default function AddressesPage() {
  const { customer } = useAuth();
  const [addresses, setAddresses] = React.useState<CustomerAddress[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<AddressForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fetchAddresses = React.useCallback(async () => {
    try {
      const data = await apiFetch<
        CustomerAddress[] | { data: CustomerAddress[] }
      >("/storefront/customers/addresses");
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setAddresses(list);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (customer) fetchAddresses();
  }, [customer, fetchAddresses]);

  function startNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function startEdit(addr: CustomerAddress) {
    setEditingId(addr.id);
    setForm({
      firstName: addr.firstName ?? "",
      lastName: addr.lastName ?? "",
      company: addr.company ?? "",
      phone: addr.phone ?? "",
      address1: addr.address1,
      address2: addr.address2 ?? "",
      city: addr.city,
      province: addr.province ?? "",
      provinceCode: addr.provinceCode ?? "",
      country: addr.country,
      countryCode: addr.countryCode,
      zip: addr.zip,
      isDefault: addr.isDefault ?? false,
    });
    setErrors({});
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const input: ShippingAddressInput = {
      firstName: form.firstName ?? undefined,
      lastName: form.lastName ?? undefined,
      address1: form.address1,
      city: form.city,
      province: form.province ?? undefined,
      country: form.country,
      countryCode: form.countryCode?.toUpperCase(),
      zip: form.zip,
      phone: form.phone ?? undefined,
    };
    const vErrors = validateShippingAddress(input);
    if (vErrors.length > 0) {
      const map: Record<string, string> = {};
      for (const err of vErrors) map[err.field] = err.message;
      setErrors(map);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        countryCode: form.countryCode.toUpperCase(),
      };
      if (editingId === "new") {
        await apiFetch("/storefront/customers/addresses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Address added" });
      } else {
        await apiFetch(`/storefront/customers/addresses/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Address updated" });
      }
      setEditingId(null);
      fetchAddresses();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Could not save address";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirmDialog({
      title: "Remove this address?",
      description:
        "Saved addresses speed up future checkouts. You can always add it back later.",
      confirmText: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await apiFetch(`/storefront/customers/addresses/${id}`, {
        method: "DELETE",
      });
      toast({ title: "Address removed" });
      fetchAddresses();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Could not remove address";
      toast({
        title: "Remove failed",
        description: msg,
        variant: "destructive",
      });
    }
  }

  return (
    <CustomerShell
      title="Addresses"
      description="Save shipping destinations to skip the typing at checkout."
      breadcrumbs={[{ label: "Addresses" }]}
      active="addresses"
      headerActions={
        editingId === null && !loading ? (
          <Button
            onClick={startNew}
            className="h-10 rounded-full px-4 font-medium"
          >
            <Plus className="size-4" aria-hidden />
            Add address
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-border/60 bg-card"
              />
            ))}
          </div>
        ) : editingId !== null ? (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <MapPin
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                {editingId === "new" ? "Add a new address" : "Edit address"}
              </h2>
            </div>
            <form
              onSubmit={handleSave}
              className="grid gap-4 px-5 py-5 sm:px-6"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="firstName"
                  label="First name"
                  value={form.firstName ?? ""}
                  onChange={(v) => setForm({ ...form, firstName: v })}
                  error={errors.firstName}
                  autoComplete="given-name"
                />
                <Field
                  id="lastName"
                  label="Last name"
                  value={form.lastName ?? ""}
                  onChange={(v) => setForm({ ...form, lastName: v })}
                  error={errors.lastName}
                  autoComplete="family-name"
                />
              </div>
              <Field
                id="address1"
                label="Street address"
                required
                value={form.address1}
                onChange={(v) => setForm({ ...form, address1: v })}
                error={errors.address1}
                autoComplete="address-line1"
              />
              <Field
                id="address2"
                label="Apt, suite, etc."
                value={form.address2 ?? ""}
                onChange={(v) => setForm({ ...form, address2: v })}
                autoComplete="address-line2"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="city"
                  label="City"
                  required
                  value={form.city}
                  onChange={(v) => setForm({ ...form, city: v })}
                  error={errors.city}
                  autoComplete="address-level2"
                />
                <Field
                  id="province"
                  label="State / Province"
                  value={form.province ?? ""}
                  onChange={(v) => setForm({ ...form, province: v })}
                  error={errors.province}
                  autoComplete="address-level1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1.4fr]">
                <Field
                  id="country"
                  label="Country"
                  required
                  value={form.country}
                  onChange={(v) => setForm({ ...form, country: v })}
                  error={errors.country}
                  autoComplete="country-name"
                />
                <Field
                  id="countryCode"
                  label="Code"
                  required
                  maxLength={2}
                  value={form.countryCode}
                  onChange={(v) =>
                    setForm({ ...form, countryCode: v.toUpperCase() })
                  }
                  error={errors.countryCode}
                  autoComplete="country"
                />
                <Field
                  id="zip"
                  label="ZIP / Postal"
                  required
                  value={form.zip}
                  onChange={(v) => setForm({ ...form, zip: v })}
                  error={errors.zip}
                  autoComplete="postal-code"
                />
              </div>
              <Field
                id="phone"
                label="Phone (optional)"
                type="tel"
                value={form.phone ?? ""}
                onChange={(v) => setForm({ ...form, phone: v })}
                error={errors.phone}
                autoComplete="tel"
              />
              <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault ?? false}
                  onChange={(e) =>
                    setForm({ ...form, isDefault: e.target.checked })
                  }
                  className="size-4 rounded border-border accent-primary"
                />
                Make this my default address
              </label>
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingId(null)}
                  disabled={saving}
                  className="h-10 rounded-full px-5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded-full px-5 font-semibold"
                >
                  {saving && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  Save address
                </Button>
              </div>
            </form>
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/70 bg-card/60 px-6 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-muted">
              <MapPin className="size-7 text-muted-foreground" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p
                className="text-lg font-medium tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                No saved addresses yet
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Save an address to make checkout faster next time.
              </p>
            </div>
            <Button
              onClick={startNew}
              className="mt-1 h-11 rounded-full px-6 font-semibold"
            >
              <Plus className="size-4" aria-hidden />
              Add your first address
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {addresses.map((addr) => (
              <li key={addr.id}>
                <div
                  className={cn(
                    "flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-colors",
                    addr.isDefault
                      ? "border-primary/40 ring-1 ring-primary/15"
                      : "border-border/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 place-items-center rounded-lg bg-muted/70 ring-1 ring-inset ring-border">
                        <MapPin
                          className="size-4 text-muted-foreground"
                          aria-hidden
                        />
                      </span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                          <Star
                            className="size-3"
                            fill="currentColor"
                            aria-hidden
                          />
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(addr)}
                        aria-label="Edit address"
                        className="size-8 rounded-lg p-0"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(addr.id)}
                        aria-label="Delete address"
                        className="size-8 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <address className="mt-4 flex-1 not-italic text-sm leading-relaxed text-muted-foreground">
                    {(addr.firstName || addr.lastName) && (
                      <p className="font-semibold text-foreground">
                        {addr.firstName} {addr.lastName}
                      </p>
                    )}
                    <p>{addr.address1}</p>
                    {addr.address2 && <p>{addr.address2}</p>}
                    <p>
                      {addr.city}
                      {addr.province && `, ${addr.province}`} {addr.zip}
                    </p>
                    <p>{addr.country}</p>
                    {addr.phone && <p className="mt-1.5">{addr.phone}</p>}
                  </address>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CustomerShell>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
  maxLength,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  maxLength?: number;
  error?: string;
  autoComplete?: string;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {label}
        {required && (
          <span aria-label="required" className="text-destructive">
            *
          </span>
        )}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={cn(
          "h-11 rounded-xl",
          error && "border-destructive focus-visible:ring-destructive"
        )}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
