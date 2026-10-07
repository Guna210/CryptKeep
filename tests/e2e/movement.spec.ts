import { mkdirSync } from "node:fs";
import { expect, test } from "../harness/browser";
import { generateFloor } from "../../src/dungeon/generate";
import { Tile } from "../../src/dungeon/types";
import { isPoseValid } from "../../src/player/state";

test("real player input moves, mouse changes the camera, and release stops motion", async ({ page, browserHarness }) => {
  await page.setViewportSize({width:1280,height:800});
  await page.goto("/");
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  const player = () => page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().player!);
  const tick = () => page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().floor!.tick);
  const waitTicks = async (amount:number) => {
    const start=await tick();
    await expect.poll(tick,{timeout:15000}).toBeGreaterThanOrEqual(start+amount);
  };
  const before = await player();
  expect(before.pose).toMatchObject({x:expect.any(Number),y:1.6,z:expect.any(Number),yaw:0});
  await page.getByLabel("Dungeon seed").focus();
  await page.keyboard.down("w");
  await page.waitForTimeout(150);
  await page.keyboard.up("w");
  expect((await player()).pose).toEqual(before.pose);
  await page.getByLabel("Dungeon seed").fill("cryptkeep-preview");
  mkdirSync("test-results/CK-02-05", {recursive:true});
  await page.screenshot({path:"test-results/CK-02-05/camera-before.png",fullPage:true});

  await page.getByRole("button", {name:"Explore dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  await page.keyboard.down("w");
  await waitTicks(12);
  await page.evaluate(() => document.querySelector(".cryptkeep__overlay")?.classList.remove("cryptkeep__overlay--playing", "cryptkeep__overlay--session-started"));
  // Synthetic focusin exercises the editable-target guard while capture normally hides the seed form.
  await page.getByLabel("Dungeon seed").evaluate((input) => input.dispatchEvent(new FocusEvent("focusin", {bubbles:true})));
  await expect.poll(async () => (await player()).capture).toBe("idle");
  const focusedPose = (await player()).pose;
  expect((await player()).active).toBe(false);
  await page.waitForTimeout(250);
  expect((await player()).pose).toEqual(focusedPose);
  await page.keyboard.up("w");
  await page.getByRole("button", {name:"Resume dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Gameplay canvas has no layout box");
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.move(box.x+box.width/2+70,box.y+box.height/2-18);
  await page.keyboard.down("w");
  await waitTicks(42);
  await page.keyboard.up("w");
  const moving = await player();
  expect(moving.active).toBe(true);
  expect(Math.hypot(moving.pose!.x-before.pose!.x,moving.pose!.z-before.pose!.z)).toBeGreaterThan(0.5);
  expect(moving.pose!.yaw).not.toBe(before.pose!.yaw);
  expect(moving.pose!.pitch).not.toBe(before.pose!.pitch);
  await page.screenshot({path:"test-results/CK-02-05/camera-after.png",fullPage:true});

  await page.keyboard.press("Escape");
  await expect.poll(async () => (await player()).capture).toBe("idle");
  const released = await player();
  expect(released.active).toBe(false);
  expect(released.velocity).toEqual({x:0,y:0,z:0});
  const stoppedAt = released.pose;
  await page.waitForTimeout(250); // observe that the paused pose remains frozen
  expect((await player()).pose).toEqual(stoppedAt);
  await page.getByRole("button", {name:"Resume dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  const repeatedStartTick=await tick();
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", {key:"w", repeat:true, bubbles:true, cancelable:true})));
  await expect.poll(tick,{timeout:15000}).toBeGreaterThanOrEqual(repeatedStartTick+15);
  expect((await player()).pose).toEqual(stoppedAt);
  const freshStartTick=await tick();
  await page.keyboard.down("w");
  await expect.poll(tick,{timeout:15000}).toBeGreaterThanOrEqual(freshStartTick+24);
  await page.keyboard.up("w");
  expect(Math.hypot((await player()).pose!.x-stoppedAt!.x,(await player()).pose!.z-stoppedAt!.z)).toBeGreaterThan(0.2);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await player()).capture).toBe("idle");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForTimeout(200);
  expect((await player()).active).toBe(false);
  expect((await player()).capture).toBe("idle");
  const pausedAt = (await player()).pose;

  await page.getByLabel("Dungeon seed").focus();
  await page.keyboard.down("w");
  await page.waitForTimeout(150);
  await page.keyboard.up("w");
  expect((await player()).pose).toEqual(pausedAt);
  browserHarness.assertNoErrors();
});

test("Left Shift is wired to valid sprint, stationary Shift is free, and pause freezes meter snapshots", async ({ page, browserHarness }) => {
  await page.goto("/");
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  const read = () => page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().player!);
  await page.getByRole("button", {name:"Explore dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  let snapshot = await read();
  const full = snapshot.resources!.stamina.current;
  const stationaryTick = (await page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().floor!.tick)) + 2;
  await page.keyboard.down("Shift");
  await expect.poll(() => page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().floor!.tick), {timeout:5000}).toBeGreaterThanOrEqual(stationaryTick);
  expect((await read()).resources!.stamina.current).toBe(full);
  await page.keyboard.up("Shift");

  const movingTick = (await page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().floor!.tick)) + 24;
  await page.keyboard.down("w");
  await page.keyboard.down("Shift");
  await expect.poll(async () => {
    const p = await read();
    return p.sprinting && Math.hypot(p.velocity!.x,p.velocity!.z) > 3.5 && p.resources!.stamina.current < full;
  }, {timeout:8000}).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().floor!.tick), {timeout:5000}).toBeGreaterThanOrEqual(movingTick);
  snapshot = await read();
  expect(snapshot.resources!.stamina.current).toBeLessThan(full);
  expect(snapshot.sprinting).toBe(true);
  await page.keyboard.up("Shift");
  await page.keyboard.up("w");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await read()).active).toBe(false);
  const paused = await read();
  await page.waitForTimeout(800);
  expect((await read()).resources).toEqual(paused.resources);
  expect((await read()).regenTimers).toEqual(paused.regenTimers);
  browserHarness.assertNoErrors();
});

