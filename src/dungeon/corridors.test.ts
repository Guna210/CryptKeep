import { describe, expect, it } from "vitest";
import { connectRooms } from "./corridors";
import { layoutDefaults, placeRooms } from "./rooms";
import { createFloorPlan, Tile, type FloorPlan } from "./types";

function empty(floor=1, seed="seed", width=36, height=36): FloorPlan {
  return createFloorPlan({ floorNumber:floor, floorSeed:seed, width,height,tiles:Array(width*height).fill(Tile.Solid) });
}
function generated(floor:number,seed:string) {
  const dims=layoutDefaults(floor);
  return connectRooms(placeRooms(empty(floor,seed,dims.width,dims.height)).plan);
}
function reachable(plan:FloorPlan): Set<number> {
  const first=plan.tiles.findIndex((tile)=>tile===Tile.Walkable); if(first<0)return new Set();
  const seen=new Set([first]), queue=[first];
  for(let i=0;i<queue.length;i++) { const at=queue[i]!,x=at%plan.width,z=Math.floor(at/plan.width);
    for(const [nx,nz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]] as [number,number][]) {
      if(nx<0||nz<0||nx>=plan.width||nz>=plan.height)continue;
      const next=nz*plan.width+nx; if(plan.tiles[next]===Tile.Walkable&&!seen.has(next)){seen.add(next);queue.push(next);}
    }
  } return seen;
}
function edgeKey(edge:{fromRoomId:string;toRoomId:string}) { return `${edge.fromRoomId}\0${edge.toRoomId}`; }

