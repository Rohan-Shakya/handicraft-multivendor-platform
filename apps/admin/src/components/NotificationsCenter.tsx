import * as React from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  AlertCircle,
  CircleAlert,
  CircleCheck,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type AdminNotification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const severityIcon: Record<NonNullable<AdminNotification["severity"]>, React.ReactNode> = {
  info: <Info className="size-4 text-sky-500" />,
  success: <CircleCheck className="size-4 text-emerald-500" />,
  warning: <CircleAlert className="size-4 text-amber-500" />,
  error: <AlertCircle className="size-4 text-destructive" />,
};

/**
 * Bell-icon dropdown listing admin notifications. Polls every 30s via the
 * `useNotifications` hook. Click-to-read marks individual items; "Mark all
 * read" clears the unread badge in one shot.
 */
export function NotificationsCenter() {
  const { notifications, unread, markAsRead, markAllRead, isLoading } =
    useNotifications();

  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        >
          <Bell className="size-4" aria-hidden />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 grid size-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0
                ? `${unread} unread`
                : "You're all caught up"}
            </p>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="size-3.5" aria-hidden /> Mark all
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[420px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center">
              <Bell className="mx-auto mb-2 size-8 text-muted-foreground/50" aria-hidden />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">
                You'll see real-time order and vendor alerts here.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const unread = !n.readAt;
                const Row: React.FC<{ children: React.ReactNode }> = ({ children }) =>
                  n.actionUrl ? (
                    <Link
                      to={n.actionUrl}
                      onClick={() => {
                        if (unread) markAsRead(n.id);
                        setOpen(false);
                      }}
                      className="block"
                    >
                      {children}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => unread && markAsRead(n.id)}
                      className="block w-full text-left"
                    >
                      {children}
                    </button>
                  );

                return (
                  <li key={n.id}>
                    <Row>
                      <div
                        className={cn(
                          "flex items-start gap-3 px-3 py-2.5 hover:bg-accent/40",
                          unread && "bg-primary/5"
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {severityIcon[n.severity ?? "info"]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm",
                              unread && "font-semibold"
                            )}
                          >
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {n.body}
                            </p>
                          )}
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {formatRelative(n.createdAt)}
                          </p>
                        </div>
                        {unread && (
                          <span
                            aria-hidden
                            className="mt-1 size-1.5 shrink-0 rounded-full bg-primary"
                          />
                        )}
                      </div>
                    </Row>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
