"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Tag,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { BrandMark } from "@/components/BrandMark";
import { CartDrawer } from "@/components/CartDrawer";
import { SearchCommand } from "@/components/SearchCommand";
import { Button } from "@/components/ui/button";
import { confirm as confirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { CART_OPEN_EVENT, useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/utils";

// ─── Types + props ──────────────────────────────────────────────────────────

export interface HeaderNavData {
  collections: Array<{
    id: string;
    title: string;
    handle: string;
    image?: string;
  }>;
  vendors: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

interface Props {
  nav: HeaderNavData;
}

// ─── Static nav structure ───────────────────────────────────────────────────

interface ShopGroup {
  heading: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}

const SHOP_GROUPS: ReadonlyArray<ShopGroup> = [
  {
    heading: "Catalogue",
    links: [
      { label: `All ${brand.productNounPlural}`, href: "/products" },
      { label: "New arrivals", href: "/products?sort=created_at_desc" },
      { label: "On sale", href: "/products?onSale=1" },
      { label: "Best sellers", href: "/products?sort=best_selling" },
      { label: "In stock", href: "/products?inStock=1" },
    ],
  },
  {
    heading: "By tradition",
    links: [
      { label: "Buddhist", href: "/products?tag=buddha" },
      { label: "Hindu", href: "/products?tag=hindu" },
      { label: "Bodhisattva", href: "/products?tag=bodhisattva" },
      { label: "Newari", href: "/products?tag=newari" },
      { label: "Tibetan & Himalayan", href: "/products?tag=tibetan" },
    ],
  },
  {
    heading: "By material",
    links: [
      { label: "Brass & bronze", href: "/products?tag=brass" },
      { label: "Stone & marble", href: "/products?tag=stone-carving" },
      { label: "Wood carvings", href: "/products?tag=wood-carving" },
      { label: "Gold-plated", href: "/products?tag=gold-plated" },
      { label: "With stone inlay", href: "/products?tag=stone-inlay" },
    ],
  },
  {
    heading: "By size",
    links: [
      { label: "Small (under 25 cm)", href: "/products?size=S" },
      { label: "Medium (25–45 cm)", href: "/products?size=M" },
      { label: "Large (45–75 cm)", href: "/products?size=L" },
      { label: "Extra-large (75 cm +)", href: "/products?size=XL" },
      { label: "Altar & shelf-friendly", href: "/products?tag=altar" },
    ],
  },
];

const HEADER_COLLECTION_COVER_BY_HANDLE: Record<string, string> = {
  "featured-statues":
    "https://images.unsplash.com/photo-1771692820416-4b4634b82e9d?auto=format&fit=crop&w=600&q=80",
  "traditional-nepali":
    "https://images.unsplash.com/flagged/photo-1576784865254-244acbfced40?auto=format&fit=crop&w=600&q=80",
  "deity-sets":
    "https://images.unsplash.com/photo-1678593628844-6ea49dee8ce3?auto=format&fit=crop&w=600&q=80",
};

function fallbackCollectionImage(handle: string): string {
  const curated = HEADER_COLLECTION_COVER_BY_HANDLE[handle];
  if (curated) return curated;
  const tags = encodeURIComponent(handle.replace(/-/g, ","));
  return `https://loremflickr.com/400/300/${tags}?lock=${handle.length * 7}`;
}

// ─── Header ─────────────────────────────────────────────────────────────────

export function Header({ nav }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { itemCount } = useCart();
  const { productIds } = useWishlist();
  const wishCount = productIds.size;

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  // ⌘K / `/` shortcuts open command-palette search.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    const onOpen = () => setCartOpen(true);
    window.addEventListener(CART_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, onOpen);
  }, []);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile drawer on route change.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href) ?? false;

  return (
    <>
      {/* Utility bar */}
      <div className="hidden border-b bg-background md:block">
        <div className="mx-auto flex max-w-8xl items-center justify-between px-4 py-1.5 text-[11px] text-muted-foreground sm:px-6 lg:px-8">
          <p>Free shipping over Rs 25,000 · 14-day returns · Buyer protection</p>
          <div className="flex items-center gap-5">
            <Link
              href="/vendors"
              className="transition-colors hover:text-foreground"
            >
              Become a seller
            </Link>
            <Link
              href={auth.customer ? "/customer/orders" : "/customer/login"}
              className="transition-colors hover:text-foreground"
            >
              Track order
            </Link>
            <Link
              href="/pages/faq"
              className="transition-colors hover:text-foreground"
            >
              Help
            </Link>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md transition-shadow",
          scrolled && "shadow-[var(--shadow-soft)]"
        )}
      >
        <div className="mx-auto flex h-16 max-w-8xl items-center gap-3 px-4 sm:px-6 lg:h-[68px] lg:gap-5 lg:px-8">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${brand.shortName} home`}
          >
            <BrandMark size="md" />
          </Link>

          {/* Mega navigation (desktop) */}
          <NavigationMenu.Root
            className="ml-2 hidden flex-1 justify-center lg:flex"
            aria-label="Primary"
            delayDuration={150}
          >
            <NavigationMenu.List className="flex items-center gap-1">
              {/* Shop — mega trigger */}
              <NavigationMenu.Item>
                <NavigationMenu.Trigger
                  className={cn(
                    "group/menu inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive("/products")
                      ? "text-primary"
                      : "text-foreground/80 hover:bg-accent hover:text-foreground"
                  )}
                >
                  Shop
                  <ChevronDown
                    aria-hidden
                    className="size-3.5 transition-transform duration-200 group-data-[state=open]/menu:rotate-180"
                  />
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="absolute left-0 top-0 w-full data-[motion=from-start]:animate-[fade-in_0.2s_ease-out] data-[motion=from-end]:animate-[fade-in_0.2s_ease-out]">
                  <ShopMega
                    onNavigate={() => setMobileOpen(false)}
                    nav={nav}
                  />
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              {/* Collections — mega trigger */}
              {nav.collections.length > 0 && (
                <NavigationMenu.Item>
                  <NavigationMenu.Trigger
                    className={cn(
                      "group/menu inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive("/collections")
                        ? "text-primary"
                        : "text-foreground/80 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    Collections
                    <ChevronDown
                      aria-hidden
                      className="size-3.5 transition-transform duration-200 group-data-[state=open]/menu:rotate-180"
                    />
                  </NavigationMenu.Trigger>
                  <NavigationMenu.Content className="absolute left-0 top-0 w-full">
                    <CollectionsMega collections={nav.collections} />
                  </NavigationMenu.Content>
                </NavigationMenu.Item>
              )}

              <NavigationMenu.Item>
                <NavigationMenu.Link asChild active={isActive("/vendors")}>
                  <Link
                    href="/vendors"
                    className={cn(
                      "relative inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                      isActive("/vendors")
                        ? "text-primary"
                        : "text-foreground/80 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    Vendors
                    {isActive("/vendors") && (
                      <span
                        aria-hidden
                        className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>

            </NavigationMenu.List>

            {/* Mega menu viewport */}
            <div className="absolute left-0 right-0 top-full flex justify-center">
              <NavigationMenu.Viewport
                className={cn(
                  "relative mt-0 w-full origin-top overflow-hidden bg-background shadow-[var(--shadow-pop)] transition-[height,opacity] duration-200",
                  "data-[state=open]:animate-[fade-in_0.2s_ease-out] data-[state=closed]:animate-[fade-in_0.15s_ease-in]",
                  "h-[var(--radix-navigation-menu-viewport-height)]"
                )}
              />
            </div>
          </NavigationMenu.Root>

          {/* Search trigger (desktop) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search the site"
            className="hidden items-center gap-3 rounded-full border bg-card px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:inline-flex xl:w-72"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="hidden items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide xl:inline-flex">
              ⌘ K
            </kbd>
          </button>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-1 lg:gap-1">
            {/* Search button (mobile) */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="rounded-full p-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
            >
              <Search className="size-5" aria-hidden />
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              aria-label={`Wishlist${wishCount ? `, ${wishCount} item${wishCount === 1 ? "" : "s"}` : ""}`}
              className="relative hidden rounded-full p-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:inline-flex"
            >
              <Heart className="size-5" aria-hidden />
              {wishCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
                >
                  {wishCount > 99 ? "99+" : wishCount}
                </span>
              )}
            </Link>

            {/* Account */}
            <div className="hidden lg:block">
              {auth.customer ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      aria-label="Account menu"
                      className="inline-flex items-center gap-2 rounded-full p-1 pr-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span className="grid size-8 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                        {(
                          auth.customer.firstName?.[0] ??
                          auth.customer.email[0]
                        ).toUpperCase()}
                      </span>
                      <span className="hidden max-w-[7rem] truncate xl:inline">
                        {auth.customer.firstName ?? "Account"}
                      </span>
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={8}
                      className="z-50 min-w-[15rem] overflow-hidden rounded-2xl border bg-popover p-1.5 shadow-[var(--shadow-pop)] animate-[scale-in_0.15s_cubic-bezier(0.16,1,0.3,1)]"
                    >
                      <div className="px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">
                          Signed in as
                        </p>
                        <p className="truncate text-sm font-semibold">
                          {auth.customer.email}
                        </p>
                      </div>
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <AccountMenuItem
                        href="/customer/account"
                        icon={<User className="size-4" />}
                        label="My account"
                      />
                      <AccountMenuItem
                        href="/customer/orders"
                        icon={<Package className="size-4" />}
                        label="My orders"
                      />
                      <AccountMenuItem
                        href="/wishlist"
                        icon={<Heart className="size-4" />}
                        label="Wishlist"
                      />
                      <AccountMenuItem
                        href="/customer/addresses"
                        icon={<MapPin className="size-4" />}
                        label="Addresses"
                      />
                      <AccountMenuItem
                        href="/customer/account/settings"
                        icon={<Settings className="size-4" />}
                        label="Settings"
                      />
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <DropdownMenu.Item
                        onSelect={async () => {
                          const ok = await confirmDialog({
                            title: "Sign out of your account?",
                            description:
                              "You'll need to sign back in to view your orders, wishlist, and saved addresses.",
                            confirmText: "Sign out",
                            variant: "destructive",
                          });
                          if (ok) {
                            await auth.logout();
                            router.push("/");
                          }
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-accent"
                      >
                        <LogOut className="size-4" />
                        Sign out
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              ) : (
                <Link
                  href="/customer/login"
                  aria-label="Sign in"
                  className="inline-flex rounded-full p-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <User className="size-5" aria-hidden />
                </Link>
              )}
            </div>

            {/* Cart */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Cart${itemCount ? `, ${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}`}
              className="relative rounded-full p-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ShoppingBag className="size-5" aria-hidden />
              {itemCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[88vw] gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="flex flex-row items-center justify-between border-b px-5 py-4">
            <SheetTitle>
              <BrandMark size="sm" />
            </SheetTitle>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="size-4" aria-hidden />
            </button>
          </SheetHeader>

          <nav
            id="mobile-nav"
            aria-label="Mobile primary"
            className="soft-scroll flex-1 overflow-y-auto p-3"
          >
            <MobileLinkGroup>
              <MobileLink href="/" active={isActive("/")}>Home</MobileLink>
              <MobileLink href="/products" active={isActive("/products")}>
                Shop
              </MobileLink>
              <MobileLink
                href="/collections"
                active={isActive("/collections")}
              >
                Collections
              </MobileLink>
              <MobileLink href="/vendors" active={isActive("/vendors")}>
                Vendors
              </MobileLink>
              <MobileLink href="/blogs" active={isActive("/blogs")}>
                Journal
              </MobileLink>
              <MobileLink
                href="/pages/contact"
                active={isActive("/pages/contact")}
              >
                Contact
              </MobileLink>
            </MobileLinkGroup>

            {nav.collections.length > 0 && (
              <details className="mt-4 rounded-2xl border bg-card">
                <summary className="flex cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Featured collections
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                  />
                </summary>
                <ul className="px-2 pb-2">
                  {nav.collections.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/collections/${c.handle}`}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                      >
                        {c.title}
                        <ArrowUpRight
                          aria-hidden
                          className="size-3.5 text-muted-foreground"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="my-4 h-px bg-border" />

            <MobileLinkGroup>
              <MobileLink
                href="/customer/orders"
                icon={<Package className="size-4" aria-hidden />}
              >
                Track my order
              </MobileLink>
              <MobileLink
                href="/wishlist"
                icon={<Heart className="size-4" aria-hidden />}
              >
                Wishlist
              </MobileLink>
              <MobileLink
                href="/vendors"
                icon={<Store className="size-4" aria-hidden />}
              >
                Become a seller
              </MobileLink>
              <MobileLink
                href="/customer/gift-cards"
                icon={<Tag className="size-4" aria-hidden />}
              >
                Gift cards
              </MobileLink>
              <MobileLink
                href="/pages/faq"
                icon={<Search className="size-4" aria-hidden />}
              >
                Help centre
              </MobileLink>
            </MobileLinkGroup>
          </nav>

          <div className="mt-auto border-t p-4">
            {auth.customer ? (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: "Sign out of your account?",
                    confirmText: "Sign out",
                    variant: "destructive",
                  });
                  if (ok) {
                    await auth.logout();
                    setMobileOpen(false);
                  }
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-destructive"
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </button>
            ) : (
              <div className="grid gap-2">
                <Button asChild>
                  <Link href="/customer/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/customer/register">Create account</Link>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}

