import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreHorizontalIcon, UserPlus } from "lucide-react";

interface Membership {
  id: string;
  userId: string;
  vendorId: string;
  role: "owner" | "admin" | "catalog_manager" | "content_manager" | "support_agent";
  status: "invited" | "active" | "suspended" | "revoked";
  invitedBy?: string | null;
  acceptedAt?: string | null;
  joinedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VendorSummary {
  id: string;
  name: string;
  slug: string;
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "catalog_manager", label: "Catalog manager" },
  { value: "content_manager", label: "Content manager" },
  { value: "support_agent", label: "Support agent" },
] as const;

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

export function VendorMembershipsPage() {
  const { id: vendorId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite sheet state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Membership["role"]>("catalog_manager");
  const [inviting, setInviting] = useState(false);

  // Per-row confirm dialogs
  const [revokeTarget, setRevokeTarget] = useState<Membership | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    if (!vendorId) return;
    setLoading(true);
    try {
      const [v, ms] = await Promise.all([
        apiFetch<VendorSummary>(`/admin/vendors/${vendorId}`, { signal }),
        apiFetch<Membership[]>(`/admin/vendors/${vendorId}/memberships`, { signal }),
      ]);
      setVendor(v);
      setMembers(ms ?? []);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Couldn't load memberships", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [vendorId]);

  async function handleInvite() {
    if (!vendorId) return;
    if (!inviteEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      await apiFetch(`/admin/vendors/${vendorId}/memberships`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      toast({ title: "Invitation sent" });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("catalog_manager");
      load();
    } catch (e: any) {
      toast({ title: "Couldn't invite member", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(member: Membership, role: Membership["role"]) {
    setUpdatingId(member.id);
    try {
      await apiFetch(`/admin/memberships/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      toast({ title: `Role updated to ${roleLabel(role)}` });
      load();
    } catch (e: any) {
      toast({ title: "Couldn't update role", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  async function changeStatus(member: Membership, status: "active" | "suspended") {
    setUpdatingId(member.id);
    try {
      await apiFetch(`/admin/memberships/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: status === "suspended" ? "Member suspended" : "Member reactivated" });
      load();
    } catch (e: any) {
      toast({ title: "Couldn't update status", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  async function revokeMember() {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      await apiFetch(`/admin/memberships/${revokeTarget.id}`, { method: "DELETE" });
      toast({ title: "Member revoked" });
      setRevokeTarget(null);
      load();
    } catch (e: any) {
      toast({ title: "Couldn't revoke member", description: e.message, variant: "destructive" });
    } finally {
      setRevokeLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => navigate(`/vendors/${vendorId}`)}
          aria-label="Back to vendor"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <div className="flex-1 min-w-0">
          <PageHeader
            title="Team members"
            description={vendor ? `Manage staff who can sign in on behalf of ${vendor.name}.` : "Manage vendor staff."}
            action={
              <Button onClick={() => setInviteOpen(true)} disabled={loading}>
                <UserPlus className="size-4" aria-hidden />
                Invite member
              </Button>
            }
          />
        </div>
      </div>

      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            title="No team members yet"
            description="Invite a teammate to manage this vendor's catalog, orders, or content."
            action={
              <Button onClick={() => setInviteOpen(true)}>
                <UserPlus className="size-4" />
                Invite member
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Member</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Joined</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {m.userId.slice(0, 16)}…
                  </TableCell>
                  <TableCell className="capitalize">{roleLabel(m.role)}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.joinedAt
                      ? new Date(m.joinedAt).toLocaleDateString()
                      : m.acceptedAt
                        ? new Date(m.acceptedAt).toLocaleDateString()
                        : "—"}
                  </TableCell>
                  <TableCell className="w-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Member actions"
                          disabled={updatingId === m.id}
                        >
                          <MoreHorizontalIcon className="size-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {ROLE_OPTIONS.filter((r) => r.value !== m.role).map((r) => (
                          <DropdownMenuItem
                            key={r.value}
                            onClick={() => changeRole(m, r.value)}
                          >
                            Set as {r.label.toLowerCase()}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        {m.status === "active" ? (
                          <DropdownMenuItem onClick={() => changeStatus(m, "suspended")}>
                            Suspend
                          </DropdownMenuItem>
                        ) : m.status === "suspended" ? (
                          <DropdownMenuItem onClick={() => changeStatus(m, "active")}>
                            Reactivate
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setRevokeTarget(m)}
                        >
                          Revoke access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {vendor && (
        <p className="text-xs text-muted-foreground">
          Looking for {vendor.name}'s profile? <Link to={`/vendors/${vendor.id}`} className="text-primary hover:underline">Back to vendor detail</Link>.
        </p>
      )}

      {/* Invite sheet */}
      <Sheet
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteEmail("");
            setInviteRole("catalog_manager");
          }
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Invite team member</SheetTitle>
            <SheetDescription>
              Send an invitation to a colleague. They'll be able to sign in to {vendor?.name ?? "this vendor"} once they accept.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <FormField label="Email" htmlFor="invite-email" required>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@vendor.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Role" htmlFor="invite-role">
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Membership["role"])}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? "Sending…" : "Send invitation"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke access?"
        description={
          revokeTarget
            ? `Remove this member from ${vendor?.name ?? "the vendor"}? They will lose access immediately.`
            : ""
        }
        confirmLabel="Revoke"
        variant="destructive"
        loading={revokeLoading}
        onConfirm={revokeMember}
      />
    </div>
  );
}
