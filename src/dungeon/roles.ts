import { deriveStream } from "../core/rng";
import { createFloorPlan, Tile, type Cell, type FloorPlan, type Room } from "./types";
import type { ConnectedFloorPlan } from "./corridors";

export type SpawnPadKind = "entry" | "boss" | "reward" | "exit";
export interface SpawnPad { readonly kind: SpawnPadKind; readonly center: Cell; readonly cells: readonly Cell[] }
export interface ArenaBounds { readonly x: number; readonly z: number; readonly width: number; readonly height: number }
export interface FloorRoles {
  readonly entryRoomId: string; readonly bossRoomId: string; readonly exitRoomId: string;
  readonly entry: Cell; readonly approach: Cell; readonly boss: Cell; readonly reward: Cell; readonly exit: Cell;
  readonly arena: ArenaBounds;
}
export interface ReservedPath { readonly from: "entry" | "approach" | "boss" | "reward"; readonly to: "approach" | "boss" | "reward" | "exit"; readonly cells: readonly Cell[] }
export interface RoleFloorPlan extends ConnectedFloorPlan {
  readonly roles: FloorRoles;
  readonly spawnPads: readonly SpawnPad[];
  readonly reservedPaths: readonly ReservedPath[];
  readonly reservedCells: readonly Cell[];
}