test("swept movement stops at a generated wall with the full player circle clear", async ({ page, browserHarness }) => {
  const floor = generateFloor({campaignSeed:"cryptkeep-preview",floorNumber:1}).plan;
  const entry = floor.roles.entry;
  const directions = [{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}];
  const target = directions.map((direction) => {
    let count=0,x=entry.x+direction.x,z=entry.z+direction.z;
    while(x>=0&&z>=0&&x<floor.width&&z<floor.height&&floor.tiles[z*floor.width+x]===1){count++;x+=direction.x;z+=direction.z;}
    if(x<0||z<0||x>=floor.width||z>=floor.height||floor.tiles[z*floor.width+x]!==0)return null;
    const startX=(entry.x+0.5)*2,startZ=(entry.z+0.5)*2;
    const distance=direction.x<0?startX-(x+1)*2-0.28:direction.x>0?x*2-startX-0.28:
      direction.z<0?startZ-(z+1)*2-0.28:z*2-startZ-0.28;
    return {direction,distance,yaw:Math.atan2(-direction.x,-direction.z),wall:{x,z},count};
  }).filter((item):item is NonNullable<typeof item>=>item!==null).sort((a,b)=>a.distance-b.distance)[0];
  if(!target)throw new Error("Generated entry has no cardinal wall to test");
  expect(floor.tiles[target.wall.z*floor.width+target.wall.x]).toBe(Tile.Solid);
  await page.goto("/");
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  await page.getByRole("button",{name:"Explore dungeon"}).click();
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.tagName)).toBe("CANVAS");
  const box=await page.locator("canvas").boundingBox();
  if(!box) throw new Error("Gameplay canvas has no layout box");
  const waitForSettledLook=async()=>{
    let lastTick=-1,lastYaw=Number.NaN,stableSamples=0;
    await expect.poll(async()=>{
      const snapshot=await page.evaluate(()=>window.__cryptkeepDiagnostics!.snapshot());
      const tick=snapshot.floor!.tick, yaw=snapshot.player!.pose!.yaw, look=snapshot.player!.lastSample?.look;
      if(tick>lastTick){
        stableSamples=look?.x===0&&look?.y===0&&yaw===lastYaw?stableSamples+1:0;
        lastTick=tick;lastYaw=yaw;
      }
      return stableSamples;
    },{timeout:5000}).toBeGreaterThanOrEqual(3);
  };
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await waitForSettledLook();
  const facing=await page.evaluate(()=>window.__cryptkeepDiagnostics!.snapshot().player!.pose!.yaw);
  const yawDelta=Math.atan2(Math.sin(target.yaw-facing),Math.cos(target.yaw-facing));
  let remaining=-yawDelta/0.002, movedX=0;
  while(Math.abs(remaining)>0.1){const delta=Math.sign(remaining)*Math.min(120,Math.abs(remaining));movedX+=delta;await page.mouse.move(box.x+box.width/2+movedX,box.y+box.height/2);remaining-=delta;}
  await waitForSettledLook();
  await expect.poll(()=>page.evaluate(()=>window.__cryptkeepDiagnostics!.snapshot().player!.pose!.yaw)).toBeCloseTo(target.yaw,2);
  const spawn=await page.evaluate(()=>window.__cryptkeepDiagnostics!.snapshot().player!.pose!);
  await page.keyboard.down("w");
  await page.keyboard.down("Shift");
  await expect.poll(async()=>page.evaluate(({x,z,dx,dz})=>{
    const p=window.__cryptkeepDiagnostics!.snapshot().player!.pose!;
    return (p.x-x)*dx+(p.z-z)*dz;
  },{x:spawn.x,z:spawn.z,dx:target.direction.x,dz:target.direction.z}),{timeout:15000}).toBeGreaterThan(target.distance-0.06);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  const finalPlayer=await page.evaluate(()=>window.__cryptkeepDiagnostics!.snapshot().player!);
  const stopped=finalPlayer.pose!;
  expect(isPoseValid(floor,stopped)).toBe(true);
  const progress=(stopped.x-spawn.x)*target.direction.x+(stopped.z-spawn.z)*target.direction.z;
  if(progress>target.distance+0.02) console.log("Wall fixture overshoot",JSON.stringify({target,targetYaw:target.yaw,spawn,stopped,progress,tick:await page.evaluate(()=>window.__cryptkeepDiagnostics!.snapshot().floor!.tick),lastSample:finalPlayer.lastSample}));
  expect(progress).toBeGreaterThan(target.distance-0.06);
  expect(progress).toBeLessThanOrEqual(target.distance+0.02);
  expect(finalPlayer.velocity!.x*target.direction.x+finalPlayer.velocity!.z*target.direction.z).toBe(0);
  expect(finalPlayer.resources!.stamina.current).toBeLessThan(100);
  const staminaAtWall = finalPlayer.resources!.stamina.current;
  await page.keyboard.down("w");
  await page.keyboard.down("Shift");
  await expect.poll(async () => (await page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().player!)).lastSample?.held.includes("sprint")).toBe(true);
  await expect.poll(async () => (await page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().player!)).resources!.stamina.current, {timeout:5000}).toBe(100);
  const heldAtWall = await page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().player!);
  await page.waitForTimeout(150);
  expect((await page.evaluate(() => window.__cryptkeepDiagnostics!.snapshot().player!)).resources!.stamina.current).toBe(heldAtWall.resources!.stamina.current);
  await page.keyboard.up("Shift");
  await page.keyboard.up("w");
  await page.keyboard.press("Escape");
  browserHarness.assertNoErrors();
});

