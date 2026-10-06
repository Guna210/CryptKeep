import { expect, test } from "@playwright/test";

test("shell fills and resizes with the viewport, then shows loading status", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CRYPTKEEP" })).toBeVisible();
  await expect(page.getByText("Preparing the dungeon…")).toBeVisible();

  const firstSize = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => ({
    rect: canvas.getBoundingClientRect().toJSON(),
    width: canvas.width,
    height: canvas.height,
  }));
  expect(firstSize.rect.width).toBe(960);
  expect(firstSize.rect.height).toBe(600);
  expect(firstSize.width).toBeGreaterThanOrEqual(960);
  expect(firstSize.height).toBeGreaterThanOrEqual(600);

  await page.screenshot({ path: "test-results/CK-00-02/shell.png", fullPage: true });
  await page.setViewportSize({ width: 720, height: 480 });
  await expect.poll(() => page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return [rect.width, rect.height];
  })).toEqual([720, 480]);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("unsupported WebGL 2 displays a readable compatibility message", async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === "webgl2") return null;
      return originalGetContext.call(this, type, ...args) as RenderingContext | null;
    };
  });

  await page.goto("/");
  await expect(page.getByText("RENDERING UNAVAILABLE")).toBeVisible();
  await expect(page.getByText(/needs WebGL 2 to render/i)).toBeVisible();
  await expect(page.getByRole("main", { name: "CryptKeep status" })).toHaveClass(/unsupported/);
  await page.screenshot({ path: "test-results/CK-00-02/unsupported-webgl2.png", fullPage: true });
});
