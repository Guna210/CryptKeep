import {expect,test} from "@playwright/test";
import {mkdirSync} from "node:fs";

test("trusted native sword tap, full charge, wall block and pause cancellation run through the live app",async({page})=>{
  const pageErrors:string[]=[],consoleErrors:string[]=[];
  page.on("pageerror",error=>pageErrors.push(error.message));page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text());});
  mkdirSync("test-results/CK-03-09",{recursive:true});
  await page.setViewportSize({width:960,height:600});await page.goto("/");
  await expect(page.locator(".cryptkeep__status-label")).toHaveText("DUNGEON PREVIEW");
  await page.getByRole("button",{name:"Clear room"}).click();
  await expect(page.locator(".cryptkeep__status-label")).toHaveText("DEV TRAINING · CLEAR");
  await page.getByRole("button",{name:"Explore dungeon"}).click();
  await expect.poll(()=>page.locator("canvas").evaluate(canvas=>document.pointerLockElement===canvas)).toBe(true);
  const snapshot=()=>page.evaluate(()=>window.__cryptkeepDiagnostics!.snapshot());
  const hp=async()=>(await snapshot()).combat?.actors[0]?.health.current??-1;
  const stamina=async()=>(await snapshot()).player?.resources?.stamina.current??-1;
  const swordPhase=async()=>(await snapshot()).combat?.sword.phase??"missing";
  const waitForSwordIdle=async()=>await expect.poll(swordPhase,{timeout:15000}).toBe("idle");
  const floorTick=async()=>(await snapshot()).floor!.tick;
  const attack=async()=>{await page.mouse.down();await page.mouse.up();};
  await attack();await expect.poll(hp).toBe(82);await expect.poll(stamina).toBe(90);
  await page.screenshot({path:"test-results/CK-03-09/native-sword-hit.png"});

  await waitForSwordIdle();
  await page.mouse.down();await expect(page.locator(".ck-hud__charge")).toBeVisible();await expect(page.locator(".ck-hud__charge i")).toHaveAttribute("style","width: 100%;");
  const fullChargeStamina=await stamina();await page.mouse.up();
  await expect.poll(hp).toBe(28);await expect.poll(stamina).toBe(fullChargeStamina-30);
  await waitForSwordIdle();await expect.poll(hp).toBe(28);

  await page.keyboard.press("Escape");await expect.poll(()=>page.locator("canvas").evaluate(canvas=>document.pointerLockElement===canvas)).toBe(false);
  await page.getByRole("button",{name:"Wall blocked"}).click();
  await expect(page.locator(".cryptkeep__status-label")).toHaveText("DEV TRAINING · OBSTRUCTED");
  await page.getByRole("button",{name:"Resume dungeon"}).click();
  await expect.poll(()=>page.locator("canvas").evaluate(canvas=>document.pointerLockElement===canvas)).toBe(true);
  const wallStaminaBefore=await stamina();await attack();
  await expect.poll(()=>stamina()).toBe(wallStaminaBefore-10);
  await waitForSwordIdle(); // finish the real recovery before checking the blocked swing remains a miss
  await expect.poll(hp).toBe(100);

  await waitForSwordIdle();
  await page.mouse.down();await expect(page.locator(".ck-hud__charge")).toBeVisible();
  const beforePause=await stamina();await page.keyboard.press("Escape");await page.mouse.up();
  await expect(page.locator(".ck-hud__charge")).toBeHidden();
  await expect.poll(()=>page.locator("canvas").evaluate(canvas=>document.pointerLockElement===canvas)).toBe(false);
  await page.getByRole("button",{name:"Resume dungeon"}).click();
  await expect.poll(()=>page.locator("canvas").evaluate(canvas=>document.pointerLockElement===canvas)).toBe(true);
  const resumeTick=await floorTick();
  await expect.poll(floorTick,{timeout:15000}).toBeGreaterThanOrEqual(resumeTick+45);
  await expect.poll(stamina).toBeGreaterThanOrEqual(beforePause);await expect.poll(hp).toBe(100);
  await page.keyboard.press("Escape");await page.getByRole("button",{name:"Clear room"}).click();
  await page.getByRole("button",{name:"Resume dungeon"}).click();
  await expect.poll(()=>page.locator("canvas").evaluate(canvas=>document.pointerLockElement===canvas)).toBe(true);
  await attack();await expect.poll(hp).toBe(82);
  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});

declare global { interface Window { __cryptkeepDiagnostics?:{snapshot():{floor?:{tick:number};combat?:{sword:{phase:string};actors:readonly {health:{current:number}}[]};player?:{resources?:{stamina:{current:number}}}}} } }
