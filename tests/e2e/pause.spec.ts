import { mkdirSync } from "node:fs";
import { expect, test } from "../harness/browser";
import type { FloorSessionSnapshot } from "../../src/app/floor-session";
import type { PlayerSessionSnapshot } from "../../src/app/player-session";

type PauseDiagnosticsApi={snapshot():{floor:Readonly<FloorSessionSnapshot>|null;player:Readonly<PlayerSessionSnapshot>|null}};

test("native pause freezes the session and Resume requires a fresh gesture without replaying held input", async ({page, browserHarness}) => {
  await page.goto("/");
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  const read = () => page.evaluate(() => (window.__cryptkeepDiagnostics as unknown as PauseDiagnosticsApi).snapshot());
  await page.getByRole("button", {name:"Explore dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  await page.keyboard.down("w");
  await page.keyboard.down("Shift");
  await expect.poll(async () => (await read()).player!.sprinting).toBe(true);
  await page.mouse.down({button:"left"});
  await page.mouse.down({button:"right"});
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", {name:"Resume dungeon"})).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBe(null);
  const paused = await read();
  expect(paused.player!.active).toBe(false);
  expect(paused.player!.velocity).toEqual({x:0,y:0,z:0});
  mkdirSync("test-results/CK-02-08", {recursive:true});
  await page.screenshot({path:"test-results/CK-02-08/pause.png", fullPage:true});
  await page.waitForTimeout(800);
  const stillPaused = await read();
  expect(stillPaused.floor!.tick).toBe(paused.floor!.tick);
  expect(stillPaused.player!.pose).toEqual(paused.player!.pose);
  expect(stillPaused.player!.resources).toEqual(paused.player!.resources);
  expect(stillPaused.player!.regenTimers).toEqual(paused.player!.regenTimers);
  expect(stillPaused.player!.dash.cooldownRemainingSeconds).toBe(paused.player!.dash.cooldownRemainingSeconds);

  await page.getByRole("button", {name:"Resume dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  await expect.poll(async () => (await read()).player!.active).toBe(true);
  await expect.poll(async () => {
    const resumed = await read();
    return resumed.floor!.tick > paused.floor!.tick && resumed.player!.lastSample !== null;
  }).toBe(true);
  const firstResumedSample = (await read()).player!.lastSample!;
  expect(firstResumedSample.held).not.toContain("primary");
  expect(firstResumedSample.held).not.toContain("secondary");
  expect(firstResumedSample.pressed).not.toContain("primary");
  expect(firstResumedSample.pressed).not.toContain("secondary");
  expect(firstResumedSample.released).not.toContain("primary");
  expect(firstResumedSample.released).not.toContain("secondary");
  const resumedPose = (await read()).player!.pose;
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", {key:"w", repeat:true, bubbles:true, cancelable:true})));
  await page.waitForTimeout(200);
  expect((await read()).player!.pose).toEqual(resumedPose);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  await page.mouse.up({button:"right"});
  await page.mouse.up({button:"left"});
  await page.keyboard.down("w");
  await expect.poll(async () => (await read()).player!.pose!.z).not.toBe(resumedPose!.z);
  await page.keyboard.up("w");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", {name:"Resume dungeon"})).toBeVisible();
  browserHarness.assertNoErrors();
});

test("visibility restoration does not auto-resume; a simulated denial needs a fresh native gesture", async ({page, browserHarness}) => {
  await page.goto("/");
  const read = () => page.evaluate(() => (window.__cryptkeepDiagnostics as unknown as PauseDiagnosticsApi).snapshot().player!);
  await page.getByRole("button", {name:"Explore dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {configurable:true, value:"hidden"});
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("button", {name:"Resume dungeon"})).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {configurable:true, value:"visible"});
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(120);
  expect((await read()).active).toBe(false);
  expect((await read()).capture).toBe("idle");
  await page.locator("canvas").evaluate((element) => {
    (element as unknown as {requestPointerLock:() => Promise<void>}).requestPointerLock = () => Promise.reject(new Error("simulated denial"));
  });
  await page.getByRole("button", {name:"Resume dungeon"}).click();
  await expect(page.getByText("Mouse capture was denied. Choose Resume to try again.")).toBeVisible();
  expect((await read()).active).toBe(false);
  await page.locator("canvas").evaluate((element) => { delete (element as unknown as {requestPointerLock?:() => Promise<void>}).requestPointerLock; });
  await page.getByRole("button", {name:"Resume dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  await page.keyboard.press("Escape");
  browserHarness.assertNoErrors();
});

test("paused preview controls can reroll a floor without releasing pause or auto-resuming", async ({page, browserHarness}) => {
  await page.goto("/");
  const snapshot = () => page.evaluate(() => (window.__cryptkeepDiagnostics as unknown as PauseDiagnosticsApi).snapshot());
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  await page.getByRole("button", {name:"Explore dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", {name:"Resume dungeon"})).toBeVisible();
  const paused = await snapshot();
  await page.getByLabel("Dungeon seed").fill("   ");
  await page.getByRole("button", {name:"Generate dungeon"}).click();
  await expect(page.getByText("GENERATION FAILED")).toBeVisible();
  expect((await snapshot()).floor!.campaignSeed).toBe(paused.floor!.campaignSeed);
  expect((await snapshot()).player!.active).toBe(false);
  await expect(page.getByRole("button", {name:"Resume dungeon"})).toBeVisible();
  await page.getByLabel("Dungeon seed").fill("pause-reroll-seed");
  await page.getByRole("button", {name:"Generate dungeon"}).click();
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  await expect.poll(async () => (await snapshot()).floor!.campaignSeed).toBe("pause-reroll-seed");
  expect((await snapshot()).player!.active).toBe(false);
  expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
  expect((await snapshot()).player!.resources!.stamina.current).toBe(100);
  expect((await snapshot()).floor!.tick).toBe(paused.floor!.tick);
  await expect(page.getByRole("button", {name:"Resume dungeon"})).toBeVisible();
  await page.getByRole("button", {name:"Resume dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  await expect.poll(async () => (await snapshot()).player!.active).toBe(true);
  browserHarness.assertNoErrors();
});
