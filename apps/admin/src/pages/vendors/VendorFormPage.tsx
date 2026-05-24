import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { FormField } from "@/components/FormField";
import { StatusBadge } from "@/components/StatusBadge";
import { ImagePicker, type ImagePickerValue } from "@/components/ImagePicker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftIcon, SaveIcon, XIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VendorDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  bio: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  legalName: string | null;
  primaryEmail: string | null;
  supportEmail: string | null;
  billingEmail: string | null;
  primaryPhone: string | null;
  supportPhone: string | null;
  countryCode: string | null;
  currencyCode: string | null;
  timezone: string | null;
  vatNumber: string | null;
  taxId: string | null;
  registrationNumber: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  commissionBps: number;
  createdAt: string;
  updatedAt: string;
}

interface VendorForm {
  // Common
  name: string;
  slug: string;
  legalName: string;
  websiteUrl: string;
  bio: string;
  // Create-only
  userEmail: string;
  userPassword: string;
  // Contact
  primaryEmail: string;
  supportEmail: string;
  billingEmail: string;
  primaryPhone: string;
  supportPhone: string;
  // Business
  countryCode: string;
  currencyCode: string;
  timezone: string;
  vatNumber: string;
  taxId: string;
  registrationNumber: string;
  // Commission
  commissionBps: string;
  // SEO (edit only)
  seoTitle: string;
  seoDescription: string;
}

