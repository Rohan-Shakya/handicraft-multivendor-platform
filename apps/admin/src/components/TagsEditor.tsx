import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { XIcon, PlusIcon, TagIcon } from "lucide-react";

interface TagsEditorProps {
  tags: string[];
  onAdd: (tags: string[]) => Promise<void>;
  onRemove: (tag: string) => Promise<void>;
  placeholder?: string;
}

export function TagsEditor({
  tags,
  onAdd,
  onRemove,
  placeholder = "Add a tag",
}: TagsEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [removingTag, setRemovingTag] = useState<string | null>(null);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addFromInput();
    }
  }

  function addFromInput() {
    const newTags = inputValue
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .filter((t) => !tags.includes(t) && !pendingTags.includes(t));

    if (newTags.length > 0) {
      setPendingTags((prev) => [...prev, ...newTags]);
    }
    setInputValue("");
  }

  function removePendingTag(tag: string) {
    setPendingTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSave() {
    if (pendingTags.length === 0) {
      setDialogOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onAdd(pendingTags);
      toast({ title: `Added ${pendingTags.length} tag${pendingTags.length > 1 ? "s" : ""}` });
      setPendingTags([]);
      setInputValue("");
      setDialogOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to add tags",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(tag: string) {
    setRemovingTag(tag);
    try {
      await onRemove(tag);
      toast({ title: `Removed tag "${tag}"` });
    } catch (e: any) {
      toast({
        title: "Failed to remove tag",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setRemovingTag(null);
    }
  }

  function handleOpenDialog() {
    setPendingTags([]);
    setInputValue("");
    setDialogOpen(true);
  }

  return (
    <div className="space-y-3">
      {/* Existing tags */}
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No tags</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="rounded-full pl-2.5 pr-1 py-0.5 gap-1 text-xs font-normal"
            >
              {tag}
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors disabled:opacity-50"
                onClick={() => handleRemove(tag)}
                disabled={removingTag === tag}
              >
                <XIcon className="size-3" />
                <span className="sr-only">Remove {tag}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add tags button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={handleOpenDialog}
      >
        <PlusIcon className="size-3 mr-1" />
        Add tags
      </Button>

      {/* Add tags dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="size-4" />
              Add tags
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="flex-1"
                autoFocus
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addFromInput}
                disabled={inputValue.trim().length === 0}
              >
                Add
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Type a tag and press Enter. Use commas to add multiple tags at once.
            </p>

            {/* Pending tags */}
            {pendingTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tags to add
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pendingTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="rounded-full pl-2.5 pr-1 py-0.5 gap-1 text-xs font-normal"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                        onClick={() => removePendingTag(tag)}
                      >
                        <XIcon className="size-3" />
                        <span className="sr-only">Remove {tag}</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={pendingTags.length === 0 || saving}
            >
              {saving ? "Saving..." : `Save${pendingTags.length > 0 ? ` (${pendingTags.length})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