test("pagehide removes retained Explore and Resume listeners and neither can revive the app", async ({ page, browserHarness }) => {
  await page.addInitScript(() => {
    const exploreListeners = new Set<EventListenerOrEventListenerObject>();
    const resumeListeners = new Set<EventListenerOrEventListenerObject>();
    const focusListeners = new Set<EventListenerOrEventListenerObject>();
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === "click" && listener && this instanceof HTMLElement && this.classList.contains("cryptkeep__explore")) exploreListeners.add(listener);
      if (type === "click" && listener && this instanceof HTMLElement && this.classList.contains("cryptkeep__resume")) resumeListeners.add(listener);
      if (type === "focusin" && listener && this === document) focusListeners.add(listener);
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      if (type === "click" && listener && this instanceof HTMLElement && this.classList.contains("cryptkeep__explore")) exploreListeners.delete(listener);
      if (type === "click" && listener && this instanceof HTMLElement && this.classList.contains("cryptkeep__resume")) resumeListeners.delete(listener);
      if (type === "focusin" && listener && this === document) focusListeners.delete(listener);
      return remove.call(this, type, listener, options);
    };
    Object.defineProperty(window, "__exploreListenerCount", {get:() => exploreListeners.size});
    Object.defineProperty(window, "__resumeListenerCount", {get:() => resumeListeners.size});
    Object.defineProperty(window, "__focusListenerCount", {get:() => focusListeners.size});
  });
  await page.goto("/");
  await expect(page.getByText("DUNGEON PREVIEW")).toBeVisible();
  expect(await page.evaluate(() => (window as Window & {__focusListenerCount:number}).__focusListenerCount)).toBe(1);
  await page.getByRole("button", {name:"Explore dungeon"}).evaluate((button) => {
    (window as Window & {__retainedExplore?:HTMLButtonElement}).__retainedExplore = button as HTMLButtonElement;
  });
  expect(await page.evaluate(() => (window as Window & {__exploreListenerCount:number}).__exploreListenerCount)).toBe(1);
  await page.getByRole("button", {name:"Explore dungeon"}).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", {name:"Resume dungeon"})).toBeVisible();
  await page.getByRole("button", {name:"Resume dungeon"}).evaluate((button) => {
    (window as Window & {__retainedResume?:HTMLButtonElement}).__retainedResume = button as HTMLButtonElement;
  });
  expect(await page.evaluate(() => (window as Window & {__resumeListenerCount:number}).__resumeListenerCount)).toBe(1);
  await page.evaluate(() => { window.dispatchEvent(new Event("pagehide")); window.dispatchEvent(new Event("pagehide")); });
  expect(await page.evaluate(() => (window as Window & {__exploreListenerCount:number}).__exploreListenerCount)).toBe(0);
  expect(await page.evaluate(() => (window as Window & {__resumeListenerCount:number}).__resumeListenerCount)).toBe(0);
  expect(await page.evaluate(() => (window as Window & {__focusListenerCount:number}).__focusListenerCount)).toBe(0);
  expect(await page.evaluate(() => "__cryptkeepDiagnostics" in window)).toBe(false);
  expect(await page.evaluate(() => document.querySelector("#app")?.childElementCount)).toBe(0);
  await page.evaluate(() => {
    const retained = window as Window & {__retainedExplore:HTMLButtonElement; __retainedResume:HTMLButtonElement};
    retained.__retainedExplore.click();
    retained.__retainedResume.click();
  });
  expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
  expect(await page.evaluate(() => document.querySelector("#app")?.childElementCount)).toBe(0);
  browserHarness.assertNoErrors();
});
