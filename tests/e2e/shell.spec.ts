import { mkdirSync } from "node:fs";
import { expect, test } from "../harness/browser";

test("application shell renders, resizes, and reports ready diagnostics", async ({ page, browserHarness }) => {
  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto("/");
  expect(await browserHarness.waitForReadiness()).toBe("ready");
  await expect(page.getByRole("heading", { name: "CRYPTKEEP" })).toBeVisible();
  await expect(page.getByText("Floor 1 · Seed cryptkeep-preview")).toBeVisible();
  const diagnostics = await page.evaluate(() => {
    const snapshot = window.__cryptkeepDiagnostics?.snapshot() ?? null;
    return {
      snapshot,
      frozen: snapshot ? Object.isFrozen(snapshot) : false,
      rendererFrozen: snapshot?.renderer ? Object.isFrozen(snapshot.renderer) : false,
    };
  });
  expect(diagnostics.snapshot?.readiness).toBe("ready");
  expect(diagnostics.snapshot?.floor?.currentFloors).toBe(1);
  expect(diagnostics.snapshot?.floor?.contentHash).toMatch(/^fnv1a:/);
  await expect.poll(() => page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().renderer?.drawCalls ?? 0)).toBeGreaterThan(0);
  expect(diagnostics.frozen).toBe(true);
  expect(diagnostics.rendererFrozen).toBe(true);

  const firstSize = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => ({
    rect: canvas.getBoundingClientRect().toJSON(),
    width: canvas.width,
    height: canvas.height,
  }));
  expect(firstSize.rect.width).toBe(960);
  expect(firstSize.rect.height).toBe(600);
  expect(firstSize.width).toBeGreaterThanOrEqual(firstSize.rect.width);
  expect(firstSize.height).toBeGreaterThanOrEqual(firstSize.rect.height);
  expect(firstSize.width * firstSize.height).toBeLessThanOrEqual(2_400_000);
  expect(firstSize.width / firstSize.height).toBeCloseTo(firstSize.rect.width / firstSize.rect.height, 2);

  mkdirSync("test-results/CK-00-08", { recursive: true });
  await page.screenshot({ path: "test-results/CK-00-08/shell.png", fullPage: true });
  await page.setViewportSize({ width: 720, height: 480 });
  await expect.poll(() => page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return [rect.width, rect.height, canvas.width, canvas.height];
  })).toEqual([720, 480, expect.any(Number), expect.any(Number)]);
  const resized = await page.locator("canvas").evaluate((canvas:HTMLCanvasElement)=>({width:canvas.width,height:canvas.height}));
  expect(resized.width).toBeGreaterThanOrEqual(720);
  expect(resized.height).toBeGreaterThanOrEqual(480);
  expect(resized.width*resized.height).toBeLessThanOrEqual(2_400_000);

  await page.evaluate(() => { window.dispatchEvent(new Event("pagehide")); window.dispatchEvent(new Event("pagehide")); });
  expect(await page.evaluate(() => "__cryptkeepDiagnostics" in window)).toBe(false);
  expect(await page.evaluate(() => document.querySelector("#app")?.childElementCount)).toBe(0);
  browserHarness.assertNoErrors();
});

test("unsupported WebGL 2 has honest readiness and a readable compatibility message", async ({ page, browserHarness }) => {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === "webgl2") return null;
      return originalGetContext.call(this, type, ...args) as RenderingContext | null;
    };
  });

  await page.goto("/");
  expect(await browserHarness.waitForReadiness()).toBe("unsupported");
  expect(await page.evaluate(() => window.__cryptkeepDiagnostics?.snapshot().readiness)).toBe("unsupported");
  await expect(page.getByText("RENDERING UNAVAILABLE")).toBeVisible();
  await expect(page.getByText(/needs WebGL 2 to render/i)).toBeVisible();
  await expect(page.getByRole("main", { name: "CryptKeep status" })).toHaveClass(/unsupported/);
  await page.screenshot({ path: "test-results/CK-00-03/unsupported-webgl2.png", fullPage: true });
  await page.evaluate(() => { window.dispatchEvent(new Event("pagehide")); window.dispatchEvent(new Event("pagehide")); });
  expect(await page.evaluate(() => "__cryptkeepDiagnostics" in window)).toBe(false);
  expect(await page.evaluate(() => document.querySelector("#app")?.childElementCount)).toBe(0);
  browserHarness.assertNoErrors();
});
