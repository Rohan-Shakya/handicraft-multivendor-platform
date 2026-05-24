import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RotateCcw,
  ShieldCheck,
  FileText,
  Truck,
  ChevronRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Policy definitions                                                         */
/* -------------------------------------------------------------------------- */

export const POLICIES = [
  { key: "policy_refund", slug: "refund-policy", label: "Return and refund policy", icon: RotateCcw },
  { key: "policy_privacy", slug: "privacy-policy", label: "Privacy policy", icon: ShieldCheck },
  { key: "policy_terms", slug: "terms-of-service", label: "Terms of service", icon: FileText },
  { key: "policy_shipping", slug: "shipping-policy", label: "Shipping policy", icon: Truck },
] as const;

type Settings = Record<string, string | null>;

/* -------------------------------------------------------------------------- */
/*  PoliciesPage                                                               */
/* -------------------------------------------------------------------------- */

export function PoliciesPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiFetch<Settings>("/admin/settings", { signal: controller.signal });
        setSettings(data);
      } catch (e: any) {
        if ((e as any)?.name !== "AbortError") {
          toast({
            title: "Failed to load policies",
            description: e.message,
            variant: "destructive",
          });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="Policies" description="Manage your store policies" />
        <div className="divide-y border rounded-lg">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Policies"
        description="Manage your store policies"
      />

      <p className="text-sm text-muted-foreground mb-4">
        Policies are linked in the footer of checkout and can be added to your online store menu.
      </p>

      <div className="divide-y border rounded-lg">
        {POLICIES.map(({ key, slug, label, icon: Icon }) => {
          const hasContent = !!settings[key];

          return (
            <Link
              key={key}
              to={`/system/policies/${slug}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
            >
              <Icon className="size-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium">{label}</span>
              {!hasContent && (
                <span className="text-xs text-muted-foreground border rounded-md px-2 py-0.5">
                  No policy set
                </span>
              )}
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
