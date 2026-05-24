import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RouteBreadcrumb } from "@/components/ui/breadcrumb";
import { CommandPalette, ShortcutsDialog } from "@/components/CommandPalette";
import { NotificationsCenter } from "@/components/NotificationsCenter";
import { VendorSwitcher } from "@/components/VendorSwitcher";
import { useHotkeys } from "@/hooks/useHotkeys";
import type { HotkeyDef } from "@/hooks/useHotkeys";
import {
  LayoutDashboard,
  Store,
  Users,
  Package,
  FolderOpen,
  Filter as FilterIcon,
  ShoppingCart,
  CreditCard,
  Percent,
  Megaphone,
  Mail,
  Star,
  FileText,
  BookOpen,
  ScrollText,
  Webhook,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Menu,
  ShieldCheck,
  ClipboardList,
  Undo2,
  Wallet,
  ChevronDown,
  Calculator,
  FileIcon,
  PanelLeft,
  Settings,
  Scale,
  Landmark,
  Truck,
  BarChart3,
  Gift,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

/* -------------------------------------------------------------------------- */
/*  Sidebar collapse context                                                   */
/* -------------------------------------------------------------------------- */

const SidebarContext = createContext({ collapsed: false, toggle: () => {} });
function useSidebar() {
  return useContext(SidebarContext);
}

/* -------------------------------------------------------------------------- */
/*  Navigation config                                                          */
/* -------------------------------------------------------------------------- */

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
}

