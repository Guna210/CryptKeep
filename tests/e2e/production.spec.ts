import { mkdirSync } from "node:fs";
import { expect, test } from "../harness/browser";

test("production app renders without development diagnostics, including with a tempting query string", async ({ page, browserHarness }) => {
  await page.goto("/?debug=1&diagnostics=1&test=1");
  await expect(page.getByRole("heading", { name: "CRYPTKEEP" })).toBeVisible();
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("Floor 1 · Seed cryptkeep-preview")).toBeVisible();
  await expect(page.locator(".ck-hud")).toBeVisible();
  await expect(page.locator(".ck-training-controls")).toHaveCount(0);
  await expect(page.locator(".ck-hud__reticle")).toBeVisible();
  await expect.poll(() => page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBeGreaterThan(0);
  expect(await page.evaluate(() => "__cryptkeepDiagnostics" in window)).toBe(false);
  browserHarness.assertNoErrors();
});

test("production entry shows painted dungeon masonry and the complete torch at default and native-input angles", async ({ page, browserHarness }) => {
  await page.setViewportSize({width:1280,height:800});
  await page.goto("/");
  await expect(page.getByText("Floor 1 · Seed cryptkeep-preview")).toBeVisible();
  await page.getByRole("button",{name:"Explore dungeon"}).click();
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.tagName)).toBe("CANVAS");
  const canvas=page.locator("canvas");
  const initial=await canvas.evaluate((element:HTMLCanvasElement)=>({
    width:element.width,height:element.height,rect:element.getBoundingClientRect().toJSON(),
    antialias:element.getContext("webgl2")?.getContextAttributes()?.antialias,
    imageRendering:getComputedStyle(element).imageRendering,
  }));
  expect(initial.width).toBeGreaterThanOrEqual(initial.rect.width);
  expect(initial.height).toBeGreaterThanOrEqual(initial.rect.height);
  expect(initial.width*initial.height).toBeLessThanOrEqual(2_400_000);
  expect(initial.antialias).toBe(true);
  expect(initial.imageRendering).not.toBe("pixelated");
  mkdirSync("test-results/CK-ART-02",{recursive:true});
  await page.screenshot({path:"test-results/CK-ART-02/production-entry-yaw-0.png"});
  const center=await canvas.evaluate((element:HTMLCanvasElement)=>{const rect=element.getBoundingClientRect();return{x:rect.x+rect.width/2,y:rect.y+rect.height/2};});
  await page.mouse.move(center.x,center.y);
  await page.mouse.move(center.x+115,center.y,{steps:8});
  await page.screenshot({path:"test-results/CK-ART-02/production-entry-angle-native-mouse.png"});
  await page.setViewportSize({width:900,height:600});
  await expect.poll(()=>canvas.evaluate((element:HTMLCanvasElement)=>element.width/element.height)).toBeCloseTo(1.5,2);
  const resized=await canvas.evaluate((element:HTMLCanvasElement)=>({width:element.width,height:element.height}));
  expect(resized.width).toBeGreaterThanOrEqual(900);
  expect(resized.width*resized.height).toBeLessThanOrEqual(2_400_000);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button",{name:"Resume dungeon"})).toBeVisible();
  browserHarness.assertNoErrors();
});
