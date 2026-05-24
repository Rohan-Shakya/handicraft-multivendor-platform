/**
 * Admin page for managing storefront facet filters.
 *
 * Mirrors the shape of the other catalog list pages. Each row has:
 *   - key pill (URL param — immutable once wired but editable here)
 *   - label / source-type / display-type badges
 *   - enabled switch (PATCH on toggle, optimistic)
 *   - edit button → FilterDialog
 *   - delete button → confirm → DELETE
 *
 * Reorder via ↑/↓ arrows (sends the full ordered id list to
 * `/admin/facet-filters/reorder`). Drag-and-drop reorder can be layered on top
 * later once @dnd-kit is introduced.
 */
import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Filter as FilterIcon,
  PencilIcon,
  PlusIcon,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FilterDialog, type FilterRow } from "./FilterDialog";

const SOURCE_TYPE_LABELS: Record<FilterRow["sourceType"], string> = {
  variant_price: "Variant Price",
  variant_option: "Variant Option",
  variant_metafield: "Variant Metafield",
  product_metafield: "Product Metafield",
  collection: "Collection",
  tag: "Tag",
  vendor: "Vendor",
  rating: "Rating",
  availability: "Availability",
};

export function FilterListPage() {
  const [rows, setRows] = React.useState<FilterRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FilterRow | undefined>();
  const [toDelete, setToDelete] = React.useState<FilterRow | null>(null);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const res = await apiFetch<FilterRow[]>("/admin/facet-filters", {
        signal,
      });
      setRows(res);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load filters",
          description: e.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);

  async function toggleEnabled(row: FilterRow, next: boolean) {
    // Optimistic — flip immediately, roll back on failure.
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, enabled: next } : r))
    );
    try {
      await apiFetch(`/admin/facet-filters/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: next }),
      });
    } catch (e: any) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, enabled: !next } : r))
      );
      toast({
        title: "Toggle failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[index], next[j]] = [next[j]!, next[index]!];
    // Optimistic reorder
    setRows(next);
    try {
      await apiFetch("/admin/facet-filters/reorder", {
        method: "POST",
        body: JSON.stringify({ ids: next.map((r) => r.id) }),
      });
    } catch (e: any) {
      // Revert on failure
      await load();
      toast({
        title: "Reorder failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await apiFetch(`/admin/facet-filters/${toDelete.id}`, {
        method: "DELETE",
      });
      setRows((prev) => prev.filter((r) => r.id !== toDelete.id));
      toast({ title: "Filter deleted" });
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setToDelete(null);
    }
  }

  function openNew() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(row: FilterRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Filters"
        description="Control which filters appear on the storefront product listing."
        action={
          <Button onClick={openNew}>
            <PlusIcon className="size-4" /> Add Filter
          </Button>
        }
      />

      <Card className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={FilterIcon}
              title="No filters yet"
              description="Add your first filter to let shoppers refine the catalog."
              action={
                <Button onClick={openNew}>
                  <PlusIcon className="size-4" /> Add Filter
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[80px]" />
                <TableHead className="font-semibold">Key</TableHead>
                <TableHead className="font-semibold">Label</TableHead>
                <TableHead className="font-semibold">Source Type</TableHead>
                <TableHead className="font-semibold">Display</TableHead>
                <TableHead className="font-semibold">Enabled</TableHead>
                <TableHead className="w-[90px] text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row.id} className="group">
                  <TableCell className="align-middle">
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={i === rows.length - 1}
                        onClick={() => move(i, 1)}
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground/80">
                      {row.key}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{row.label}</span>
                    {row.sourceRef && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        · {row.sourceRef}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {SOURCE_TYPE_LABELS[row.sourceType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {row.displayType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.enabled}
                      onCheckedChange={(v) => toggleEnabled(row, v)}
                      aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.label}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${row.label}`}
                        onClick={() => openEdit(row)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${row.label}`}
                        onClick={() => setToDelete(row)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <FilterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        filter={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete filter?"
        description={
          toDelete
            ? `"${toDelete.label}" will be removed from the storefront immediately. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
