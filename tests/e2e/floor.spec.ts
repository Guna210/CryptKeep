import { mkdirSync } from "node:fs";
import { expect, test } from "../harness/browser";

test("seeded dungeon preview changes floors, recovers from invalid input and keeps one active scene", async ({ page, browserHarness }) => {
  await page.addInitScript(() => {
    const active = new Set<EventListenerOrEventListenerObject>();
    const add = HTMLFormElement.prototype.addEventListener;
    const remove = HTMLFormElement.prototype.removeEventListener;
    HTMLFormElement.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (type === "submit" && listener) active.add(listener);
      return add.call(this, type, listener, options);
    } as typeof HTMLFormElement.prototype.addEventListener;
    HTMLFormElement.prototype.removeEventListener = function (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      if (type === "submit" && listener) active.delete(listener);
      return remove.call(this, type, listener, options);
    } as typeof HTMLFormElement.prototype.removeEventListener;
    Object.defineProperty(window, "__activeSubmitListeners", { get: () => active.size });
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const seed = page.getByRole("textbox", { name: "Dungeon seed" });
  const generate = page.getByRole("button", { name: "Generate dungeon" });
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  const read = () => page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().floor!);
  const first = await read();
  expect(first.floorNumber).toBe(1);
  expect(first.currentFloors).toBe(1);
  expect(first.roomCount).toBeGreaterThan(0);

  await seed.fill("a-second-layout");
  await generate.click();
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  const second = await read();
  expect(second.contentHash).not.toBe(first.contentHash);
  expect(second.campaignSeed).toBe("a-second-layout");
  expect(second.roleMarkers).not.toEqual(first.roleMarkers);
  await expect(page.getByText("Boss")).toBeVisible();
  await expect(page.getByText("Reward")).toBeVisible();

  await seed.fill("   ");
  await generate.click();
  await expect(page.getByText("GENERATION FAILED")).toBeVisible();
  await expect(page.locator(".cryptkeep__status-message")).toContainText(/seed/i);
  await seed.fill("cryptkeep-preview");
  await generate.click();
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();

  for (let i = 0; i < 25; i++) {
    await seed.fill(`cycle-${i}`);
    await generate.click();
    await expect.poll(() => read()).toMatchObject({ currentFloors: 1, lifecycle: "ready" });
  }
  const stable = await read();
  expect(stable.currentFloors).toBe(1);
  const canvasCount = await page.locator("canvas").count();
  expect(canvasCount).toBe(1);
  const sceneChildren = await page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().floor!.currentFloors);
  expect(sceneChildren).toBe(1);
  expect(await page.evaluate(() => (window as Window & { __activeSubmitListeners: number }).__activeSubmitListeners)).toBe(1);

  mkdirSync("docs/evidence/CK-01-08", { recursive: true });
  await page.screenshot({ path: "docs/evidence/CK-01-08/preview.png", fullPage: true });
  const retainedForm = await page.locator("form").evaluateHandle((element) => element as HTMLFormElement);
  await page.evaluate(() => { window.dispatchEvent(new Event("pagehide")); window.dispatchEvent(new Event("pagehide")); });
  expect(await page.evaluate(() => "__cryptkeepDiagnostics" in window)).toBe(false);
  expect(await page.evaluate(() => document.querySelector("#app")?.childElementCount)).toBe(0);
  expect(await page.evaluate(() => (window as Window & { __activeSubmitListeners: number }).__activeSubmitListeners)).toBe(0);
  await retainedForm.evaluate((element) => element.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(await page.evaluate(() => "__cryptkeepDiagnostics" in window)).toBe(false);
  browserHarness.assertNoErrors();
});

test("floor diagnostics are detached and immutable", async ({ page, browserHarness }) => {
  await page.goto("/");
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  const frozen = await page.evaluate(() => {
    const snapshot = window.__cryptkeepDiagnostics!.snapshot();
    return [snapshot.floor, snapshot.floor?.roleMarkers, snapshot.floor?.roleMarkers?.entry].map((value) => Object.isFrozen(value));
  });
  expect(frozen).toEqual([true, true, true]);
  browserHarness.assertNoErrors();
});
