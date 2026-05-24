import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UsersIcon, PlusIcon, MoreHorizontalIcon, ShieldIcon, SearchIcon,
} from "lucide-react";

interface CustomerSegment {
  id: string;
  name: string;
  type: "manual" | "dynamic";
  description?: string | null;
  customerCount?: number;
  isSystem?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface SegmentForm {
  name: string;
  type: "manual" | "dynamic";
  description: string;
}

const EMPTY_FORM: SegmentForm = { name: "", type: "manual", description: "" };

export function CustomerSegmentsPage() {
  const navigate = useNavigate();
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<CustomerSegment | null>(null);
  const [form, setForm] = useState<SegmentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<CustomerSegment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Total customers (for % calculation)
  const [totalCustomers, setTotalCustomers] = useState(0);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const [segRes, custRes] = await Promise.all([
        apiFetch<CustomerSegment[]>("/admin/customer-segments", { signal }),
        apiFetch<{ total: number }>("/admin/customers?page=1&limit=1", { signal }),
      ]);
      setSegments(Array.isArray(segRes) ? segRes : []);
      setTotalCustomers(custRes.total ?? 0);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Failed to load segments", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, []);

  // Filter by search
  const filtered = search.trim()
    ? segments.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : segments;

  function openCreate() {
    setEditingSegment(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(seg: CustomerSegment) {
    setEditingSegment(seg);
    setForm({ name: seg.name, type: seg.type, description: seg.description ?? "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast({ title: "Segment name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingSegment) {
        await apiFetch(`/admin/customer-segments/${editingSegment.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: form.name, type: form.type, description: form.description || undefined }),
        });
        toast({ title: "Segment updated" });
      } else {
        const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        await apiFetch("/admin/customer-segments", {
          method: "POST",
          body: JSON.stringify({ name: form.name, slug, type: form.type, description: form.description || undefined }),
        });
        toast({ title: "Segment created" });
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Failed to save segment", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/customer-segments/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Segment deleted" });
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  function pct(count: number): string {
    if (!totalCustomers || totalCustomers === 0) return "0%";
    return `${Math.round((count / totalCustomers) * 100)}%`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segments"
        description="Group customers into segments for targeted marketing and analysis."
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4 mr-1" /> Create segment
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search segments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-4 w-48 flex-1" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={search ? "No segments match your search" : "No segments yet"}
            description={search ? "Try a different search term." : "Create segments to group and target customers."}
            action={
              !search ? (
                <Button onClick={openCreate}>
                  <PlusIcon className="size-4 mr-1" /> Create segment
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold text-right">% of customers</TableHead>
                <TableHead className="font-semibold">Last activity</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((seg) => (
                <TableRow
                  key={seg.id}
                  className="group cursor-pointer"
                  tabIndex={0}
                  role="link"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/customers/segments/${seg.id}`);
                    }
                  }}
                  onClick={() => navigate(`/customers/segments/${seg.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{seg.name}</span>
                      {seg.isSystem && (
                        <ShieldIcon className="size-3.5 text-muted-foreground" />
                      )}
                      {seg.type === "dynamic" && (
                        <Badge variant="secondary" className="text-[10px] font-normal">Auto</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground text-right">
                    {pct(seg.customerCount ?? 0)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    Created on {new Date(seg.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Segment actions"
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(seg)} disabled={seg.isSystem}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={seg.isSystem}
                          onClick={() => setDeleteTarget(seg)}
                        >
                          Delete
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSegment ? "Edit Segment" : "New Segment"}</DialogTitle>
            <DialogDescription>
              {editingSegment ? "Update this customer segment." : "Create a new customer segment."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Name" htmlFor="seg-name" required>
              <Input
                id="seg-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VIP Customers"
                autoFocus
              />
            </FormField>
            <FormField label="Type" htmlFor="seg-type">
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as "manual" | "dynamic" }))}
              >
                <SelectTrigger id="seg-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="dynamic">Dynamic</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Description" htmlFor="seg-desc">
              <Input
                id="seg-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe your segment..."
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingSegment ? "Save changes" : "Create segment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete segment"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Customers won't be deleted, only the segment grouping.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
