import { useEffect, useState, useCallback } from "react";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserCogIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Constants & types                                                          */
/* -------------------------------------------------------------------------- */

const LIMIT = 20;

type PlatformRole = "super_admin" | "support_agent";

const PLATFORM_ROLES: PlatformRole[] = ["super_admin", "support_agent"];

function formatRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PlatformUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  platformRole: PlatformRole | null;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface CreateForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: PlatformRole | "";
}

const EMPTY_CREATE: CreateForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "",
};

const MIN_PASSWORD_LENGTH = 8;

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function UserListPage() {
  const { actor } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<PlatformRole | "all">("all");

  // Create sheet
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [createErrors, setCreateErrors] = useState<
    Partial<Record<keyof CreateForm, string>>
  >({});
  const [creating, setCreating] = useState(false);

  // Edit role sheet
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [editRole, setEditRole] = useState<PlatformRole | "">("");
  const [editSaving, setEditSaving] = useState(false);

  // Toggle active
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Delete confirm
  const [deletingUser, setDeletingUser] = useState<PlatformUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* -- Load ---------------------------------------------------------------- */

  const load = useCallback(
    async (p = page, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(LIMIT),
        });
        if (roleFilter !== "all") params.set("role", roleFilter);

        const res = await apiFetch<PaginatedResponse<PlatformUser>>(
          `/admin/users?${params}`,
          { signal }
        );

        // Client-side search (API doesn't have search param yet)
        let filtered = res.data;
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          filtered = filtered.filter(
            (u) =>
              u.email.toLowerCase().includes(q) ||
              u.firstName?.toLowerCase().includes(q) ||
              u.lastName?.toLowerCase().includes(q)
          );
        }

        setUsers(filtered);
        setTotal(search.trim() ? filtered.length : res.total);
      } catch (e: any) {
        if ((e as any)?.name !== "AbortError") {
          toast({
            title: "Failed to load users",
            description: e.message,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [page, roleFilter, search]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(page, controller.signal);
    return () => controller.abort();
  }, [page, roleFilter]);

  // Debounced search
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => load(1, controller.signal), 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [search]);

  /* -- Create -------------------------------------------------------------- */

  function openCreate() {
    setCreateForm(EMPTY_CREATE);
    setCreateErrors({});
    setCreateOpen(true);
  }

  function validateCreate(): boolean {
    const errs: Partial<Record<keyof CreateForm, string>> = {};
    if (!createForm.email.trim()) errs.email = "Email is required";
    if (!createForm.password.trim()) {
      errs.password = "Password is required";
    } else if (createForm.password.length < MIN_PASSWORD_LENGTH) {
      errs.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (!createForm.role) errs.role = "Role is required";
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate() {
    if (!validateCreate()) return;
    setCreating(true);
    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: createForm.email.trim().toLowerCase(),
          password: createForm.password,
          firstName: createForm.firstName.trim() || undefined,
          lastName: createForm.lastName.trim() || undefined,
          role: createForm.role,
        }),
      });
      toast({
        title: "User created",
        description: `${createForm.email} has been added.`,
      });
      setCreateOpen(false);
      load(page);
    } catch (e: any) {
      toast({
        title: "Failed to create user",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  /* -- Edit Role ----------------------------------------------------------- */

  function openEdit(user: PlatformUser) {
    setEditingUser(user);
    setEditRole(user.platformRole ?? "");
  }

  async function handleEditSave() {
    if (!editingUser || !editRole) return;
    setEditSaving(true);
    try {
      await apiFetch(`/admin/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: editRole }),
      });
      toast({
        title: "Role updated",
        description: `${editingUser.email} is now ${formatRole(editRole)}.`,
      });
      setEditingUser(null);
      load(page);
    } catch (e: any) {
      toast({
        title: "Failed to update role",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  }

  /* -- Toggle Active ------------------------------------------------------- */

  async function toggleActive(user: PlatformUser) {
    setTogglingId(user.id);
    try {
      await apiFetch(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      toast({
        title: user.isActive ? "User deactivated" : "User activated",
        description: `${user.email} has been ${user.isActive ? "deactivated" : "activated"}.`,
      });
      load(page);
    } catch (e: any) {
      toast({
        title: "Failed to update status",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  }

  /* -- Delete -------------------------------------------------------------- */

  async function handleDelete() {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/users/${deletingUser.id}`, { method: "DELETE" });
      toast({
        title: "User deleted",
        description: `${deletingUser.email} has been removed.`,
      });
      setDeletingUser(null);
      load(page);
    } catch (e: any) {
      toast({
        title: "Failed to delete user",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  /* -- Helpers ------------------------------------------------------------- */

  const cf =
    (field: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (createErrors[field])
        setCreateErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  function getUserName(u: PlatformUser): string {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
    return name || u.email.split("@")[0];
  }

  function getAvatarInitials(u: PlatformUser): string {
    if (u.firstName && u.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    return u.email.slice(0, 2).toUpperCase();
  }

  const isSelf = (userId: string) => actor?.id === userId;

  /* -- Render -------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Users"
        description="Manage platform admin accounts and roles."
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" /> Add User
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            aria-label="Search users"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v as PlatformRole | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {PLATFORM_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {formatRole(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={UserCogIcon}
            title={
              search || roleFilter !== "all"
                ? "No users match your filters"
                : "No platform users yet"
            }
            description={
              search || roleFilter !== "all"
                ? "Try adjusting your search or filter."
                : "Add your first platform user to grant admin access."
            }
            action={
              !search && roleFilter === "all" ? (
                <Button onClick={openCreate}>
                  <PlusIcon className="size-4" /> Add User
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Last Login</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {getAvatarInitials(u)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{getUserName(u)}</span>
                          {isSelf(u.id) && (
                            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <span className="inline-block bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                        {u.platformRole
                          ? formatRole(u.platformRole)
                          : "No role"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={u.isActive ? "active" : "inactive"}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="w-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                            aria-label={`Actions for ${u.email}`}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEdit(u)}
                            disabled={isSelf(u.id)}
                          >
                            Edit Role
                            {isSelf(u.id) && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                (self)
                              </span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleActive(u)}
                            disabled={togglingId === u.id || isSelf(u.id)}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                            {isSelf(u.id) && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                (self)
                              </span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeletingUser(u)}
                            disabled={isSelf(u.id)}
                          >
                            Delete
                            {isSelf(u.id) && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                (self)
                              </span>
                            )}
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

      {/* Create User Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Platform User</SheetTitle>
            <SheetDescription>
              Create a new platform admin account with a role
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="grid gap-4">
              <FormField
                label="Email"
                htmlFor="u-email"
                required
                error={createErrors.email}
              >
                <Input
                  id="u-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={createForm.email}
                  onChange={cf("email")}
                  autoComplete="off"
                />
              </FormField>
              <FormField
                label="Password"
                htmlFor="u-pw"
                required
                error={createErrors.password}
              >
                <Input
                  id="u-pw"
                  type="password"
                  placeholder="Min 8 characters"
                  value={createForm.password}
                  onChange={cf("password")}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                />
                {!createErrors.password && (
                  <p className="text-xs text-muted-foreground">
                    At least {MIN_PASSWORD_LENGTH} characters
                  </p>
                )}
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First Name" htmlFor="u-first">
                  <Input
                    id="u-first"
                    placeholder="Jane"
                    value={createForm.firstName}
                    onChange={cf("firstName")}
                  />
                </FormField>
                <FormField label="Last Name" htmlFor="u-last">
                  <Input
                    id="u-last"
                    placeholder="Doe"
                    value={createForm.lastName}
                    onChange={cf("lastName")}
                  />
                </FormField>
              </div>
              <FormField
                label="Role"
                htmlFor="u-role"
                required
                error={createErrors.role}
              >
                <Select
                  value={createForm.role}
                  onValueChange={(v) => {
                    setCreateForm((prev) => ({
                      ...prev,
                      role: v as PlatformRole,
                    }));
                    if (createErrors.role)
                      setCreateErrors((prev) => ({
                        ...prev,
                        role: undefined,
                      }));
                  }}
                >
                  <SelectTrigger id="u-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {formatRole(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create User"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Role Sheet */}
      <Sheet
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Role</SheetTitle>
            <SheetDescription>
              Update this user's platform role
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {editingUser && (
              <div className="grid gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    User
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {editingUser.email}
                  </p>
                </div>
                <FormField label="Role" htmlFor="edit-role" required>
                  <Select
                    value={editRole}
                    onValueChange={(v) => setEditRole(v as PlatformRole)}
                  >
                    <SelectTrigger id="edit-role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {formatRole(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={
                editSaving ||
                !editRole ||
                editRole === editingUser?.platformRole
              }
            >
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Delete Platform User"
        description={`Are you sure you want to delete "${deletingUser?.email}"? This will soft-delete the account and deactivate it.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
