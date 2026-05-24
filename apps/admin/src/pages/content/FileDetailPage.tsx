import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeftIcon,
  CopyIcon,
  ExternalLinkIcon,
  TrashIcon,
  FileIcon,
  ImageIcon,
  VideoIcon,
  FileTextIcon,
  MusicIcon,
  InfoIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FileRecord {
  id: string;
  scope: string;
  vendorId: string | null;
  kind: "image" | "video" | "document" | "audio" | "other";
  status: string;
  originalName: string;
  fileName: string;
  mimeType: string | null;
  extension: string | null;
  storageKey: string;
  url: string;
  altText: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function kindIcon(kind: string, className = "size-5 text-muted-foreground") {
  switch (kind) {
    case "image":
      return <ImageIcon className={className} />;
    case "video":
      return <VideoIcon className={className} />;
    case "document":
      return <FileTextIcon className={className} />;
    case "audio":
      return <MusicIcon className={className} />;
    default:
      return <FileIcon className={className} />;
  }
}

function formatBytes(bytes: number | null): string {
  if (bytes == null || bytes === 0) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDisplayName(file: FileRecord): string {
  const name = file.originalName || file.fileName;
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
}

function getExtension(file: FileRecord): string {
  return (file.extension || file.mimeType?.split("/")[1] || file.kind).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/*  FileDetailPage                                                             */
/* -------------------------------------------------------------------------- */

export function FileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editAlt, setEditAlt] = useState("");

  // Preview
  const [imgError, setImgError] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* -- Load ---------------------------------------------------------------- */
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    apiFetch<FileRecord>(`/admin/files/${id}`, { signal: controller.signal })
      .then((f) => {
        setFile(f);
        setEditName(getDisplayName(f));
        setEditAlt(f.altText ?? "");
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          toast({ title: "File not found", description: e.message, variant: "destructive" });
          navigate("/content/files");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  /* -- Save ---------------------------------------------------------------- */
  async function handleSave() {
    if (!file) return;
    setSaving(true);
    try {
      const updated = await apiFetch<FileRecord>(`/admin/files/${file.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          altText: editAlt || null,
          fileName: editName,
        }),
      });
      setFile({ ...file, ...updated });
      toast({ title: "File updated" });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  /* -- Delete -------------------------------------------------------------- */
  async function handleDelete() {
    if (!file) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/files/${file.id}`, { method: "DELETE" });
      toast({ title: "File deleted" });
      navigate("/content/files");
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  /* -- Copy URL ------------------------------------------------------------ */
  function copyUrl() {
    if (!file) return;
    navigator.clipboard.writeText(file.url);
    toast({ title: "URL copied to clipboard" });
  }

  /* -- Loading skeleton ---------------------------------------------------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <Skeleton className="h-[500px] rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!file) return null;

  const isImage = file.kind === "image";
  const isVideo = file.kind === "video";

  /* -- Render -------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="Back to files"
            onClick={() => navigate("/content/files")}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{file.originalName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDelete(true)}
            className="text-destructive hover:text-destructive"
          >
            <TrashIcon className="size-4" />
            Delete
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Main layout: preview + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Preview area */}
        <div className="flex items-center justify-center rounded-lg border bg-muted/30 min-h-[400px] overflow-hidden">
          {isImage && file.url && !imgError ? (
            <img
              src={file.url}
              alt={file.altText ?? file.originalName}
              className="max-w-full max-h-[600px] object-contain"
              onError={() => setImgError(true)}
            />
          ) : isVideo && file.url ? (
            <video
              src={file.url}
              controls
              className="max-w-full max-h-[600px]"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              {kindIcon(file.kind, "size-16 text-muted-foreground/50")}
              <p className="text-sm font-medium">{getExtension(file)} file</p>
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLinkIcon className="size-4" />
                  Open file
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Information */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <InfoIcon className="size-4" />
                Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="file-name" className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="file-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Alt text */}
              <div>
                <Label htmlFor="file-alt" className="text-xs text-muted-foreground">
                  Alt text
                </Label>
                <Input
                  id="file-alt"
                  value={editAlt}
                  onChange={(e) => setEditAlt(e.target.value)}
                  placeholder="Describe this file for accessibility..."
                  className="mt-1"
                />
              </div>

              {/* Details */}
              <div>
                <Label className="text-xs text-muted-foreground">Details</Label>
                <div className="mt-1 text-sm text-foreground">
                  <p>
                    {getExtension(file)}
                    {file.width && file.height ? ` \u2022 ${file.width} \u00d7 ${file.height}` : ""}
                    {file.sizeBytes ? ` \u2022 ${formatBytes(file.sizeBytes)}` : ""}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Added {formatDate(file.createdAt)}
                  </p>
                </div>
              </div>

              {/* MIME type */}
              {file.mimeType && (
                <div>
                  <Label className="text-xs text-muted-foreground">MIME type</Label>
                  <p className="text-sm font-mono mt-1">{file.mimeType}</p>
                </div>
              )}

              {/* Scope */}
              <div>
                <Label className="text-xs text-muted-foreground">Scope</Label>
                <p className="text-sm mt-1 capitalize">{file.scope}</p>
              </div>
            </CardContent>
          </Card>

          {/* URL */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">File URL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="text-xs text-muted-foreground truncate flex-1 bg-muted px-2 py-1.5 rounded">
                  {file.url}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={copyUrl}
                  aria-label="Copy file URL"
                >
                  <CopyIcon className="size-3.5" />
                </Button>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Open file in new tab">
                    <ExternalLinkIcon className="size-3.5" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete file"
        description={`Are you sure you want to delete "${file.originalName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
