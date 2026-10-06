import { CELL_SIZE_METERS } from "../dungeon/grid";
import { Tile, type Grid, type WorldXZ } from "../dungeon/types";
import { PLAYER_RADIUS_METERS } from "./state";

const MAX_CONTACT_ITERATIONS = 4;
const TIME_EPSILON = 1e-10;
const DISTANCE_EPSILON = 1e-10;

export interface CollisionContact {
  readonly x: number;
  readonly z: number;
  /** Outward normal from the blocking surface toward the player's center. */
  readonly normalX: number;
  readonly normalZ: number;
}

export interface CircleMoveResult {
  readonly position: Readonly<WorldXZ>;
  readonly appliedDisplacement: Readonly<WorldXZ>;
  readonly contacts: readonly CollisionContact[];
  readonly blockedX: boolean;
  readonly blockedZ: boolean;
}

interface Hit { readonly t: number; readonly nx: number; readonly nz: number }

/**
 * Resolve a swept player-circle displacement against actual solid grid cells.
 * The start must already be valid; invalid starts throw rather than teleport.
 * The fixed contact budget bounds work, while each tile test is a continuous
 * ray-vs-rounded-rectangle test (box expanded by player radius).
 */
export function moveCircleOnGrid(
  grid: Grid,
  start: WorldXZ,
  displacement: WorldXZ,
  radius = PLAYER_RADIUS_METERS,
): CircleMoveResult {
  if (!grid || !Number.isInteger(grid.width) || !Number.isInteger(grid.height) ||
      grid.width <= 0 || grid.height <= 0 || !Array.isArray(grid.tiles) || grid.tiles.length !== grid.width * grid.height) {
    throw new TypeError("A valid occupancy grid is required");
  }
  if (![start?.x, start?.z, displacement?.x, displacement?.z, radius].every(Number.isFinite) || radius <= 0) {
    throw new RangeError("Start, displacement, and positive radius must be finite");
  }
  if (!isCircleValid(grid, start.x, start.z, radius)) {
    throw new RangeError("Circle movement requires a valid starting position");
  }
  if (![start.x + displacement.x, start.z + displacement.z].every(Number.isFinite)) {
    throw new RangeError("Requested movement exceeds finite world coordinates");
  }

  let x = start.x, z = start.z;
  let rx = displacement.x, rz = displacement.z;
  let blockedX = false, blockedZ = false;
  const contacts: CollisionContact[] = [];
  for (let iteration = 0; iteration < MAX_CONTACT_ITERATIONS && Math.hypot(rx, rz) > DISTANCE_EPSILON; iteration += 1) {
    const hit = firstHit(grid, x, z, rx, rz, radius);
    if (!hit) { x += rx; z += rz; rx = 0; rz = 0; break; }
    const travel = Math.max(0, hit.t - TIME_EPSILON);
    x += rx * travel; z += rz * travel;
    const leftX = rx * (1 - hit.t), leftZ = rz * (1 - hit.t);
    const into = leftX * hit.nx + leftZ * hit.nz;
    rx = into < 0 ? leftX - into * hit.nx : leftX;
    rz = into < 0 ? leftZ - into * hit.nz : leftZ;
    if (Math.abs(hit.nx) > 0.5) blockedX = true;
    if (Math.abs(hit.nz) > 0.5) blockedZ = true;
    contacts.push(Object.freeze({ x, z, normalX: hit.nx, normalZ: hit.nz }));
  }
  // A contact budget exhaustion discards residual motion. It can never skip a wall.
  return Object.freeze({
    position: Object.freeze({ x, z }),
    appliedDisplacement: Object.freeze({ x: x - start.x, z: z - start.z }),
    contacts: Object.freeze(contacts), blockedX, blockedZ,
  });
}

function isCircleValid(grid: Grid, x: number, z: number, radius: number): boolean {
  const minX = x - radius, maxX = x + radius, minZ = z - radius, maxZ = z + radius;
  const x0 = Math.floor(minX / CELL_SIZE_METERS), x1 = Math.floor(maxX / CELL_SIZE_METERS);
  const z0 = Math.floor(minZ / CELL_SIZE_METERS), z1 = Math.floor(maxZ / CELL_SIZE_METERS);
  if (x0 < 0 || z0 < 0 || x1 >= grid.width || z1 >= grid.height) return false;
  for (let iz = z0; iz <= z1; iz += 1) for (let ix = x0; ix <= x1; ix += 1) {
    if (grid.tiles[iz * grid.width + ix] === Tile.Walkable) continue;
    const left = ix * CELL_SIZE_METERS, right = left + CELL_SIZE_METERS;
    const top = iz * CELL_SIZE_METERS, bottom = top + CELL_SIZE_METERS;
    const cx = Math.max(left - x, 0, x - right), cz = Math.max(top - z, 0, z - bottom);
    const tol = 8 * Number.EPSILON * Math.max(1, Math.abs(x), Math.abs(z), right, bottom) * radius;
    if (cx * cx + cz * cz < radius * radius - tol) return false;
  }
  return true;
}