const INITIAL_FORM: VendorForm = {
  name: "",
  slug: "",
  legalName: "",
  websiteUrl: "",
  bio: "",
  userEmail: "",
  userPassword: "",
  primaryEmail: "",
  supportEmail: "",
  billingEmail: "",
  primaryPhone: "",
  supportPhone: "",
  countryCode: "",
  currencyCode: "",
  timezone: "",
  vatNumber: "",
  taxId: "",
  registrationNumber: "",
  commissionBps: "",
  seoTitle: "",
  seoDescription: "",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VendorFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<VendorForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof VendorForm, string>>>({});
  const [slugManual, setSlugManual] = useState(false);

  // Image pickers for logo and banner
  const [logoImage, setLogoImage] = useState<ImagePickerValue | null>(null);
  const [bannerImage, setBannerImage] = useState<ImagePickerValue | null>(null);

  // Edit mode state
  const [vendor, setVendor] = useState<VendorDetail | null>(null);

  // ---- Data Loading ----

  useEffect(() => {
    if (isEdit) {
      const controller = new AbortController();
      loadVendor(controller.signal);
      return () => controller.abort();
    }
  }, [id]);

  async function loadVendor(signal?: AbortSignal) {
    setLoading(true);
    try {
      const res = await apiFetch<VendorDetail>(`/admin/vendors/${id}`, { signal });
      setVendor(res);
      setForm({
        name: res.name ?? "",
        slug: res.slug ?? "",
        legalName: res.legalName ?? "",
        websiteUrl: res.websiteUrl ?? "",
        bio: res.bio ?? "",
        userEmail: "",
        userPassword: "",
        primaryEmail: res.primaryEmail ?? "",
        supportEmail: res.supportEmail ?? "",
        billingEmail: res.billingEmail ?? "",
        primaryPhone: res.primaryPhone ?? "",
        supportPhone: res.supportPhone ?? "",
        countryCode: res.countryCode ?? "",
        currencyCode: res.currencyCode ?? "",
        timezone: res.timezone ?? "",
        vatNumber: res.vatNumber ?? "",
        taxId: res.taxId ?? "",
        registrationNumber: res.registrationNumber ?? "",
        commissionBps: res.commissionBps != null ? String(res.commissionBps) : "",
        seoTitle: res.seoTitle ?? "",
        seoDescription: res.seoDescription ?? "",
      });
      setSlugManual(true);
      // Populate image pickers from existing URLs
      if (res.logoUrl) {
        setLogoImage({ fileId: "", url: res.logoUrl, altText: "" });
      }
      if (res.bannerUrl) {
        setBannerImage({ fileId: "", url: res.bannerUrl, altText: "" });
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load vendor",
          description: e.message,
          variant: "destructive",
        });
        navigate("/vendors");
      }
    } finally {
      setLoading(false);
    }
  }

  // ---- Field Updates ----

  function updateField<K extends keyof VendorForm>(key: K, value: VendorForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugManual) {
        next.slug = slugify(value as string);
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // ---- Validation ----

  function validate(): boolean {
    const errs: Partial<Record<keyof VendorForm, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!isEdit) {
      if (!form.slug.trim()) errs.slug = "Slug is required";
      if (!/^[a-z0-9-]+$/.test(form.slug.trim()))
        errs.slug = "Slug must be lowercase alphanumeric with dashes";
      if (!form.userEmail.trim()) errs.userEmail = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.userEmail.trim()))
        errs.userEmail = "Enter a valid email address";
      if (!form.userPassword) errs.userPassword = "Password is required";
      else if (form.userPassword.length < 8)
        errs.userPassword = "Password must be at least 8 characters";
    }
    if (form.websiteUrl.trim() && !/^https?:\/\//.test(form.websiteUrl.trim()))
      errs.websiteUrl = "Must be a valid URL";
    if (
      form.primaryEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primaryEmail.trim())
    )
      errs.primaryEmail = "Enter a valid email address";
    if (
      form.supportEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())
    )
      errs.supportEmail = "Enter a valid email address";
    if (
      form.billingEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.billingEmail.trim())
    )
      errs.billingEmail = "Enter a valid email address";
    if (form.commissionBps.trim()) {
      const bps = Number(form.commissionBps.trim());
      if (isNaN(bps) || !Number.isInteger(bps) || bps < 0 || bps > 10000)
        errs.commissionBps = "Must be an integer between 0 and 10000";
    }
    if (form.countryCode.trim() && form.countryCode.trim().length > 2)
      errs.countryCode = "Max 2 characters";
    if (form.currencyCode.trim() && form.currencyCode.trim().length > 3)
      errs.currencyCode = "Max 3 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ---- Submit ----

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit) {
        const body: Record<string, unknown> = {
          name: form.name.trim(),
          legalName: form.legalName.trim() || null,
          bio: form.bio.trim() || null,
          websiteUrl: form.websiteUrl.trim() || null,
          primaryEmail: form.primaryEmail.trim() || null,
          supportEmail: form.supportEmail.trim() || null,
          billingEmail: form.billingEmail.trim() || null,
          primaryPhone: form.primaryPhone.trim() || null,
          supportPhone: form.supportPhone.trim() || null,
          countryCode: form.countryCode.trim() || null,
          currencyCode: form.currencyCode.trim() || null,
          timezone: form.timezone.trim() || null,
          vatNumber: form.vatNumber.trim() || null,
          taxId: form.taxId.trim() || null,
          registrationNumber: form.registrationNumber.trim() || null,
          logoUrl: logoImage?.url || null,
          bannerUrl: bannerImage?.url || null,
          seoTitle: form.seoTitle.trim() || null,
          seoDescription: form.seoDescription.trim() || null,
        };
        if (form.commissionBps.trim()) {
          body.commissionBps = Number(form.commissionBps.trim());
        }
        await apiFetch(`/admin/vendors/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Vendor updated" });
        await loadVendor();
      } else {
        const body: Record<string, unknown> = {
          name: form.name.trim(),
          slug: form.slug.trim(),
          userEmail: form.userEmail.trim().toLowerCase(),
          userPassword: form.userPassword,
        };
        if (form.legalName.trim()) body.legalName = form.legalName.trim();
        if (form.bio.trim()) body.bio = form.bio.trim();
        if (form.websiteUrl.trim()) body.websiteUrl = form.websiteUrl.trim();
        if (form.primaryEmail.trim()) body.primaryEmail = form.primaryEmail.trim();
        if (form.supportEmail.trim()) body.supportEmail = form.supportEmail.trim();
        if (form.billingEmail.trim()) body.billingEmail = form.billingEmail.trim();
        if (form.primaryPhone.trim()) body.primaryPhone = form.primaryPhone.trim();
        if (form.supportPhone.trim()) body.supportPhone = form.supportPhone.trim();
        if (form.countryCode.trim()) body.countryCode = form.countryCode.trim();
        if (form.currencyCode.trim()) body.currencyCode = form.currencyCode.trim();
        if (form.timezone.trim()) body.timezone = form.timezone.trim();
        if (form.vatNumber.trim()) body.vatNumber = form.vatNumber.trim();
        if (form.taxId.trim()) body.taxId = form.taxId.trim();
        if (form.registrationNumber.trim())
          body.registrationNumber = form.registrationNumber.trim();
        if (form.commissionBps.trim())
          body.commissionBps = Number(form.commissionBps.trim());
        if (logoImage?.url) body.logoUrl = logoImage.url;
        if (bannerImage?.url) body.bannerUrl = bannerImage.url;

        const created = await apiFetch<{ id: string }>("/admin/vendors", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Vendor created" });
        navigate(`/vendors/${created.id}`);
      }
    } catch (e: any) {
      toast({
        title: "Failed to save vendor",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // ---- Helpers ----

  const pageTitle = isEdit ? `Edit: ${vendor?.name ?? "Vendor"}` : "Add vendor";

  const commissionBpsNum = form.commissionBps.trim()
    ? Number(form.commissionBps.trim())
    : null;
  const commissionHelperText =
    commissionBpsNum != null && !isNaN(commissionBpsNum)
      ? `${commissionBpsNum} BPS = ${bpsToPercent(commissionBpsNum)}%`
      : "1000 = 10%";

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
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
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
            aria-label="Back to vendors"
            onClick={() => navigate(isEdit ? `/vendors/${id}` : "/vendors")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/vendors/${id}` : "/vendors")}
          >
            <XIcon className="size-4 mr-1" />
            Discard
          </Button>
          <Button type="submit" form="vendor-form" disabled={saving}>
            <SaveIcon className="size-4 mr-1" />
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create vendor"}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <form
        id="vendor-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* ---- LEFT COLUMN ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vendor Info */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Name" htmlFor="vendor-name" required error={errors.name}>
                <Input
                  id="vendor-name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Acme Store"
                />
              </FormField>
              <FormField
                label="Slug"
                htmlFor="vendor-slug"
                required={!isEdit}
                error={errors.slug}
              >
                <Input
                  id="vendor-slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    updateField("slug", e.target.value);
                  }}
                  placeholder="acme-store"
                  readOnly={isEdit}
                  className={isEdit ? "bg-muted cursor-not-allowed" : ""}
                />
                {!isEdit && (
                  <p className="text-muted-foreground text-xs">
                    Auto-generated from name. Lowercase alphanumeric with dashes only.
                  </p>
                )}
                {isEdit && (
                  <p className="text-muted-foreground text-xs">
                    Slug cannot be changed after creation.
                  </p>
                )}
              </FormField>
              <FormField
                label="Legal name"
                htmlFor="vendor-legal-name"
                error={errors.legalName}
              >
                <Input
                  id="vendor-legal-name"
                  value={form.legalName}
                  onChange={(e) => updateField("legalName", e.target.value)}
                  placeholder="Acme Inc."
                />
              </FormField>
              <FormField
                label="Website"
                htmlFor="vendor-website"
                error={errors.websiteUrl}
              >
                <Input
                  id="vendor-website"
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => updateField("websiteUrl", e.target.value)}
                  placeholder="https://acmestore.com"
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField label="Bio" htmlFor="vendor-bio">
                <Textarea
                  id="vendor-bio"
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  placeholder="Tell customers about this vendor..."
                  rows={5}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Primary email"
                  htmlFor="vendor-primary-email"
                  error={errors.primaryEmail}
                >
                  <Input
                    id="vendor-primary-email"
                    type="email"
                    value={form.primaryEmail}
                    onChange={(e) => updateField("primaryEmail", e.target.value)}
                    placeholder="contact@vendor.com"
                  />
                </FormField>
                <FormField
                  label="Support email"
                  htmlFor="vendor-support-email"
                  error={errors.supportEmail}
                >
                  <Input
                    id="vendor-support-email"
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => updateField("supportEmail", e.target.value)}
                    placeholder="support@vendor.com"
                  />
                </FormField>
              </div>
              <FormField
                label="Billing email"
                htmlFor="vendor-billing-email"
                error={errors.billingEmail}
              >
                <Input
                  id="vendor-billing-email"
                  type="email"
                  value={form.billingEmail}
                  onChange={(e) => updateField("billingEmail", e.target.value)}
                  placeholder="billing@vendor.com"
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Primary phone"
                  htmlFor="vendor-primary-phone"
                  error={errors.primaryPhone}
                >
                  <Input
                    id="vendor-primary-phone"
                    type="tel"
                    value={form.primaryPhone}
                    onChange={(e) => updateField("primaryPhone", e.target.value)}
                    placeholder="+1 555-0100"
                  />
                </FormField>
                <FormField
                  label="Support phone"
                  htmlFor="vendor-support-phone"
                  error={errors.supportPhone}
                >
                  <Input
                    id="vendor-support-phone"
                    type="tel"
                    value={form.supportPhone}
                    onChange={(e) => updateField("supportPhone", e.target.value)}
                    placeholder="+1 555-0100"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle>Business details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Country code"
                  htmlFor="vendor-country"
                  error={errors.countryCode}
                >
                  <Input
                    id="vendor-country"
                    value={form.countryCode}
                    onChange={(e) => updateField("countryCode", e.target.value)}
                    placeholder="US"
                    maxLength={2}
                  />
                </FormField>
                <FormField
                  label="Currency code"
                  htmlFor="vendor-currency"
                  error={errors.currencyCode}
                >
                  <Input
                    id="vendor-currency"
                    value={form.currencyCode}
                    onChange={(e) => updateField("currencyCode", e.target.value)}
                    placeholder="USD"
                    maxLength={3}
                  />
                </FormField>
              </div>
              <FormField label="Timezone" htmlFor="vendor-timezone">
                <Input
                  id="vendor-timezone"
                  value={form.timezone}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  placeholder="Asia/Kathmandu"
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="PAN / VAT number" htmlFor="vendor-vat">
                  <Input
                    id="vendor-vat"
                    value={form.vatNumber}
                    onChange={(e) => updateField("vatNumber", e.target.value)}
                    placeholder="301234567 (Nepal PAN) or country VAT ID"
                  />
                </FormField>
                <FormField label="Tax ID" htmlFor="vendor-tax-id">
                  <Input
                    id="vendor-tax-id"
                    value={form.taxId}
                    onChange={(e) => updateField("taxId", e.target.value)}
                    placeholder="Country-issued tax identifier"
                  />
                </FormField>
                <FormField label="Registration number" htmlFor="vendor-reg">
                  <Input
                    id="vendor-reg"
                    value={form.registrationNumber}
                    onChange={(e) => updateField("registrationNumber", e.target.value)}
                    placeholder="REG-001"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImagePicker
                label="Logo"
                value={logoImage}
                onChange={setLogoImage}
              />
              <ImagePicker
                label="Banner"
                value={bannerImage}
                onChange={setBannerImage}
              />
            </CardContent>
          </Card>
        </div>

        {/* ---- RIGHT COLUMN (SIDEBAR) ---- */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Setup (create mode) */}
          {!isEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Account setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  label="User email"
                  htmlFor="vendor-user-email"
                  required
                  error={errors.userEmail}
                >
                  <Input
                    id="vendor-user-email"
                    type="email"
                    value={form.userEmail}
                    onChange={(e) => updateField("userEmail", e.target.value)}
                    placeholder="owner@vendor.com"
                  />
                </FormField>
                <FormField
                  label="User password"
                  htmlFor="vendor-user-password"
                  required
                  error={errors.userPassword}
                >
                  <Input
                    id="vendor-user-password"
                    type="password"
                    value={form.userPassword}
                    onChange={(e) => updateField("userPassword", e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                  />
                </FormField>
                <p className="text-xs text-muted-foreground">
                  This will create a user account for the vendor owner.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Status (edit mode) */}
          {isEdit && vendor && (
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <StatusBadge status={vendor.status} />
                  <span className="text-sm text-muted-foreground capitalize">
                    {vendor.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use the vendor detail page to change the status.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Commission */}
          <Card>
            <CardHeader>
              <CardTitle>Commission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <FormField
                label="Rate (BPS)"
                htmlFor="vendor-commission"
                error={errors.commissionBps}
              >
                <Input
                  id="vendor-commission"
                  type="number"
                  min={0}
                  max={10000}
                  step={1}
                  value={form.commissionBps}
                  onChange={(e) => updateField("commissionBps", e.target.value)}
                  placeholder="0"
                />
              </FormField>
              <p className="text-xs text-muted-foreground">{commissionHelperText}</p>
            </CardContent>
          </Card>

          {/* SEO (edit mode) */}
          {isEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Search engine listing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="SEO title" htmlFor="vendor-seo-title">
                  <Input
                    id="vendor-seo-title"
                    value={form.seoTitle}
                    onChange={(e) => updateField("seoTitle", e.target.value)}
                    placeholder={form.name || "Vendor name"}
                    maxLength={255}
                  />
                </FormField>
                <FormField label="SEO description" htmlFor="vendor-seo-desc">
                  <Textarea
                    id="vendor-seo-desc"
                    value={form.seoDescription}
                    onChange={(e) => updateField("seoDescription", e.target.value)}
                    placeholder="Brief description for search engines..."
                    rows={3}
                    maxLength={500}
                  />
                </FormField>
              </CardContent>
            </Card>
          )}
        </div>
      </form>
    </div>
  );
}
