import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPrice as formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  TruckIcon, PlusIcon, MoreHorizontalIcon, GlobeIcon, MapPinIcon, PackageIcon,
} from "lucide-react";

// ---- Types ----

interface ShippingRate {
  id: string;
  zoneId: string;
  name: string;
  type: "flat_rate" | "weight_based" | "price_based" | "free";
  price: number;
  minWeight: number | null;
  maxWeight: number | null;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
  freeAboveAmount: number | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  isActive: boolean;
  position: number;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  isRestOfWorld: boolean;
  rates: ShippingRate[];
  createdAt: string;
}

// ---- Zone form ----

interface ZoneForm {
  name: string;
  countries: string;
  isRestOfWorld: boolean;
}

const EMPTY_ZONE_FORM: ZoneForm = {
  name: "",
  countries: "",
  isRestOfWorld: false,
};

// ---- Rate form ----

interface RateForm {
  name: string;
  type: string;
  price: string;
  minWeight: string;
  maxWeight: string;
  minOrderAmount: string;
  maxOrderAmount: string;
  freeAboveAmount: string;
  estimatedDaysMin: string;
  estimatedDaysMax: string;
}

const EMPTY_RATE_FORM: RateForm = {
  name: "",
  type: "flat_rate",
  price: "0",
  minWeight: "",
  maxWeight: "",
  minOrderAmount: "",
  maxOrderAmount: "",
  freeAboveAmount: "",
  estimatedDaysMin: "",
  estimatedDaysMax: "",
};

const RATE_TYPES = [
  { value: "flat_rate", label: "Flat rate" },
  { value: "weight_based", label: "Weight based" },
  { value: "price_based", label: "Price based" },
  { value: "free", label: "Free shipping" },
] as const;

function formatPrice(cents: number, currency?: string | null): string {
  return formatCurrency(cents / 100, currency);
}

function formatRateType(type: string): string {
  return RATE_TYPES.find((t) => t.value === type)?.label ?? type;
}

