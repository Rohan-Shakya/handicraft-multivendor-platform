import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Landmark, PlusIcon, MoreHorizontalIcon, Trash2Icon, PencilIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TaxRate {
  id: string;
  zoneId: string;
  name: string;
  rateBps: number;
  isCompound: boolean;
  isShippingTaxed: boolean;
  priority: number;
  isActive: boolean;
}

interface TaxZone {
  id: string;
  name: string;
  countryCode: string;
  provinceCode: string | null;
  behavior: "exclusive" | "inclusive";
  isActive: boolean;
  rates: TaxRate[];
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2);
}

function percentToBps(pct: string): number {
  return Math.round(parseFloat(pct) * 100);
}

/* -------------------------------------------------------------------------- */
/*  Zone form                                                                  */
/* -------------------------------------------------------------------------- */

interface ZoneForm {
  name: string;
  countryCode: string;
  provinceCode: string;
  behavior: string;
}

const INITIAL_ZONE_FORM: ZoneForm = {
  name: "",
  countryCode: "",
  provinceCode: "",
  behavior: "exclusive",
};

/* -------------------------------------------------------------------------- */
/*  Rate form                                                                  */
/* -------------------------------------------------------------------------- */

interface RateForm {
  name: string;
  ratePercent: string;
  isCompound: boolean;
  isShippingTaxed: boolean;
  priority: string;
}