describe("room graph and corridor carving",()=>{
  it("connects actual walkable occupancy deterministically across representative floors",()=>{
    for(const floor of [1,10,11,50,99,100]) for(const seed of ["amber","cobalt"]) {
      const first=generated(floor,seed), repeat=generated(floor,seed), seen=reachable(first);
      expect(repeat).toEqual(first);
      expect(first.edges.filter(e=>e.kind==="tree")).toHaveLength(Math.max(0,first.rooms.length-1));
      expect(first.edges.length).toBeLessThanOrEqual(153);
      for(const room of first.rooms) {
        const {x,z,width,height}=room.rect;
        expect(seen.has((z+Math.floor(height/2))*first.width+x+Math.floor(width/2))).toBe(true);
      }
      for(let z=0;z<first.height;z++)for(let x=0;x<first.width;x++) {
        if(first.tiles[z*first.width+x]===Tile.Walkable) expect(seen.has(z*first.width+x)).toBe(true);
        if(x===0||z===0||x===first.width-1||z===first.height-1) expect(first.tiles[z*first.width+x]).toBe(Tile.Solid);
      }
      const original=placeRooms(empty(floor,seed,layoutDefaults(floor).width,layoutDefaults(floor).height)).plan;
      for(let i=0;i<original.tiles.length;i++) if(original.tiles[i]===Tile.Walkable) expect(first.tiles[i]).toBe(Tile.Walkable);
    }
  });
  it("stores valid room endpoints, cardinal centerlines, and bounded two-cell footprints",()=>{
    const result=generated(11,"paths");
    for(const edge of result.edges) {
      const a=result.rooms.find(r=>r.id===edge.fromRoomId)!, b=result.rooms.find(r=>r.id===edge.toRoomId)!;
      expect(edge.path[0]).toEqual(edge.fromCell); expect(edge.path.at(-1)).toEqual(edge.toCell);
      for(const endpoint of [edge.fromCell,edge.toCell]) {
        const room=endpoint===edge.fromCell?a:b, r=room.rect;
        expect(endpoint.x).toBeGreaterThanOrEqual(r.x); expect(endpoint.z).toBeGreaterThanOrEqual(r.z);
        expect(endpoint.x+1).toBeLessThan(r.x+r.width); expect(endpoint.z+1).toBeLessThan(r.z+r.height);
      }
      for(let i=0;i<edge.path.length;i++) {
        const p=edge.path[i]!; expect(p.x).toBeGreaterThanOrEqual(0);expect(p.z).toBeGreaterThanOrEqual(0);
        expect(p.x+1).toBeLessThan(result.width);expect(p.z+1).toBeLessThan(result.height);
        for(let dz=0;dz<2;dz++)for(let dx=0;dx<2;dx++)expect(result.tiles[(p.z+dz)*result.width+p.x+dx]).toBe(Tile.Walkable);
        if(i){const q=edge.path[i-1]!;expect(Math.abs(q.x-p.x)+Math.abs(q.z-p.z)).toBe(1);}
      }
    }
    expect(Object.isFrozen(result.edges)).toBe(true);
    expect(Object.isFrozen(result.edges[0])).toBe(true);
    expect(Object.isFrozen(result.edges[0]?.path)).toBe(true);
    expect(Object.isFrozen(result.edges[0]?.path[0])).toBe(true);
  });
  it("keeps tree paths unchanged when loops are disabled and supports valid fractions",()=>{
    const source=placeRooms(empty(1,"options")).plan;
    const plain=connectRooms(source,{loopFraction:0}), loops=connectRooms(source);
    expect(plain.edges.filter(e=>e.kind==="tree")).toEqual(loops.edges.filter(e=>e.kind==="tree"));
    expect(plain.edges.every(e=>e.kind==="tree")).toBe(true);
    expect(()=>connectRooms(source,{loopFraction:-0.1})).toThrow();
    expect(()=>connectRooms(source,{loopFraction:Infinity})).toThrow();
    expect(()=>connectRooms(source,{loopFraction:null as never})).toThrow();
    expect(()=>connectRooms(source,{loopFraction:"0.2" as never})).toThrow();
    expect(()=>connectRooms(source,{loopFraction:NaN})).toThrow();
    expect(()=>connectRooms(source,{unknown:true} as never)).toThrow();
    expect(()=>connectRooms(source,null as never)).toThrow(TypeError);
  });
  it("carves a real optional cycle in a four-corner room fixture",()=>{
    const rooms=[
      {id:"a",rect:{x:2,z:2,width:4,height:4}}, {id:"b",rect:{x:22,z:2,width:4,height:4}},
      {id:"c",rect:{x:2,z:22,width:4,height:4}}, {id:"d",rect:{x:22,z:22,width:4,height:4}},
    ];
    const tiles=Array(30*30).fill(Tile.Solid);
    for(const {rect:r} of rooms)for(let z=r.z;z<r.z+r.height;z++)for(let x=r.x;x<r.x+r.width;x++)tiles[z*30+x]=Tile.Walkable;
    const plan=createFloorPlan({floorNumber:1,floorSeed:"corners",width:30,height:30,tiles,rooms});
    const tree=connectRooms(plan,{loopFraction:0}), result=connectRooms(plan,{loopFraction:1});
    expect(result.edges.filter(e=>e.kind==="loop").length).toBeGreaterThan(0);
    expect(new Set(result.edges.map(edgeKey)).size).toBe(result.edges.length);
    expect(result.tiles.filter((t,i)=>t===Tile.Walkable&&tree.tiles[i]===Tile.Solid).length).toBeGreaterThan(0);
    expect(reachable(result).size).toBe(result.tiles.filter(t=>t===Tile.Walkable).length);
  });
  it("handles zero/one room and rejects malformed plans before generation",()=>{
    expect(connectRooms(empty()).edges).toEqual([]);
    const one=createFloorPlan({floorNumber:1,floorSeed:"one",width:8,height:8,tiles:Array(64).fill(Tile.Solid),rooms:[{id:"one",rect:{x:2,z:2,width:3,height:3}}]});
    const oneTiles=[...one.tiles];for(let z=2;z<5;z++)for(let x=2;x<5;x++)oneTiles[z*8+x]=Tile.Walkable;
    expect(connectRooms(createFloorPlan({...one,tiles:oneTiles})).edges).toEqual([]);
    expect(()=>connectRooms({...one,width:81} as FloorPlan)).toThrow();
    expect(()=>connectRooms(createFloorPlan({floorNumber:1,floorSeed:"solid",width:8,height:8,tiles:Array(64).fill(Tile.Solid),rooms:[{id:"r",rect:{x:2,z:2,width:3,height:3}}]}))).toThrow(/interior/);
    expect(()=>connectRooms(createFloorPlan({floorNumber:1,floorSeed:"small",width:8,height:8,tiles:Array(64).fill(Tile.Walkable),rooms:[{id:"r",rect:{x:2,z:2,width:1,height:3}}]}))).toThrow(/2×2/);
    const overlaps=createFloorPlan({floorNumber:1,floorSeed:"overlap",width:8,height:8,tiles:Array(64).fill(Tile.Walkable),rooms:[
      {id:"a",rect:{x:1,z:1,width:4,height:4}},{id:"b",rect:{x:3,z:3,width:4,height:4}},
    ]});
    expect(()=>connectRooms(overlaps)).toThrow(/overlap/);
    const crowdedRooms=Array.from({length:19},(_,i)=>({id:`r${i}`,rect:{x:i%5,z:Math.floor(i/5),width:1,height:1}}));
    const crowded=createFloorPlan({floorNumber:1,floorSeed:"cap",width:8,height:8,tiles:Array(64).fill(Tile.Walkable),rooms:crowdedRooms});
    expect(()=>connectRooms(crowded)).toThrow(/18 rooms/);
  });
});
