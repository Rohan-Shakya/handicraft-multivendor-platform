import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  ArrowLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  GlobeIcon,
  TrashIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface PageRecord {
  id: string;
  title: string;
  handle: string;
  body: string | null;
  status: string;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  seoCanonicalUrl: string | null;
  ogImageFileId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PageForm {
  title: string;
  handle: string;
  body: string;
  isVisible: boolean;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoCanonicalUrl: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* -------------------------------------------------------------------------- */
/*  PageFormPage                                                               */
/* -------------------------------------------------------------------------- */

export function PageFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";

  const [form, setForm] = useState<PageForm>({
    title: "",
    handle: "",
    body: "",
    isVisible: false,
    publishedAt: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    seoCanonicalUrl: "",
  });
  const [handleTouched, setHandleTouched] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PageForm, string>>>({});

  // SEO editing
  const [showSeoEdit, setShowSeoEdit] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Navigation
  const [siblings, setSiblings] = useState<{ prev: string | null; next: string | null }>({
    prev: null,
    next: null,
  });

  /* -- Load ---------------------------------------------------------------- */
  const loadPage = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const p = await apiFetch<PageRecord>(`/admin/pages/${id}`, { signal });
      setForm({
        title: p.title ?? "",
        handle: p.handle ?? "",
        body: p.body ?? "",
        isVisible: p.status === "published",
        publishedAt: p.publishedAt ?? "",
        seoTitle: p.seoTitle ?? "",
        seoDescription: p.seoDescription ?? "",
        seoKeywords: p.seoKeywords ?? "",
        seoCanonicalUrl: p.seoCanonicalUrl ?? "",
      });
      setHandleTouched(true);

      // Load siblings for prev/next navigation
      try {
        const list = await apiFetch<{ data: { id: string }[] }>(
          "/admin/pages?limit=100",
          { signal }
        );
        const ids = list.data.map((pg) => pg.id);
        const idx = ids.indexOf(p.id);
        setSiblings({
          prev: idx > 0 ? ids[idx - 1] : null,
          next: idx < ids.length - 1 ? ids[idx + 1] : null,
        });
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          // Non-critical
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load page",
          description: e.message,
          variant: "destructive",
        });
        navigate("/content/pages");
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isEdit) {
      const controller = new AbortController();
      loadPage(controller.signal);
      return () => controller.abort();
    }
  }, [isEdit, loadPage]);

  /* -- Update field -------------------------------------------------------- */
  function updateField<K extends keyof PageForm>(key: K, value: PageForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !handleTouched) {
        next.handle = toHandle(value as string);
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  /* -- Validate ------------------------------------------------------------ */
  function validate(): boolean {
    const errs: Partial<Record<keyof PageForm, string>> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.handle.trim()) errs.handle = "Handle is required";
    else if (!/^[a-z0-9-]+$/.test(form.handle))
      errs.handle = "Lowercase letters, numbers, and dashes only";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* -- Save ---------------------------------------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        handle: form.handle.trim() || toHandle(form.title),
        body: form.body || null,
        isVisible: form.isVisible,
        publishedAt: form.publishedAt || null,
        seoTitle: form.seoTitle.trim() || null,
        seoDescription: form.seoDescription.trim() || null,
        seoKeywords: form.seoKeywords.trim() || null,
        seoCanonicalUrl: form.seoCanonicalUrl.trim() || null,
      };

      if (isEdit) {
        await apiFetch(`/admin/pages/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Page updated" });
      } else {
        await apiFetch("/admin/pages", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Page created" });
        navigate("/content/pages");
      }
    } catch (e: any) {
      toast({
        title: "Failed to save page",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* -- Delete -------------------------------------------------------------- */
  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/pages/${id}`, { method: "DELETE" });
      toast({ title: "Page deleted" });
      navigate("/content/pages");
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  /* -- SEO preview values ------------------------------------------------- */
  const seoPreviewTitle = form.seoTitle || form.title || "Page title";
  const seoPreviewHandle = form.handle || "page-handle";
  const seoPreviewDescription =
    form.seoDescription || "Page description will appear here...";

  /* -- Loading skeleton ---------------------------------------------------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-96 rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  /* -- Render -------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => navigate("/content/pages")}
            aria-label="Back to pages"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            {isEdit ? form.title || "Edit page" : "Add page"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDelete(true)}
                className="text-destructive hover:text-destructive"
              >
                <TrashIcon className="size-4" />
                Delete
              </Button>
              {/* Prev / Next navigation */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-r-none"
                  disabled={!siblings.prev}
                  onClick={() =>
                    siblings.prev &&
                    navigate(`/content/pages/${siblings.prev}`)
                  }
                  aria-label="Previous page"
                >
                  <ChevronUpIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-l-none border-l"
                  disabled={!siblings.next}
                  onClick={() =>
                    siblings.next &&
                    navigate(`/content/pages/${siblings.next}`)
                  }
                  aria-label="Next page"
                >
                  <ChevronDownIcon className="size-4" />
                </Button>
              </div>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/content/pages")}
          >
            Discard
          </Button>
          <Button size="sm" type="submit" form="page-form" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────── */}
      <form
        id="page-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6"
      >
        {/* ── Left column ───────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Title + Content */}
          <Card className="shadow-none">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. About us"
                  className="mt-1.5"
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Content</Label>
                <div className="mt-1.5" style={{ minHeight: 400 }}>
                  <RichTextEditor
                    value={form.body}
                    onChange={(html) => updateField("body", html)}
                    placeholder="Write your page content..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEO Preview */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Search engine listing
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setShowSeoEdit(!showSeoEdit)}
                  aria-label="Edit SEO"
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Preview */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-700 truncate">
                  {seoPreviewTitle}
                </p>
                <p className="text-xs text-green-700 truncate">
                  /pages/{seoPreviewHandle}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {seoPreviewDescription}
                </p>
              </div>

              {/* Editable fields */}
              {showSeoEdit && (
                <div className="space-y-3 pt-3 border-t">
                  <div>
                    <Label htmlFor="seoTitle" className="text-xs text-muted-foreground">
                      SEO title
                    </Label>
                    <Input
                      id="seoTitle"
                      value={form.seoTitle}
                      onChange={(e) => updateField("seoTitle", e.target.value)}
                      placeholder={form.title || "Page title"}
                      className="mt-1"
                    />
                    <p aria-live="polite" className="text-xs text-muted-foreground mt-1">
                      {form.seoTitle.length}/70 characters
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="seoDescription" className="text-xs text-muted-foreground">
                      SEO description
                    </Label>
                    <Textarea
                      id="seoDescription"
                      value={form.seoDescription}
                      onChange={(e) =>
                        updateField("seoDescription", e.target.value)
                      }
                      placeholder="Page description for search engines"
                      className="mt-1"
                      rows={3}
                    />
                    <p aria-live="polite" className="text-xs text-muted-foreground mt-1">
                      {form.seoDescription.length}/320 characters
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="seoKeywords"
                      className="text-xs text-muted-foreground"
                    >
                      Keywords
                    </Label>
                    <Input
                      id="seoKeywords"
                      value={form.seoKeywords}
                      onChange={(e) => updateField("seoKeywords", e.target.value)}
                      placeholder="handicrafts, bronze buddha statue, kathmandu"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated. Used by some search engines and internal
                      site search.
                    </p>
                  </div>
                  <div>
                    <Label
                      htmlFor="seoCanonicalUrl"
                      className="text-xs text-muted-foreground"
                    >
                      Canonical URL
                    </Label>
                    <Input
                      id="seoCanonicalUrl"
                      type="url"
                      value={form.seoCanonicalUrl}
                      onChange={(e) =>
                        updateField("seoCanonicalUrl", e.target.value)
                      }
                      placeholder="https://himalayan-crafts.com/pages/about"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to use this page&rsquo;s URL as canonical.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="handle" className="text-xs text-muted-foreground">
                      URL handle
                    </Label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        /pages/
                      </span>
                      <Input
                        id="handle"
                        value={form.handle}
                        onChange={(e) => {
                          setHandleTouched(true);
                          updateField("handle", e.target.value.toLowerCase());
                        }}
                        placeholder="page-handle"
                        className="flex-1"
                      />
                    </div>
                    {errors.handle && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.handle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column (sidebar) ────────────────────────────────── */}
        <div className="space-y-4">
          {/* Visibility */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <fieldset className="space-y-2">
                <legend className="sr-only">Page visibility</legend>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    checked={form.isVisible}
                    onChange={() => {
                      updateField("isVisible", true);
                      if (!form.publishedAt) {
                        updateField("publishedAt", new Date().toISOString());
                      }
                    }}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium">Visible</span>
                    {form.isVisible && form.publishedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        As of {formatDateTime(form.publishedAt)}
                      </p>
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!form.isVisible}
                    onChange={() => updateField("isVisible", false)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm font-medium">Hidden</span>
                </label>
              </fieldset>
            </CardContent>
          </Card>

          {/* Page info (edit mode only) */}
          {isEdit && (
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GlobeIcon className="size-4" />
                  Online store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  /pages/{form.handle}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </form>

      {/* ── Delete confirmation ────────────────────────────────────── */}
      {isEdit && (
        <ConfirmDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          title="Delete page"
          description={`Are you sure you want to delete "${form.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          loading={deleting}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
