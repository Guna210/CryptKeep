import { expect, test } from "@playwright/test";

test.describe("pointer capture isolated proof", () => {
  test("captures from click, accumulates native relative movement, cancels on Escape, and requires another click", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.goto("/tests/harness/pointer-capture.html");
    const surface = page.locator("#surface");
    await page.locator("#capture").click();
    await expect.poll(() => surface.evaluate((node) => document.pointerLockElement === node)).toBe(true);

    const box = await surface.boundingBox();
    if (!box) throw new Error("Pointer proof surface has no layout box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 25);
    await expect.poll(async () => page.evaluate(() => {
      const command = window.pointerCaptureProof.sample();
      return Math.abs(command.look.x) + Math.abs(command.look.y);
    })).toBeGreaterThan(0);
    const capturedBeforeEscape = await surface.evaluate((node) => document.pointerLockElement === node);
    expect(capturedBeforeEscape).toBe(true);

    await page.keyboard.press("Escape");
    await expect.poll(() => surface.evaluate((node) => document.pointerLockElement === node)).toBe(false);
    await expect(page.locator("#status")).toContainText("pause");
    expect(await page.evaluate(() => window.pointerCaptureProof.sample().cancellations)).toContain("pause");
    expect(await page.evaluate(() => window.pointerCaptureProof.state())).toBe("idle");

    await page.mouse.move(box.x + 10, box.y + 10);
    await expect.poll(() => page.evaluate(() => window.pointerCaptureProof.state())).toBe("idle");
    await page.locator("#capture").click();
    await expect.poll(() => surface.evaluate((node) => document.pointerLockElement === node)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.pointerCaptureProof.state())).toBe("captured");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect.poll(() => surface.evaluate((node) => document.pointerLockElement === node)).toBe(false);
    expect(await page.evaluate(() => window.pointerCaptureProof.sample().cancellations)).toContain("blur");
    await page.locator("#capture").click();
    await expect.poll(() => surface.evaluate((node) => document.pointerLockElement === node)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.pointerCaptureProof.state())).toBe("captured");
    await page.evaluate(() => document.exitPointerLock());
    await expect.poll(() => page.evaluate(() => window.pointerCaptureProof.state())).toBe("idle");
    expect(await page.evaluate(() => window.pointerCaptureProof.sample().cancellations)).toContain("pointer-lock-lost");
    await page.locator("#capture").click();
    await expect.poll(() => surface.evaluate((node) => document.pointerLockElement === node)).toBe(true);
    await page.evaluate(() => window.pointerCaptureProof.dispose());
    await expect.poll(() => surface.evaluate((node) => document.pointerLockElement === node)).toBe(false);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("shows failed capture and cancels actions without manufacturing a release", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.goto("/tests/harness/pointer-capture.html");
    await page.locator("#denied").click();
    await expect(page.locator("#status")).toContainText("failed: denied");
    expect(await page.evaluate(() => window.pointerCaptureProof.state())).toBe("failed");
    expect(await page.evaluate(() => window.pointerCaptureProof.sample().cancellations)).toContain("pointer-lock-lost");
    expect(await page.evaluate(() => window.pointerCaptureProof.sample().released)).toEqual([]);

    await page.locator("#capture").click();
    await expect.poll(() => page.locator("#status").textContent()).toContain("captured");
    await page.evaluate(() => window.pointerCaptureProof.dispose());
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
