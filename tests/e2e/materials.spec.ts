import { expect, test } from "../harness/browser";

test("base material contact sheet uses real recipes without browser errors", async ({ page, browserHarness }) => {
  await page.setViewportSize({ width: 820, height: 520 });
  await page.goto("/tests/harness/materials.html");
  await expect(page.locator("#sheet figure")).toHaveCount(7);
  await expect(page.locator("html")).toHaveAttribute("data-material-count", "7");
  await expect(page.locator("figcaption").allTextContents()).resolves.toEqual(["stone", "floor", "door", "entry", "boss", "reward", "exit"]);
  await page.screenshot({ path: "docs/evidence/CK-01-06/materials.png" });
  browserHarness.assertNoErrors();
});