// ─── Mega-menu panels ───────────────────────────────────────────────────────

function ShopMega({
  nav,
  onNavigate,
}: {
  nav: HeaderNavData;
  onNavigate: () => void;
}) {
  const featured = nav.collections[0];

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-10">
        {/* 4-column link groups */}
        <ul className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          {SHOP_GROUPS.map((group) => (
            <li key={group.heading}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {group.heading}
              </p>
              <ul className="mt-3 flex flex-col gap-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <NavigationMenu.Link asChild>
                      <Link
                        href={link.href}
                        onClick={onNavigate}
                        className="-mx-2 inline-flex items-center rounded-md px-2 py-1.5 text-sm tracking-tight text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </NavigationMenu.Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {/* Compact featured promo */}
        {featured && (
          <NavigationMenu.Link asChild>
            <Link
              href={`/collections/${featured.handle}`}
              onClick={onNavigate}
              className="group relative block overflow-hidden rounded-2xl bg-muted"
            >
              <div className="relative aspect-[4/3] sm:aspect-[5/4]">
                <Image
                  src={featured.image ?? fallbackCollectionImage(featured.handle)}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 320px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/15 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 text-background">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-background/80">
                    Editor&apos;s pick
                  </p>
                  <p
                    className="mt-1 text-lg font-medium leading-tight tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {featured.title}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold">
                    Shop the collection
                    <ArrowRight aria-hidden className="size-3" />
                  </span>
                </div>
              </div>
            </Link>
          </NavigationMenu.Link>
        )}
      </div>

      {/* Bottom bar: vendors + view-all */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
        {nav.vendors.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-2">
            <li className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Featured vendors:
            </li>
            {nav.vendors.slice(0, 4).map((v) => (
              <li key={v.id}>
                <NavigationMenu.Link asChild>
                  <Link
                    href={`/${v.slug}`}
                    onClick={onNavigate}
                    className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium tracking-tight transition-colors hover:border-primary hover:text-primary"
                  >
                    {v.name}
                  </Link>
                </NavigationMenu.Link>
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <NavigationMenu.Link asChild>
          <Link
            href="/products"
            onClick={onNavigate}
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
          >
            Shop everything
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </NavigationMenu.Link>
      </div>
    </div>
  );
}

function CollectionsMega({
  collections,
}: {
  collections: HeaderNavData["collections"];
}) {
  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Curated edits
          </p>
          <h2
            className="mt-1 text-xl font-medium tracking-tight sm:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Browse by collection
          </h2>
        </div>
        <NavigationMenu.Link asChild>
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight transition-colors hover:text-primary"
          >
            All collections
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </NavigationMenu.Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {collections.slice(0, 6).map((c) => (
          <li key={c.id}>
            <NavigationMenu.Link asChild>
              <Link
                href={`/collections/${c.handle}`}
                className="group block overflow-hidden rounded-xl bg-muted"
              >
                <div className="relative aspect-[5/4]">
                  <Image
                    src={c.image ?? fallbackCollectionImage(c.handle)}
                    alt={c.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
                  <p
                    className="absolute inset-x-3 bottom-2 text-xs font-medium leading-tight tracking-tight text-background"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {c.title}
                  </p>
                </div>
              </Link>
            </NavigationMenu.Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Sub-bits ───────────────────────────────────────────────────────────────

function MobileLinkGroup({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col gap-0.5">{children}</ul>;
}

function MobileLink({
  href,
  children,
  active,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-primary"
            : "text-foreground hover:bg-accent"
        )}
        aria-current={active ? "page" : undefined}
      >
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {children}
      </Link>
    </li>
  );
}

function AccountMenuItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent"
      >
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </Link>
    </DropdownMenu.Item>
  );
}