interface NavGroup {
  section: string;
  items: NavItem[];
  subItems?: Record<string, NavItem[]>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: "MAIN",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    section: "MARKETPLACE",
    items: [
      { to: "/vendors", label: "Vendors", icon: Store, end: true },
      { to: "/customers", label: "Customers", icon: Users, end: true },
    ],
    subItems: {
      "/vendors": [
        { to: "/vendors/approvals", label: "Approvals", icon: ShieldCheck },
        { to: "/vendors/kyc", label: "KYC Review", icon: ClipboardList },
      ],
      "/customers": [
        { to: "/customers/segments", label: "Segments", icon: Users },
      ],
    },
  },
  {
    section: "CATALOG",
    items: [
      { to: "/catalog/products", label: "Products", icon: Package },
      { to: "/catalog/collections", label: "Collections", icon: FolderOpen },
      { to: "/catalog/filters", label: "Filters", icon: FilterIcon },
    ],
  },
  {
    section: "COMMERCE",
    items: [
      { to: "/orders", label: "Orders", icon: ShoppingCart, end: true },
      { to: "/payments", label: "Payments", icon: CreditCard, end: true },
      { to: "/discounts", label: "Discounts", icon: Percent },
      { to: "/marketing/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/marketing/newsletter", label: "Newsletter", icon: Mail },
    ],
    subItems: {
      "/orders": [
        { to: "/orders/returns", label: "Returns", icon: Undo2 },
        { to: "/orders/refunds", label: "Refunds", icon: Wallet },
      ],
      "/payments": [
        { to: "/payments/payouts", label: "Payouts", icon: Wallet },
      ],
    },
  },
  {
    section: "ENGAGEMENT",
    items: [
      { to: "/reviews", label: "Reviews", icon: Star },
      { to: "/content/pages", label: "Pages", icon: FileText },
      { to: "/content/blogs", label: "Blogs", icon: BookOpen },
      { to: "/content/files", label: "Files", icon: FileIcon },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { to: "/system/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/system/audit-logs", label: "Audit Logs", icon: ScrollText },
      { to: "/system/webhooks", label: "Webhooks", icon: Webhook },
      { to: "/system/users", label: "Users & Roles", icon: UserCog },
      { to: "/system/commission-rules", label: "Commission Rules", icon: Calculator },
      { to: "/system/shipping", label: "Shipping", icon: Truck },
      { to: "/system/tax", label: "Tax", icon: Landmark },
      { to: "/system/gift-cards", label: "Gift Cards", icon: Gift },
      { to: "/system/preferences", label: "Preferences", icon: Settings },
      { to: "/system/policies", label: "Policies", icon: Scale },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Page transition animation                                                  */
/* -------------------------------------------------------------------------- */

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/* -------------------------------------------------------------------------- */
/*  AdminLayout                                                                */
/* -------------------------------------------------------------------------- */

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const icon = theme === "dark" ? <Moon className="size-4" /> : theme === "light" ? <Sun className="size-4" /> : <Monitor className="size-4" />;
  const label = theme === "dark" ? "Dark mode" : theme === "light" ? "Light mode" : "System theme";

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
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { actor, logout } = useAuth();
  const location = useLocation();
  const nav = useNavigate();

  // Default per-route document title — derived from the URL so SR users get
  // an orientation cue on every navigation. Pages that want a richer title
  // (e.g. "Order #1234") can override via `useDocumentTitle` inside the page.
  useEffect(() => {
    const seg = location.pathname.split("/").filter(Boolean)[0] ?? "dashboard";
    const label = seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    document.title = `${label} · ${brand.titleSuffix}`;
  }, [location.pathname]);

  const initials = (actor?.role ?? "AD")
    .split("_")
    .map((w: string) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  const toggle = () => setCollapsed((c) => !c);

  /* -- Global keyboard shortcuts ------------------------------------------ */
  const openCmd = useCallback(() => setCommandOpen(true), []);
  const toggleShortcuts = useCallback(() => setShortcutsOpen((v) => !v), []);

  const hotkeys: HotkeyDef[] = [
    { key: "mod+k", label: "Open command palette", category: "General", handler: openCmd },
    { key: "mod+shift+p", label: "Open command palette", category: "General", handler: openCmd },

    { key: "?", label: "Show keyboard shortcuts", category: "General", handler: toggleShortcuts },

    { key: "g then d", label: "Go to Dashboard", category: "Navigation", handler: () => nav("/") },
    { key: "g then o", label: "Go to Orders", category: "Navigation", handler: () => nav("/orders") },
    { key: "g then p", label: "Go to Products", category: "Navigation", handler: () => nav("/catalog/products") },
    { key: "g then c", label: "Go to Customers", category: "Navigation", handler: () => nav("/customers") },
    { key: "g then v", label: "Go to Vendors", category: "Navigation", handler: () => nav("/vendors") },
    { key: "g then s", label: "Go to Settings", category: "Navigation", handler: () => nav("/system/preferences") },

    { key: "c then p", label: "Create product", category: "Actions", handler: () => nav("/catalog/products/new") },
    { key: "c then o", label: "Create order", category: "Actions", handler: () => nav("/orders") },
    { key: "c then d", label: "Create discount", category: "Actions", handler: () => nav("/discounts/new") },
  ];

  useHotkeys(hotkeys);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <TooltipProvider delayDuration={0}>
        {/* Skip to main content — WCAG 2.4.1 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Skip to main content
        </a>

        {/* Live region for toast/status announcements — WCAG 4.1.3 */}
        <div aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-status" />

        <div className="flex h-screen overflow-hidden bg-background">
          {/* ── Desktop Sidebar ──────────────────────────────────────── */}
          <motion.aside
            role="navigation"
            aria-label="Main navigation"
            initial={false}
            animate={{ width: collapsed ? 64 : 240 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden md:flex shrink-0 flex-col border-r bg-card text-foreground overflow-hidden"
          >
            <SidebarContent
              collapsed={collapsed}
              initials={initials}
              actor={actor}
              logout={logout}
              toggle={toggle}
            />
          </motion.aside>

          {/* ── Mobile Sidebar (Sheet) ───────────────────────────────── */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-[260px] p-0 bg-card text-foreground border-r-0">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <SheetDescription className="sr-only">
                Marketplace admin navigation
              </SheetDescription>
              <SidebarContent
                collapsed={false}
                initials={initials}
                actor={actor}
                logout={logout}
                toggle={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* ── Main area ────────────────────────────────────────────── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <header role="banner" className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4 md:px-6">
              {/* Mobile hamburger */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden size-8 text-muted-foreground"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="size-4" aria-hidden />
              </Button>

              {/* Desktop sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex size-8 text-muted-foreground"
                onClick={toggle}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
              >
                <PanelLeft className="size-4" aria-hidden />
              </Button>

              {/* Breadcrumb */}
              <div className="flex-1 min-w-0">
                <RouteBreadcrumb />
              </div>

              {/* Right side */}
              <div className="flex items-center gap-1">
                {/* Search — opens command palette */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex gap-2 text-muted-foreground h-8 px-3"
                  onClick={() => setCommandOpen(true)}
                  aria-label="Open search (⌘K)"
                >
                  <Search className="size-3.5" />
                  <span className="text-xs">Search...</span>
                  <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                    <span className="text-xs">&#8984;</span>K
                  </kbd>
                </Button>

                <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

                {/* Vendor switcher (visible only for multi-vendor users) */}
                <VendorSwitcher />

                {/* Theme toggle */}
                <ThemeToggle />

                {/* Notifications (polled) */}
                <NotificationsCenter />

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 gap-2 px-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline text-xs font-medium capitalize">
                        {actor?.role?.replace(/_/g, " ") ?? "Admin"}
                      </span>
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium capitalize">
                        {actor?.role?.replace(/_/g, " ") ?? "Admin"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {actor?.type ?? "admin"}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                      <LogOut className="size-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Content with page transition */}
            <main id="main-content" className="flex-1 min-h-0 overflow-y-auto" tabIndex={-1}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="p-4 md:p-8"
                >
                  {/* Nested boundary so a page-level render error doesn't
                      kill the sidebar/header. The boundary remounts on
                      route change via the location.pathname key above. */}
                  <ErrorBoundary>
                    <Outlet />
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </TooltipProvider>
      {/* Command Palette (⌘K) */}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Keyboard Shortcuts Help */}
      <ShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </SidebarContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar content (shared between desktop & mobile)                          */
/* -------------------------------------------------------------------------- */

interface SidebarContentProps {
  collapsed: boolean;
  initials: string;
  actor: { role?: string; type?: string } | null;
  logout: () => void;
  toggle: () => void;
  onNavigate?: () => void;
}

function SidebarContent({
  collapsed,
  initials,
  actor,
  logout,
  toggle,
  onNavigate,
}: SidebarContentProps) {
  const location = useLocation();

  return (
    <>
      {/* Logo + collapse */}
      <div className={cn(
        "flex h-14 shrink-0 items-center border-b",
        collapsed ? "justify-center px-2" : "px-3"
      )}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={cn(
            "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
            collapsed ? "size-9" : "size-8"
          )}>
            <Store className="size-4" aria-hidden />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-semibold tracking-tight"
            >
              {brand.shortName}
            </motion.span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll">
        <nav className="flex flex-col gap-0.5 px-3 py-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.section} className={gi > 0 ? "mt-5" : ""}>
              {!collapsed && (
                <p className="mb-2 px-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.section}
                </p>
              )}
              {group.items.map((item) => {
                const isParentActive = location.pathname === item.to ||
                  location.pathname.startsWith(item.to + "/");
                const subs = group.subItems?.[item.to];

                return (
                  <div key={item.to}>
                    <SidebarNavItem
                      item={item}
                      collapsed={collapsed}
                      onNavigate={onNavigate}
                    />
                    {/* Sub-items */}
                    {subs && !collapsed && isParentActive && (
                      <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2.5">
                        {subs.map((sub) => (
                          <SidebarNavItem
                            key={sub.to}
                            item={sub}
                            collapsed={false}
                            isSub
                            onNavigate={onNavigate}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer — user only */}
      <div className="shrink-0 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-muted",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="truncate text-xs font-medium capitalize">
                  {actor?.role?.replace(/_/g, " ") ?? "Admin"}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium capitalize">
                {actor?.role?.replace(/_/g, " ") ?? "Admin"}
              </p>
              <p className="text-xs text-muted-foreground">{actor?.type}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="size-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Navigation item                                                            */
/* -------------------------------------------------------------------------- */

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
  isSub?: boolean;
  onNavigate?: () => void;
}

function SidebarNavItem({ item, collapsed, isSub, onNavigate }: SidebarNavItemProps) {
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2.5 rounded-lg transition-all duration-150",
          isSub
            ? "px-2 py-1.5 text-xs"
            : "px-2.5 py-[7px] text-[13px] font-medium",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-accent text-accent-foreground font-semibold"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <Icon className={cn("shrink-0", isSub ? "size-3.5" : "size-4")} />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
