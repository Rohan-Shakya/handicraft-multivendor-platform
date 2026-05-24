import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ImageIcon,
  UploadIcon,
  XIcon,
  Loader2Icon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FileRecord {
  id: string;
  url: string;
  fileName: string;
  originalName: string;
  altText: string | null;
  mimeType: string | null;
  kind: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
}

export interface ImagePickerValue {
  fileId: string;
  url: string;
  altText: string;
}

interface ImagePickerProps {
  value: ImagePickerValue | null;
  onChange: (value: ImagePickerValue | null) => void;
  label?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
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

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function ImagePicker({ value, onChange, label }: ImagePickerProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* -- Upload via presigned URL ------------------------------------------- */

  async function uploadFile(file: File): Promise<ImagePickerValue | null> {
    setUploading(true);
    try {
      // Step 1: Get presigned URL
      const presignRes = await apiFetch<{
        file: FileRecord;
        uploadUrl: string;
      }>("/admin/files/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      // Step 2: Upload directly to R2
      const uploadRes = await fetch(presignRes.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status}`);
      }

      // Step 3: Confirm with metadata
      const confirmData: Record<string, number> = { sizeBytes: file.size };
      if (file.type.startsWith("image/")) {
        try {
          const dims = await getImageDimensions(file);
          confirmData.width = dims.width;
          confirmData.height = dims.height;
        } catch {
          // Non-critical
        }
      }

      await apiFetch(`/admin/files/${presignRes.file.id}/confirm`, {
        method: "POST",
        body: JSON.stringify(confirmData),
      });

      return {
        fileId: presignRes.file.id,
        url: presignRes.file.url,
        altText: "",
      };
    } catch (e: any) {
      toast({
        title: "Failed to upload image",
        description: e.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  }

  /* -- Handlers ----------------------------------------------------------- */

  async function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }
    // Guard against oversize uploads BEFORE spending a presigned URL on them.
    // The API enforces 10MB — mirror that limit here for immediate feedback.
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast({
        title: "File too large",
        description: `Max size is ${Math.round(MAX_BYTES / (1024 * 1024))}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
        variant: "destructive",
      });
      return;
    }
    const result = await uploadFile(file);
    if (result) onChange(result);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleRemove() {
    onChange(null);
  }

  function handleAltTextChange(alt: string) {
    if (value) {
      onChange({ ...value, altText: alt });
    }
  }

  /* -- Render ------------------------------------------------------------- */

  // Has image selected
  if (value && value.url) {
    return (
      <div className="space-y-3">
        {label && (
          <p className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="size-4" />
            {label}
          </p>
        )}
        <div className="relative group rounded-lg border overflow-hidden bg-muted/30">
          <img
            src={value.url}
            alt={value.altText || "Featured image"}
            className="w-full max-h-56 object-contain"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setBrowseOpen(true)}
            >
              Change
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemove}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Alt text */}
        <div className="space-y-1">
          <label
            htmlFor="image-alt-text"
            className="text-xs font-medium text-muted-foreground"
          >
            Alt text
          </label>
          <Input
            id="image-alt-text"
            value={value.altText}
            onChange={(e) => handleAltTextChange(e.target.value)}
            placeholder="Describe the image for accessibility"
            className="text-sm"
          />
        </div>

        {/* Browse dialog */}
        <BrowseFilesDialog
          open={browseOpen}
          onOpenChange={setBrowseOpen}
          onSelect={(file) => {
            onChange({
              fileId: file.id,
              url: file.url,
              altText: file.altText || value.altText || "",
            });
            setBrowseOpen(false);
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // Empty state — drop zone
  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="size-4" />
          {label}
        </p>
      )}

      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploading && "pointer-events-none opacity-60"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload featured image"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2Icon className="size-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <UploadIcon className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Drop image here or{" "}
                <span className="text-primary underline underline-offset-2">
                  click to upload
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP, GIF up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Browse existing files */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setBrowseOpen(true)}
      >
        <SearchIcon className="size-3.5 mr-1.5" />
        Select from existing files
      </Button>

      <BrowseFilesDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        onSelect={(file) => {
          onChange({
            fileId: file.id,
            url: file.url,
            altText: file.altText || "",
          });
          setBrowseOpen(false);
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Browse Files Dialog                                                        */
/* -------------------------------------------------------------------------- */

interface BrowseFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: FileRecord) => void;
}

function BrowseFilesDialog({
  open,
  onOpenChange,
  onSelect,
}: BrowseFilesDialogProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FileRecord | null>(null);

  const LIMIT = 18;

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("kind", "image");
      params.set("status", "active");
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (search.trim()) params.set("search", search.trim());

      const res = await apiFetch<{
        data: FileRecord[];
        total: number;
      }>(`/admin/files?${params}`);
      setFiles(res.data);
      setTotal(res.total);
    } catch (e: any) {
      toast({
        title: "Failed to load files",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open, loadFiles]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSelected(null);
      setPage(1);
      setSearch("");
    }
  }, [open]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Also reset searchInput when dialog opens
  useEffect(() => {
    if (open) setSearchInput("");
  }, [open]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select image</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No images match your search."
                  : "No images uploaded yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className={cn(
                    "relative aspect-square rounded-lg border-2 overflow-hidden bg-muted/50 transition-all hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary",
                    selected?.id === file.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent"
                  )}
                  onClick={() => setSelected(file)}
                  onDoubleClick={() => onSelect(file)}
                  title={file.originalName}
                >
                  <img
                    src={file.url}
                    alt={file.altText || file.fileName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {selected?.id === file.id && (
                    <div className="absolute top-1.5 left-1.5 size-5 rounded-full bg-primary flex items-center justify-center">
                      <svg
                        className="size-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
            <span>
              {total} image{total !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span>
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Selected file info + actions */}
        <DialogFooter className="flex-row items-center gap-3 sm:justify-between">
          <div className="flex-1 min-w-0">
            {selected && (
              <p className="text-sm text-muted-foreground truncate">
                {selected.originalName}
                {selected.sizeBytes
                  ? ` (${formatFileSize(selected.sizeBytes)})`
                  : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!selected}
              onClick={() => selected && onSelect(selected)}
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
