import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { POLICIES } from "./PoliciesPage";
import { Loader2 } from "lucide-react";

type Settings = Record<string, string | null>;

/* -------------------------------------------------------------------------- */
/*  Policy metadata (keyed by slug)                                            */
/* -------------------------------------------------------------------------- */

const POLICY_BY_SLUG = Object.fromEntries(
  POLICIES.map((p) => [
    p.slug,
    {
      key: p.key,
      label: p.label,
      description: {
        "refund-policy":
          "Outline the conditions under which customers can return or exchange items, and how refunds are processed.",
        "privacy-policy":
          "Describe how your store collects, uses, and protects customer data.",
        "terms-of-service":
          "Define the rules and guidelines customers agree to when using your store.",
        "shipping-policy":
          "Explain shipping methods, delivery times, costs, and any restrictions.",
      }[p.slug]!,
    },
  ])
);

/* -------------------------------------------------------------------------- */
/*  PolicyEditPage                                                             */
/* -------------------------------------------------------------------------- */

export function PolicyEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const meta = slug ? POLICY_BY_SLUG[slug] : undefined;

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!meta) return;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiFetch<Settings>("/admin/settings", { signal: controller.signal });
        setContent(data[meta.key] ?? "");
      } catch (e: any) {
        if ((e as any)?.name !== "AbortError") {
          toast({
            title: "Failed to load policy",
            description: e.message,
            variant: "destructive",
          });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [meta]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!meta) return;
    setSaving(true);
    try {
      await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ [meta.key]: content || null }),
      });
      toast({ title: "Policy saved" });
    } catch (e: any) {
      toast({
        title: "Failed to save policy",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && meta) {
    return (
      <div>
        <PageHeader title={meta.label} />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!slug || !meta) {
    return (
      <div>
        <PageHeader title="Policy not found" />
        <p className="text-sm text-muted-foreground">
          The requested policy does not exist.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={meta.label}
        description={meta.description}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/system/policies")}
            >
              Back
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </div>
        }
      />

      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder={`Write your ${meta.label.toLowerCase()} here...`}
      />
    </div>
  );
}
