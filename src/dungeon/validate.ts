import { Tile, type Cell } from "./types";
import type { RoleFloorPlan } from "./roles";

export interface FloorValidation { readonly valid: boolean; readonly issues: readonly string[] }
const fail = (issues: string[], message: string) => issues.push(message);
const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const cell = (v: any): v is Cell => obj(v) && Number.isSafeInteger(v.x) && Number.isSafeInteger(v.z);
const key = (c: any) => c && typeof c === "object" ? `${c.x},${c.z}` : "<invalid>";
const cmp = (a: Cell,b: Cell) => a.z-b.z || a.x-b.x;

/** Independently validate role metadata and actual tile occupancy; never mutates input. */
export function validateFloor(input: unknown): FloorValidation {
  const issues: string[] = [];
  if (!obj(input)) return Object.freeze({ valid:false, issues:Object.freeze(["plan must be an object"]) });
  const p=input;
  if (!Number.isSafeInteger(p.floorNumber)||p.floorNumber<1||p.floorNumber>100) fail(issues,"floorNumber must be 1 through 100");
  if (typeof p.floorSeed!=="string"||!p.floorSeed.trim()||[...p.floorSeed].length>64) fail(issues,"floorSeed must be a nonempty normalized seed of at most 64 characters");
  if (typeof p.generatorVersion!=="string"||!p.generatorVersion.trim()) fail(issues,"generatorVersion must be nonempty");
  if (!Number.isSafeInteger(p.width)||!Number.isSafeInteger(p.height)||p.width<1||p.height<1||p.width>80||p.height>80) {
    fail(issues,"grid dimensions must be integers from 1 through 80");
    return Object.freeze({valid:false,issues:Object.freeze(issues)});
  }
  const n=p.width*p.height;
  if (!Array.isArray(p.tiles)||p.tiles.length!==n||n>6400) { fail(issues,"tiles must contain exactly width × height cells"); return Object.freeze({valid:false,issues:Object.freeze(issues)}); }
  if (!Array.isArray(p.rooms)||p.rooms.length<3||p.rooms.length>18) { fail(issues,"rooms must contain 3 through 18 records"); return Object.freeze({valid:false,issues:Object.freeze(issues)}); }
  const ids=new Set<string>(), rooms: any[]=[];
  for (const r of p.rooms) {
    if (!obj(r)||typeof r.id!=="string"||!r.id.trim()||!obj(r.rect)) { fail(issues,"room record or ID is malformed"); continue; }
    const b=r.rect;
    if (![b.x,b.z,b.width,b.height].every(Number.isSafeInteger)||b.width<5||b.height<5||b.x<1||b.z<1||b.x+b.width>=p.width||b.z+b.height>=p.height) { fail(issues,`room ${r.id} has invalid bounds`); continue; }
    if(ids.has(r.id)) fail(issues,`duplicate room ID ${r.id}`); ids.add(r.id); rooms.push(r);
    for(let z=b.z;z<b.z+b.height;z++) for(let x=b.x;x<b.x+b.width;x++) if(p.tiles[z*p.width+x]!==Tile.Walkable) fail(issues,`room ${r.id} interior is blocked`);
  }
  for(let i=0;i<rooms.length;i++) for(let j=i+1;j<rooms.length;j++){const a=rooms[i].rect,b=rooms[j].rect;if(a.x<b.x+b.width&&b.x<a.x+a.width&&a.z<b.z+b.height&&b.z<a.z+a.height)fail(issues,"room rectangles overlap");}
  for(let z=0;z<p.height;z++) for(let x=0;x<p.width;x++){const v=p.tiles[z*p.width+x];if(v!==Tile.Solid&&v!==Tile.Walkable)fail(issues,"tile value is invalid");if((x===0||z===0||x===p.width-1||z===p.height-1)&&v!==Tile.Solid)fail(issues,"outer border must be solid");}
  const roles=p.roles;
  if(!obj(roles)||!cell(roles.entry)||!cell(roles.approach)||!cell(roles.boss)||!cell(roles.reward)||!cell(roles.exit)||!obj(roles.arena)) { fail(issues,"role markers or arena are malformed"); return Object.freeze({valid:false,issues:Object.freeze(issues)}); }
  const inside=(c:Cell)=>c.x>=0&&c.z>=0&&c.x<p.width&&c.z<p.height;
  const walk=(c:Cell)=>inside(c)&&p.tiles[c.z*p.width+c.x]===Tile.Walkable;
  const roomById=new Map(rooms.map(r=>[r.id,r]));
  const entryRoom=roomById.get(roles.entryRoomId), bossRoom=roomById.get(roles.bossRoomId);
  const inRoom=(r:any,c:Cell)=>!!r&&c.x>=r.rect.x&&c.z>=r.rect.z&&c.x<r.rect.x+r.rect.width&&c.z<r.rect.z+r.rect.height;
  if(!entryRoom||!bossRoom||entryRoom.id===bossRoom.id||roles.exitRoomId!==bossRoom?.id)fail(issues,"entry and boss room IDs must identify distinct rooms");
  for(const name of ["entry","approach","boss","reward","exit"] as const)if(!walk(roles[name]))fail(issues,`${name} marker must be finite, in-grid, and walkable`);
  if(!inRoom(entryRoom,roles.entry))fail(issues,"entry marker must be inside entry room");
  if(entryRoom&&inside(roles.entry))for(let z=roles.entry.z-2;z<=roles.entry.z+2;z++)for(let x=roles.entry.x-2;x<=roles.entry.x+2;x++)if(!walk({x,z})||!inRoom(entryRoom,{x,z}))fail(issues,"entry must have a safe walkable 5×5 area in its room");
  if(!inRoom(bossRoom,roles.approach)||!inRoom(bossRoom,roles.boss)||!inRoom(bossRoom,roles.reward)||!inRoom(bossRoom,roles.exit))fail(issues,"boss markers must be inside boss room");
  const a=roles.arena;
  const arenaValid=[a.x,a.z,a.width,a.height].every(Number.isSafeInteger)&&a.width>=7&&a.height>=7&&a.x>=0&&a.z>=0&&a.x+a.width<=p.width&&a.z+a.height<=p.height;
  if(!arenaValid)fail(issues,"arena must be an in-grid rectangle at least 7×7");
  else for(let z=a.z;z<a.z+a.height;z++)for(let x=a.x;x<a.x+a.width;x++){const c={x,z};if(!walk(c)||!inRoom(bossRoom,c))fail(issues,"arena must be wholly walkable inside boss room");}
  if(arenaValid)for(const name of ["boss","reward","exit"] as const){const c=roles[name];if(c.x<a.x||c.z<a.z||c.x>=a.x+a.width||c.z>=a.z+a.height)fail(issues,`${name} marker must be inside arena`);}
  if(key(roles.approach)===key(roles.boss))fail(issues,"approach and boss markers must be distinct");
  if(!(roles.approach.x===bossRoom?.rect.x||roles.approach.z===bossRoom?.rect.z||roles.approach.x===bossRoom?.rect.x+bossRoom?.rect.width-1||roles.approach.z===bossRoom?.rect.z+bossRoom?.rect.height-1))fail(issues,"approach must lie on boss room boundary");
  const kinds: string[]=["entry","boss","reward","exit"];
  const padCells=new Set<string>();
  if(!Array.isArray(p.spawnPads)||p.spawnPads.length!==4)fail(issues,"exactly four spawn pads are required");
  else for(let i=0;i<4;i++){const pad=p.spawnPads[i],kind=kinds[i]!,marker=(roles as Record<string,any>)[kind],room=kind==="entry"?entryRoom:bossRoom;if(!obj(pad)||pad.kind!==kind||!cell(pad.center)||!inside(pad.center)||!inRoom(room,pad.center)||!Array.isArray(pad.cells)||pad.cells.length!==9||!cell(marker)||key(pad.center)!==key(marker)){fail(issues,`${kind} spawn pad is malformed or mismatched`);continue;}const expected:string[]=[];for(let z=pad.center.z-1;z<=pad.center.z+1;z++)for(let x=pad.center.x-1;x<=pad.center.x+1;x++)expected.push(`${x},${z}`);if(pad.cells.some((c:any)=>!cell(c)||!walk(c)||!inRoom(room,c))||pad.cells.map(key).join("|")!==expected.join("|"))fail(issues,`${kind} pad must be its walkable centered 3×3 footprint in the matching room`);for(const k of expected){if(padCells.has(k))fail(issues,"spawn pads must be mutually disjoint");padCells.add(k);}}
  const reached=new Set<string>();if(walk(roles.entry)){const q:Cell[]=[roles.entry];reached.add(key(roles.entry));for(let i=0;i<q.length;i++){const c=q[i]!;for(const d of [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}]){const t={x:c.x+d.x,z:c.z+d.z},k=key(t);if(walk(t)&&!reached.has(k)){reached.add(k);q.push(t);}}}}
  for(let i=0;i<n;i++)if(p.tiles[i]===Tile.Walkable&&!reached.has(`${i%p.width},${Math.floor(i/p.width)}`))fail(issues,"every walkable cell must be reachable from entry");
  for(const [name,c] of [["approach",roles.approach],["boss",roles.boss],["reward",roles.reward],["exit",roles.exit]] as const)if(cell(c)&&!reached.has(key(c)))fail(issues,`${name} must be reachable from entry`);
  const links: [string,string][]=[["entry","approach"],["approach","boss"],["boss","reward"],["reward","exit"]];
  if(!Array.isArray(p.reservedPaths)||p.reservedPaths.length!==4)fail(issues,"exactly four reserved paths are required");
  else for(let i=0;i<4;i++){const path=p.reservedPaths[i], [from,to]=links[i]!;if(!obj(path)||path.from!==from||path.to!==to||!Array.isArray(path.cells)||path.cells.length<1||path.cells.length>n){fail(issues,`reserved path ${from}→${to} is malformed`);continue;}if(key(path.cells[0])!==key(roles[from])||key(path.cells[path.cells.length-1])!==key(roles[to]))fail(issues,`reserved path ${from}→${to} has wrong endpoints`);for(let j=0;j<path.cells.length;j++){const c=path.cells[j];if(!cell(c)||!walk(c))fail(issues,`reserved path ${from}→${to} has blocked/out-of-grid cells`);if(j&&cell(c)&&cell(path.cells[j-1])&&Math.abs(c.x-path.cells[j-1].x)+Math.abs(c.z-path.cells[j-1].z)!==1)fail(issues,"reserved paths must be cardinal");}}
  if(!Array.isArray(p.reservedCells)||p.reservedCells.length>n)fail(issues,"reservedCells must be a bounded array");else{const actual=new Set<string>();for(const c of p.reservedCells){if(!cell(c)||!walk(c))fail(issues,"reserved cells must be walkable in-grid cells");else{if(actual.has(key(c)))fail(issues,"reserved cells must be unique");actual.add(key(c));}}const required=new Set<string>(padCells);if(arenaValid)for(let z=a.z;z<a.z+a.height;z++)for(let x=a.x;x<a.x+a.width;x++)required.add(`${x},${z}`);for(const path of Array.isArray(p.reservedPaths)?p.reservedPaths:[])if(obj(path)&&Array.isArray(path.cells)&&path.cells.length<=n)for(const c of path.cells)if(cell(c))required.add(key(c));if(required.size!==actual.size||[...required].some(k=>!actual.has(k)))fail(issues,"reservedCells must equal the sorted union of pads, paths, and arena");const sorted=[...actual].map(k=>{const [x,z]=k.split(",").map(Number);return{x:x!,z:z!} as Cell;}).sort(cmp).map(key);if(sorted.join("|")!==p.reservedCells.filter(cell).map(key).join("|"))fail(issues,"reservedCells must be row-major sorted");}
  if(!Array.isArray(p.edges)||p.edges.length>153)fail(issues,"edges must be a bounded array");else{const edgePairs=new Set<string>();for(const e of p.edges){if(!obj(e)||!ids.has(e.fromRoomId)||!ids.has(e.toRoomId)||e.fromRoomId===e.toRoomId||(e.kind!=="tree"&&e.kind!=="loop")||!Array.isArray(e.path)||e.path.length<1||e.path.length>n){fail(issues,"corridor edge metadata is malformed");continue;}const pair=[e.fromRoomId,e.toRoomId].sort().join("|");if(edgePairs.has(pair))fail(issues,"duplicate corridor edge");edgePairs.add(pair);if(!cell(e.fromCell)||!cell(e.toCell)||key(e.fromCell)!==key(e.path[0])||key(e.toCell)!==key(e.path[e.path.length-1]))fail(issues,"corridor edge endpoints must match its path");const fromRoom=roomById.get(e.fromRoomId),toRoom=roomById.get(e.toRoomId);if(cell(e.fromCell)&&(!inRoom(fromRoom,e.fromCell)||!inRoom(fromRoom,{x:e.fromCell.x+1,z:e.fromCell.z+1}))||cell(e.toCell)&&(!inRoom(toRoom,e.toCell)||!inRoom(toRoom,{x:e.toCell.x+1,z:e.toCell.z+1})))fail(issues,"corridor 2×2 endpoints must fit their named rooms");for(let i=0;i<e.path.length;i++){const c=e.path[i];if(!cell(c)||!inside(c))fail(issues,"corridor anchors must be in-grid");else for(let z=c.z;z<=c.z+1;z++)for(let x=c.x;x<=c.x+1;x++)if(!walk({x,z}))fail(issues,"corridor 2×2 footprints must be walkable and in-grid");if(i&&cell(c)&&cell(e.path[i-1])&&Math.abs(c.x-e.path[i-1].x)+Math.abs(c.z-e.path[i-1].z)!==1)fail(issues,"corridor paths must be cardinal");}}}
  return Object.freeze({valid:issues.length===0,issues:Object.freeze(issues)});
}
