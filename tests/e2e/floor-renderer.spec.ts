import { expect, test } from "@playwright/test";

test("renders seeded floor-only geometry and replaces/disposes floors repeatedly", async ({ page }) => {
  const pageErrors: string[] = [], consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto("/tests/harness/floor-renderer.html");
  await expect.poll(() => page.evaluate(() => window.floorRendererFixture?.active()?.hash)).toMatch(/^fnv1a:/);
  const seedA = await page.evaluate(() => window.floorRendererFixture.active());
  console.log("Floor renderer seed A:", JSON.stringify(seedA));
  await page.screenshot({ path: "docs/evidence/CK-01-07/seed-a.png" });
  const seedB = await page.evaluate(() => window.floorRendererFixture.replace("CK-01-07-seed-b"));
  console.log("Floor renderer seed B:", JSON.stringify(seedB));
  await page.screenshot({ path: "docs/evidence/CK-01-07/seed-b.png" });
  expect(seedB.hash).not.toBe(seedA.hash);
  expect(seedB.counts.markers).toBe(4);
  expect(seedB.rendererCounts.drawCalls).toBeLessThanOrEqual(10);
  const repeated = await page.evaluate(() => window.floorRendererFixture.cycle(25));
  expect(repeated).toHaveLength(25);
  for (const report of repeated) {
    expect(report.rootCount).toBe(1);
    expect(report.counts).toEqual(report.seed === seedA.seed ? seedA.counts : seedB.counts);
    expect(report.rendererCounts.geometries).toBe(seedB.rendererCounts.geometries);
    expect(report.rendererCounts.textures).toBe(seedB.rendererCounts.textures);
    expect(report.rendererCounts.programs).toBe(seedB.rendererCounts.programs);
  }
  await page.evaluate(() => window.floorRendererFixture.dispose());
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
