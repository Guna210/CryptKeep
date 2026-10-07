import { expect, test } from "@playwright/test";

test("DEV training room renders a real target, damage/death state, and optional LOS wall", async ({ page }) => {
  const pageErrors: string[] = [], consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto("/tests/harness/combat-room.html");
  await expect(page.locator("#label")).toContainText("DEV TRAINING ROOM · HP 100 / 100 · ALIVE");
  const initial = await page.evaluate(() => ({ draws: window.combatRoomFixture.drawCalls(), hits: window.combatRoomFixture.queryTargets().map((hit) => hit.targetId), globals: Object.keys(window).filter((key) => /combatRoom|cryptkeep/i.test(key)) }));
  expect(initial.draws).toBeGreaterThan(0); expect(initial.hits).toEqual(["dev-training-dummy"]);
  expect(initial.globals).toContain("combatRoomFixture");
  await page.screenshot({ path: "docs/evidence/CK-03-07/training-clear.png" });
  await page.getByRole("button", { name: "Toggle obstruction" }).click();
  await expect(page.locator("#variant")).toHaveText("OBSTRUCTED");
  expect(await page.evaluate(() => window.combatRoomFixture.queryTargets())).toEqual([]);
  await page.screenshot({ path: "docs/evidence/CK-03-07/training-obstructed.png" });
  await page.getByRole("button", { name: "Toggle obstruction" }).click();
  expect(await page.evaluate(() => window.combatRoomFixture.queryTargets().length)).toBe(1);
  await page.getByRole("button", { name: "Light 18" }).click();
  await expect(page.locator("#label")).toContainText("HP 82 / 100 · ALIVE");
  await page.getByRole("button", { name: "Heavy 54" }).click();
  await expect(page.locator("#label")).toContainText("HP 28 / 100 · ALIVE");
  await page.getByRole("button", { name: "Lethal 100" }).click();
  await expect(page.locator("#label")).toContainText("HP 0 / 100 · DEAD");
  expect(await page.evaluate(() => window.combatRoomFixture.queryTargets())).toEqual([]);
  await page.screenshot({ path: "docs/evidence/CK-03-07/training-dead.png" });
  expect(pageErrors).toEqual([]); expect(consoleErrors).toEqual([]);
});
