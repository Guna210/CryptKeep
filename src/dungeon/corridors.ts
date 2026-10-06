import { deriveStream } from "../core/rng";
import { createFloorPlan, Tile, type Cell, type FloorPlan, type Room } from "./types";

const MAX_ROOMS = 18;

export interface CorridorOptions { readonly loopFraction?: number }
export interface CorridorEdge {
  readonly fromRoomId: string;
  readonly toRoomId: string;
  readonly kind: "tree" | "loop";
  readonly fromCell: Cell;
  readonly toCell: Cell;
  /** Ordered cardinal centerline anchors, including both room endpoints. */
  readonly path: readonly Cell[];
}
export interface ConnectedFloorPlan extends FloorPlan { readonly edges: readonly CorridorEdge[] }
interface Pair { readonly a: Room; readonly b: Room; readonly key: string; readonly cost: number }

function compareId(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function comparePair(a: Pair, b: Pair): number {
  return a.cost - b.cost || compareId(a.a.id, b.a.id) || compareId(a.b.id, b.b.id);
}
function canonicalPair(a: Room, b: Room): Pair {
  const [first, second] = compareId(a.id, b.id) <= 0 ? [a, b] : [b, a];
  const ax = first.rect.x + first.rect.width / 2;
  const az = first.rect.z + first.rect.height / 2;
  const bx = second.rect.x + second.rect.width / 2;
  const bz = second.rect.z + second.rect.height / 2;
  return { a: first, b: second, key: JSON.stringify([first.id, second.id]), cost: (ax - bx) ** 2 + (az - bz) ** 2 };
}
function anchor(room: Room): Cell {
  const { x, z, width: rw, height: rh } = room.rect;
  return Object.freeze({ x: x + Math.floor((rw - 2) / 2), z: z + Math.floor((rh - 2) / 2) });
}
function route(from: Cell, to: Cell, horizontalFirst: boolean): Cell[] {
  const points: Cell[] = [{ x: from.x, z: from.z }];
  const append = (x: number, z: number) => {
    const last = points[points.length - 1]!;
    if (last.x !== x || last.z !== z) points.push({ x, z });
  };
  const horizontal = () => { let x = from.x; while (x !== to.x) { x += Math.sign(to.x - x); append(x, from.z); } };
  const vertical = () => { let z = from.z; while (z !== to.z) { z += Math.sign(to.z - z); append(to.x, z); } };
  if (horizontalFirst) { horizontal(); vertical(); }
  else {
    let z = from.z; while (z !== to.z) { z += Math.sign(to.z - z); append(from.x, z); }
    let x = from.x; while (x !== to.x) { x += Math.sign(to.x - x); append(x, to.z); }
  }
  return points;
}
function freezeEdge(pair: Pair, kind: CorridorEdge["kind"], points: readonly Cell[]): CorridorEdge {
  const path = Object.freeze(points.map(({ x, z }) => Object.freeze({ x, z })));
  return Object.freeze({ fromRoomId: pair.a.id, toRoomId: pair.b.id, kind,
    fromCell: path[0]!, toCell: path[path.length - 1]!, path });
}

/** Connect every room with a deterministic MST, then carve geometry-valid optional loops. */
export function connectRooms(plan: FloorPlan, options?: CorridorOptions): ConnectedFloorPlan {
  if (!plan || typeof plan !== "object") throw new TypeError("A floor plan is required");
  const input = createFloorPlan({ floorNumber: plan.floorNumber, floorSeed: plan.floorSeed,
    generatorVersion: plan.generatorVersion, width: plan.width, height: plan.height,
    tiles: plan.tiles, rooms: plan.rooms });
  if (input.rooms.length > MAX_ROOMS) throw new RangeError("Floor plans may contain at most 18 rooms");
  for (const room of input.rooms) {
    const { width, height, x, z } = room.rect;
    if (width < 2 || height < 2) throw new RangeError("Rooms must be at least 2×2 cells");
    for (let row = z; row < z + height; row++) for (let col = x; col < x + width; col++) {
      if (input.tiles[row * input.width + col] !== Tile.Walkable) throw new RangeError(`Room ${room.id} interior must be walkable`);
    }
  }
  const rects = [...input.rooms].sort((a,b) => compareId(a.id,b.id));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i]!.rect, b = rects[j]!.rect;
    if (a.x < b.x+b.width && b.x < a.x+a.width && a.z < b.z+b.height && b.z < a.z+a.height) {
      throw new RangeError("Room rectangles must not overlap");
    }
  }
  if (options !== undefined && (options === null || typeof options !== "object" || Array.isArray(options))) throw new TypeError("Corridor options must be an object");
  for (const key of Object.keys(options ?? {})) if (key !== "loopFraction") throw new TypeError(`Unknown corridor option: ${key}`);
  const loopFraction = options?.loopFraction === undefined ? 0.2 : options.loopFraction;
  if (typeof loopFraction !== "number" || !Number.isFinite(loopFraction) || loopFraction < 0 || loopFraction > 1) {
    throw new RangeError("loopFraction must be finite and between 0 and 1");
  }
  const tiles = [...input.tiles];
  const rooms = [...input.rooms].sort((a,b) => compareId(a.id,b.id));
  const edges: CorridorEdge[] = [];
  if (rooms.length < 2) return Object.freeze({ ...input, edges: Object.freeze(edges) });
  const pairs: Pair[] = [];
  for (let i = 0; i < rooms.length; i++) for (let j = i+1; j < rooms.length; j++) pairs.push(canonicalPair(rooms[i]!, rooms[j]!));
  pairs.sort(comparePair);
  const parent = new Map(rooms.map((room) => [room.id, room.id]));
  const find = (id: string): string => { let root=id; while (parent.get(root)! !== root) root=parent.get(root)!; while (id !== root) { const next=parent.get(id)!; parent.set(id,root); id=next; } return root; };
  const tree: Pair[] = [], remaining: Pair[] = [];
  for (const pair of pairs) { const a=find(pair.a.id), b=find(pair.b.id); if (a !== b) { parent.set(b,a); tree.push(pair); } else remaining.push(pair); }
  const rng = deriveStream(input.floorSeed, "layout", JSON.stringify([input.generatorVersion,input.floorNumber,"corridors"]));
  const carve = (pair: Pair, kind: CorridorEdge["kind"], horizontalFirst: boolean, requireNew: boolean): boolean => {
    const from=anchor(pair.a), to=anchor(pair.b);
    const points=route(from,to,horizontalFirst);
    let changed=false;
    for (const point of points) for (let dz=0; dz<2; dz++) for (let dx=0; dx<2; dx++) {
      const x=point.x+dx,z=point.z+dz;
      if (x<0||z<0||x>=input.width||z>=input.height) throw new Error("Corridor footprint escaped grid");
      if (tiles[z*input.width+x] !== Tile.Walkable) changed=true;
    }
    if (requireNew && !changed) return false;
    for (const point of points) for (let dz=0; dz<2; dz++) for (let dx=0; dx<2; dx++) tiles[(point.z+dz)*input.width+point.x+dx]=Tile.Walkable;
    edges.push(freezeEdge(pair,kind,points)); return true;
  };
  for (const pair of tree) carve(pair,"tree",rng.nextInt(0,2)===0,false);
  const wanted = loopFraction === 1 ? remaining.length : Math.min(remaining.length, Math.ceil((rooms.length-1)*loopFraction/(1-loopFraction)));
  // Shuffle candidate order with the isolated stream; route bends are tested before rejecting overlap.
  for (let i=remaining.length-1;i>0;i--) { const j=rng.nextInt(0,i+1); [remaining[i],remaining[j]]=[remaining[j]!,remaining[i]!]; }
  let added=0;
  for (const pair of remaining) {
    if (added>=wanted) break;
    const bend=rng.nextInt(0,2)===0;
    if (carve(pair,"loop",bend,true)||carve(pair,"loop",!bend,true)) added++;
  }
  const result = createFloorPlan({ ...input, tiles, rooms });
  return Object.freeze({ ...result, edges: Object.freeze(edges) });
}
