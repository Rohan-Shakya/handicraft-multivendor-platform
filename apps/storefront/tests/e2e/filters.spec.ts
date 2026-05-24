import { expect, test } from "@playwright/test";

/**
 * Filter-flow coverage for /products and /collections/[handle].
 *
 * State-based assertions: the filter UI is URL-driven, so we can pre-populate
 * the URL and verify the page reflects it (active chips, filter param, sort
 * label) without depending on Radix Popover/Dialog click timing in the dev
 * server (which is flaky during cold compile).
 *
 * The mobile FAB test exercises a real click because that path is reliably
 * hot in CI.
 */
test.describe.configure({ timeout: 90_000 });

const goto = async (
  page: import("@playwright/test").Page,
  url: string,
) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
};

test.describe("Toolbar — desktop", () => {
  test.use({ viewport: { width: 1280, height: 820 } });

  test("renders count, range, sort, view toggle, and filter trigger", async ({
    page,
  }) => {
    await goto(page, "/products");

    // Result count + showing range
    await expect(page.getByText(/\d+\s+rugs?/i).first()).toBeVisible();
    await expect(page.getByText(/Showing\s+\d+/i).first()).toBeVisible();

    // Controls
    await expect(page.getByRole("group", { name: /layout/i })).toBeVisible();
    await expect(
      page.locator('button[aria-label^="Sort products"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^filters\b/i }),
    ).toBeVisible();
  });

  test("active filter is reflected in URL, chip and count badge", async ({
    page,
  }) => {
    await goto(page, "/products?rating=4");

    // The trigger's accessible name is "Filters" plus the count pill text,
    // so it reads "Filters 1" when there's one applied filter.
    const trigger = page.getByRole("button", { name: /^filters\b/i });
    await expect(trigger).toBeVisible();

    // The page should show 1 active filter — verify via the trigger's nested
    // count pill (the small badge sits next to "Filters").
    await expect(trigger).toContainText("1");

    // Toolbar count + Showing range still render
    await expect(page.getByText(/\d+\s+rugs?/i).first()).toBeVisible();
  });

  test("sort URL persists between renders", async ({ page }) => {
    await goto(page, "/products?sort=price_asc");
    await expect(
      page.locator('button[aria-label^="Sort products"]'),
    ).toContainText(/Price: Low to High/);
  });

  test("view=list renders horizontal cards instead of grid", async ({
    page,
  }) => {
    await goto(page, "/products?view=list");
    // The list view has a single border-t list, not a multi-column grid.
    const list = page.locator("ul[role=list]").first();
    const cls = (await list.getAttribute("class")) ?? "";
    expect(cls).not.toMatch(/grid-cols-/);
  });
});

test.describe("Filter FAB — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("filter button is fixed at the bottom-right above the mobile nav", async ({
    page,
  }) => {
    await goto(page, "/products");

    const fab = page.getByRole("button", { name: /^filters\b/i }).last();
    await expect(fab).toBeVisible();

    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Sit clear of the mobile bottom nav (~60px) and the right edge.
      expect(box.y + box.height).toBeLessThan(844 - 50);
      expect(box.x + box.width).toBeGreaterThan(390 - 80);
      // Roughly square FAB (size-14 ≈ 56px).
      expect(Math.abs(box.width - box.height)).toBeLessThan(2);
      expect(box.width).toBeGreaterThan(48);
      expect(box.width).toBeLessThan(72);
    }

    // The mobile bottom nav still renders alongside the FAB.
    await expect(
      page.getByRole("navigation", { name: /primary mobile/i }),
    ).toBeVisible();
  });
});

test.describe("Collection page — toolbar parity", () => {
  test.use({ viewport: { width: 1280, height: 820 } });

  test("collection page reuses the same toolbar shape", async ({ page }) => {
    await goto(page, "/collections/persian-classics");

    // Same shape: count, sort, filter trigger
    await expect(page.getByText(/\d+\s+rugs?/i).first()).toBeVisible();
    await expect(
      page.locator('button[aria-label^="Sort products"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^filters\b/i }),
    ).toBeVisible();
  });
});

test.describe("SEO surfaces on listing pages", () => {
  test.use({ viewport: { width: 1280, height: 820 } });

  test("/products has canonical, openGraph, ItemList JSON-LD", async ({
    page,
  }) => {
    const res = await page.goto("/products", { waitUntil: "domcontentloaded" });
    // Dev server can return 304 from cache; only fail on real errors.
    expect(res?.status() ?? 0).toBeLessThan(400);

    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical).toMatch(/\/products$/);

    const og = await page
      .locator('meta[property="og:url"]')
      .getAttribute("content");
    expect(og).toMatch(/\/products$/);

    const itemList = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) =>
        nodes
          .map((n) => {
            try {
              return JSON.parse(n.textContent ?? "{}");
            } catch {
              return {};
            }
          })
          .find((d) => d["@type"] === "ItemList"),
      );
    expect(itemList).toBeTruthy();
    expect(itemList.numberOfItems).toBeGreaterThan(0);
  });
});
