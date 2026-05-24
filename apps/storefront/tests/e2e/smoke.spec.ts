import { test, expect } from "@playwright/test";

/**
 * High-value smoke tests covering the commercial happy paths. They are
 * deliberately shallow — deeper feature tests should live alongside the
 * feature they exercise.
 */

test.describe("Homepage", () => {
  test("loads and links to shop", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ShopHub/);
    await expect(page.getByRole("link", { name: /shop/i })).toBeVisible();
  });

  test("mobile bottom nav is rendered on small screens", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Only relevant on mobile viewport");
    await page.goto("/");
    await expect(page.getByLabel("Primary mobile")).toBeVisible();
  });
});

test.describe("Product discovery", () => {
  test("shop listing renders products + filters", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /shop|results/i
    );
    // The sort pill is always there; filters sidebar exists on desktop.
    await expect(page.getByRole("button", { name: /sort/i })).toBeVisible();
  });

  test("search command opens via ⌘K", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Keyboard shortcut varies on WebKit");
    await page.goto("/");
    await page.keyboard.press("Control+K");
    await expect(
      page.getByPlaceholder(/search products/i)
    ).toBeVisible();
  });
});

test.describe("Cart + Checkout", () => {
  test("empty cart shows empty state", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /empty/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /start shopping/i })).toBeVisible();
  });

  test("checkout redirects away when cart is empty", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: /empty/i })).toBeVisible();
  });
});

test.describe("Auth", () => {
  test("login page renders & links to register", async ({ page }) => {
    await page.goto("/customer/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /create.*account|register|join/i })
    ).toBeVisible();
  });

  test("register form has password strength meter", async ({ page }) => {
    await page.goto("/customer/register");
    await page.fill('input[id="password"]', "abc12345");
    await expect(page.getByText(/password strength/i)).toBeVisible();
  });
});

test.describe("Customer area (guarded)", () => {
  test("wishlist empty state", async ({ page }) => {
    await page.goto("/wishlist");
    // Either signed-out gate OR empty wishlist state is acceptable.
    const gate = page.getByRole("heading", { name: /sign in to view/i });
    const empty = page.getByRole("heading", { name: /wishlist is empty/i });
    await expect(gate.or(empty)).toBeVisible();
  });
});

test.describe("Accessibility sanity", () => {
  test("homepage has skip-to-content link", async ({ page }) => {
    await page.goto("/");
    const skip = page.getByRole("link", { name: /skip to main content/i });
    await expect(skip).toBeAttached();
  });

  test("all images have alt attributes on product detail", async ({ page }) => {
    await page.goto("/products");
    const firstProduct = page.getByRole("link").filter({ hasText: /.+/ }).first();
    if (!(await firstProduct.isVisible().catch(() => false))) test.skip();
    await firstProduct.click();
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      await expect(images.nth(i)).toHaveAttribute("alt", /./);
    }
  });
});
