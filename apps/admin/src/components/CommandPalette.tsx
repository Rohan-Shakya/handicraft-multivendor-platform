import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatShortcut } from "@/hooks/useHotkeys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Store,
  Users,
  Package,
  FolderOpen,
  ShoppingCart,
  CreditCard,
  Percent,
  Star,
  FileText,
  BookOpen,
  Webhook,
  UserCog,
  ScrollText,
  Calculator,
  Settings,
  Scale,
  FileIcon,
  Search,
  Plus,
  ShieldCheck,
  ClipboardList,
  Undo2,
  Wallet,
  LogOut,
  Keyboard,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  category: "navigation" | "actions" | "create" | "system";
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Category labels & order                                                    */
/* -------------------------------------------------------------------------- */

const CATEGORY_LABELS: Record<string, string> = {
  actions: "Quick Actions",
  create: "Create New",
  navigation: "Go To",
  system: "System",
};

const CATEGORY_ORDER = ["actions", "create", "navigation", "system"];

/* -------------------------------------------------------------------------- */
/*  CommandPalette                                                             */
/* -------------------------------------------------------------------------- */

export function CommandPalette({ open, onOpenChange, onShowShortcuts }: CommandPaletteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close and navigate
  const go = useCallback(
    (path: string) => {
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange]
  );

  const doAction = useCallback(
    (fn: () => void) => {
      onOpenChange(false);
      fn();
    },
    [onOpenChange]
  );

  /* -- All available commands ---------------------------------------------- */
  const commands: CommandItem[] = useMemo(
    () => [
      // Quick actions
      {
        id: "search-orders",
        label: "Search orders",
        icon: ShoppingCart,
        category: "actions",
        action: () => go("/orders"),
        keywords: ["find", "order", "lookup"],
      },
      {
        id: "search-customers",
        label: "Search customers",
        icon: Users,
        category: "actions",
        action: () => go("/customers"),
        keywords: ["find", "customer", "lookup"],
      },
      {
        id: "search-products",
        label: "Search products",
        icon: Package,
        category: "actions",
        action: () => go("/catalog/products"),
        keywords: ["find", "product", "lookup"],
      },
      {
        id: "keyboard-shortcuts",
        label: "Keyboard shortcuts",
        icon: Keyboard,
        category: "actions",
        shortcut: "?",
        action: () => {
          onOpenChange(false);
          onShowShortcuts();
        },
        keywords: ["help", "hotkey", "shortcut"],
      },

      // Create new
      {
        id: "create-product",
        label: "Create product",
        icon: Plus,
        category: "create",
        action: () => go("/catalog/products/new"),
        keywords: ["new", "add", "product"],
      },
      {
        id: "create-order",
        label: "Create draft order",
        icon: Plus,
        category: "create",
        action: () => go("/orders/new"),
        keywords: ["new", "add", "order", "draft", "invoice", "custom"],
      },
      {
        id: "create-customer",
        label: "Create customer",
        icon: Plus,
        category: "create",
        action: () => go("/customers/new"),
        keywords: ["new", "add", "customer"],
      },
      {
        id: "create-collection",
        label: "Create collection",
        icon: Plus,
        category: "create",
        action: () => go("/catalog/collections/new"),
        keywords: ["new", "add", "collection"],
      },
      {
        id: "create-discount",
        label: "Create discount",
        icon: Plus,
        category: "create",
        action: () => go("/discounts/new"),
        keywords: ["new", "add", "discount", "coupon"],
      },
      {
        id: "create-campaign",
        label: "Create campaign",
        icon: Plus,
        category: "create",
        action: () => go("/marketing/campaigns/new"),
        keywords: ["new", "add", "campaign", "sale", "promotion", "11.11", "banner"],
      },
      {
        id: "create-page",
        label: "Create page",
        icon: Plus,
        category: "create",
        action: () => go("/content/pages/new"),
        keywords: ["new", "add", "page", "cms"],
      },
      {
        id: "create-blog-post",
        label: "Create blog post",
        icon: Plus,
        category: "create",
        action: () => go("/content/blog-posts/new"),
        keywords: ["new", "add", "blog", "post", "article"],
      },

      // Navigation
      {
        id: "nav-dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        category: "navigation",
        shortcut: "g then d",
        action: () => go("/"),
        keywords: ["home", "overview"],
      },
      {
        id: "nav-vendors",
        label: "Vendors",
        icon: Store,
        category: "navigation",
        action: () => go("/vendors"),
        keywords: ["seller", "merchant"],
      },
      {
        id: "nav-vendor-approvals",
        label: "Vendor Approvals",
        icon: ShieldCheck,
        category: "navigation",
        action: () => go("/vendors/approvals"),
        keywords: ["pending", "approve", "reject"],
      },
      {
        id: "nav-vendor-kyc",
        label: "Vendor KYC",
        icon: ClipboardList,
        category: "navigation",
        action: () => go("/vendors/kyc"),
        keywords: ["verification", "identity"],
      },
      {
        id: "nav-customers",
        label: "Customers",
        icon: Users,
        category: "navigation",
        action: () => go("/customers"),
        keywords: ["buyer", "user"],
      },
      {
        id: "nav-products",
        label: "Products",
        icon: Package,
        category: "navigation",
        shortcut: "g then p",
        action: () => go("/catalog/products"),
        keywords: ["item", "catalog"],
      },
      {
        id: "nav-collections",
        label: "Collections",
        icon: FolderOpen,
        category: "navigation",
        action: () => go("/catalog/collections"),
        keywords: ["group", "category"],
      },
      {
        id: "nav-orders",
        label: "Orders",
        icon: ShoppingCart,
        category: "navigation",
        shortcut: "g then o",
        action: () => go("/orders"),
        keywords: ["purchase", "sale"],
      },
      {
        id: "nav-returns",
        label: "Returns",
        icon: Undo2,
        category: "navigation",
        action: () => go("/orders/returns"),
        keywords: ["refund", "rma"],
      },
      {
        id: "nav-refunds",
        label: "Refunds",
        icon: Wallet,
        category: "navigation",
        action: () => go("/orders/refunds"),
        keywords: ["money back", "reimburse"],
      },
      {
        id: "nav-payments",
        label: "Payments",
        icon: CreditCard,
        category: "navigation",
        action: () => go("/payments"),
        keywords: ["transaction", "charge"],
      },
      {
        id: "nav-payouts",
        label: "Payouts",
        icon: Wallet,
        category: "navigation",
        action: () => go("/payments/payouts"),
        keywords: ["vendor payment", "disbursement"],
      },
      {
        id: "nav-discounts",
        label: "Discounts",
        icon: Percent,
        category: "navigation",
        action: () => go("/discounts"),
        keywords: ["coupon", "promo", "sale"],
      },
      {
        id: "nav-reviews",
        label: "Reviews",
        icon: Star,
        category: "navigation",
        action: () => go("/reviews"),
        keywords: ["rating", "feedback"],
      },
      {
        id: "nav-pages",
        label: "Pages",
        icon: FileText,
        category: "navigation",
        action: () => go("/content/pages"),
        keywords: ["cms", "content"],
      },
      {
        id: "nav-blogs",
        label: "Blog Posts",
        icon: BookOpen,
        category: "navigation",
        action: () => go("/content/blogs"),
        keywords: ["article", "blog"],
      },
      {
        id: "nav-files",
        label: "Files",
        icon: FileIcon,
        category: "navigation",
        action: () => go("/content/files"),
        keywords: ["media", "upload", "image"],
      },
      {
        id: "nav-audit-logs",
        label: "Audit Logs",
        icon: ScrollText,
        category: "navigation",
        action: () => go("/system/audit-logs"),
        keywords: ["history", "activity"],
      },
      {
        id: "nav-webhooks",
        label: "Webhooks",
        icon: Webhook,
        category: "navigation",
        action: () => go("/system/webhooks"),
        keywords: ["endpoint", "integration"],
      },
      {
        id: "nav-users",
        label: "Users & Roles",
        icon: UserCog,
        category: "navigation",
        action: () => go("/system/users"),
        keywords: ["staff", "admin", "permission"],
      },
      {
        id: "nav-commission",
        label: "Commission Rules",
        icon: Calculator,
        category: "navigation",
        action: () => go("/system/commission-rules"),
        keywords: ["fee", "rate"],
      },
      {
        id: "nav-preferences",
        label: "Preferences",
        icon: Settings,
        category: "navigation",
        shortcut: "g then s",
        action: () => go("/system/preferences"),
        keywords: ["settings", "config"],
      },
      {
        id: "nav-policies",
        label: "Policies",
        icon: Scale,
        category: "navigation",
        action: () => go("/system/policies"),
        keywords: ["terms", "privacy", "legal"],
      },

      // System
      {
        id: "sign-out",
        label: "Sign out",
        icon: LogOut,
        category: "system",
        action: () => doAction(logout),
        keywords: ["logout", "exit"],
      },
    ],
    [go, doAction, logout, onOpenChange, onShowShortcuts]
  );

  /* -- Filter commands by query ------------------------------------------- */
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;

    const q = query.toLowerCase().trim();
    const terms = q.split(/\s+/);

    return commands.filter((cmd) => {
      const searchable = [
        cmd.label.toLowerCase(),
        cmd.description?.toLowerCase() ?? "",
        ...(cmd.keywords ?? []),
      ].join(" ");

      return terms.every((term) => searchable.includes(term));
    });
  }, [commands, query]);

  /* -- Group by category -------------------------------------------------- */
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      (groups[item.category] ??= []).push(item);
    }
    return CATEGORY_ORDER
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat]!, items: groups[cat]! }));
  }, [filtered]);

  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  /* -- Reset on open/query change ----------------------------------------- */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Focus input after dialog animation
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  /* -- Keyboard navigation ------------------------------------------------ */
  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        flatItems[selectedIndex]?.action();
        break;
      case "Escape":
        onOpenChange(false);
        break;
    }
  }

  /* -- Scroll selected item into view ------------------------------------- */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  /* -- Close on navigation ------------------------------------------------ */
  useEffect(() => {
    onOpenChange(false);
  }, [location.pathname]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 sm:max-w-[540px] gap-0 rounded-xl top-[30%] translate-y-[-30%]"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Type to search commands and navigate. Use arrow keys to move and Enter to select.
        </DialogDescription>
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[320px] overflow-y-auto overscroll-contain"
          role="listbox"
          aria-label="Command results"
        >
          {flatItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No results found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term.
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category} role="group" aria-label={group.label}>
                <div className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const index = flatItems.indexOf(item);
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors outline-none",
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/50"
                      )}
                      onClick={() => item.action()}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {formatShortcut(item.shortcut)}
                        </kbd>
                      )}
                      <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Keyboard shortcuts help dialog                                             */
