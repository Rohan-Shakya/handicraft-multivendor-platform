import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/format";
import { FormField } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  PlusIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
  BarChart3Icon,
  ZapIcon,
  TicketIcon,
  ExternalLinkIcon,
} from "lucide-react";

interface DiscountSummary {
  id: string;
  title: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: string;
  status: string;
  method: "code" | "automatic";
  scope: "platform" | "vendor" | "targeted_vendors";
}

interface CampaignDetail {
  id: string;
  handle: string;
  title: string;
  headline: string | null;
  description: string | null;
  heroImageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  priority: number;
  status: "draft" | "scheduled" | "active" | "ended" | "archived";
  startsAt: string;
  endsAt: string;
  accentColor: string | null;
  backgroundColor: string | null;
  discounts?: DiscountSummary[];
}

interface AnalyticsResponse {
  campaign: CampaignDetail;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: string;
    clickThroughRate: number;
    conversionRate: number;
  };
}

interface FormState {
  handle: string;
  title: string;
  headline: string;
  description: string;
  heroImageUrl: string;
  ctaText: string;
  ctaUrl: string;
  priority: number;
  status: CampaignDetail["status"];
  startsAt: string; // datetime-local
  endsAt: string;
  accentColor: string;
  backgroundColor: string;
  discountIds: string[];
}

const EMPTY_FORM: FormState = {
  handle: "",
  title: "",
  headline: "",
  description: "",
  heroImageUrl: "",
  ctaText: "",
  ctaUrl: "",
  priority: 100,
  status: "draft",
  startsAt: "",
  endsAt: "",
  accentColor: "",
  backgroundColor: "",
  discountIds: [],
};

