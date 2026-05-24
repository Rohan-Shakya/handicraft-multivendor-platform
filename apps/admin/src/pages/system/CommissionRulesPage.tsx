import { useEffect, useState } from "react";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { CalculatorIcon, PlusIcon, MoreHorizontalIcon } from "lucide-react";

const LIMIT = 20;

const RULE_TYPES = [
  { value: "bps", label: "Percentage (BPS)" },
  { value: "flat_fee", label: "Flat Fee" },
] as const;

const RULE_SCOPES = [
  { value: "default", label: "Default (all vendors)" },
  { value: "vendor", label: "Vendor-specific" },
] as const;

interface CommissionRule {
  id: string;
  name: string;
  type: "bps" | "flat_fee";
  value: string;
  scope: "default" | "vendor";
  vendorId: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RuleForm {
  name: string;
  type: string;
  value: string;
  scope: string;
  vendorId: string;
  startsAt: string;
  endsAt: string;
}

const INITIAL_FORM: RuleForm = {
  name: "",
  type: "bps",
  value: "",
  scope: "default",
  vendorId: "",
  startsAt: "",
  endsAt: "",
};

function formatValue(type: string, value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (type === "bps") return `${(num / 100).toFixed(2)}%`;
  return formatPrice(num);
}

export function CommissionRulesPage() {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [form, setForm] = useState<RuleForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RuleForm, string>>>({});

  // Archive dialog
  const [archiveTarget, setArchiveTarget] = useState<CommissionRule | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  async function load(_p = page, signal?: AbortSignal) {
    setLoading(true);
    try {
      const res = await apiFetch<CommissionRule[] | PaginatedResponse<CommissionRule>>(`/admin/commission-rules?page=${_p}&limit=${LIMIT}`, { signal });
      if (Array.isArray(res)) {
        // Bare-array fallback: total is unknown. Estimate from current offset
        // so the "Next" page button stays available when the page is full.
        setRules(res);
        const offset = (_p - 1) * LIMIT;
        setTotal(res.length === LIMIT ? offset + LIMIT + 1 : offset + res.length);
      } else {
        setRules(res.data);
        setTotal(res.total);
      }
    } catch (e: any) {
      if ((e as any)?.name !== "AbortError") {
        toast({ title: "Failed to load commission rules", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(page, controller.signal);
    return () => controller.abort();
  }, [page]);

  function openCreate() {
    setEditingRule(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setSheetOpen(true);
  }

  function openEdit(rule: CommissionRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      type: rule.type,
      value: rule.value,
      scope: rule.scope,
      vendorId: rule.vendorId ?? "",
      startsAt: rule.startsAt ? rule.startsAt.slice(0, 16) : "",
      endsAt: rule.endsAt ? rule.endsAt.slice(0, 16) : "",
    });
    setErrors({});
    setSheetOpen(true);
  }

  function updateField<K extends keyof RuleForm>(key: K, value: RuleForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof RuleForm, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.value || parseFloat(form.value) <= 0) errs.value = "Value must be greater than 0";
    if (form.scope === "vendor" && !form.vendorId.trim()) errs.vendorId = "Vendor ID is required for vendor scope";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type,
        value: form.value,
        scope: form.scope,
        vendorId: form.scope === "vendor" ? form.vendorId.trim() : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };

      if (editingRule) {
        await apiFetch(`/admin/commission-rules/${editingRule.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Commission rule updated" });
      } else {
        await apiFetch("/admin/commission-rules", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Commission rule created" });
      }

      setSheetOpen(false);
      load(page);
    } catch (e: any) {
      toast({ title: "Failed to save rule", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      await apiFetch(`/admin/commission-rules/${archiveTarget.id}`, { method: "DELETE" });
      toast({ title: "Commission rule archived" });
      setArchiveTarget(null);
      load(page);
    } catch (e: any) {
      toast({ title: "Failed to archive rule", description: e.message, variant: "destructive" });
    } finally {
      setArchiveLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commission Rules"
        description="Configure commission rates for vendors."
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4 mr-1" />
            Add Rule
          </Button>
        }
      />

      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : rules.length === 0 ? (
          <EmptyState
            icon={CalculatorIcon}
            title="No commission rules"
            description="Create your first commission rule to get started."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Scope</TableHead>
                  <TableHead className="font-semibold text-right">Value</TableHead>
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Active Range</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {rule.type === "bps" ? "Percentage" : "Flat Fee"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{rule.scope}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm">
                      {formatValue(rule.type, rule.value)}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {rule.vendorId ? `${rule.vendorId.slice(0, 8)}...` : "-"}
                    </TableCell>
                    <TableCell><StatusBadge status={rule.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rule.startsAt || rule.endsAt ? (
                        <>
                          {rule.startsAt ? new Date(rule.startsAt).toLocaleDateString() : "..."}
                          {" - "}
                          {rule.endsAt ? new Date(rule.endsAt).toLocaleDateString() : "..."}
                        </>
                      ) : (
                        "Always"
                      )}
                    </TableCell>
                    <TableCell className="w-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${rule.name}`}>
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(rule)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setArchiveTarget(rule)}
                          >
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingRule ? "Edit Commission Rule" : "Create Commission Rule"}</SheetTitle>
            <SheetDescription>
              {editingRule ? "Update the commission rule details." : "Set up a new commission rule for vendor payouts."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-4">
              <FormField label="Name" htmlFor="rule-name" error={errors.name} required>
                <Input
                  id="rule-name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Default Commission"
                />
              </FormField>

              <FormField label="Type" htmlFor="rule-type" required>
                <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                  <SelectTrigger id="rule-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label={form.type === "bps" ? "Value (basis points, e.g. 1000 = 10%)" : "Value (flat amount, e.g. 5.00)"}
                htmlFor="rule-value"
                error={errors.value}
                required
              >
                <Input
                  id="rule-value"
                  type="number"
                  min="0"
                  step={form.type === "bps" ? "1" : "0.01"}
                  value={form.value}
                  onChange={(e) => updateField("value", e.target.value)}
                  placeholder={form.type === "bps" ? "1000" : "5.00"}
                />
              </FormField>

              <FormField label="Scope" htmlFor="rule-scope" required>
                <Select value={form.scope} onValueChange={(v) => updateField("scope", v)}>
                  <SelectTrigger id="rule-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {form.scope === "vendor" && (
                <FormField label="Vendor ID" htmlFor="rule-vendor" error={errors.vendorId} required>
                  <Input
                    id="rule-vendor"
                    value={form.vendorId}
                    onChange={(e) => updateField("vendorId", e.target.value)}
                    placeholder="Vendor UUID"
                    className="font-mono"
                  />
                </FormField>
              )}

              <FormField label="Starts At" htmlFor="rule-starts">
                <Input
                  id="rule-starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => updateField("startsAt", e.target.value)}
                />
              </FormField>

              <FormField label="Ends At" htmlFor="rule-ends">
                <Input
                  id="rule-ends"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => updateField("endsAt", e.target.value)}
                />
              </FormField>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingRule ? "Save changes" : "Create rule"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Archive Confirm Dialog */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        title="Archive Commission Rule"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? This action can be undone by an administrator.`}
        confirmLabel="Archive"
        variant="destructive"
        loading={archiveLoading}
        onConfirm={handleArchive}
      />
    </div>
  );
}
