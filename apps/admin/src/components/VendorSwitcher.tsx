import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Store, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { trackEvent } from "@/lib/observability";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Membership {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  vendorStatus: string;
  memberRole: string;
}

interface SwitchResponse {
  accessToken: string;
  vendor: { id: string; name: string; slug: string };
  memberRole: string;
}

/**
 * Pickerized vendor switcher — used by vendor users who belong to multiple
 * stores. Fetches the caller's `vendorMemberships` and lets them swap the
 * active vendor scope without re-entering their password.
 *
 * Backend contract (optional): `POST /auth/vendor/switch { vendorId }` mints
 * a fresh access token scoped to the requested vendor. If the endpoint isn't
 * wired we fall back to signing the user out; they can re-login to the new
 * vendor from the login page.
 */
export function VendorSwitcher() {
  const { actor, token } = useAuth() as unknown as {
    actor: { type: string; vendorId?: string; vendorName?: string; vendorSlug?: string } | null;
    token?: string | null;
  };
  const navigate = useNavigate();

  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");

  // Only vendor actors need this.
  const enabled = actor?.type === "vendor" && !!token;

  const { data: memberships = [] } = useQuery({
    queryKey: ["vendor-memberships", actor?.vendorId],
    queryFn: async () => {
      const res = await apiFetch<{ memberships: Membership[] }>(
        "/auth/vendor/memberships/me"
      );
      return res.memberships;
    },
    enabled,
    staleTime: 5 * 60_000,
  });

  if (!enabled || memberships.length === 0) {
    return null;
  }

  const currentId = actor?.vendorId;
  const current = memberships.find((m) => m.vendorId === currentId);
  const visible = memberships.filter((m) =>
    filter.trim()
      ? m.vendorName.toLowerCase().includes(filter.toLowerCase())
      : true
  );

  async function switchVendor(vendorId: string) {
    if (vendorId === currentId) {
      setOpen(false);
      return;
    }
    try {
      const res = await apiFetch<SwitchResponse>("/auth/vendor/switch", {
        method: "POST",
        body: JSON.stringify({ vendorId }),
      });
      // Update in-memory token so subsequent requests see the new scope.
      const { setAccessToken } = await import("@/lib/api");
      setAccessToken(res.accessToken);
      toast({
        title: `Switched to ${res.vendor.name}`,
        description: `You're now managing the ${res.vendor.name} store.`,
      });
      trackEvent("update", { entity: "vendor_scope", vendorId });
      setOpen(false);
      // Hard reload the current path so every React Query cache resets to the
      // new vendor scope.
      navigate(0);
    } catch (err) {
      toast({
        title: "Couldn't switch vendor",
        description: (err as Error)?.message ?? "Please sign out and back in.",
        variant: "destructive",
      });
    }
  }

  // Single-vendor users: show the store name read-only.
  if (memberships.length === 1) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <Store className="size-3.5" aria-hidden />
        <span className="max-w-[12rem] truncate">
          {current?.vendorName ?? "Store"}
        </span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Switch vendor"
          className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent"
        >
          <Store className="size-3.5" aria-hidden />
          <span className="max-w-[10rem] truncate">
            {current?.vendorName ?? "Select store"}
          </span>
          <ChevronsUpDown className="size-3 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b p-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search stores…"
            className="h-8"
          />
        </div>
        <ScrollArea className="max-h-72">
          <ul className="p-1">
            {visible.map((m) => {
              const active = m.vendorId === currentId;
              return (
                <li key={m.vendorId}>
                  <button
                    type="button"
                    onClick={() => switchVendor(m.vendorId)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                      active && "bg-accent/60"
                    )}
                  >
                    <div className="grid size-6 place-items-center rounded bg-primary/10 text-[10px] font-bold uppercase text-primary">
                      {m.vendorName.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.vendorName}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {m.memberRole} · {m.vendorStatus}
                      </p>
                    </div>
                    {active && <Check className="size-3.5 text-primary" aria-hidden />}
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                No matching stores
              </li>
            )}
          </ul>
        </ScrollArea>
        <div className="border-t p-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/login");
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="size-3.5" aria-hidden /> Add another store
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
