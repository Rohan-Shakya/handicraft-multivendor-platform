import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type EntityType = "products" | "variants" | "collections" | "customers";

type MetafieldType = "string" | "integer" | "float" | "boolean" | "json" | "date";

interface Metafield {
  id: string;
  namespace: string | null;
  key: string;
  value?: string;
  valueJson?: unknown;
  type: MetafieldType;
}

function getMetafieldValue(m: Metafield): string {
  if (m.value !== undefined && m.value !== null) return String(m.value);
  if (m.valueJson !== undefined && m.valueJson !== null) return typeof m.valueJson === "string" ? m.valueJson : JSON.stringify(m.valueJson);
  return "";
}

interface MetafieldsEditorProps {
  entityType: EntityType;
  entityId: string;
}

const METAFIELD_TYPES: MetafieldType[] = [
  "string",
  "integer",
  "float",
  "boolean",
  "json",
  "date",
];

const EMPTY_FORM = {
  namespace: "",
  key: "",
  value: "",
  type: "string" as MetafieldType,
};

export function MetafieldsEditor({ entityType, entityId }: MetafieldsEditorProps) {
  const [metafields, setMetafields] = useState<Metafield[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMetafields = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Metafield[] | { metafields: Metafield[] }>(
        `/admin/${entityType}/${entityId}/metafields`
      );
      setMetafields(Array.isArray(data) ? data : (data.metafields ?? []));
    } catch {
      toast({ title: "Failed to load metafields", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchMetafields();
  }, [fetchMetafields]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(metafield: Metafield) {
    setEditingId(metafield.id);
    setForm({
      namespace: metafield.namespace ?? "",
      key: metafield.key,
      value: getMetafieldValue(metafield),
      type: metafield.type,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.key.trim()) {
      toast({ title: "Key is required", variant: "destructive" });
      return;
    }
    if (!form.value.trim()) {
      toast({ title: "Value is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const body = {
        namespace: form.namespace.trim() || null,
        key: form.key.trim(),
        value: form.value.trim(),
        type: form.type,
      };

      if (editingId) {
        await apiFetch(`/admin/metafields/${entityType}/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Metafield updated" });
      } else {
        await apiFetch(`/admin/${entityType}/${entityId}/metafields`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Metafield created" });
      }

      setDialogOpen(false);
      fetchMetafields();
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      toast({
        title: editingId ? "Failed to update metafield" : "Failed to create metafield",
        description: msg.includes("unique constraint") ? "A metafield with this key already exists." : msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await apiFetch(`/admin/metafields/${entityType}/${id}`, {
        method: "DELETE",
      });
      toast({ title: "Metafield deleted" });
      setDeleteConfirmId(null);
      fetchMetafields();
    } catch {
      toast({ title: "Failed to delete metafield", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  function truncateValue(val: string, max = 60) {
    return val.length > max ? val.slice(0, max) + "..." : val;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Metafields</CardTitle>
          <CardDescription>
            Custom data fields for this {entityType.replace(/s$/, "")}
          </CardDescription>
        </div>
        <Button type="button" size="sm" onClick={openCreateDialog}>
          <Plus className="size-4 mr-1" />
          Add Metafield
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : metafields.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No metafields yet. Click &quot;Add Metafield&quot; to create one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namespace</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metafields.map((mf) => (
                <TableRow key={mf.id}>
                  <TableCell className="text-muted-foreground">
                    {mf.namespace ?? <span className="italic">--</span>}
                  </TableCell>
                  <TableCell className="font-medium">{mf.key}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <span className="font-mono text-xs">
                      {truncateValue(getMetafieldValue(mf))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{mf.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(mf)}
                        aria-label={`Edit metafield ${mf.namespace}.${mf.key}`}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(mf.id)}
                        aria-label={`Delete metafield ${mf.namespace}.${mf.key}`}
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Metafield" : "Add Metafield"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the metafield values below."
                : "Fill in the details to create a new metafield."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="mf-namespace">Namespace (optional)</Label>
              <Input
                id="mf-namespace"
                placeholder="e.g. custom"
                value={form.namespace}
                onChange={(e) =>
                  setForm((f) => ({ ...f, namespace: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mf-key">Key</Label>
              <Input
                id="mf-key"
                placeholder="e.g. color"
                value={form.key}
                onChange={(e) =>
                  setForm((f) => ({ ...f, key: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mf-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, type: val as MetafieldType }))
                }
              >
                <SelectTrigger id="mf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METAFIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mf-value">Value</Label>
              <Input
                id="mf-value"
                placeholder="Enter value"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Metafield</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this metafield? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
