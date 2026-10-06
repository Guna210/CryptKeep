import { expect, test } from "../harness/browser";

test("production app renders without development diagnostics, including with a tempting query string", async ({ page, browserHarness }) => {
  await page.goto("/?debug=1&diagnostics=1&test=1");
  await expect(page.getByRole("heading", { name: "CRYPTKEEP" })).toBeVisible();
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("A glimpse of the depths below.")).toBeVisible();
  await expect.poll(() => page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBeGreaterThan(0);
  expect(await page.evaluate(() => "__cryptkeepDiagnostics" in window)).toBe(false);
  browserHarness.assertNoErrors();
});
