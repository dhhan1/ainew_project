import { expect, test } from "@playwright/test";

test.describe("AI News Digest", () => {
  test("home page loads with title and last-updated text", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AI News Trend/);
    await expect(page.getByText(/마지막 갱신:/)).toBeVisible();
  });

  test("dark mode toggle persists across navigation", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "라이트/다크 모드 전환" }).first();
    await toggle.click();
    // After click, html should have 'dark' class (next-themes attribute='class')
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Reload — theme should persist (localStorage)
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("refresh button reloads the page (URL unchanged)", async ({ page }) => {
    await page.goto("/");
    const url = page.url();
    await page.getByRole("button", { name: /새로고침/ }).click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toBe(url);
  });
});
