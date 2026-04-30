import { expect, test } from "@playwright/test";

test.describe("AI News Digest", () => {
  test("home page loads with title, mood badge, and last-updated text", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AI News Trend/);
    await expect(page.getByRole("heading", { name: "AI News Trend" })).toBeVisible();
    await expect(page.getByText(/마지막 갱신:/)).toBeVisible();
    // mood badge — one of the three Korean labels
    await expect(page.getByText(/평온한 날|보통의 날|주목 필요한 날/)).toBeVisible();
  });

  test("dark mode toggle persists across reload", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "라이트/다크 모드 전환" }).first();
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
