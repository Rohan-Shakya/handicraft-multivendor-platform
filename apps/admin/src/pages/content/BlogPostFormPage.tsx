import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImagePicker, type ImagePickerValue } from "@/components/ImagePicker";
import {
  ArrowLeftIcon,
  SaveIcon,
  XIcon,
  GlobeIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface BlogOption {
  id: string;
  title: string;
}

interface BlogPostForm {
  title: string;
  handle: string;
  body: string;
  excerpt: string;
  isVisible: boolean;
  blogId: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
}

const INITIAL_FORM: BlogPostForm = {
  title: "",
  handle: "",
  body: "",
  excerpt: "",
  isVisible: true,
  blogId: "",
  seoTitle: "",
  seoDescription: "",
  tags: [],
};

function toHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function BlogPostFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";

  const [form, setForm] = useState<BlogPostForm>(INITIAL_FORM);
  const [handleTouched, setHandleTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BlogPostForm, string>>>({});

  // Blog options for selector
  const [blogs, setBlogs] = useState<BlogOption[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(true);

  // Featured image
  const [featuredImage, setFeaturedImage] = useState<ImagePickerValue | null>(null);

  // Tag input
  const [tagInput, setTagInput] = useState("");

  // Author info (read-only, from loaded post)
  const [authorName, setAuthorName] = useState("");

  // Load blogs list
  const loadBlogs = useCallback(async (signal?: AbortSignal) => {
    setBlogsLoading(true);
    try {
      const res = await apiFetch<{ data: BlogOption[]; total: number }>(
        "/admin/blogs?limit=100",
        { signal }
      );
      setBlogs(res.data);
      // Default to first blog if creating new
      if (!isEdit && res.data.length > 0 && !form.blogId) {
        setForm((prev) => ({ ...prev, blogId: res.data[0].id }));
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load blogs",
          description: e.message,
          variant: "destructive",
        });
      }
    } finally {
      setBlogsLoading(false);
    }
  }, [isEdit]);

  // Load post for editing
  const loadPost = useCallback(async (signal?: AbortSignal) => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const p = await apiFetch<any>(`/admin/blog-posts/${id}`, { signal });
      setForm({
        title: p.title ?? "",
        handle: p.handle ?? "",
        body: p.body ?? "",
        excerpt: p.excerpt ?? "",
        isVisible: p.isVisible ?? p.status === "published",
        blogId: p.blogId ?? "",
        seoTitle: p.seoTitle ?? "",
        seoDescription: p.seoDescription ?? "",
        tags: (p.tags ?? []).map((t: any) => (typeof t === "string" ? t : t.name)),
      });
      setHandleTouched(true);

      // Load featured image if present
      if (p.featuredImageFileId) {
        try {
          const file = await apiFetch<any>(`/admin/files/${p.featuredImageFileId}`, { signal });
          setFeaturedImage({
            fileId: file.id,
            url: file.url,
            altText: p.imageAlt ?? file.altText ?? "",
          });
        } catch (err: any) {
          if (err?.name !== "AbortError") {
            // File may have been deleted — still set the ID so we don't lose it
            setFeaturedImage({
              fileId: p.featuredImageFileId,
              url: "",
              altText: p.imageAlt ?? "",
            });
          }
        }
      }

      // Build author display name
      const parts = [p.authorFirstName, p.authorLastName].filter(Boolean);
      setAuthorName(parts.length > 0 ? parts.join(" ") : "");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load post",
          description: e.message,
          variant: "destructive",
        });
        navigate("/content/blogs");
      }
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    loadBlogs(controller.signal);
    loadPost(controller.signal);
    return () => controller.abort();
  }, [loadBlogs, loadPost]);

  function updateField<K extends keyof BlogPostForm>(key: K, value: BlogPostForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !handleTouched) {
        next.handle = toHandle(value as string);
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // Tag management
  function addTag(value: string) {
    const tag = value.trim();
    if (!tag || form.tags.includes(tag)) return;
    updateField("tags", [...form.tags, tag]);
  }

  function removeTag(tag: string) {
    updateField(
      "tags",
      form.tags.filter((t) => t !== tag)
    );
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const parts = tagInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      parts.forEach(addTag);
      setTagInput("");
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof BlogPostForm, string>> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.blogId) errs.blogId = "Blog is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload: any = {
        blogId: form.blogId,
        title: form.title.trim(),
        handle: form.handle.trim() || toHandle(form.title),
        body: form.body,
        excerpt: form.excerpt.trim() || null,
        featuredImageFileId: featuredImage?.fileId || null,
        imageAlt: featuredImage?.altText?.trim() || null,
        isVisible: form.isVisible,
        seoTitle: form.seoTitle.trim() || null,
        seoDescription: form.seoDescription.trim() || null,
        tags: form.tags,
      };

      if (isEdit) {
        await apiFetch(`/admin/blog-posts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Blog post updated" });
      } else {
        await apiFetch("/admin/blog-posts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Blog post created" });
      }
      navigate("/content/blogs");
    } catch (e: any) {
      toast({
        title: "Failed to save blog post",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ── Loading skeleton ──────────────────────────────────────────────────── */

  if (loading || blogsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  /* ── SEO Preview ───────────────────────────────────────────────────────── */

  const seoPreviewTitle = form.seoTitle || form.title || "Page title";
  const seoPreviewDesc =
    form.seoDescription || form.excerpt || "Page description will appear here.";
  const seoPreviewUrl = form.handle
    ? `/blogs/.../posts/${form.handle}`
    : "/blogs/.../posts/...";

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
            onClick={() => navigate("/content/blogs")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? `Edit: ${form.title || "Blog post"}` : "Add blog post"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/content/blogs")}
          >
            Discard
          </Button>
          <Button type="submit" form="post-form" disabled={saving}>
            <SaveIcon className="size-4 mr-1" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <form
        id="post-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* ── Left column ────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
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
                  placeholder="e.g. How to get started with our platform"
                />
              </FormField>

              <FormField label="Content" htmlFor="body">
                <div style={{ minHeight: 400 }}>
                  <RichTextEditor
                    value={form.body}
                    onChange={(html) => updateField("body", html)}
                    placeholder="Write your blog post..."
                  />
                </div>
              </FormField>
            </CardContent>
          </Card>

          {/* Excerpt */}
          <Card className="border shadow-none">
            <CardContent className="p-6 space-y-4">
              <FormField label="Excerpt" htmlFor="excerpt">
                <Textarea
                  id="excerpt"
                  value={form.excerpt}
                  onChange={(e) => updateField("excerpt", e.target.value)}
                  placeholder="Brief summary shown in blog listing and search results..."
                  rows={3}
                  maxLength={500}
                />
                <p
                  className="text-xs text-muted-foreground mt-1"
                  aria-live="polite"
                >
                  {form.excerpt.length}/500
                </p>
              </FormField>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card className="border shadow-none">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <GlobeIcon className="size-4" />
                Search engine listing
              </h2>

              {/* SEO Preview */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 line-clamp-1">
                  {seoPreviewTitle}
                </p>
                <p className="text-xs text-green-700 dark:text-green-500">
                  {seoPreviewUrl}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {seoPreviewDesc}
                </p>
              </div>

              <FormField label="SEO Title" htmlFor="seoTitle">
                <Input
                  id="seoTitle"
                  value={form.seoTitle}
                  onChange={(e) => updateField("seoTitle", e.target.value)}
                  placeholder="Post title for search engines"
                  maxLength={255}
                />
                <p
                  className="text-xs text-muted-foreground mt-1"
                  aria-live="polite"
                >
                  {form.seoTitle.length}/255
                </p>
              </FormField>

              <FormField label="SEO Description" htmlFor="seoDescription">
                <Textarea
                  id="seoDescription"
                  value={form.seoDescription}
                  onChange={(e) =>
                    updateField("seoDescription", e.target.value)
                  }
                  placeholder="Post description for search engines"
                  rows={3}
                  maxLength={320}
                />
                <p
                  className="text-xs text-muted-foreground mt-1"
                  aria-live="polite"
                >
                  {form.seoDescription.length}/320
                </p>
              </FormField>

              <FormField label="URL Handle" htmlFor="handle">
                <Input
                  id="handle"
                  value={form.handle}
                  onChange={(e) => {
                    setHandleTouched(true);
                    updateField("handle", e.target.value);
                  }}
                  placeholder="how-to-get-started"
                />
              </FormField>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column ───────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Visibility */}
          <Card className="border shadow-none">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold" id="visibility-label">Visibility</h2>
              <div className="space-y-3" role="radiogroup" aria-labelledby="visibility-label">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    checked={form.isVisible}
                    onChange={() => updateField("isVisible", true)}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Visible</p>
                    <p className="text-xs text-muted-foreground">
                      Published on your storefront
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!form.isVisible}
                    onChange={() => updateField("isVisible", false)}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Hidden</p>
                    <p className="text-xs text-muted-foreground">
                      Not visible to customers
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card className="border shadow-none">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold">Organization</h2>

              {/* Author */}
              {isEdit && authorName && (
                <FormField label="Author">
                  <p className="text-sm text-muted-foreground">{authorName}</p>
                </FormField>
              )}

              {/* Blog selector */}
              <FormField label="Blog" htmlFor="blogId" error={errors.blogId} required>
                <Select
                  value={form.blogId}
                  onValueChange={(v) => updateField("blogId", v)}
                >
                  <SelectTrigger id="blogId">
                    <SelectValue placeholder="Select a blog" />
                  </SelectTrigger>
                  <SelectContent>
                    {blogs.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Tags */}
              <FormField label="Tags">
                <div className="space-y-2">
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="rounded-full pl-2.5 pr-1 py-0.5 gap-1 text-xs font-normal"
                        >
                          {tag}
                          <button
                            type="button"
                            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                            onClick={() => removeTag(tag)}
                          >
                            <XIcon className="size-3" />
                            <span className="sr-only">Remove {tag}</span>
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Input
                    placeholder="Add tags (press Enter or comma)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => {
                      if (tagInput.trim()) {
                        tagInput
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .forEach(addTag);
                        setTagInput("");
                      }
                    }}
                  />
                </div>
              </FormField>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card className="border shadow-none">
            <CardContent className="p-6">
              <ImagePicker
                label="Featured image"
                value={featuredImage}
                onChange={setFeaturedImage}
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
