import { useState, useRef } from "react";
import type { ProductImage } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  PlusIcon,
  Trash2Icon,
  StarIcon,
  ChevronRightIcon,
  UploadIcon,
  Loader2Icon,
} from "lucide-react";

interface Props {
  productId: string;
  images: ProductImage[];
  onReload: () => void;
}

export function ProductMediaCard({ productId, images, onReload }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageFeatured, setImageFeatured] = useState(false);
  const [addingImage, setAddingImage] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [mediaDragOver, setMediaDragOver] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  async function handleAddImage() {
    if (!imageUrl.trim()) return;
    setAddingImage(true);
    try {
      await apiFetch(`/admin/products/${productId}/images`, {
        method: "POST",
        body: JSON.stringify({
          url: imageUrl.trim(),
          altText: imageAlt.trim() || null,
          position: images.length + 1,
          isFeatured: imageFeatured,
        }),
      });
      toast({ title: "Image added" });
      setImageUrl("");
      setImageAlt("");
      setImageFeatured(false);
      onReload();
    } catch (e: any) {
      toast({ title: "Failed to add image", description: e.message, variant: "destructive" });
    } finally {
      setAddingImage(false);
    }
  }

  async function handleUploadImages(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({ title: "Please select image files", variant: "destructive" });
      return;
    }
    setUploadingImages(true);
    let successCount = 0;
    for (const file of imageFiles) {
      try {
        const presignRes = await apiFetch<{ file: { id: string; url: string }; uploadUrl: string }>(
          "/admin/files/presign",
          { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type }) }
        );
        const uploadRes = await fetch(presignRes.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
        const confirmData: Record<string, number> = { sizeBytes: file.size };
        try {
          const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(img.src); };
            img.onerror = () => { URL.revokeObjectURL(img.src); reject(); };
            img.src = URL.createObjectURL(file);
          });
          confirmData.width = dims.width;
          confirmData.height = dims.height;
        } catch { /* skip dims */ }
        await apiFetch(`/admin/files/${presignRes.file.id}/confirm`, {
          method: "POST",
          body: JSON.stringify(confirmData),
        });
        await apiFetch(`/admin/products/${productId}/images`, {
          method: "POST",
          body: JSON.stringify({
            url: presignRes.file.url,
            altText: null,
            position: images.length + 1 + successCount,
            isFeatured: images.length === 0 && successCount === 0,
          }),
        });
        successCount++;
      } catch (e: any) {
        toast({ title: `Failed to upload ${file.name}`, description: e.message, variant: "destructive" });
      }
    }
    if (successCount > 0) {
      toast({ title: `${successCount} image${successCount > 1 ? "s" : ""} uploaded` });
      onReload();
    }
    setUploadingImages(false);
  }

  async function handleDeleteImage(imageId: string) {
    try {
      await apiFetch(`/admin/products/${productId}/images/${imageId}`, { method: "DELETE" });
      toast({ title: "Image removed" });
      onReload();
    } catch (e: any) {
      toast({ title: "Failed to remove image", description: e.message, variant: "destructive" });
    }
  }

  async function handleSetFeatured(imageId: string) {
    try {
      await apiFetch(`/admin/products/${productId}/images/${imageId}`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: true }),
      });
      toast({ title: "Featured image updated" });
      onReload();
    } catch (e: any) {
      toast({ title: "Failed to update featured image", description: e.message, variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload drop zone */}
        <div
          className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
            mediaDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          } ${uploadingImages ? "pointer-events-none opacity-60" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setMediaDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setMediaDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setMediaDragOver(false);
            handleUploadImages(Array.from(e.dataTransfer.files));
          }}
          onClick={() => !uploadingImages && mediaFileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); mediaFileInputRef.current?.click(); } }}
          aria-label="Upload product images"
        >
          {uploadingImages ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2Icon className="size-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadIcon className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drop images here or <span className="text-primary underline underline-offset-2">click to upload</span>
              </p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF up to 10MB</p>
            </div>
          )}
        </div>
        <input
          ref={mediaFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleUploadImages(Array.from(e.target.files));
            e.target.value = "";
          }}
        />

        {/* Existing images grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...images]
              .sort((a, b) => a.position - b.position)
              .map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-lg border overflow-hidden bg-muted aspect-square"
                >
                  <img
                    src={img.url}
                    alt={img.altText ?? "Product image"}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] rounded px-1.5 py-0.5 font-mono">
                    #{img.position}
                  </span>
                  {img.isFeatured && (
                    <Badge variant="secondary" className="absolute top-1.5 left-1.5 text-[10px] gap-1">
                      <StarIcon className="size-2.5 fill-current" />
                      Featured
                    </Badge>
                  )}
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!img.isFeatured && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="size-6"
                        title="Set as featured"
                        aria-label="Set as featured image"
                        onClick={() => handleSetFeatured(img.id)}
                      >
                        <StarIcon className="size-3" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="size-6"
                      aria-label="Delete image"
                      onClick={() => handleDeleteImage(img.id)}
                    >
                      <Trash2Icon className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Add by URL */}
        <Separator />
        <details className="group">
          <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1.5">
            <ChevronRightIcon className="size-3.5 transition-transform group-open:rotate-90" />
            Add image by URL
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <Input
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Alt text (optional)"
                className="sm:w-48"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddImage}
                disabled={!imageUrl.trim() || addingImage}
              >
                <PlusIcon className="size-4 mr-1" />
                {addingImage ? "Adding..." : "Add"}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="image-featured" checked={imageFeatured} onCheckedChange={setImageFeatured} />
              <Label htmlFor="image-featured" className="text-sm">
                Set as featured image
              </Label>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
