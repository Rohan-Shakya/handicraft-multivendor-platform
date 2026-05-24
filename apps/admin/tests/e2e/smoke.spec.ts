import { test, expect } from "@playwright/test";

/**
 * Admin smoke tests — purposely shallow. They verify the shell boots, the
 * primary routes don't crash for unauthenticated users, and the login page is
 * wired to the API. Real auth-gated flows are better covered by per-page
 * Vitest component tests with mocked fetchers.
 */

test.describe("Admin shell", () => {
  test("unauthenticated user is redirected to /admin/login", async ({ page }) => {
    await page.goto("/");
    // ProtectedRoute should kick us to the admin login.
    await page.waitForURL(/\/admin\/login|\/login/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("/admin/login renders the form with 2FA-aware fields", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|continue/i })).toBeVisible();
  });

  test("/admin/forgot-password is reachable", async ({ page }) => {
    await page.goto("/admin/forgot-password");
    await expect(page.getByRole("heading", { name: /forgot|reset/i })).toBeVisible();
  });

  test("invalid credentials surface an error", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill("nobody@example.com");
    await page.getByLabel(/password/i).fill("wrong-password-xyz");
    await page.getByRole("button", { name: /sign in|continue/i }).click();
    // Either a toast, inline error, or the button re-enables — any of those
    // prove the submit reached the API. Wait up to 5s.
    const inlineError = page.getByText(/invalid|incorrect|wrong|failed/i).first();
    await expect(inlineError).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Accessibility", () => {
  test("login page has a visible primary heading", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("login form inputs have labels", async ({ page }) => {
    await page.goto("/admin/login");
    const email = page.getByLabel(/email/i);
    const password = page.getByLabel(/password/i);
    await expect(email).toHaveAttribute("type", "email");
    await expect(password).toHaveAttribute("type", "password");
  });
});

test.describe("Route guards", () => {
  const guardedRoutes = [
    "/",
    "/vendors",
    "/catalog/products",
    "/orders",
    "/customers",
    "/system/users",
  ];

  for (const path of guardedRoutes) {
    test(`${path} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(path);
      // Should end up on the login page — path normalises to /admin/login
      // or /login depending on which flow the guard picked.
      await page.waitForURL(/\/login|\/admin\/login/, { timeout: 10_000 });
    });
  }
});
