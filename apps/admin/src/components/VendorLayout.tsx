import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { brand } from "@/config/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Menu,
  Monitor,
  Moon,
  Package,
  PanelLeft,
  Search,
  ShoppingCart,
  Star,
  Store,
  Sun,
} from "lucide-react";

// ─── Nav model ──────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  keywords?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: "home overview kpi" },
  { to: "/vendor/analytics", label: "Analytics", icon: BarChart3, keywords: "report chart revenue" },
  { to: "/vendor/products", label: "Products", icon: Package, keywords: "catalog inventory listing" },
  { to: "/vendor/orders", label: "Orders", icon: ShoppingCart, keywords: "sales fulfilment shipping" },
  { to: "/vendor/messages", label: "Messages", icon: MessageSquare, keywords: "chat customer inbox quote" },
  { to: "/vendor/reviews", label: "Reviews", icon: Star, keywords: "rating feedback" },
];

const BREADCRUMB: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((n) => [n.to, n.label])
);

// ─── Theme toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const icon =
    theme === "dark" ? <Moon className="size-4" aria-hidden /> :
    theme === "light" ? <Sun className="size-4" aria-hidden /> :
    <Monitor className="size-4" aria-hidden />;
  const label =
    theme === "dark" ? "Dark mode" :
    theme === "light" ? "Light mode" :
    "System theme";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={toggleTheme}
          aria-label={`Switch theme (currently ${label})`}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label} — click to cycle</TooltipContent>
    </Tooltip>
  );
}

// ─── Search palette ─────────────────────────────────────────────────────────

function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter((n) =>
      `${n.label} ${n.keywords ?? ""}`.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  function go(item: NavItem) {
    onOpenChange(false);
    navigate(item.to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && matches[activeIdx]) {
      e.preventDefault();
      go(matches[activeIdx]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search vendor hub</DialogTitle>
        <DialogDescription className="sr-only">
          Type to filter pages, use arrow keys to navigate, Enter to open.
        </DialogDescription>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, orders, products…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search the vendor hub"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches for &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul role="listbox">
              {matches.map((m, idx) => (
                <li key={m.to}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === activeIdx}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => go(m)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      idx === activeIdx
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/90"
                    )}
                  >
                    <m.icon className="size-4 text-muted-foreground" aria-hidden />
                    <span className="flex-1 font-medium">{m.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {m.to}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate ·{" "}
            <kbd className="font-mono">⏎</kbd> open ·{" "}
            <kbd className="font-mono">esc</kbd> close
          </span>
          <span>{matches.length} result{matches.length === 1 ? "" : "s"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Notifications popover (empty stub until /vendor/notifications exists) ──

function VendorNotifications() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            You&apos;re all caught up
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Bell className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-sm font-medium">No notifications</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            You&apos;ll see real-time order and customer-message alerts here.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Sidebar (shared desktop + mobile) ──────────────────────────────────────

function SidebarContent({
  collapsed,
  onItemClick,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const { actor, logout } = useAuth();
  return (
    <>
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b px-4",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Store className="size-3.5 text-white" aria-hidden />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold tracking-tight">
            {brand.shortName} · Vendor
          </span>
        )}
      </div>

      {/* Nav */}
      <nav
        className={cn(
          "flex flex-1 flex-col overflow-y-auto",
          collapsed ? "items-center gap-1 px-2 py-3" : "gap-px p-3"
        )}
        aria-label="Vendor navigation"
      >
        {!collapsed && (
          <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Store
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const link = (
            <NavLink
              to={item.to}
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-lg font-medium transition-colors",
                  collapsed
                    ? "size-10 justify-center"
                    : "gap-2.5 px-2.5 py-2 text-sm",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
              aria-label={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn("shrink-0", collapsed ? "size-[18px]" : "size-4")}
                aria-hidden
              />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
          // Only show a tooltip when the sidebar is collapsed — wrapping the
          // NavLink in a TooltipTrigger asChild while expanded was clashing
          // with NavLink's function-style className and stripping flex/gap.
          if (!collapsed) return <div key={item.to}>{link}</div>;
          return (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t p-3">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-semibold">
              VD
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium leading-none">
                  Vendor account
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {actor?.vendorId?.slice(0, 8)}…
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={logout}
                    aria-label="Sign out"
                  >
                    <LogOut className="size-3.5" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export function VendorLayout() {
  const { actor, logout } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("vendor-sidebar-collapsed") === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("vendor-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Update document title per route
  useEffect(() => {
    const label = BREADCRUMB[location.pathname] ?? "Vendor";
    document.title = `${label} · ${brand.titleSuffix}`;
  }, [location.pathname]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Hotkeys: ⌘K for search, ⌘B for sidebar collapse
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const currentLabel = BREADCRUMB[location.pathname] ?? "";

  const toggleSidebar = useCallback(() => setCollapsed((v) => !v), []);

  return (
    <TooltipProvider delayDuration={0}>
      {/* Skip link — WCAG 2.4.1 */}
      <a
        href="#vendor-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="vendor-a11y-status"
      />

      <div className="flex h-screen overflow-hidden bg-background">
        {/* ── Desktop sidebar ──────────────────────────────────────────── */}
        <aside
          aria-label="Vendor navigation"
          className={cn(
            "hidden shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex",
            collapsed ? "w-16" : "w-56"
          )}
        >
          <SidebarContent collapsed={collapsed} />
        </aside>

        {/* ── Mobile drawer ────────────────────────────────────────────── */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0 [&>button]:hidden">
            <SheetTitle className="sr-only">Vendor navigation</SheetTitle>
            <div className="flex h-full flex-col">
              <SidebarContent collapsed={false} onItemClick={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Main column ──────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header
            role="banner"
            className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 md:px-4"
          >
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" aria-hidden />
            </Button>

            {/* Desktop sidebar collapse toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden size-8 text-muted-foreground md:flex"
                  onClick={toggleSidebar}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-expanded={!collapsed}
                >
                  <PanelLeft className="size-4" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {collapsed ? "Expand" : "Collapse"} sidebar (⌘B)
              </TooltipContent>
            </Tooltip>

            {/* Breadcrumb */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Vendor Hub</span>
              {currentLabel && (
                <>
                  <ChevronRight
                    className="size-3 text-muted-foreground/40"
                    aria-hidden
                  />
                  <span className="truncate text-xs font-medium text-foreground">
                    {currentLabel}
                  </span>
                </>
              )}
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-1">
              {/* Search button (opens command palette) */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 gap-2 px-3 text-muted-foreground sm:flex"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search (⌘K)"
              >
                <Search className="size-3.5" aria-hidden />
                <span className="text-xs">Search…</span>
                <kbd className="hidden lg:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>
              {/* Mobile/SM search icon */}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground sm:hidden"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search (⌘K)"
              >
                <Search className="size-4" aria-hidden />
              </Button>

              <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

              <ThemeToggle />
              <VendorNotifications />

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 gap-2 px-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        VD
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-xs font-medium sm:inline">
                      Vendor
                    </span>
                    <ChevronDown
                      className="size-3 text-muted-foreground"
                      aria-hidden
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">Vendor account</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {actor?.vendorId ?? "—"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-4" aria-hidden />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main
            id="vendor-main-content"
            role="main"
            className="flex-1 overflow-y-auto p-6"
            tabIndex={-1}
          >
            <Outlet />
          </main>
        </div>
      </div>

      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </TooltipProvider>
  );
}
