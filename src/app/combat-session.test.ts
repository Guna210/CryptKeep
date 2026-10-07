import {describe,expect,it} from "vitest";
import {createGrid} from "../dungeon/grid";
import {Tile} from "../dungeon/types";
import {createGridPlayerState} from "../player/state";
import {createResourceRegenTimers} from "../player/resources";
import {CombatSession} from "./combat-session";
import type {GameCommand} from "../core/commands";

const start={x:10.3,z:10.5,yaw:Math.atan2(1,.9)};
const target={id:"dummy",team:"enemies",position:{x:9.3,z:9.6},radius:.35,health:{current:100,maximum:100}};
function grid(wall=false){const tiles=Array<number>(81).fill(Tile.Walkable);for(let x=0;x<9;x++){tiles[x]=0;tiles[72+x]=0;}for(let z=0;z<9;z++){tiles[z*9]=0;tiles[z*9+8]=0;}if(wall)tiles[49]=0;return createGrid(9,9,tiles);}
const command=(edges:GameCommand["edges"]=[]):GameCommand=>Object.freeze({movement:{x:0,y:0},look:{x:0,y:0},held:[],pressed:edges.filter(e=>e.type==="pressed").map(e=>e.action),released:edges.filter(e=>e.type==="released").map(e=>e.action),edges,cancellations:[]});
function player(pose=start){return createGridPlayerState(grid(),pose).state;}
describe("CombatSession live sword integration boundary",()=>{
 it("spends shared stamina at release and stamps one live-pose hit at its actual active tick",()=>{
  const combat=new CombatSession(grid(),[target],{id:"player",team:"players"});let state=player();let timers=createResourceRegenTimers();const batches:number[]=[];combat.subscribe(batch=>batches.push(...batch.filter(e=>e.type==="damage-applied").map(e=>e.tick)));
  let result=combat.step(state,command([{action:"primary",type:"pressed"}]),1/60,40,timers);state={...state,stamina:result.stamina};timers=result.regenTimers;
  result=combat.step(state,command([{action:"primary",type:"released"}]),1/60,41,timers);state={...state,stamina:result.stamina};timers=result.regenTimers;
  expect(state.stamina.current).toBe(90);expect(result.staminaSpent).toBe(true);expect(timers.staminaIdleSeconds).toBe(0);
  for(let tick=42;tick<=46;tick++){result=combat.step(state,command(),1/60,tick,timers);state={...state,stamina:result.stamina};timers=result.regenTimers;}
  expect(combat.snapshot().actors[0]?.health.current).toBe(82);expect(batches).toEqual([44]);
  result=combat.step(state,command(),1/60,47,timers);expect(combat.snapshot().actors[0]?.health.current).toBe(82);
  combat.dispose();expect(()=>combat.snapshot()).toThrow("disposed");
 });
 it("uses the same Grid for wall LOS, and cancellation never manufactures release or refunds a committed cost",()=>{
  const blocked=new CombatSession(grid(true),[target],{id:"player",team:"players"});let state=player();let timers=createResourceRegenTimers();
  let r=blocked.step(state,command([{action:"primary",type:"pressed"}]),1/60,1,timers);state={...state,stamina:r.stamina};timers=r.regenTimers;
  r=blocked.step(state,command([{action:"primary",type:"released"}]),1/60,2,timers);state={...state,stamina:r.stamina};timers=r.regenTimers;
  for(let tick=3;tick<=7;tick++){r=blocked.step(state,command(),1/60,tick,timers);state={...state,stamina:r.stamina};timers=r.regenTimers;}
  expect(state.stamina.current).toBe(90);expect(blocked.snapshot().actors[0]?.health.current).toBe(100);
  r=blocked.step(state,command([{action:"primary",type:"pressed"}]),1/60,8,timers);state={...state,stamina:r.stamina};timers=r.regenTimers;
  blocked.cancel("pause");
  r=blocked.step(state,command([{action:"primary",type:"released"}]),1/60,9,timers);expect(blocked.snapshot().actors[0]?.health.current).toBe(100);expect(r.stamina.current).toBe(90);
  blocked.dispose();
 });
 it("keeps attack IDs unique when the authoritative actor world resets",()=>{
  const combat=new CombatSession(grid(),[target],{id:"player",team:"players"});const state=player();let timers=createResourceRegenTimers();
  combat.step(state,command([{action:"primary",type:"pressed"}]),1/60,1,timers);
  combat.step(state,command([{action:"primary",type:"released"}]),1/60,2,timers);const first=combat.snapshot().sword.attackId;
  combat.setWorld(grid(),[target]);combat.step(state,command([{action:"primary",type:"pressed"}]),1/60,3,timers);
  combat.step(state,command([{action:"primary",type:"released"}]),1/60,4,timers);const second=combat.snapshot().sword.attackId;
  expect(first).not.toBe(second);combat.dispose();
 });
});