const INITIAL_RATE_FORM: RateForm = {
  name: "",
  ratePercent: "",
  isCompound: false,
  isShippingTaxed: false,
  priority: "0",
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function TaxSettingsPage() {
  const [zones, setZones] = useState<TaxZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Zone sheet
  const [zoneSheetOpen, setZoneSheetOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<TaxZone | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneForm>(INITIAL_ZONE_FORM);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [zoneErrors, setZoneErrors] = useState<Partial<Record<keyof ZoneForm, string>>>({});

  // Rate sheet
  const [rateSheetOpen, setRateSheetOpen] = useState(false);
  const [rateZoneId, setRateZoneId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [rateForm, setRateForm] = useState<RateForm>(INITIAL_RATE_FORM);
  const [rateSaving, setRateSaving] = useState(false);
  const [rateErrors, setRateErrors] = useState<Partial<Record<keyof RateForm, string>>>({});

  // Delete dialogs
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<TaxZone | null>(null);
  const [deleteZoneLoading, setDeleteZoneLoading] = useState(false);
  const [deleteRateTarget, setDeleteRateTarget] = useState<TaxRate | null>(null);
  const [deleteRateLoading, setDeleteRateLoading] = useState(false);

  /* -- Load zones ---------------------------------------------------------- */

  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const res = await apiFetch<TaxZone[]>("/admin/tax/zones", { signal });
      setZones(res);
    } catch (e: any) {
      if ((e as any)?.name !== "AbortError") {
        toast({ title: "Failed to load tax zones", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);

  /* -- Zone CRUD ----------------------------------------------------------- */

  function openCreateZone() {
    setEditingZone(null);
    setZoneForm(INITIAL_ZONE_FORM);
    setZoneErrors({});
    setZoneSheetOpen(true);
  }

  function openEditZone(zone: TaxZone) {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      countryCode: zone.countryCode,
      provinceCode: zone.provinceCode ?? "",
      behavior: zone.behavior,
    });
    setZoneErrors({});
    setZoneSheetOpen(true);
  }

  function updateZoneField<K extends keyof ZoneForm>(key: K, value: ZoneForm[K]) {
    setZoneForm((prev) => ({ ...prev, [key]: value }));
    if (zoneErrors[key]) setZoneErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateZone(): boolean {
    const errs: Partial<Record<keyof ZoneForm, string>> = {};
    if (!zoneForm.name.trim()) errs.name = "Name is required";
    if (!zoneForm.countryCode.trim()) errs.countryCode = "Country code is required";
    if (zoneForm.countryCode.trim().length !== 2) errs.countryCode = "Must be a 2-letter code";
    setZoneErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSaveZone() {
    if (!validateZone()) return;
    setZoneSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: zoneForm.name.trim(),
        countryCode: zoneForm.countryCode.trim().toUpperCase(),
        provinceCode: zoneForm.provinceCode.trim() || null,
        behavior: zoneForm.behavior,
      };

      if (editingZone) {
        await apiFetch(`/admin/tax/zones/${editingZone.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Tax zone updated" });
      } else {
        await apiFetch("/admin/tax/zones", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Tax zone created" });
      }

      setZoneSheetOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Failed to save zone", description: e.message, variant: "destructive" });
    } finally {
      setZoneSaving(false);
    }
  }

  async function handleDeleteZone() {
    if (!deleteZoneTarget) return;
    setDeleteZoneLoading(true);
    try {
      await apiFetch(`/admin/tax/zones/${deleteZoneTarget.id}`, { method: "DELETE" });
      toast({ title: "Tax zone deleted" });
      setDeleteZoneTarget(null);
      load();
    } catch (e: any) {
      toast({ title: "Failed to delete zone", description: e.message, variant: "destructive" });
    } finally {
      setDeleteZoneLoading(false);
    }
  }

  /* -- Rate CRUD ----------------------------------------------------------- */

  function openCreateRate(zoneId: string) {
    setRateZoneId(zoneId);
    setEditingRate(null);
    setRateForm(INITIAL_RATE_FORM);
    setRateErrors({});
    setRateSheetOpen(true);
  }

  function openEditRate(rate: TaxRate) {
    setRateZoneId(rate.zoneId);
    setEditingRate(rate);
    setRateForm({
      name: rate.name,
      ratePercent: bpsToPercent(rate.rateBps),
      isCompound: rate.isCompound,
      isShippingTaxed: rate.isShippingTaxed,
      priority: String(rate.priority),
    });
    setRateErrors({});
    setRateSheetOpen(true);
  }

  function updateRateField<K extends keyof RateForm>(key: K, value: RateForm[K]) {
    setRateForm((prev) => ({ ...prev, [key]: value }));
    if (rateErrors[key]) setRateErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateRate(): boolean {
    const errs: Partial<Record<keyof RateForm, string>> = {};
    if (!rateForm.name.trim()) errs.name = "Name is required";
    const pct = parseFloat(rateForm.ratePercent);
    if (isNaN(pct) || pct < 0 || pct > 100) errs.ratePercent = "Rate must be between 0% and 100%";
    setRateErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSaveRate() {
    if (!validateRate()) return;
    setRateSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: rateForm.name.trim(),
        rateBps: percentToBps(rateForm.ratePercent),
        isCompound: rateForm.isCompound,
        isShippingTaxed: rateForm.isShippingTaxed,
        priority: parseInt(rateForm.priority, 10) || 0,
      };

      if (editingRate) {
        await apiFetch(`/admin/tax/rates/${editingRate.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Tax rate updated" });
      } else {
        await apiFetch(`/admin/tax/zones/${rateZoneId}/rates`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Tax rate created" });
      }

      setRateSheetOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Failed to save rate", description: e.message, variant: "destructive" });
    } finally {
      setRateSaving(false);
    }
  }

  async function handleDeleteRate() {
    if (!deleteRateTarget) return;
    setDeleteRateLoading(true);
    try {
      await apiFetch(`/admin/tax/rates/${deleteRateTarget.id}`, { method: "DELETE" });
      toast({ title: "Tax rate deleted" });
      setDeleteRateTarget(null);
      load();
    } catch (e: any) {
      toast({ title: "Failed to delete rate", description: e.message, variant: "destructive" });
    } finally {
      setDeleteRateLoading(false);
    }
  }

  /* -- Render -------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Settings"
        description="Manage tax zones and rates for your marketplace."
        action={
          <Button onClick={openCreateZone}>
            <PlusIcon className="size-4 mr-1" />
            Add Tax Zone
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-3 border shadow-none">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
      ) : zones.length === 0 ? (
        <Card className="border shadow-none">
          <EmptyState
            icon={Landmark}
            title="No tax zones"
            description="Create your first tax zone to start collecting taxes."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <Card key={zone.id} className="border shadow-none overflow-hidden">
              {/* Zone header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{zone.name}</h3>
                      <Badge variant={zone.behavior === "inclusive" ? "default" : "secondary"}>
                        {zone.behavior}
                      </Badge>
                      {!zone.isActive && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {zone.countryCode}
                      {zone.provinceCode ? ` / ${zone.provinceCode}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openCreateRate(zone.id)}>
                    <PlusIcon className="size-3.5 mr-1" />
                    Add Rate
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${zone.name}`}>
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditZone(zone)}>
                        Edit Zone
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteZoneTarget(zone)}
                      >
                        Delete Zone
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Rates table */}
              {zone.rates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold text-right">Rate</TableHead>
                      <TableHead className="font-semibold">Compound</TableHead>
                      <TableHead className="font-semibold">Tax Shipping</TableHead>
                      <TableHead className="font-semibold text-right">Priority</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zone.rates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.name}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm">
                          {bpsToPercent(rate.rateBps)}%
                        </TableCell>
                        <TableCell>
                          {rate.isCompound ? (
                            <Badge variant="secondary">Yes</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rate.isShippingTaxed ? (
                            <Badge variant="secondary">Yes</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {rate.priority}
                        </TableCell>
                        <TableCell>
                          {rate.isActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="w-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${rate.name}`}>
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditRate(rate)}>
                                <PencilIcon className="size-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteRateTarget(rate)}
                              >
                                <Trash2Icon className="size-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No rates configured. Add a rate to start collecting taxes in this zone.
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Zone Sheet ──────────────────────────────────────────────── */}
      <Sheet open={zoneSheetOpen} onOpenChange={setZoneSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingZone ? "Edit Tax Zone" : "Create Tax Zone"}</SheetTitle>
            <SheetDescription>
              {editingZone
                ? "Update the tax zone details."
                : "Define a geographic tax zone for tax collection."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-4">
              <FormField label="Name" htmlFor="zone-name" error={zoneErrors.name} required>
                <Input
                  id="zone-name"
                  value={zoneForm.name}
                  onChange={(e) => updateZoneField("name", e.target.value)}
                  placeholder="e.g. Nepal VAT 13%, India GST, EU VAT"
                />
              </FormField>

              <FormField label="Country Code" htmlFor="zone-country" error={zoneErrors.countryCode} required>
                <Input
                  id="zone-country"
                  value={zoneForm.countryCode}
                  onChange={(e) => updateZoneField("countryCode", e.target.value.toUpperCase())}
                  placeholder="US"
                  maxLength={2}
                  className="uppercase font-mono"
                />
              </FormField>

              <FormField label="Province / State Code" htmlFor="zone-province">
                <Input
                  id="zone-province"
                  value={zoneForm.provinceCode}
                  onChange={(e) => updateZoneField("provinceCode", e.target.value.toUpperCase())}
                  placeholder="CA (optional)"
                  maxLength={5}
                  className="uppercase font-mono"
                />
              </FormField>

              <FormField label="Tax Behavior" htmlFor="zone-behavior" required>
                <Select value={zoneForm.behavior} onValueChange={(v) => updateZoneField("behavior", v)}>
                  <SelectTrigger id="zone-behavior">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusive (added on top of price)</SelectItem>
                    <SelectItem value="inclusive">Inclusive (included in price)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
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

      {/* ── Rate Sheet ──────────────────────────────────────────────── */}
      <Sheet open={rateSheetOpen} onOpenChange={setRateSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingRate ? "Edit Tax Rate" : "Add Tax Rate"}</SheetTitle>
            <SheetDescription>
              {editingRate
                ? "Update the tax rate details."
                : "Add a new tax rate to this zone."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-4">
              <FormField label="Name" htmlFor="rate-name" error={rateErrors.name} required>
                <Input
                  id="rate-name"
                  value={rateForm.name}
                  onChange={(e) => updateRateField("name", e.target.value)}
                  placeholder="e.g. State Sales Tax, GST"
                />
              </FormField>

              <FormField label="Rate (%)" htmlFor="rate-percent" error={rateErrors.ratePercent} required>
                <Input
                  id="rate-percent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rateForm.ratePercent}
                  onChange={(e) => updateRateField("ratePercent", e.target.value)}
                  placeholder="e.g. 10.00 for 10%"
                />
              </FormField>

              <FormField label="Priority" htmlFor="rate-priority">
                <Input
                  id="rate-priority"
                  type="number"
                  min="0"
                  step="1"
                  value={rateForm.priority}
                  onChange={(e) => updateRateField("priority", e.target.value)}
                  placeholder="0"
                />
              </FormField>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Compound tax</p>
                  <p className="text-xs text-muted-foreground">Applied on top of other taxes</p>
                </div>
                <Switch
                  checked={rateForm.isCompound}
                  onCheckedChange={(v) => updateRateField("isCompound", v)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Tax shipping</p>
                  <p className="text-xs text-muted-foreground">Apply this rate to shipping charges</p>
                </div>
                <Switch
                  checked={rateForm.isShippingTaxed}
                  onCheckedChange={(v) => updateRateField("isShippingTaxed", v)}
                />
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

      {/* ── Delete Zone Confirm ──────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteZoneTarget}
        onOpenChange={(open) => { if (!open) setDeleteZoneTarget(null); }}
        title="Delete Tax Zone"
        description={`Are you sure you want to delete "${deleteZoneTarget?.name}"? This will also remove all associated tax rates. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteZoneLoading}
        onConfirm={handleDeleteZone}
      />

      {/* ── Delete Rate Confirm ──────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteRateTarget}
        onOpenChange={(open) => { if (!open) setDeleteRateTarget(null); }}
        title="Delete Tax Rate"
        description={`Are you sure you want to delete the rate "${deleteRateTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteRateLoading}
        onConfirm={handleDeleteRate}
      />
    </div>
  );
}
