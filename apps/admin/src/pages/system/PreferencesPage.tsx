import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { FormField } from "@/components/FormField";
import { ImagePicker, ImagePickerValue } from "@/components/ImagePicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Loader2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type Settings = Record<string, string | null>;

/* -------------------------------------------------------------------------- */
/*  PreferencesPage                                                            */
/* -------------------------------------------------------------------------- */

export function PreferencesPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [socialImage, setSocialImage] = useState<ImagePickerValue | null>(null);
  const [faviconImage, setFaviconImage] = useState<ImagePickerValue | null>(null);

  // ── Load settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiFetch<Settings>("/admin/settings", { signal: controller.signal });
        setSettings(data);
        if (data.social_image_url) {
          setSocialImage({ fileId: "", url: data.social_image_url, altText: "" });
        }
        if (data.favicon_url) {
          setFaviconImage({ fileId: "", url: data.favicon_url, altText: "" });
        }
      } catch (e: any) {
        if ((e as any)?.name !== "AbortError") {
          toast({ title: "Failed to load settings", description: e.message, variant: "destructive" });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value || null }));

  const val = (key: string) => settings[key] ?? "";

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await apiFetch<Settings>("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(data);
      if (data.social_image_url) {
        setSocialImage((prev) => prev ? { ...prev, url: data.social_image_url! } : { fileId: "", url: data.social_image_url!, altText: "" });
      } else {
        setSocialImage(null);
      }
      if (data.favicon_url) {
        setFaviconImage((prev) => prev ? { ...prev, url: data.favicon_url! } : { fileId: "", url: data.favicon_url!, altText: "" });
      } else {
        setFaviconImage(null);
      }
      toast({ title: "Settings saved" });
    } catch (e: any) {
      toast({ title: "Failed to save settings", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <PageHeader title="Preferences" description="Manage your online store settings" />
        <div className="space-y-6 max-w-3xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Preferences"
        description="Manage your online store settings"
        action={
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        }
      />

      <div className="space-y-6 max-w-3xl">
        {/* ── Homepage meta ─────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-1">Homepage title and meta description</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The homepage title and meta description help define how your store shows up on search engines.
          </p>

          <div className="space-y-4">
            <FormField label="Homepage title" htmlFor="homepage_title">
              <Input
                id="homepage_title"
                value={val("homepage_title")}
                onChange={(e) => set("homepage_title", e.target.value)}
                placeholder="My Store — Home"
                maxLength={70}
              />
              <CharCount value={val("homepage_title")} max={70} />
            </FormField>

            <FormField label="Homepage meta description" htmlFor="homepage_description">
              <Textarea
                id="homepage_description"
                value={val("homepage_description")}
                onChange={(e) => set("homepage_description", e.target.value)}
                placeholder="Discover amazing products from independent vendors..."
                rows={3}
                maxLength={320}
              />
              <CharCount value={val("homepage_description")} max={320} />
            </FormField>
          </div>
        </Card>

        {/* ── Social sharing image ──────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-1">Social sharing image</h2>
          <p className="text-sm text-muted-foreground mb-4">
            When you share a link to your store on social media, an image is usually shown in your post. Provide the URL to a default social sharing image (1200 x 628px recommended).
          </p>

          <div className="space-y-4">
            <ImagePicker
              label="Social sharing image"
              value={socialImage}
              onChange={(value) => {
                setSocialImage(value);
                set("social_image_url", value?.url || "");
              }}
            />

            <ImagePicker
              label="Favicon"
              value={faviconImage}
              onChange={(value) => {
                setFaviconImage(value);
                set("favicon_url", value?.url || "");
              }}
            />
          </div>
        </Card>

        {/* ── Store details ─────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-1">Store details</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your store name and contact details shown to customers.
          </p>

          <div className="space-y-4">
            <FormField label="Store name" htmlFor="store_name">
              <Input
                id="store_name"
                value={val("store_name")}
                onChange={(e) => set("store_name", e.target.value)}
                placeholder="My Store"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Store email" htmlFor="store_email">
                <Input
                  id="store_email"
                  type="email"
                  value={val("store_email")}
                  onChange={(e) => set("store_email", e.target.value)}
                  placeholder="hello@mystore.com"
                />
              </FormField>

              <FormField label="Store phone" htmlFor="store_phone">
                <Input
                  id="store_phone"
                  type="tel"
                  value={val("store_phone")}
                  onChange={(e) => set("store_phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </FormField>
            </div>

            <FormField label="Store address" htmlFor="store_address">
              <Textarea
                id="store_address"
                value={val("store_address")}
                onChange={(e) => set("store_address", e.target.value)}
                placeholder="123 Main St, City, State, ZIP"
                rows={2}
              />
            </FormField>
          </div>
        </Card>

        {/* ── Social accounts ───────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-1">Social accounts</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Link your social media accounts. These may be displayed on your storefront.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Facebook" htmlFor="social_facebook">
                <Input
                  id="social_facebook"
                  value={val("social_facebook")}
                  onChange={(e) => set("social_facebook", e.target.value)}
                  placeholder="https://facebook.com/yourstore"
                />
              </FormField>

              <FormField label="Instagram" htmlFor="social_instagram">
                <Input
                  id="social_instagram"
                  value={val("social_instagram")}
                  onChange={(e) => set("social_instagram", e.target.value)}
                  placeholder="https://instagram.com/yourstore"
                />
              </FormField>

              <FormField label="X (Twitter)" htmlFor="social_twitter">
                <Input
                  id="social_twitter"
                  value={val("social_twitter")}
                  onChange={(e) => set("social_twitter", e.target.value)}
                  placeholder="https://x.com/yourstore"
                />
              </FormField>

              <FormField label="Pinterest" htmlFor="social_pinterest">
                <Input
                  id="social_pinterest"
                  value={val("social_pinterest")}
                  onChange={(e) => set("social_pinterest", e.target.value)}
                  placeholder="https://pinterest.com/yourstore"
                />
              </FormField>

              <FormField label="YouTube" htmlFor="social_youtube">
                <Input
                  id="social_youtube"
                  value={val("social_youtube")}
                  onChange={(e) => set("social_youtube", e.target.value)}
                  placeholder="https://youtube.com/@yourstore"
                />
              </FormField>

              <FormField label="TikTok" htmlFor="social_tiktok">
                <Input
                  id="social_tiktok"
                  value={val("social_tiktok")}
                  onChange={(e) => set("social_tiktok", e.target.value)}
                  placeholder="https://tiktok.com/@yourstore"
                />
              </FormField>
            </div>
          </div>
        </Card>

        {/* ── Analytics ─────────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-1">Analytics</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add tracking IDs for your analytics services.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Google Analytics ID" htmlFor="google_analytics_id">
              <Input
                id="google_analytics_id"
                value={val("google_analytics_id")}
                onChange={(e) => set("google_analytics_id", e.target.value)}
                placeholder="G-XXXXXXXXXX"
              />
            </FormField>

            <FormField label="Facebook Pixel ID" htmlFor="facebook_pixel_id">
              <Input
                id="facebook_pixel_id"
                value={val("facebook_pixel_id")}
                onChange={(e) => set("facebook_pixel_id", e.target.value)}
                placeholder="123456789012345"
              />
            </FormField>
          </div>
        </Card>

        {/* ── Custom code ───────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-1">Custom code</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add custom scripts or styles. Code in "Head" is injected before the closing{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/head&gt;</code> tag.
            Code in "Body" is injected before the closing{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag.
          </p>

          <div className="space-y-4">
            <FormField label="Custom <head> code" htmlFor="custom_head_code">
              <Textarea
                id="custom_head_code"
                value={val("custom_head_code")}
                onChange={(e) => set("custom_head_code", e.target.value)}
                placeholder="<!-- Analytics, meta tags, etc. -->"
                rows={4}
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Custom <body> code" htmlFor="custom_body_code">
              <Textarea
                id="custom_body_code"
                value={val("custom_body_code")}
                onChange={(e) => set("custom_body_code", e.target.value)}
                placeholder="<!-- Chat widgets, tracking scripts, etc. -->"
                rows={4}
                className="font-mono text-xs"
              />
            </FormField>
          </div>
        </Card>

        {/* ── Password protection ───────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-1">Password protection</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Restrict access to your storefront with a password. Useful during development or for private sales.
          </p>

          <div className="space-y-4">
            <FormField label="Enable password protection" htmlFor="password_protection_enabled">
              <Select
                value={val("password_protection_enabled") || "false"}
                onValueChange={(v) => set("password_protection_enabled", v)}
              >
                <SelectTrigger id="password_protection_enabled">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Disabled</SelectItem>
                  <SelectItem value="true">Enabled</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {val("password_protection_enabled") === "true" && (
              <>
                <FormField label="Password" htmlFor="password_protection_password">
                  <Input
                    id="password_protection_password"
                    type="text"
                    value={val("password_protection_password")}
                    onChange={(e) => set("password_protection_password", e.target.value)}
                    placeholder="Enter a password for visitors"
                  />
                </FormField>

                <FormField label="Message for visitors" htmlFor="password_protection_message">
                  <Textarea
                    id="password_protection_message"
                    value={val("password_protection_message")}
                    onChange={(e) => set("password_protection_message", e.target.value)}
                    placeholder="Our store is currently under construction. Check back soon!"
                    rows={3}
                  />
                </FormField>
              </>
            )}
          </div>
        </Card>

        {/* ── Bottom save button ────────────────────────────────────────── */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Character counter                                                          */
/* -------------------------------------------------------------------------- */

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  return (
    <p
      aria-live="polite"
      className={`text-xs ${len > max ? "text-destructive" : "text-muted-foreground"}`}
    >
      {len} / {max}
    </p>
  );
}
