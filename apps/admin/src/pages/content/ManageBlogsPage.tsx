import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PaginatedResponse } from "@repo/types";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

const LIMIT = 20;

interface BlogRow {
  id: string;
  title: string;
  handle: string;
  status: string;
  commentStatus: string;
  updatedAt: string;
}

const COMMENT_LABELS: Record<string, string> = {
  enabled: "Comments enabled",
  moderated: "Comments moderated",
  disabled: "Comments disabled",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ManageBlogsPage() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<BlogRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBlogs = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<BlogRow>>(
        `/admin/blogs?page=${page}&limit=${LIMIT}`,
        { signal }
      );
      setBlogs(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({
          title: "Failed to load blogs",
          description: e.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();
    loadBlogs(controller.signal);
    return () => controller.abort();
  }, [loadBlogs]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/blogs/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: `Blog "${deleteTarget.title}" deleted` });
      setDeleteTarget(null);
      loadBlogs();
    } catch (e: any) {
      toast({
        title: "Failed to delete blog",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage blogs"
        description="Create and manage your blogs."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/content/blogs")}
            >
              <ArrowLeftIcon className="size-4" />
              Back to posts
            </Button>
            <Button onClick={() => navigate("/content/blogs/new")}>
              <PlusIcon className="size-4" />
              Add blog
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden border shadow-none">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <EmptyState
            icon={BookOpenIcon}
            title="No blogs yet"
            description="Create your first blog to start organizing your posts."
            action={
              <Button onClick={() => navigate("/content/blogs/new")}>
                <PlusIcon className="size-4" /> Add blog
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold">Comments</TableHead>
                  <TableHead className="font-semibold">Updated</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs.map((b) => (
                  <TableRow
                    key={b.id}
                    className="group cursor-pointer"
                    tabIndex={0}
                    role="link"
                    onClick={() => navigate(`/content/blogs/${b.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/content/blogs/${b.id}`);
                      }
                    }}
                  >
                    <TableCell>
                      <p className="font-medium">{b.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                        /{b.handle}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {COMMENT_LABELS[b.commentStatus] ?? b.commentStatus}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(b.updatedAt)}
                    </TableCell>
                    <TableCell className="w-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            aria-label="Blog actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/content/blogs/${b.id}`);
                            }}
                          >
                            <PencilIcon className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(b);
                            }}
                          >
                            <Trash2Icon className="size-4 mr-2" />
                            Delete
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

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete blog"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This will also remove all posts in this blog. This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
