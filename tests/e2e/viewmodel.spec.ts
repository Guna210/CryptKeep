import { expect, test } from "@playwright/test";

test("sword renders readable tap and charged poses and disposes its owned model", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto("/tests/harness/viewmodel.html");
  await expect(page.locator("#state")).toHaveText("fixture ready");
  const canvasSize = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height]);
  expect(canvasSize[0]).toBeGreaterThanOrEqual(960);
  expect(canvasSize[1]).toBeGreaterThanOrEqual(540);
  expect(canvasSize[0] * canvasSize[1]).toBeLessThanOrEqual(2_400_000);
  const initialDrawCalls = await page.evaluate(() => window.swordFixture.renderer.getResourceCounts().drawCalls);
  expect(initialDrawCalls).toBeGreaterThan(0);
  await page.evaluate(() => {
    const s = window.swordFixture;
    s.setState(Object.freeze({ weaponClass: "sword", phase: "active", elapsedSeconds: 0.06,
      attackId: "fixture-tap", committedKind: "sword-light", committedDamage: 18,
      committedTiming: Object.freeze({ windupSeconds: 0.06, activeSeconds: 0.12, recoverySeconds: 0.3 }),
      primaryHeld: false, heldTimeCompensationSeconds: 0 }));
  });
  const tapDrawCalls = await page.evaluate(() => window.swordFixture.renderer.getResourceCounts().drawCalls);
  expect(tapDrawCalls).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/CK-03-06/tap.png" });
  await page.evaluate(() => {
    const s = window.swordFixture;
    s.setState(Object.freeze({ weaponClass: "sword", phase: "anticipation", elapsedSeconds: 1.2, primaryHeld: true,
      attackId: null, heldTimeCompensationSeconds: 0, committedKind: null, committedDamage: null, committedTiming: null }));
  });
  const chargeDrawCalls = await page.evaluate(() => window.swordFixture.renderer.getResourceCounts().drawCalls);
  expect(chargeDrawCalls).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/CK-03-06/charge.png" });
  const disposed = await page.evaluate(() => window.swordFixture.dispose());
  expect(disposed).toEqual({ contextLost: true, cameraKept: true, rootRemoved: true });
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
