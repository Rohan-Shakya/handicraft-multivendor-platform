import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftIcon, SaveIcon } from "lucide-react";

interface BlogForm {
  title: string;
  handle: string;
  description: string;
  status: string;
  commentStatus: string;
  seoTitle: string;
  seoDescription: string;
}

const INITIAL_FORM: BlogForm = {
  title: "",
  handle: "",
  description: "",
  status: "draft",
  commentStatus: "enabled",
  seoTitle: "",
  seoDescription: "",
};

function toHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BlogFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";

  const [form, setForm] = useState<BlogForm>(INITIAL_FORM);
  const [handleTouched, setHandleTouched] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof BlogForm, string>>
  >({});

  const backPath = "/content/blogs/manage";

  useEffect(() => {
    if (isEdit) {
      const controller = new AbortController();
      loadBlog(controller.signal);
      return () => controller.abort();
    }
  }, [id]);

  async function loadBlog(signal?: AbortSignal) {
    setLoading(true);
    try {
      const b = await apiFetch<any>(`/admin/blogs/${id}`, { signal });
      setForm({
        title: b.title ?? "",
        handle: b.handle ?? "",
        description: b.description ?? "",
        status: b.status ?? "draft",
        commentStatus: b.commentStatus ?? "enabled",
        seoTitle: b.seoTitle ?? "",
        seoDescription: b.seoDescription ?? "",
      });
      setHandleTouched(true);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load blog",
          description: e.message,
          variant: "destructive",
        });
        navigate(backPath);
      }
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof BlogForm>(key: K, value: BlogForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !handleTouched) {
        next.handle = toHandle(value as string);
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof BlogForm, string>> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const body: any = {
        title: form.title.trim(),
        handle: form.handle.trim() || toHandle(form.title),
        description: form.description.trim() || null,
        status: form.status,
        commentStatus: form.commentStatus,
        seoTitle: form.seoTitle.trim() || null,
        seoDescription: form.seoDescription.trim() || null,
      };

      if (isEdit) {
        await apiFetch(`/admin/blogs/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Blog updated" });
      } else {
        await apiFetch("/admin/blogs", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Blog created" });
      }
      navigate(backPath);
    } catch (e: any) {
      toast({
        title: "Failed to save blog",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Back to blogs"
            onClick={() => navigate(backPath)}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? `Edit: ${form.title}` : "Add blog"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(backPath)}
          >
            Discard
          </Button>
          <Button type="submit" form="blog-form" disabled={saving}>
            <SaveIcon className="size-4 mr-1" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <form
        id="blog-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border shadow-none">
            <CardContent className="p-6 space-y-4">
              <FormField
                label="Title"
                htmlFor="title"
                error={errors.title}
                required
              >
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. News"
                />
              </FormField>

              <FormField label="Description" htmlFor="description">
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Optional blog description..."
                  rows={4}
                />
              </FormField>

              <FormField label="Comment Status" htmlFor="commentStatus">
                <Select
                  value={form.commentStatus}
                  onValueChange={(v) => updateField("commentStatus", v)}
                >
                  <SelectTrigger id="commentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="moderated">Moderated</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="border shadow-none">
            <CardContent className="p-6 space-y-4">
              <FormField label="Status" htmlFor="status">
                <Select
                  value={form.status}
                  onValueChange={(v) => updateField("status", v)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Handle" htmlFor="handle">
                <Input
                  id="handle"
                  value={form.handle}
                  onChange={(e) => {
                    setHandleTouched(true);
                    updateField("handle", e.target.value);
                  }}
                  placeholder="news"
                />
              </FormField>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold">SEO</h2>
              <FormField label="SEO Title" htmlFor="seoTitle">
                <Input
                  id="seoTitle"
                  value={form.seoTitle}
                  onChange={(e) => updateField("seoTitle", e.target.value)}
                  placeholder="Blog title for search engines"
                />
              </FormField>

              <FormField label="SEO Description" htmlFor="seoDescription">
                <Input
                  id="seoDescription"
                  value={form.seoDescription}
                  onChange={(e) =>
                    updateField("seoDescription", e.target.value)
                  }
                  placeholder="Blog description for search engines"
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