const MAX_ROOMS = 18;
const STEPS = Object.freeze([{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]);
const cmp = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const cellCmp = (a: Cell, b: Cell) => a.z - b.z || a.x - b.x;
const key = (c: Cell) => `${c.x},${c.z}`;
const freezeCell = (c: Cell): Cell => Object.freeze({ x: c.x, z: c.z });

function copyInput(plan: ConnectedFloorPlan): ConnectedFloorPlan {
  if (!plan || typeof plan !== "object") throw new TypeError("A connected floor plan is required");
  const base = createFloorPlan({ floorNumber: plan.floorNumber, floorSeed: plan.floorSeed,
    generatorVersion: plan.generatorVersion, width: plan.width, height: plan.height, tiles: plan.tiles, rooms: plan.rooms });
  const roomById = new Map(base.rooms.map((room) => [room.id, room]));
  if (!Array.isArray(plan.edges)) throw new TypeError("Connected floor edges must be an array");
  const edges = plan.edges.map((edge) => {
    if (!edge || typeof edge !== "object" || typeof edge.fromRoomId !== "string" || typeof edge.toRoomId !== "string" ||
      (edge.kind !== "tree" && edge.kind !== "loop") || !Array.isArray(edge.path) || edge.path.length === 0) {
      throw new TypeError("Malformed corridor edge");
    }
    if (edge.fromRoomId === edge.toRoomId || !roomById.has(edge.fromRoomId) || !roomById.has(edge.toRoomId)) {
      throw new RangeError("Corridor edge must reference two distinct existing rooms");
    }
    const path = edge.path.map((p: Cell) => {
      if (!p || !Number.isSafeInteger(p.x) || !Number.isSafeInteger(p.z) || p.x < 0 || p.z < 0 || p.x >= base.width || p.z >= base.height) {
        throw new RangeError("Corridor path cells must be in-grid integer coordinates");
      }
      for (let dz = 0; dz <= 1; dz++) for (let dx = 0; dx <= 1; dx++) {
        const x = p.x + dx, z = p.z + dz;
        if (x >= base.width || z >= base.height) throw new RangeError("Corridor path 2×2 footprint must remain inside the grid");
        if (base.tiles[z * base.width + x] !== Tile.Walkable) throw new RangeError("Corridor path 2×2 footprint must be walkable");
      }
      return freezeCell(p);
    });
    for (let i = 1; i < path.length; i++) if (Math.abs(path[i]!.x - path[i - 1]!.x) + Math.abs(path[i]!.z - path[i - 1]!.z) !== 1) throw new RangeError("Corridor paths must be cardinal");
    const validateEndpoint = (endpoint: Cell, expected: Cell, roomId: string, label: string): Cell => {
      if (!endpoint || typeof endpoint !== "object" || !Number.isSafeInteger(endpoint.x) || !Number.isSafeInteger(endpoint.z) ||
        endpoint.x < 0 || endpoint.z < 0 || endpoint.x >= base.width || endpoint.z >= base.height) {
        throw new RangeError(`Corridor ${label} endpoint must be an in-grid safe integer cell`);
      }
      if (endpoint.x !== expected.x || endpoint.z !== expected.z) throw new RangeError(`Corridor ${label} endpoint must match its path endpoint`);
      const room = roomById.get(roomId)!;
      if (!inside(room, endpoint) || !inside(room, { x: endpoint.x + 1, z: endpoint.z + 1 })) {
        throw new RangeError(`Corridor ${label} 2×2 anchor must fit inside room ${roomId}`);
      }
      return freezeCell(endpoint);
    };
    const from = validateEndpoint(edge.fromCell, path[0]!, edge.fromRoomId, "from");
    const to = validateEndpoint(edge.toCell, path[path.length - 1]!, edge.toRoomId, "to");
    return Object.freeze({ fromRoomId: edge.fromRoomId, toRoomId: edge.toRoomId, kind: edge.kind,
      fromCell: from, toCell: to, path: Object.freeze(path) });
  });
  return Object.freeze({ ...base, edges: Object.freeze(edges) });
}
function walkable(plan: FloorPlan, c: Cell): boolean { return c.x >= 0 && c.z >= 0 && c.x < plan.width && c.z < plan.height && plan.tiles[c.z * plan.width + c.x] === Tile.Walkable; }
function neighbors(plan: FloorPlan, c: Cell): Cell[] { return STEPS.map((d) => ({ x: c.x + d.x, z: c.z + d.z })).filter((p) => walkable(plan, p)); }
function bfs(plan: FloorPlan, start: Cell): Map<string, Cell | null> {
  const prev = new Map<string, Cell | null>([[key(start), null]]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const next of neighbors(plan, queue[i]!)) if (!prev.has(key(next))) { prev.set(key(next), queue[i]!); queue.push(next); }
  return prev;
}
function pathFrom(prev: Map<string, Cell | null>, target: Cell): Cell[] {
  if (!prev.has(key(target))) return [];
  const path: Cell[] = []; let cur: Cell | null | undefined = target;
  while (cur) { path.push(cur); cur = prev.get(key(cur)); }
  return path.reverse();
}
function inside(room: Room, c: Cell): boolean { const r = room.rect; return c.x >= r.x && c.z >= r.z && c.x < r.x + r.width && c.z < r.z + r.height; }
function rectWalkable(plan: FloorPlan, room: Room, x: number, z: number, w: number, h: number): boolean {
  for (let dz = 0; dz < h; dz++) for (let dx = 0; dx < w; dx++) if (!walkable(plan, { x: x + dx, z: z + dz }) || !inside(room, { x: x + dx, z: z + dz })) return false;
  return true;
}
function padsFor(plan: FloorPlan, room: Room, arena: ArenaBounds): { boss: Cell; reward: Cell; exit: Cell } | null {
  const candidates: Cell[] = [];
  for (let z = arena.z; z < arena.z + arena.height; z++) for (let x = arena.x; x < arena.x + arena.width; x++) candidates.push({ x, z });
  const validCenter = (c: Cell) => rectWalkable(plan, room, c.x - 1, c.z - 1, 3, 3);
  const centers = candidates.filter(validCenter).sort(cellCmp);
  const apart = (a: Cell, b: Cell) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z)) >= 3;
  for (const boss of centers) for (const reward of centers) {
    if (!apart(boss, reward)) continue;
    for (const exit of centers) if (apart(boss, exit) && apart(reward, exit)) return { boss, reward, exit };
  }
  return null;
}
function arenaCandidates(plan: FloorPlan, room: Room): ArenaBounds[] {
  const out: ArenaBounds[] = [], r = room.rect;
  // For each top-left and height, retain the maximal walkable width. Any
  // smaller all-walkable rectangle at that origin is contained by this one.
  for (let z = r.z; z < r.z + r.height; z++) for (let x = r.x; x < r.x + r.width; x++) {
    let maxWidth = r.x + r.width - x;
    for (let h = 1; z + h <= r.z + r.height; h++) {
      let rowWidth = 0;
      while (rowWidth < maxWidth && walkable(plan, { x: x + rowWidth, z: z + h - 1 })) rowWidth++;
      maxWidth = rowWidth;
      if (h >= 7 && maxWidth >= 7) out.push({ x, z, width: maxWidth, height: h });
      if (maxWidth === 0) break;
    }
  }
  return out.sort((a,b) => b.width*b.height - a.width*a.height || a.z-b.z || a.x-b.x);
}
function makePad(kind: SpawnPadKind, center: Cell): SpawnPad {
  const cells: Cell[] = [];
  for (let z = center.z - 1; z <= center.z + 1; z++) for (let x = center.x - 1; x <= center.x + 1; x++) cells.push(freezeCell({ x, z }));
  return Object.freeze({ kind, center: freezeCell(center), cells: Object.freeze(cells) });
}
function routeWithin(plan: FloorPlan, start: Cell, target: Cell, room?: Room): Cell[] {
  const prev = new Map<string, Cell | null>([[key(start), null]]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i]!; if (key(here) === key(target)) return pathFrom(prev, target);
    for (const n of neighbors(plan, here)) if ((!room || inside(room, n)) && !prev.has(key(n))) { prev.set(key(n), here); queue.push(n); }
  }
  return [];
}

