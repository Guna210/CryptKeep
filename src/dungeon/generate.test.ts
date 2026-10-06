import { describe, expect, it } from "vitest";
import { generateFloor } from "./generate";
import { createFallbackFloor } from "./fallback";
import { validateFloor } from "./validate";
import { Tile } from "./types";

const config=(floorNumber:number)=>({campaignSeed:"CK-01-05 corpus",floorNumber});
const validFactory=({floorSeed,floorNumber,generatorVersion}:any)=>createFallbackFloor(floorSeed,floorNumber,generatorVersion);

describe("floor generation and validation",()=>{
  it("runs the normal generation pipeline on representative depths",()=>{
    for(const floorNumber of [1,10,11,50,99,100]){
      const a=generateFloor({campaignSeed:"normal-pipeline-corpus",floorNumber});
      const b=generateFloor({campaignSeed:"normal-pipeline-corpus",floorNumber});
      expect(a).toEqual(b);expect(a.diagnostics.attempts).toBeGreaterThanOrEqual(1);expect(a.diagnostics.attempts).toBeLessThanOrEqual(8);
      expect(validateFloor(a.plan).valid).toBe(true);
    }
  });
  it("generates repeatable valid floors across the supported depth range",()=>{
    for(const floorNumber of [1,10,11,50,99,100]){
      const a=generateFloor(config(floorNumber),{attemptFactory:validFactory});
      const b=generateFloor(config(floorNumber),{attemptFactory:validFactory});
      expect(a).toEqual(b);expect(a.diagnostics.attempts).toBe(1);expect(a.diagnostics.usedFallback).toBe(false);
      expect(validateFloor(a.plan).valid).toBe(true);expect(Object.isFrozen(a.plan.roles.arena)).toBe(true);
    }
  });
  it("rejects malformed configuration before calling the factory",()=>{
    let calls=0;const attemptFactory=()=>{calls++;return null;};
    for(const c of [{campaignSeed:" ",floorNumber:1},{campaignSeed:"s",floorNumber:0},{campaignSeed:"s",floorNumber:101},{campaignSeed:"s",floorNumber:1,generatorVersion:" "}]) expect(()=>generateFloor(c as any,{attemptFactory})).toThrow();
    expect(()=>generateFloor(config(1),{attemptFactory,cheat:true} as any)).toThrow();expect(calls).toBe(0);
  });
  it("retries malformed then valid plans with isolated unique attempt seeds",()=>{
    const contexts:any[]=[];const out=generateFloor(config(11),{attemptFactory:(ctx)=>{contexts.push(ctx);return contexts.length===1?{}:validFactory(ctx);}});
    expect(contexts).toHaveLength(2);expect(new Set(contexts.map(c=>c.floorSeed)).size).toBe(2);
    expect(out.diagnostics.attempts).toBe(2);expect(out.diagnostics.rejections).toHaveLength(1);expect(out.diagnostics.usedFallback).toBe(false);
  });
  it("hashes only the canonical layout record",()=>{
    const plain=generateFloor(config(6),{attemptFactory:validFactory});
    const noisy=generateFloor(config(6),{attemptFactory:(ctx)=>({...validFactory(ctx) as any,elapsedMs:123,uiState:{open:true}})});
    expect(noisy.contentHash).toBe(plain.contentHash);
    expect(generateFloor({campaignSeed:"different",floorNumber:6},{attemptFactory:validFactory}).contentHash).not.toBe(plain.contentHash);
  });
  it("caps throwing and invalid factories at eight calls before valid fallback",()=>{
    let calls=0;const out=generateFloor(config(50),{attemptFactory:()=>{calls++;throw new Error("fixture failure");}});
    expect(calls).toBe(8);expect(out.diagnostics.attempts).toBe(8);expect(out.diagnostics.usedFallback).toBe(true);
    expect(out.diagnostics.rejections).toHaveLength(8);expect(out.plan.rooms).toHaveLength(4);expect(validateFloor(out.plan).valid).toBe(true);
    expect(out.plan.roles).toBeDefined();
  });
  it("detects isolated walkable occupancy and blocked exit using tile BFS",()=>{
    const source=createFallbackFloor("validator-seed",2,"cryptkeep-layout-v1");
    const orphan:any=structuredClone(source);let found=-1;
    for(let i=0;i<orphan.tiles.length;i++)if(orphan.tiles[i]===Tile.Solid){found=i;break;}
    orphan.tiles[found]=Tile.Walkable;
    expect(validateFloor(orphan).issues.some(x=>x.includes("every walkable cell"))).toBe(true);
    const blocked:any=structuredClone(source);const exit=blocked.roles.exit;blocked.tiles[exit.z*blocked.width+exit.x]=Tile.Solid;
    expect(validateFloor(blocked).issues.some(x=>x.includes("exit marker"))).toBe(true);
  });
  it("rejects malformed huge bounds/arrays safely and detects centered pad damage",()=>{
    expect(validateFloor({width:1e100,height:1e100,tiles:[],rooms:[]}).valid).toBe(false);
    expect(validateFloor({width:20,height:20,tiles:Array(400),rooms:Array(1000000)}).valid).toBe(false);
    const plan:any=structuredClone(createFallbackFloor("pad-seed",3,"cryptkeep-layout-v1"));
    plan.spawnPads[0]!.center.x++;
    expect(validateFloor(plan).valid).toBe(false);
    const dangerous:any=structuredClone(createFallbackFloor("safe-bounds",3,"cryptkeep-layout-v1"));
    dangerous.roles.entry={x:Number.MAX_SAFE_INTEGER,z:Number.MAX_SAFE_INTEGER};
    dangerous.roles.arena={x:Number.MAX_SAFE_INTEGER,z:Number.MAX_SAFE_INTEGER,width:7,height:7};
    expect(validateFloor(dangerous).valid).toBe(false);
  });
});