/** datetime-local <input> values are local-time without a TZ. Convert to ISO. */
function localToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
/** ISO → datetime-local string in the browser's TZ. */
function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function CampaignFormPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEdit = !!editId && editId !== "new";

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [originalHandle, setOriginalHandle] = useState<string>("");
  const [analytics, setAnalytics] = useState<AnalyticsResponse["metrics"] | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Discount picker — search + select existing discounts.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerResults, setPickerResults] = useState<DiscountSummary[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const pickerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [linkedDiscounts, setLinkedDiscounts] = useState<DiscountSummary[]>([]);

  useEffect(() => {
    if (!isEdit) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await apiFetch<AnalyticsResponse>(
          `/admin/campaigns/${editId}/analytics`,
          { signal: ctrl.signal }
        );
        const c = res.campaign;
        setForm({
          handle: c.handle,
          title: c.title,
          headline: c.headline ?? "",
          description: c.description ?? "",
          heroImageUrl: c.heroImageUrl ?? "",
          ctaText: c.ctaText ?? "",
          ctaUrl: c.ctaUrl ?? "",
          priority: c.priority,
          status: c.status,
          startsAt: isoToLocal(c.startsAt),
          endsAt: isoToLocal(c.endsAt),
          accentColor: c.accentColor ?? "",
          backgroundColor: c.backgroundColor ?? "",
          discountIds: (c.discounts ?? []).map((d) => d.id),
        });
        setOriginalHandle(c.handle);
        setLinkedDiscounts(c.discounts ?? []);
        setAnalytics(res.metrics);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast({
            title: "Failed to load campaign",
            description: e.message,
            variant: "destructive",
          });
          navigate("/marketing/campaigns");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [isEdit, editId, navigate]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Auto-derive handle from title when creating (never overrides manual edits).
  function onTitleChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, title: value };
      if (!isEdit && !prev.handle) next.handle = slugify(value);
      return next;
    });
  }

  // Discount picker debounced search.
  const runPickerSearch = useCallback((query: string) => {
    if (pickerDebounce.current) clearTimeout(pickerDebounce.current);
    pickerDebounce.current = setTimeout(async () => {
      setPickerLoading(true);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (query.trim()) params.set("search", query.trim());
        const res = await apiFetch<{ data: DiscountSummary[] }>(
          `/admin/discounts?${params}`
        );
        setPickerResults(res.data ?? []);
      } catch (e: any) {
        toast({
          title: "Failed to search discounts",
          description: e.message,
          variant: "destructive",
        });
        setPickerResults([]);
      } finally {
        setPickerLoading(false);
      }
    }, 250);
  }, []);

  function openPicker() {
    setPickerOpen(true);
    setPickerSearch("");
    runPickerSearch("");
  }

  function attachDiscount(d: DiscountSummary) {
    if (form.discountIds.includes(d.id)) {
      setPickerOpen(false);
      return;
    }
    setForm((prev) => ({ ...prev, discountIds: [...prev.discountIds, d.id] }));
    setLinkedDiscounts((prev) => [...prev, d]);
    setPickerOpen(false);
  }

  function detachDiscount(id: string) {
    setForm((prev) => ({
      ...prev,
      discountIds: prev.discountIds.filter((d) => d !== id),
    }));
    setLinkedDiscounts((prev) => prev.filter((d) => d.id !== id));
  }

  function validate(): string | null {
    if (!form.title.trim()) return "Title is required";
    if (!form.handle.trim()) return "Handle is required";
    if (!/^[a-z0-9][a-z0-9-]*$/.test(form.handle))
      return "Handle must be lowercase letters, digits, and hyphens";
    if (!form.startsAt || !form.endsAt) return "Start and end dates are required";
    const start = new Date(form.startsAt);
    const end = new Date(form.endsAt);
    if (start > end) return "Start date must be on or before end date";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Cannot save", description: err, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        handle: form.handle.trim(),
        title: form.title.trim(),
        headline: form.headline.trim() || undefined,
        description: form.description.trim() || undefined,
        heroImageUrl: form.heroImageUrl.trim() || undefined,
        ctaText: form.ctaText.trim() || undefined,
        ctaUrl: form.ctaUrl.trim() || undefined,
        priority: form.priority,
        status: form.status,
        startsAt: localToIso(form.startsAt),
        endsAt: localToIso(form.endsAt),
        accentColor: form.accentColor.trim() || undefined,
        backgroundColor: form.backgroundColor.trim() || undefined,
        discountIds: form.discountIds,
      };

      if (isEdit) {
        await apiFetch(`/admin/campaigns/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Campaign updated" });
        navigate(`/marketing/campaigns/${editId}`);
      } else {
        const created = await apiFetch<{ id: string }>("/admin/campaigns", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: `Campaign "${form.title}" created` });
        navigate(`/marketing/campaigns/${created.id}`);
      }
    } catch (e: any) {
      toast({
        title: "Failed to save campaign",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!editId) return;
    setArchiving(true);
    try {
      await apiFetch(`/admin/campaigns/${editId}`, { method: "DELETE" });
      toast({ title: "Campaign archived" });
      navigate("/marketing/campaigns");
    } catch (e: any) {
      toast({
        title: "Failed to archive",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
      setArchiveOpen(false);
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
            onClick={() => navigate("/marketing/campaigns")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <PageHeader
            title={isEdit ? form.title || "Campaign" : "New campaign"}
            description={
              isEdit
                ? `Live at /sale/${originalHandle || form.handle}`
                : "Run a scheduled sale event — links automatic discounts under one banner."
            }
          />
        </div>
        <div className="flex items-center gap-2">
          {isEdit && form.status !== "archived" && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setArchiveOpen(true)}
            >
              <Trash2Icon className="size-4 mr-1" /> Archive
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/marketing/campaigns")}
            disabled={saving}
          >
            <XIcon className="size-4 mr-1" /> Cancel
          </Button>
          <Button type="submit" form="campaign-form" disabled={saving}>
            <SaveIcon className="size-4 mr-1" />
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create campaign"}
          </Button>
        </div>
      </div>

      <form
        id="campaign-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField label="Title" htmlFor="title" required>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="11.11 Mega Sale"
                  maxLength={120}
                />
              </FormField>
              <FormField
                label="Handle"
                htmlFor="handle"
                required
                hint="URL slug — used at /sale/{handle}. Lowercase letters, digits, hyphens."
              >
                <Input
                  id="handle"
                  value={form.handle}
                  onChange={(e) => update("handle", e.target.value)}
                  placeholder="1111-mega-sale"
                  maxLength={80}
                />
              </FormField>
              <FormField
                label="Headline"
                htmlFor="headline"
                hint="Short line shown on the homepage banner."
              >
                <Input
                  id="headline"
                  value={form.headline}
                  onChange={(e) => update("headline", e.target.value)}
                  placeholder="Up to 50% off — 2 days only"
                  maxLength={200}
                />
              </FormField>
              <FormField
                label="Description"
                htmlFor="description"
                hint="Longer pitch shown on the /sale landing page."
              >
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="The biggest sale of the year. Heavy discounts on selected pieces."
                  maxLength={2000}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Linked discounts</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={openPicker}>
                <PlusIcon className="size-3.5 mr-1" /> Attach discount
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {linkedDiscounts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No discounts attached yet. Attach one or more existing discounts —
                  customers see the campaign banner and any <strong>automatic</strong>{" "}
                  discounts apply at cart with no code entry.
                </p>
              ) : (
                linkedDiscounts.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <span
                      className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground"
                      aria-hidden
                    >
                      {d.method === "automatic" ? (
                        <ZapIcon className="size-4" />
                      ) : (
                        <TicketIcon className="size-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.type === "percentage"
                          ? `${parseFloat(d.value)}% off`
                          : d.type === "fixed_amount"
                            ? `Fixed ${d.value} off`
                            : "Free shipping"}
                        {" · "}
                        {d.method === "automatic" ? "automatic" : "code"}{" "}
                        {" · "}
                        <StatusBadge status={d.status} />
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive"
                      onClick={() => detachDiscount(d.id)}
                      aria-label={`Detach ${d.title}`}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))
              )}

              {pickerOpen && (
                <div className="mt-4 border rounded-md p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="relative flex-1">
                      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Search discounts by title…"
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
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        Loading…
                      </p>
                    ) : pickerResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        No discounts found. Create one under <strong>Discounts</strong>{" "}
                        first.
                      </p>
                    ) : (
                      pickerResults.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => attachDiscount(d)}
                          className="w-full text-left py-2 px-2 hover:bg-muted/50 flex items-center gap-3 rounded"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{d.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {d.type === "percentage"
                                ? `${parseFloat(d.value)}% off`
                                : d.type === "fixed_amount"
                                  ? `Fixed ${d.value} off`
                                  : "Free shipping"}{" "}
                              · {d.method} · {d.status}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analytics — only in edit mode */}
          {isEdit && analytics && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3Icon className="size-4 text-muted-foreground" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <MetricCell label="Impressions" value={analytics.impressions.toLocaleString()} />
                  <MetricCell label="Clicks" value={analytics.clicks.toLocaleString()} />
                  <MetricCell
                    label="CTR"
                    value={`${(analytics.clickThroughRate * 100).toFixed(1)}%`}
                  />
                  <MetricCell label="Conversions" value={analytics.conversions.toLocaleString()} />
                  <MetricCell
                    label="Conversion rate"
                    value={`${(analytics.conversionRate * 100).toFixed(1)}%`}
                  />
                  <MetricCell label="Revenue" value={formatPrice(analytics.revenue)} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status & schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField label="Status" htmlFor="status">
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    update("status", v as FormState["status"])
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label="Starts at"
                htmlFor="startsAt"
                required
                hint="Local time"
              >
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => update("startsAt", e.target.value)}
                />
              </FormField>
              <FormField label="Ends at" htmlFor="endsAt" required>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => update("endsAt", e.target.value)}
                />
              </FormField>
              <FormField
                label="Priority"
                htmlFor="priority"
                hint="Lower wins if multiple campaigns overlap."
              >
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={1000}
                  value={form.priority}
                  onChange={(e) =>
                    update("priority", Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Banner & CTA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField label="Hero image URL" htmlFor="heroImageUrl">
                <Input
                  id="heroImageUrl"
                  type="url"
                  value={form.heroImageUrl}
                  onChange={(e) => update("heroImageUrl", e.target.value)}
                  placeholder="https://cdn.example.com/banners/1111.jpg"
                />
              </FormField>
              {form.heroImageUrl && (
                <div className="rounded-md overflow-hidden border bg-muted/30 aspect-[2/1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.heroImageUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <FormField label="CTA text" htmlFor="ctaText">
                <Input
                  id="ctaText"
                  value={form.ctaText}
                  onChange={(e) => update("ctaText", e.target.value)}
                  placeholder="Shop the sale"
                  maxLength={40}
                />
              </FormField>
              <FormField
                label="CTA URL"
                htmlFor="ctaUrl"
                hint="Defaults to /sale/{handle} when blank."
              >
                <Input
                  id="ctaUrl"
                  value={form.ctaUrl}
                  onChange={(e) => update("ctaUrl", e.target.value)}
                  placeholder="/sale/1111-mega-sale"
                />
              </FormField>
              <Separator className="my-1" />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Accent color" htmlFor="accentColor" hint="#dc2626">
                  <Input
                    id="accentColor"
                    value={form.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    placeholder="#dc2626"
                  />
                </FormField>
                <FormField
                  label="Background"
                  htmlFor="backgroundColor"
                  hint="#fee2e2"
                >
                  <Input
                    id="backgroundColor"
                    value={form.backgroundColor}
                    onChange={(e) => update("backgroundColor", e.target.value)}
                    placeholder="#fee2e2"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {isEdit && form.status === "active" && (
            <Card className="border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <CardContent className="pt-5 pb-5 text-sm">
                <p className="font-medium text-emerald-900 dark:text-emerald-200">
                  This campaign is live.
                </p>
                <a
                  href={`/sale/${form.handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  View on storefront <ExternalLinkIcon className="size-3" />
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive campaign"
        description={`Archive "${form.title}"? Linked discounts will be unlinked and the banner stops showing immediately.`}
        confirmLabel="Archive"
        variant="destructive"
        loading={archiving}
        onConfirm={handleArchive}
      />
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