/** Assign deterministic entry and boss-room roles without changing occupancy. */
export function assignRoles(input: ConnectedFloorPlan): RoleFloorPlan {
  const plan = copyInput(input);
  if (plan.rooms.length > MAX_ROOMS) throw new RangeError("Role assignment supports at most 18 rooms");
  if (plan.rooms.length < 3) throw new RangeError("Role assignment requires at least three rooms");
  const rooms = [...plan.rooms].sort((a,b) => cmp(a.id,b.id));
  for (const room of rooms) for (let z=room.rect.z; z<room.rect.z+room.rect.height; z++) for (let x=room.rect.x; x<room.rect.x+room.rect.width; x++)
    if (!walkable(plan,{x,z})) throw new RangeError(`Room ${room.id} contains blocked occupancy`);
  for (let i=0;i<rooms.length;i++) for (let j=i+1;j<rooms.length;j++) { const a=rooms[i]!.rect,b=rooms[j]!.rect;
    if (a.x<b.x+b.width&&b.x<a.x+a.width&&a.z<b.z+b.height&&b.z<a.z+a.height) throw new RangeError("Room rectangles must not overlap"); }
  const entryCandidates: { room: Room; center: Cell }[] = [];
  for (const room of rooms) for (let z=room.rect.z+2;z<room.rect.z+room.rect.height-2;z++) for (let x=room.rect.x+2;x<room.rect.x+room.rect.width-2;x++) {
    const center={x,z}; if (rectWalkable(plan,room,x-2,z-2,5,5)) entryCandidates.push({room,center});
  }
  if (!entryCandidates.length) throw new RangeError("No room can fit the safe entry spawn pad and 5×5 clearance");
  const rng = deriveStream(plan.floorSeed,"room-roles",JSON.stringify([plan.generatorVersion,plan.floorNumber,"roles"]));
  const entryPick = entryCandidates[rng.nextInt(0,entryCandidates.length)]!;
  const fromEntry = bfs(plan, entryPick.center);
  const candidates: {room:Room;arena:ArenaBounds;pads:{boss:Cell;reward:Cell;exit:Cell};approach:Cell;entryPath:Cell[];distance:number}[]=[];
  for (const room of rooms) if (room.id!==entryPick.room.id) {
    const arenas=arenaCandidates(plan,room); if (!arenas.length) continue;
    const boundary: Cell[]=[];
    for(let z=room.rect.z;z<room.rect.z+room.rect.height;z++) for(let x=room.rect.x;x<room.rect.x+room.rect.width;x++) {
      const c={x,z}; if ((x===room.rect.x||z===room.rect.z||x===room.rect.x+room.rect.width-1||z===room.rect.z+room.rect.height-1)&&fromEntry.has(key(c))) boundary.push(c);
    }
    boundary.sort((a,b)=>pathFrom(fromEntry,a).length-pathFrom(fromEntry,b).length||cellCmp(a,b));
    if(!boundary.length) continue;
    for(const arena of arenas) { const pads=padsFor(plan,room,arena); if(!pads) continue;
      const approach=boundary[0]!, entryPath=pathFrom(fromEntry,approach);
      candidates.push({room,arena,pads,approach,entryPath,distance:entryPath.length-1}); break;
    }
  }
  if (!candidates.length) throw new RangeError("No reachable distinct boss room has a walkable 7×7 arena and three separated spawn pads");
  candidates.sort((a,b)=>b.distance-a.distance||cmp(a.room.id,b.room.id));
  const maxDistance=candidates[0]!.distance, far=candidates.filter(c=>c.distance===maxDistance);
  const selected=far[rng.nextInt(0,far.length)]!;
  const bossPath=routeWithin(plan,selected.approach,selected.pads.boss,selected.room);
  const rewardPath=routeWithin(plan,selected.pads.boss,selected.pads.reward,selected.room);
  const exitPath=routeWithin(plan,selected.pads.reward,selected.pads.exit,selected.room);
  if(!bossPath.length||!rewardPath.length||!exitPath.length) throw new RangeError("Selected boss room lacks a reachable critical arena path");
  const roleCells={entry:entryPick.center,approach:selected.approach,boss:selected.pads.boss,reward:selected.pads.reward,exit:selected.pads.exit};
  const rawPaths: ReservedPath[]=[
    {from:"entry",to:"approach",cells:selected.entryPath},
    {from:"approach",to:"boss",cells:bossPath},
    {from:"boss",to:"reward",cells:rewardPath},
    {from:"reward",to:"exit",cells:exitPath},
  ];
  const paths: ReservedPath[]=rawPaths.map((p)=>Object.freeze({ ...p,cells:Object.freeze(p.cells.map(freezeCell)) }));
  const pads=Object.freeze([makePad("entry",roleCells.entry),makePad("boss",roleCells.boss),makePad("reward",roleCells.reward),makePad("exit",roleCells.exit)]);
  const reserved=new Map<string,Cell>();
  for(let z=selected.arena.z;z<selected.arena.z+selected.arena.height;z++)for(let x=selected.arena.x;x<selected.arena.x+selected.arena.width;x++)reserved.set(`${z},${x}`,freezeCell({x,z}));
  for(const p of paths)for(const c of p.cells)reserved.set(`${c.z},${c.x}`,c);
  for(const p of pads)for(const c of p.cells)reserved.set(`${c.z},${c.x}`,c);
  const reservedCells=Object.freeze([...reserved.values()].sort(cellCmp));
  const roles=Object.freeze({entryRoomId:entryPick.room.id,bossRoomId:selected.room.id,exitRoomId:selected.room.id,
    entry:freezeCell(roleCells.entry),approach:freezeCell(roleCells.approach),boss:freezeCell(roleCells.boss),reward:freezeCell(roleCells.reward),exit:freezeCell(roleCells.exit),arena:Object.freeze({...selected.arena})});
  return Object.freeze({...plan,roles,spawnPads:pads,reservedPaths:Object.freeze(paths),reservedCells});
}
