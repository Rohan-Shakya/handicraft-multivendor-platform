import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { brand } from "@/config/brand";
import { currencySymbol } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { SaveIcon } from "lucide-react";
import {
  type VariantDetail,
  type VariantEditForm,
  INITIAL_VARIANT_EDIT,
  WEIGHT_UNITS,
  INVENTORY_POLICIES,
  variantDisplayName,
  toDisplayPrice,
} from "./types";

interface Props {
  variant: VariantDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

export function VariantEditSheet({ variant, onClose, onSaved }: Props) {
  const [form, setForm] = useState<VariantEditForm>(INITIAL_VARIANT_EDIT);
  const [saving, setSaving] = useState(false);

  // Populate form when variant changes
  const [lastVariantId, setLastVariantId] = useState<string | null>(null);
  if (variant && variant.id !== lastVariantId) {
    setLastVariantId(variant.id);
    setForm({
      sku: variant.sku ?? "",
      barcode: variant.barcode ?? "",
      price: toDisplayPrice(variant.price),
      compareAtPrice: toDisplayPrice(variant.compareAtPrice),
      costPerItem: toDisplayPrice(variant.costPerItem),
      taxable: variant.taxable ?? true,
      inventoryTracked: variant.inventoryTracked ?? true,
      inventoryPolicy: variant.inventoryPolicy ?? "deny",
      inventoryQuantity: variant.inventoryQuantity != null ? String(variant.inventoryQuantity) : "",
      requiresShipping: variant.requiresShipping ?? true,
      weight: toDisplayPrice(variant.weightValue),
      weightUnit: variant.weightUnit ?? "kg",
      countryOfOrigin: variant.countryOfOrigin ?? "",
      hsCode: variant.harmonizedSystemCode ?? "",
    });
  }

  async function handleSave() {
    if (!variant) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        taxable: form.taxable,
        inventoryTracked: form.inventoryTracked,
        inventoryPolicy: form.inventoryPolicy,
        requiresShipping: form.requiresShipping,
        countryOfOrigin: form.countryOfOrigin.trim() || null,
        harmonizedSystemCode: form.hsCode.trim() || null,
      };
      if (form.price.trim()) body.price = form.price.trim();
      body.compareAtPrice = form.compareAtPrice.trim() || null;
      body.costPerItem = form.costPerItem.trim() || null;
      if (form.weight.trim()) {
        body.weightValue = form.weight.trim();
        body.weightUnit = form.weightUnit;
      } else {
        body.weightValue = null;
      }

      await apiFetch(`/admin/variants/${variant.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      toast({ title: "Variant updated" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Failed to update variant", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setLastVariantId(null);
    onClose();
  }

  return (
    <Sheet open={!!variant} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            Edit variant: {variant ? variantDisplayName(variant) : ""}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-6 pb-6">
            {/* Option values (readonly) */}
            {variant?.selectedOptions && variant.selectedOptions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Options</h4>
                <div className="flex flex-wrap gap-2">
                  {variant.selectedOptions.map((opt) => (
                    <div key={opt.optionId} className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{opt.optionName ?? "Option"}:</span>
                      <Badge variant="secondary" className="text-xs">{opt.value ?? opt.optionValueId}</Badge>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            )}

            {/* Pricing */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Pricing</h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Price" htmlFor="v-price">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol()}</span>
                    <Input
                      id="v-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="0.00"
                      className="pl-9"
                    />
                  </div>
                </FormField>
                <FormField label="Compare-at price" htmlFor="v-compare">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol()}</span>
                    <Input
                      id="v-compare"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.compareAtPrice}
                      onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
                      placeholder="0.00"
                      className="pl-9"
                    />
                  </div>
                </FormField>
              </div>
              <FormField label="Cost per item" htmlFor="v-cost">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol()}</span>
                  <Input
                    id="v-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPerItem}
                    onChange={(e) => setForm((f) => ({ ...f, costPerItem: e.target.value }))}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </FormField>
              <div className="flex items-center justify-between">
                <Label htmlFor="v-taxable" className="text-sm">Charge tax on this variant</Label>
                <Switch
                  id="v-taxable"
                  checked={form.taxable}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, taxable: v }))}
                />
              </div>
            </div>

            <Separator />

            {/* Inventory */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Inventory</h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="SKU" htmlFor="v-sku">
                  <Input
                    id="v-sku"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    placeholder="SKU-001"
                  />
                </FormField>
                <FormField label="Barcode" htmlFor="v-barcode">
                  <Input
                    id="v-barcode"
                    value={form.barcode}
                    onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                    placeholder="123456789012"
                  />
                </FormField>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="v-tracked" className="text-sm">Track quantity</Label>
                <Switch
                  id="v-tracked"
                  checked={form.inventoryTracked}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, inventoryTracked: v }))}
                />
              </div>
              {form.inventoryTracked && (
                <FormField label="Quantity" htmlFor="v-quantity">
                  <Input
                    id="v-quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={form.inventoryQuantity}
                    onChange={(e) => setForm((f) => ({ ...f, inventoryQuantity: e.target.value }))}
                    placeholder="0"
                    className="w-32"
                  />
                </FormField>
              )}
              <FormField label="Inventory policy" htmlFor="v-inv-policy">
                <Select
                  value={form.inventoryPolicy}
                  onValueChange={(v) => setForm((f) => ({ ...f, inventoryPolicy: v }))}
                >
                  <SelectTrigger id="v-inv-policy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_POLICIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <Separator />

            {/* Shipping */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Shipping</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="v-shipping" className="text-sm">Requires shipping</Label>
                <Switch
                  id="v-shipping"
                  checked={form.requiresShipping}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, requiresShipping: v }))}
                />
              </div>
              {form.requiresShipping && (
                <>
                  <FormField label="Weight" htmlFor="v-weight">
                    <div className="flex gap-2">
                      <Input
                        id="v-weight"
                        type="number"
                        min="0"
                        step="0.001"
                        value={form.weight}
                        onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                        placeholder="0.0"
                        className="flex-1"
                      />
                      <Select
                        value={form.weightUnit}
                        onValueChange={(v) => setForm((f) => ({ ...f, weightUnit: v }))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEIGHT_UNITS.map((u) => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Country of origin" htmlFor="v-country">
                      <Input
                        id="v-country"
                        value={form.countryOfOrigin}
                        onChange={(e) => setForm((f) => ({ ...f, countryOfOrigin: e.target.value }))}
                        placeholder={brand.countryCode}
                        maxLength={2}
                      />
                    </FormField>
                    <FormField label="HS code" htmlFor="v-hs">
                      <Input
                        id="v-hs"
                        value={form.hsCode}
                        onChange={(e) => setForm((f) => ({ ...f, hsCode: e.target.value }))}
                        placeholder="6109.10"
                      />
                    </FormField>
                  </div>
                </>
              )}
            </div>
          </div>
        </SheetBody>
        <SheetFooter className="border-t px-6 py-4 flex gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            <SaveIcon className="size-4 mr-1" />
            {saving ? "Saving…" : "Save variant"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
