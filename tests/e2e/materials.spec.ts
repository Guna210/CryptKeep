import { expect, test } from "../harness/browser";

test("painted material contact sheet covers every real library recipe without browser errors", async ({ page, browserHarness }) => {
  await page.setViewportSize({ width: 820, height: 520 });
  await page.goto("/tests/harness/materials.html");
  const recipes = ["stone", "floor", "door", "entry", "boss", "reward", "exit", "steel", "leather", "brass", "wood", "iron", "trim"];
  await expect(page.locator("#sheet figure")).toHaveCount(recipes.length);
  await expect(page.locator("html")).toHaveAttribute("data-material-count", String(recipes.length));
  await expect(page.locator("html")).toHaveAttribute("data-texture-count", String(recipes.length));
  await expect(page.locator("figcaption").allTextContents()).resolves.toEqual(recipes);
  await page.screenshot({ path: "test-results/CK-ART-03/materials.png" });
  browserHarness.assertNoErrors();
});
