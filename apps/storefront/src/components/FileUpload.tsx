"use client";

import { ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // mirrors API limit

type Scope = "vendor" | "admin";

interface FileUploadValue {
  fileId: string;
  url: string;
}

interface FileUploadProps {
  /** Current uploaded file (controlled). */
  value?: FileUploadValue | null;
  /** Called with the uploaded file metadata, or null when cleared. */
  onChange: (value: FileUploadValue | null) => void;
  /** Visible label above the dropzone. */
  label?: string;
  /** Helper text under the dropzone. */
  hint?: string;
  /** Aspect ratio for the preview area: 'square' (1:1) or 'banner' (3:1). */
  aspect?: "square" | "banner";
  /** Which presigned-upload endpoint to use. */
  scope?: Scope;
  /** Accepted MIME prefix or comma-separated list for the input. */
  accept?: string;
  /** Max file size in bytes. Defaults to 10MB to match API limit. */
  maxBytes?: number;
  /** Disable interaction (e.g. while a parent form is submitting). */
  disabled?: boolean;
  /** Visible name on the field, used for screen readers when label is omitted. */
  name?: string;
  className?: string;
}

interface PresignResponse {
  file: { id: string; url: string };
  uploadUrl: string;
}

const ASPECT_CLASSES = {
  square: "aspect-square",
  banner: "aspect-[3/1]",
} as const;

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}

export function FileUpload({
  value,
  onChange,
  label,
  hint,
  aspect = "square",
  scope = "vendor",
  accept = "image/*",
  maxBytes = DEFAULT_MAX_BYTES,
  disabled = false,
  name,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();

  const fieldLabel = label ?? name ?? "Upload";

  function reset() {
    setUploading(false);
    setProgress(0);
  }

  async function uploadWithProgress(uploadUrl: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream"
      );
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });
  }

  async function handleFile(file: File) {
    if (disabled || uploading) return;

    if (accept.startsWith("image/") && !file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please choose an image (PNG, JPG, WEBP).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxBytes) {
      toast({
        title: "File too large",
        description: `Max size is ${Math.round(maxBytes / (1024 * 1024))}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const presign = await apiFetch<PresignResponse>(
        `/${scope}/files/presign`,
        {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
          }),
        }
      );

      await uploadWithProgress(presign.uploadUrl, file);

      const confirmBody: Record<string, number> = { sizeBytes: file.size };
      if (file.type.startsWith("image/")) {
        try {
          const dims = await getImageDimensions(file);
          confirmBody.width = dims.width;
          confirmBody.height = dims.height;
        } catch {
          // dimension read is best-effort
        }
      }

      await apiFetch(`/${scope}/files/${presign.file.id}/confirm`, {
        method: "POST",
        body: JSON.stringify(confirmBody),
      });

      onChange({ fileId: presign.file.id, url: presign.file.url });
      toast({ title: "Uploaded", description: file.name });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      reset();
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLLabelElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const aspectClass = ASPECT_CLASSES[aspect];
  const hasFile = !!value?.url;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
      )}

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onKeyDown={onKeyDown}
        tabIndex={disabled ? -1 : 0}
        aria-busy={uploading}
        aria-disabled={disabled}
        aria-label={hasFile ? `${fieldLabel} — change file` : `${fieldLabel} — upload file`}
        className={cn(
          "group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/30 transition-colors",
          aspectClass,
          dragOver && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-60",
          uploading && "cursor-progress",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={onInputChange}
          disabled={disabled || uploading}
          name={name}
        />

        {hasFile ? (
          <>
            <Image
              src={value!.url}
              alt={`${fieldLabel} preview`}
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />
            {/* Overlay actions on hover/focus */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100 group-focus-visible:bg-black/40 group-focus-visible:opacity-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow">
                <ImagePlus className="size-3.5" aria-hidden />
                Replace
              </span>
              <button
                type="button"
                aria-label={`Remove ${fieldLabel.toLowerCase()}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-destructive/95 px-3 py-1.5 text-xs font-semibold text-white shadow transition-colors hover:bg-destructive"
              >
                <X className="size-3.5" aria-hidden />
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
            {uploading ? (
              <>
                <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
                <p className="text-sm font-medium">Uploading… {progress}%</p>
                <div
                  className="h-1 w-32 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${fieldLabel} upload progress`}
                >
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <UploadCloud
                  className="size-8 text-muted-foreground"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium">
                    Click to upload or drag &amp; drop
                  </p>
                  {hint && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {hint}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </label>
    </div>
  );
}

export type { FileUploadProps, FileUploadValue };