function firstHit(grid: Grid, x: number, z: number, dx: number, dz: number, radius: number): Hit | null {
  let best: Hit | null = null;
  const accept = (hit: Hit | null): void => {
    if (hit && hit.t >= -TIME_EPSILON && hit.t <= 1 + TIME_EPSILON &&
        dx * hit.nx + dz * hit.nz < -DISTANCE_EPSILON && (!best || hit.t < best.t)) best = hit;
  };

  // The map boundary is a solid wall with an inward-facing normal.
  const minX = radius, maxX = grid.width * CELL_SIZE_METERS - radius;
  const minZ = radius, maxZ = grid.height * CELL_SIZE_METERS - radius;
  if (dx < 0) accept({ t: (minX - x) / dx, nx: 1, nz: 0 });
  if (dx > 0) accept({ t: (maxX - x) / dx, nx: -1, nz: 0 });
  if (dz < 0) accept({ t: (minZ - z) / dz, nx: 0, nz: 1 });
  if (dz > 0) accept({ t: (maxZ - z) / dz, nx: 0, nz: -1 });

  // Grid dimensions cap at 80, so checking all cells is deterministic and bounded.
  for (let iz = 0; iz < grid.height; iz += 1) for (let ix = 0; ix < grid.width; ix += 1) {
    if (grid.tiles[iz * grid.width + ix] !== Tile.Solid) continue;
    const l = ix * CELL_SIZE_METERS, r = l + CELL_SIZE_METERS;
    const t = iz * CELL_SIZE_METERS, b = t + CELL_SIZE_METERS;
    accept(sweepRoundedRect(x, z, dx, dz, l, t, r, b, radius));
  }
  return best;
}

/** Ray against an AABB Minkowski-summed with a circle, preserving rounded corners. */
function sweepRoundedRect(x: number, z: number, dx: number, dz: number,
  left: number, top: number, right: number, bottom: number, radius: number): Hit | null {
  let best: Hit | null = null;
  const consider = (candidate: Hit | null): void => {
    if (candidate && candidate.t >= -TIME_EPSILON && candidate.t <= 1 + TIME_EPSILON &&
        dx * candidate.nx + dz * candidate.nz < -DISTANCE_EPSILON && (!best || candidate.t < best.t)) best = candidate;
  };
  if (dx > 0) { const q = (left - radius - x) / dx, pz = z + dz * q; if (pz >= top && pz <= bottom) consider({ t:q, nx:-1, nz:0 }); }
  if (dx < 0) { const q = (right + radius - x) / dx, pz = z + dz * q; if (pz >= top && pz <= bottom) consider({ t:q, nx:1, nz:0 }); }
  if (dz > 0) { const q = (top - radius - z) / dz, px = x + dx * q; if (px >= left && px <= right) consider({ t:q, nx:0, nz:-1 }); }
  if (dz < 0) { const q = (bottom + radius - z) / dz, px = x + dx * q; if (px >= left && px <= right) consider({ t:q, nx:0, nz:1 }); }

  for (const [cx, cz, sx, sz] of [[left,top,-1,-1],[right,top,1,-1],[left,bottom,-1,1],[right,bottom,1,1]] as const) {
    const ox = x - cx, oz = z - cz;
    const a = dx*dx + dz*dz, b = 2*(ox*dx + oz*dz), c = ox*ox + oz*oz - radius*radius;
    const disc = b*b - 4*a*c;
    if (disc < 0 || a === 0) continue;
    const q = (-b - Math.sqrt(disc)) / (2*a);
    const px = x + dx*q, pz = z + dz*q;
    if ((px-cx)*sx < -DISTANCE_EPSILON || (pz-cz)*sz < -DISTANCE_EPSILON) continue;
    const length = Math.hypot(px-cx, pz-cz);
    if (length > 0) consider({ t:q, nx:(px-cx)/length, nz:(pz-cz)/length });
  }
  return best;
}
