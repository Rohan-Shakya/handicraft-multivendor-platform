import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileIcon,
  ImageIcon,
  VideoIcon,
  FileTextIcon,
  MusicIcon,
  UploadIcon,
  TrashIcon,
  MoreHorizontalIcon,
  SearchIcon,
  CopyIcon,
  ExternalLinkIcon,
  XIcon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
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
}

interface PaginatedFiles {
  data: FileRecord[];
  total: number;
  page: number;
  limit: number;
}

type FileKind = "all" | "image" | "video" | "document" | "audio" | "other";

interface UploadItem {
  id: string;
  file: File;
  status: "uploading" | "success" | "error";
  error?: string;
  result?: FileRecord;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const KIND_OPTIONS: { value: FileKind; label: string }[] = [
  { value: "all", label: "All files" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
  { value: "audio", label: "Audio" },
  { value: "other", label: "Other" },
];

function kindIcon(kind: string, className = "size-4 text-muted-foreground") {
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

function fileKindFromMime(mime: string): FileRecord["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime.startsWith("text/") ||
    mime.includes("pdf") ||
    mime.includes("document") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation")
  )
    return "document";
  return "other";
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
    month: "short",
    day: "numeric",
  });
}

let uploadIdCounter = 0;
function nextUploadId() {
  return `upload-${++uploadIdCounter}-${Date.now()}`;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const LIMIT = 20;

/* -------------------------------------------------------------------------- */
/*  FileListPage                                                               */
/* -------------------------------------------------------------------------- */

export function FileListPage() {
  /* -- List state --------------------------------------------------------- */
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<FileKind>("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const navigate = useNavigate();

  /* -- Delete ------------------------------------------------------------- */
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* -- Upload ------------------------------------------------------------- */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDraggingPage, setIsDraggingPage] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const dragCounter = useRef(0);
  const handleFilesRef = useRef<(files: File[]) => void>(() => {});

  /* -- Debounce search ---------------------------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  /* -- Fetch -------------------------------------------------------------- */
  const load = useCallback(
    async (p = page, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(LIMIT),
        });
        if (kindFilter !== "all") params.set("kind", kindFilter);
        if (searchDebounced) params.set("search", searchDebounced);

        const res = await apiFetch<PaginatedFiles>(
          `/admin/files?${params.toString()}`,
          { signal }
        );
        setFiles(res.data);
        setTotal(res.total);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast({
            title: "Failed to load files",
            description: e.message,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [page, kindFilter, searchDebounced]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(page, controller.signal);
    return () => controller.abort();
  }, [page, kindFilter, searchDebounced]);

  /* -- Page-level drag events (show full-page overlay) -------------------- */
  useEffect(() => {
    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDraggingPage(true);
      }
    }
    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDraggingPage(false);
      }
    }
    function handleDragOver(e: DragEvent) {
      e.preventDefault();
    }
    function handleDrop(e: DragEvent) {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDraggingPage(false);
      if (e.dataTransfer?.files.length) {
        handleFilesRef.current(Array.from(e.dataTransfer.files));
      }
    }

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  /* -- Upload a single file (presigned → R2 direct, then confirm) ---------- */
  async function uploadSingleFile(item: UploadItem) {
    try {
      // Step 1: Get presigned URL from API
      const presignRes = await apiFetch<{
        file: FileRecord;
        uploadUrl: string;
      }>("/admin/files/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: item.file.name,
          contentType: item.file.type || "application/octet-stream",
        }),
      });

      // Step 2: Upload directly to R2 via presigned URL
      const uploadRes = await fetch(presignRes.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": item.file.type || "application/octet-stream" },
        body: item.file,
      });

      if (!uploadRes.ok) {
        throw new Error(`R2 upload failed: ${uploadRes.status}`);
      }

      // Step 3: Confirm upload with metadata
      const confirmData: Record<string, number> = { sizeBytes: item.file.size };

      // Extract image dimensions if it's an image
      if (item.file.type.startsWith("image/")) {
        try {
          const dims = await getImageDimensions(item.file);
          confirmData.width = dims.width;
          confirmData.height = dims.height;
        } catch {
          // Non-critical — skip dimensions
        }
      }

      await apiFetch(`/admin/files/${presignRes.file.id}/confirm`, {
        method: "POST",
        body: JSON.stringify(confirmData),
      });

      const fileRecord = { ...presignRes.file, sizeBytes: item.file.size };

      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: "success", result: fileRecord } : u
        )
      );

      return fileRecord;
    } catch (e: any) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, status: "error", error: e.message }
            : u
        )
      );
      toast({
        title: `Failed to upload ${item.file.name}`,
        description: e.message,
        variant: "destructive",
      });
      return null;
    }
  }

  function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error("Failed to load image"));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /* -- Handle file selection ---------------------------------------------- */
  function handleFiles(fileList: File[]) {
    if (fileList.length === 0) return;

    const newItems: UploadItem[] = fileList.map((file) => ({
      id: nextUploadId(),
      file,
      status: "uploading" as const,
    }));

    setUploads((prev) => [...newItems, ...prev]);
    setShowDropZone(false);

    // Upload all files concurrently
    const uploadPromises = newItems.map((item) => uploadSingleFile(item));

    // When all finish, reload the file list
    Promise.allSettled(uploadPromises).then((results) => {
      const anySuccess = results.some(
        (r) => r.status === "fulfilled" && r.value !== null
      );
      if (anySuccess) {
        load(1);
        setPage(1);
      }
    });
  }

  handleFilesRef.current = handleFiles;

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      handleFiles(Array.from(e.target.files));
    }
    // Reset so the same file can be selected again
    e.target.value = "";
  }

  function dismissUpload(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  function clearCompletedUploads() {
    setUploads((prev) => prev.filter((u) => u.status === "uploading"));
  }

  const hasCompletedUploads = uploads.some((u) => u.status !== "uploading");
  const activeUploads = uploads.filter((u) => u.status === "uploading");

  /* -- Delete handler ----------------------------------------------------- */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/files/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast({ title: "File deleted" });
      setDeleteTarget(null);
      load(page);
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

  /* -- Copy URL helper ---------------------------------------------------- */
  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied to clipboard" });
  }

  /* -- Drop zone helpers -------------------------------------------------- */
  function handleDropZoneDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDropZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowDropZone(false);
    if (e.dataTransfer.files.length) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }

  /* -- Render ------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Full-page drag overlay */}
      {isDraggingPage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current = 0;
            setIsDraggingPage(false);
            if (e.dataTransfer.files.length) {
              handleFiles(Array.from(e.dataTransfer.files));
            }
          }}
        >
          <div className="pointer-events-none flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <UploadIcon className="size-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                Drop files to upload
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Images, videos, documents, and more
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Files"
        description="Manage files and media assets."
        action={
          <Button onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="size-4" /> Upload files
          </Button>
        }
      />

      {/* Inline Drop Zone (toggle with button or always subtle) */}
      {showDropZone && (
        <Card
          className="relative border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDropZoneDragOver}
          onDrop={handleDropZoneDrop}
        >
          <button
            className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowDropZone(false);
            }}
          >
            <XIcon className="size-4" />
          </button>
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <UploadIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop files here to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse -- accepts images, videos, documents
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Upload progress panel */}
      {uploads.length > 0 && (
        <Card className="overflow-hidden border shadow-none">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              {activeUploads.length > 0 ? (
                <>
                  <Loader2Icon className="size-4 text-primary animate-spin" />
                  <span className="text-sm font-medium">
                    Uploading {activeUploads.length} file
                    {activeUploads.length !== 1 ? "s" : ""}...
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="size-4 text-green-600" />
                  <span className="text-sm font-medium">
                    Upload complete
                  </span>
                </>
              )}
            </div>
            {hasCompletedUploads && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearCompletedUploads}
              >
                {activeUploads.length === 0 ? "Dismiss all" : "Clear completed"}
              </Button>
            )}
          </div>
          <div className="divide-y max-h-60 overflow-y-auto">
            {uploads.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                {/* File icon / thumbnail */}
                <div className="flex size-8 items-center justify-center rounded border bg-muted/50 overflow-hidden shrink-0">
                  {item.file.type.startsWith("image/") ? (
                    <ImageIcon className="size-4 text-muted-foreground" />
                  ) : (
                    kindIcon(
                      fileKindFromMime(item.file.type),
                      "size-4 text-muted-foreground"
                    )
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(item.file.size)}
                  </p>
                </div>

                {/* Status */}
                <div className="shrink-0 flex items-center gap-2">
                  {item.status === "uploading" && (
                    <Loader2Icon className="size-4 text-primary animate-spin" />
                  )}
                  {item.status === "success" && (
                    <CheckCircle2Icon className="size-4 text-green-600" />
                  )}
                  {item.status === "error" && (
                    <div className="flex items-center gap-1.5">
                      <AlertCircleIcon className="size-4 text-destructive" />
                      <span className="text-xs text-destructive max-w-[120px] truncate">
                        {item.error ?? "Failed"}
                      </span>
                    </div>
                  )}
                  {item.status !== "uploading" && (
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => dismissUpload(item.id)}
                      aria-label={`Dismiss ${item.file.name}`}
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search files"
          />
        </div>
        <Select
          value={kindFilter}
          onValueChange={(v) => {
            setKindFilter(v as FileKind);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]" size="default" aria-label="Filter by file type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="size-10 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            icon={FileIcon}
            title="No files yet"
            description="Upload your first file to get started."
            action={
              <Button onClick={() => fileInputRef.current?.click()}>
                <UploadIcon className="size-4" /> Upload files
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-12" />
                  <TableHead className="font-semibold">File name</TableHead>
                  <TableHead className="font-semibold">Alt text</TableHead>
                  <TableHead className="font-semibold">Date added</TableHead>
                  <TableHead className="font-semibold">Size</TableHead>
                  <TableHead className="font-semibold">References</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow
                    key={f.id}
                    className="group cursor-pointer"
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/content/files/${f.id}`);
                      }
                    }}
                    onClick={() => navigate(`/content/files/${f.id}`)}
                  >
                    {/* Thumbnail */}
                    <TableCell className="w-12 pr-0">
                      <div className="flex size-10 items-center justify-center rounded border bg-muted/50 overflow-hidden">
                        {f.kind === "image" && f.url ? (
                          <img
                            src={f.url}
                            alt={f.altText ?? f.originalName}
                            className="size-10 object-cover"
                            loading="lazy"
                          />
                        ) : (
                          kindIcon(f.kind, "size-5 text-muted-foreground")
                        )}
                      </div>
                    </TableCell>

                    {/* File name + type */}
                    <TableCell>
                      <div className="font-medium text-sm truncate max-w-[240px]">
                        {f.originalName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {f.mimeType ?? f.extension ?? f.kind}
                      </div>
                    </TableCell>

                    {/* Alt text */}
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                      {f.altText || "--"}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(f.createdAt)}
                    </TableCell>

                    {/* Size */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatBytes(f.sizeBytes)}
                    </TableCell>

                    {/* References */}
                    <TableCell className="text-sm text-muted-foreground">
                      --
                    </TableCell>

                    {/* Actions */}
                    <TableCell
                      className="w-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="File actions"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/content/files/${f.id}`)}
                          >
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyUrl(f.url)}>
                            <CopyIcon className="size-4 mr-2" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(f)}
                          >
                            <TrashIcon className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              total={total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* -- Delete Confirmation ------------------------------------------- */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete file"
        description={`Are you sure you want to delete "${deleteTarget?.fileName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
