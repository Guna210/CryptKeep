import { expect, test } from "@playwright/test";

test("Three.js renders the fixture and releases renderer observers across repeated cycles", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto("/tests/harness/renderer.html");
  await expect(page.locator("#counts")).toContainText("GPU resources");
  const initial = await page.evaluate(() => {
    const renderer = window.rendererFixture.active!;
    return {
      counts: renderer.getResourceCounts(),
      canvas: { width: document.querySelector("canvas")!.width, height: document.querySelector("canvas")!.height },
      native: window.rendererFixture.nativeStats(),
      observerCount: window.rendererFixture.observerCount(),
    };
  });
  expect(initial.counts.geometries).toBeGreaterThanOrEqual(5);
  expect(initial.counts.programs).toBeGreaterThan(0);
  expect(initial.counts.drawCalls).toBeGreaterThanOrEqual(5);
  expect(initial.observerCount).toBe(1);
  expect(initial.native.lost).toBe(false);
  expect(initial.native.createdTextures).toBeGreaterThan(0);
  expect(initial.native.validTextures).toBe(initial.native.createdTextures);
  expect(initial.native.liveContexts).toBe(1);
  expect(initial.canvas.width / initial.canvas.height).toBeCloseTo(960 / 600, 2);
  expect(initial.canvas.width).toBeGreaterThanOrEqual(960);
  expect(initial.canvas.width * initial.canvas.height).toBeLessThanOrEqual(2_400_000);
  await page.screenshot({ path: "test-results/CK-00-03/renderer-fixture.png" });

  await page.setViewportSize({ width: 720, height: 480 });
  await expect.poll(() => page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => canvas.width / canvas.height)).toBeCloseTo(720 / 480, 2);
  const resizedBuffer = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => ({width:canvas.width,height:canvas.height}));
  expect(resizedBuffer.width).toBeGreaterThanOrEqual(720);
  expect(resizedBuffer.width * resizedBuffer.height).toBeLessThanOrEqual(2_400_000);
  const resizedAspect = await page.evaluate(() => window.rendererFixture.active!.camera.aspect);
  expect(resizedAspect).toBeCloseTo(720 / 480, 5);

  const cycles = await page.evaluate(() => {
    const fixture = window.rendererFixture;
    const reports = [];
    for (let index = 0; index < 3; index += 1) {
      const released = fixture.disposeActive();
      // Renderer disposal leaves its caller-owned canvas in place; caller retires it before recreation.
      const retainedCanvasCount = document.querySelectorAll("canvas").length;
      fixture.removeDisposedCanvas();
      const emptyCanvasCount = document.querySelectorAll("canvas").length;
      const current = fixture.create();
      reports.push({ observers: fixture.observerCount(), canvases: document.querySelectorAll("canvas").length, counts: current.getResourceCounts(), released, retainedCanvasCount, emptyCanvasCount, replacementNative: fixture.nativeStats() });
    }
    const released = fixture.disposeActive();
    return { reports, released, observers: fixture.observerCount(), canvases: document.querySelectorAll("canvas").length };
  });
  expect(cycles.reports).toHaveLength(3);
  for (const cycle of cycles.reports) {
    expect(cycle.observers).toBe(1);
    expect(cycle.canvases).toBe(1);
    expect(cycle.retainedCanvasCount).toBe(1);
    expect(cycle.emptyCanvasCount).toBe(0);
    expect(cycle.counts.geometries).toBeGreaterThanOrEqual(5);
    expect(cycle.released.lost).toBe(true);
    expect(cycle.released.createdTextures).toBeGreaterThan(0);
    expect(cycle.released.validTextures).toBe(0);
    expect(cycle.released.liveContexts).toBe(0);
    expect(cycle.released.validTextureHandles).toBe(0);
    expect(cycle.released.observers).toBe(0);
    expect(cycle.replacementNative.lost).toBe(false);
    expect(cycle.replacementNative.validTextures).toBeGreaterThan(0);
    expect(cycle.replacementNative.liveContexts).toBe(1);
    expect(cycle.replacementNative.validTextureHandles).toBe(cycle.replacementNative.createdTextures);
  }
  expect(cycles.observers).toBe(0);
  expect(cycles.released.lost).toBe(true);
  expect(cycles.released.validTextures).toBe(0);
  expect(cycles.released.liveContexts).toBe(0);
  expect(cycles.released.validTextureHandles).toBe(0);
  expect(cycles.released.contextsCreated).toBe(4);
  console.log("Renderer native-handle lifecycle:", JSON.stringify({ initial: initial.native, cycles: cycles.reports.map(({ released, replacementNative }) => ({ released, replacementNative })), final: cycles.released }));
  expect(cycles.canvases).toBe(1);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