function formatConditions(rate: ShippingRate): string {
  const parts: string[] = [];
  if (rate.type === "weight_based") {
    if (rate.minWeight != null || rate.maxWeight != null) {
      const min = rate.minWeight != null ? `${rate.minWeight}g` : "0g";
      const max = rate.maxWeight != null ? `${rate.maxWeight}g` : "+";
      parts.push(`${min} - ${max}`);
    }
  }
  if (rate.type === "price_based") {
    if (rate.minOrderAmount != null || rate.maxOrderAmount != null) {
      const min = rate.minOrderAmount != null ? formatPrice(rate.minOrderAmount) : "$0.00";
      const max = rate.maxOrderAmount != null ? formatPrice(rate.maxOrderAmount) : "+";
      parts.push(`${min} - ${max}`);
    }
  }
  if (rate.freeAboveAmount != null) {
    parts.push(`Free above ${formatPrice(rate.freeAboveAmount)}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "-";
}

function formatDeliveryEstimate(rate: ShippingRate): string {
  if (rate.estimatedDaysMin == null && rate.estimatedDaysMax == null) return "-";
  const min = rate.estimatedDaysMin ?? "?";
  const max = rate.estimatedDaysMax ?? "?";
  if (min === max) return `${min} day${min === 1 ? "" : "s"}`;
  return `${min}-${max} days`;
}

export function ShippingSettingsPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Zone sheet
  const [zoneSheetOpen, setZoneSheetOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneForm>(EMPTY_ZONE_FORM);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [zoneErrors, setZoneErrors] = useState<Partial<Record<keyof ZoneForm, string>>>({});

  // Rate sheet
  const [rateSheetOpen, setRateSheetOpen] = useState(false);
  const [rateZoneId, setRateZoneId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [rateForm, setRateForm] = useState<RateForm>(EMPTY_RATE_FORM);
  const [rateSaving, setRateSaving] = useState(false);
  const [rateErrors, setRateErrors] = useState<Partial<Record<keyof RateForm, string>>>({});

  // Delete dialogs
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<ShippingZone | null>(null);
  const [deletingZone, setDeletingZone] = useState(false);
  const [deleteRateTarget, setDeleteRateTarget] = useState<ShippingRate | null>(null);
  const [deletingRate, setDeletingRate] = useState(false);

  // ---- Load zones ----
  async function loadZones(signal?: AbortSignal) {
    setLoading(true);
    try {
      const res = await apiFetch<ShippingZone[]>("/admin/shipping/zones", { signal });
      setZones(res);
    } catch (e: any) {
      if ((e as any)?.name !== "AbortError") {
        toast({ title: "Failed to load shipping zones", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadZones(controller.signal);
    return () => controller.abort();
  }, []);

  // ---- Zone CRUD ----
  function openCreateZone() {
    setEditingZone(null);
    setZoneForm(EMPTY_ZONE_FORM);
    setZoneErrors({});
    setZoneSheetOpen(true);
  }

  function openEditZone(zone: ShippingZone) {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      countries: zone.countries.join(", "),
      isRestOfWorld: zone.isRestOfWorld,
    });
    setZoneErrors({});
    setZoneSheetOpen(true);
  }

  function validateZone(): boolean {
    const errs: Partial<Record<keyof ZoneForm, string>> = {};
    if (!zoneForm.name.trim()) errs.name = "Name is required";
    if (!zoneForm.isRestOfWorld && !zoneForm.countries.trim()) {
      errs.countries = "At least one country code is required";
    }
    setZoneErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSaveZone() {
    if (!validateZone()) return;
    setZoneSaving(true);
    try {
      const countries = zoneForm.isRestOfWorld
        ? []
        : zoneForm.countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
      const body = {
        name: zoneForm.name.trim(),
        countries,
        isRestOfWorld: zoneForm.isRestOfWorld,
      };

      if (editingZone) {
        await apiFetch(`/admin/shipping/zones/${editingZone.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Shipping zone updated" });
      } else {
        await apiFetch("/admin/shipping/zones", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Shipping zone created" });
      }

      setZoneSheetOpen(false);
      loadZones();
    } catch (e: any) {
      toast({ title: "Failed to save zone", description: e.message, variant: "destructive" });
    } finally {
      setZoneSaving(false);
    }
  }

  async function handleDeleteZone() {
    if (!deleteZoneTarget) return;
    setDeletingZone(true);
    try {
      await apiFetch(`/admin/shipping/zones/${deleteZoneTarget.id}`, { method: "DELETE" });
      toast({ title: "Shipping zone deleted" });
      setDeleteZoneTarget(null);
      loadZones();
    } catch (e: any) {
      toast({ title: "Failed to delete zone", description: e.message, variant: "destructive" });
    } finally {
      setDeletingZone(false);
    }
  }

  // ---- Rate CRUD ----
  function openCreateRate(zoneId: string) {
    setRateZoneId(zoneId);
    setEditingRate(null);
    setRateForm(EMPTY_RATE_FORM);
    setRateErrors({});
    setRateSheetOpen(true);
  }

  function openEditRate(rate: ShippingRate) {
    setRateZoneId(rate.zoneId);
    setEditingRate(rate);
    setRateForm({
      name: rate.name,
      type: rate.type,
      price: (rate.price / 100).toFixed(2),
      minWeight: rate.minWeight != null ? String(rate.minWeight) : "",
      maxWeight: rate.maxWeight != null ? String(rate.maxWeight) : "",
      minOrderAmount: rate.minOrderAmount != null ? (rate.minOrderAmount / 100).toFixed(2) : "",
      maxOrderAmount: rate.maxOrderAmount != null ? (rate.maxOrderAmount / 100).toFixed(2) : "",
      freeAboveAmount: rate.freeAboveAmount != null ? (rate.freeAboveAmount / 100).toFixed(2) : "",
      estimatedDaysMin: rate.estimatedDaysMin != null ? String(rate.estimatedDaysMin) : "",
      estimatedDaysMax: rate.estimatedDaysMax != null ? String(rate.estimatedDaysMax) : "",
    });
    setRateErrors({});
    setRateSheetOpen(true);
  }

  function validateRate(): boolean {
    const errs: Partial<Record<keyof RateForm, string>> = {};
    if (!rateForm.name.trim()) errs.name = "Name is required";
    if (rateForm.type !== "free" && (!rateForm.price || parseFloat(rateForm.price) < 0)) {
      errs.price = "Price must be 0 or greater";
    }
    setRateErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSaveRate() {
    if (!validateRate() || !rateZoneId) return;
    setRateSaving(true);
    try {
      const priceInCents = rateForm.type === "free" ? 0 : Math.round(parseFloat(rateForm.price) * 100);
      const body: Record<string, unknown> = {
        name: rateForm.name.trim(),
        type: rateForm.type,
        price: priceInCents,
        minWeight: rateForm.minWeight ? parseFloat(rateForm.minWeight) : null,
        maxWeight: rateForm.maxWeight ? parseFloat(rateForm.maxWeight) : null,
        minOrderAmount: rateForm.minOrderAmount ? Math.round(parseFloat(rateForm.minOrderAmount) * 100) : null,
        maxOrderAmount: rateForm.maxOrderAmount ? Math.round(parseFloat(rateForm.maxOrderAmount) * 100) : null,
        freeAboveAmount: rateForm.freeAboveAmount ? Math.round(parseFloat(rateForm.freeAboveAmount) * 100) : null,
        estimatedDaysMin: rateForm.estimatedDaysMin ? parseInt(rateForm.estimatedDaysMin, 10) : null,
        estimatedDaysMax: rateForm.estimatedDaysMax ? parseInt(rateForm.estimatedDaysMax, 10) : null,
      };

      if (editingRate) {
        await apiFetch(`/admin/shipping/rates/${editingRate.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Shipping rate updated" });
      } else {
        await apiFetch(`/admin/shipping/zones/${rateZoneId}/rates`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Shipping rate created" });
      }

      setRateSheetOpen(false);
      loadZones();
    } catch (e: any) {
      toast({ title: "Failed to save rate", description: e.message, variant: "destructive" });
    } finally {
      setRateSaving(false);
    }
  }

  async function handleDeleteRate() {
    if (!deleteRateTarget) return;
    setDeletingRate(true);
    try {
      await apiFetch(`/admin/shipping/rates/${deleteRateTarget.id}`, { method: "DELETE" });
      toast({ title: "Shipping rate deleted" });
      setDeleteRateTarget(null);
      loadZones();
    } catch (e: any) {
      toast({ title: "Failed to delete rate", description: e.message, variant: "destructive" });
    } finally {
      setDeletingRate(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping & delivery"
        description="Manage shipping zones and rates for your marketplace. Zones define where you ship to, and rates define how much it costs."
        action={
          <Button onClick={openCreateZone}>
            <PlusIcon className="size-4 mr-1" />
            Add shipping zone
          </Button>
        }
      />

      {/* ---- Loading skeleton ---- */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
      ) : zones.length === 0 ? (
        <Card className="border shadow-none">
          <EmptyState
            icon={TruckIcon}
            title="No shipping zones"
            description="Create your first shipping zone to start configuring delivery rates."
            action={
              <Button onClick={openCreateZone}>
                <PlusIcon className="size-4 mr-1" />
                Add shipping zone
              </Button>
            }
          />
        </Card>
      ) : (
        /* ---- Zone cards ---- */
        <div className="space-y-4">
          {zones.map((zone) => (
            <Card key={zone.id} className="border shadow-none overflow-hidden">
              {/* Zone header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  {zone.isRestOfWorld ? (
                    <GlobeIcon className="size-5 text-muted-foreground shrink-0" />
                  ) : (
                    <MapPinIcon className="size-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm">{zone.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {zone.isRestOfWorld
                        ? "Rest of world"
                        : zone.countries.length > 0
                          ? zone.countries.join(", ")
                          : "No countries assigned"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openCreateRate(zone.id)}>
                    <PlusIcon className="size-3.5 mr-1" />
                    Add rate
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${zone.name}`}>
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditZone(zone)}>
                        Edit zone
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteZoneTarget(zone)}
                      >
                        Delete zone
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Rates table */}
              {zone.rates.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <PackageIcon className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No shipping rates configured.</p>
                  <Button variant="link" size="sm" className="mt-1" onClick={() => openCreateRate(zone.id)}>
                    Add your first rate
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="font-semibold">Rate name</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold text-right">Price</TableHead>
                      <TableHead className="font-semibold">Conditions</TableHead>
                      <TableHead className="font-semibold">Delivery estimate</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zone.rates.map((rate) => (
                      <TableRow key={rate.id} className="group">
                        <TableCell className="font-medium text-sm">{rate.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {formatRateType(rate.type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm">
                          {rate.type === "free" ? "Free" : formatPrice(rate.price)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatConditions(rate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDeliveryEstimate(rate)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              rate.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {rate.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="w-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label={`Actions for ${rate.name}`}
                              >
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditRate(rate)}>
                                Edit rate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteRateTarget(rate)}
                              >
                                Delete rate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ---- Zone Create/Edit Sheet ---- */}
      <Sheet open={zoneSheetOpen} onOpenChange={setZoneSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingZone ? "Edit Shipping Zone" : "Create Shipping Zone"}</SheetTitle>
            <SheetDescription>
              {editingZone
                ? "Update the shipping zone details."
                : "Define a new shipping zone with the countries it covers."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-4">
              <FormField label="Zone name" htmlFor="zone-name" error={zoneErrors.name} required>
                <Input
                  id="zone-name"
                  value={zoneForm.name}
                  onChange={(e) => {
                    setZoneForm((prev) => ({ ...prev, name: e.target.value }));
                    if (zoneErrors.name) setZoneErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. Kathmandu Valley, Nepal Domestic, India / SAARC, EU"
                />
              </FormField>

              <FormField label="Rest of world" htmlFor="zone-row">
                <div className="flex items-center gap-2">
                  <Switch
                    id="zone-row"
                    checked={zoneForm.isRestOfWorld}
                    onCheckedChange={(checked) =>
                      setZoneForm((prev) => ({ ...prev, isRestOfWorld: checked }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {zoneForm.isRestOfWorld
                      ? "This zone covers all countries not in other zones"
                      : "Specify countries manually"}
                  </span>
                </div>
              </FormField>

              {!zoneForm.isRestOfWorld && (
                <FormField
                  label="Countries"
                  htmlFor="zone-countries"
                  error={zoneErrors.countries}
                  required
                >
                  <Textarea
                    id="zone-countries"
                    value={zoneForm.countries}
                    onChange={(e) => {
                      setZoneForm((prev) => ({ ...prev, countries: e.target.value }));
                      if (zoneErrors.countries) setZoneErrors((prev) => ({ ...prev, countries: undefined }));
                    }}
                    placeholder="US, CA, MX"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated ISO country codes (e.g. US, CA, GB, DE).
                  </p>
                </FormField>
              )}
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setZoneSheetOpen(false)} disabled={zoneSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveZone} disabled={zoneSaving}>
              {zoneSaving ? "Saving…" : editingZone ? "Save changes" : "Create zone"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ---- Rate Create/Edit Sheet ---- */}
      <Sheet open={rateSheetOpen} onOpenChange={setRateSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingRate ? "Edit Shipping Rate" : "Add Shipping Rate"}</SheetTitle>
            <SheetDescription>
              {editingRate
                ? "Update the shipping rate details."
                : "Configure a new shipping rate for this zone."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-4">
              <FormField label="Rate name" htmlFor="rate-name" error={rateErrors.name} required>
                <Input
                  id="rate-name"
                  value={rateForm.name}
                  onChange={(e) => {
                    setRateForm((prev) => ({ ...prev, name: e.target.value }));
                    if (rateErrors.name) setRateErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. Standard Shipping, Express"
                />
              </FormField>

              <FormField label="Type" htmlFor="rate-type" required>
                <Select
                  value={rateForm.type}
                  onValueChange={(v) => setRateForm((prev) => ({ ...prev, type: v }))}
                >
                  <SelectTrigger id="rate-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {rateForm.type !== "free" && (
                <FormField label="Price ($)" htmlFor="rate-price" error={rateErrors.price} required>
                  <Input
                    id="rate-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={rateForm.price}
                    onChange={(e) => {
                      setRateForm((prev) => ({ ...prev, price: e.target.value }));
                      if (rateErrors.price) setRateErrors((prev) => ({ ...prev, price: undefined }));
                    }}
                    placeholder="5.99"
                  />
                </FormField>
              )}

              {rateForm.type === "weight_based" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Min weight (g)" htmlFor="rate-min-weight">
                      <Input
                        id="rate-min-weight"
                        type="number"
                        min="0"
                        value={rateForm.minWeight}
                        onChange={(e) => setRateForm((prev) => ({ ...prev, minWeight: e.target.value }))}
                        placeholder="0"
                      />
                    </FormField>
                    <FormField label="Max weight (g)" htmlFor="rate-max-weight">
                      <Input
                        id="rate-max-weight"
                        type="number"
                        min="0"
                        value={rateForm.maxWeight}
                        onChange={(e) => setRateForm((prev) => ({ ...prev, maxWeight: e.target.value }))}
                        placeholder="5000"
                      />
                    </FormField>
                  </div>
                </>
              )}

              {rateForm.type === "price_based" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Min order amount ($)" htmlFor="rate-min-order">
                      <Input
                        id="rate-min-order"
                        type="number"
                        min="0"
                        step="0.01"
                        value={rateForm.minOrderAmount}
                        onChange={(e) => setRateForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </FormField>
                    <FormField label="Max order amount ($)" htmlFor="rate-max-order">
                      <Input
                        id="rate-max-order"
                        type="number"
                        min="0"
                        step="0.01"
                        value={rateForm.maxOrderAmount}
                        onChange={(e) => setRateForm((prev) => ({ ...prev, maxOrderAmount: e.target.value }))}
                        placeholder="100.00"
                      />
                    </FormField>
                  </div>
                </>
              )}

              <FormField label="Free above amount ($)" htmlFor="rate-free-above">
                <Input
                  id="rate-free-above"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rateForm.freeAboveAmount}
                  onChange={(e) => setRateForm((prev) => ({ ...prev, freeAboveAmount: e.target.value }))}
                  placeholder="e.g. 75.00 (leave empty for none)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Orders above this amount get free shipping with this rate.
                </p>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Est. days (min)" htmlFor="rate-days-min">
                  <Input
                    id="rate-days-min"
                    type="number"
                    min="0"
                    value={rateForm.estimatedDaysMin}
                    onChange={(e) => setRateForm((prev) => ({ ...prev, estimatedDaysMin: e.target.value }))}
                    placeholder="3"
                  />
                </FormField>
                <FormField label="Est. days (max)" htmlFor="rate-days-max">
                  <Input
                    id="rate-days-max"
                    type="number"
                    min="0"
                    value={rateForm.estimatedDaysMax}
                    onChange={(e) => setRateForm((prev) => ({ ...prev, estimatedDaysMax: e.target.value }))}
                    placeholder="7"
                  />
                </FormField>
              </div>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setRateSheetOpen(false)} disabled={rateSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveRate} disabled={rateSaving}>
              {rateSaving ? "Saving…" : editingRate ? "Save changes" : "Add rate"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ---- Delete Zone Confirm ---- */}
      <ConfirmDialog
        open={!!deleteZoneTarget}
        onOpenChange={(open) => { if (!open) setDeleteZoneTarget(null); }}
        title="Delete shipping zone"
        description={`Are you sure you want to delete "${deleteZoneTarget?.name}"? All rates within this zone will also be removed. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deletingZone}
        onConfirm={handleDeleteZone}
      />

      {/* ---- Delete Rate Confirm ---- */}
      <ConfirmDialog
        open={!!deleteRateTarget}
        onOpenChange={(open) => { if (!open) setDeleteRateTarget(null); }}
        title="Delete shipping rate"
        description={`Are you sure you want to delete "${deleteRateTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deletingRate}
        onConfirm={handleDeleteRate}
      />
    </div>
  );
}