/* -------------------------------------------------------------------------- */

interface ShortcutItem {
  keys: string;
  label: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: "mod+k", label: "Open command palette" },
      { keys: "?", label: "Show keyboard shortcuts" },
      { keys: "mod+shift+p", label: "Open command palette" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: "g then d", label: "Go to Dashboard" },
      { keys: "g then o", label: "Go to Orders" },
      { keys: "g then p", label: "Go to Products" },
      { keys: "g then c", label: "Go to Customers" },
      { keys: "g then v", label: "Go to Vendors" },
      { keys: "g then s", label: "Go to Settings" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: "c then p", label: "Create product" },
      { keys: "c then o", label: "Create order" },
      { keys: "c then d", label: "Create discount" },
    ],
  },
];

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl">
        <div className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Use these shortcuts to navigate quickly.
          </DialogDescription>
        </div>

        <div className="max-h-[400px] overflow-y-auto px-6 py-4 space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{s.label}</span>
                    <ShortcutKeys keys={s.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t text-xs text-muted-foreground">
          Press <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">?</kbd> anywhere
          to toggle this panel.
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutKeys({ keys }: { keys: string }) {
  const formatted = formatShortcut(keys);
  const parts = formatted.split(/\s+/);

  return (
    <span className="flex items-center gap-1">
      {parts.map((part, i) => (
        <span key={i}>
          {part === "→" ? (
            <span className="text-muted-foreground text-xs mx-0.5">then</span>
          ) : (
            <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
              {part}
            </kbd>
          )}
        </span>
      ))}
    </span>
  );
}
