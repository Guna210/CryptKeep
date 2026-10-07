import { isWalkable, CELL_SIZE_METERS } from "../dungeon/grid";
import type { Grid } from "../dungeon/types";

export const DEFAULT_MELEE_REACH_METERS = 2;
export const DEFAULT_MELEE_ARC_RADIANS = Math.PI / 2;

export interface MeleeXZ {
  readonly x: number;
  readonly z: number;
}

export interface MeleeTargetCollider {
  readonly id: string;
  readonly position: MeleeXZ;
  readonly radius: number;
}

export interface MeleeQueryInput {
  readonly origin: MeleeXZ;
  /** Three.js yaw convention: 0 faces -Z and positive yaw turns toward -X. */
  readonly yawRadians: number;
  readonly grid: Grid;
  readonly targets: readonly MeleeTargetCollider[];
  readonly reachMeters?: number;
  /** Full horizontal arc width in radians, from 0 through 2π. */
  readonly arcWidthRadians?: number;
}

export interface MeleeHit {
  readonly targetId: string;
  /** Distance to the selected point on the target collider. */
  readonly distanceMeters: number;
  readonly hitPoint: MeleeXZ;
}

/**
 * Query a horizontal melee sector against circular target colliders. A collider
 * is eligible when some point on it lies inside both reach and arc and has
 * clear tile LOS. Candidate bearings partition the eligible circle arc at
 * attack/reach boundaries and solid-tile corner bearings; interval midpoints
 * and boundaries are checked with exact circle and segment geometry. The query
 * selects the nearest verified generated candidate (not a global optimum).
 * Walls include solid grid tiles and the area outside the grid. Results are
 * unique and sorted by target ID so input iteration order cannot change order.
 */
export function queryMeleeTargets(input: MeleeQueryInput): readonly MeleeHit[] {
  if (!validInput(input)) return Object.freeze([]);
  const reach = input.reachMeters ?? DEFAULT_MELEE_REACH_METERS;
  const arc = input.arcWidthRadians ?? DEFAULT_MELEE_ARC_RADIANS;
  const halfArc = arc / 2;
  const selected = new Map<string, MeleeHit>();

  for (const target of input.targets) {
    if (!validTarget(target)) continue;
    const hit = queryCollider(input, target, reach, halfArc);
    if (!hit) continue;
    const previous = selected.get(target.id);
    if (!previous || hit.distanceMeters < previous.distanceMeters
      || (hit.distanceMeters === previous.distanceMeters && comparePoint(hit.hitPoint, previous.hitPoint) < 0)) {
      selected.set(target.id, hit);
    }
  }

  return Object.freeze([...selected.values()].sort((a, b) => a.targetId.localeCompare(b.targetId)));
}

function queryCollider(input: MeleeQueryInput, target: MeleeTargetCollider, reach: number, halfArc: number): MeleeHit | null {
  const dx = target.position.x - input.origin.x;
  const dz = target.position.z - input.origin.z;
  const centerDistance = Math.hypot(dx, dz);
  // A source inside the collider has a valid zero-distance contact point.
  if (centerDistance <= target.radius) {
    if (hasClearLine(input.grid, input.origin, input.origin)) {
      return Object.freeze({ targetId: target.id, distanceMeters: 0, hitPoint: Object.freeze({ ...input.origin }) });
    }
    return null;
  }

  // Convert world bearing to Three.js yaw: positive yaw points toward -X.
  const rawBearing = Math.atan2(-dx, -dz);
  const bearing = input.yawRadians + wrapAngle(rawBearing - input.yawRadians);
  const angularRadius = Math.asin(Math.min(1, target.radius / centerDistance));
  let low = bearing - angularRadius;
  let high = bearing + angularRadius;
  if (halfArc < Math.PI) {
    low = Math.max(low, input.yawRadians - halfArc);
    high = Math.min(high, input.yawRadians + halfArc);
  }
  if (reach < centerDistance - target.radius - 1e-12) return null;
  const farthestFirstContact = Math.sqrt(Math.max(0, centerDistance * centerDistance - target.radius * target.radius));
  if (reach < farthestFirstContact && reach > 0) {
    const cosine = (centerDistance * centerDistance + reach * reach - target.radius * target.radius)
      / (2 * centerDistance * reach);
    if (cosine > 1 + 1e-12) return null;
    const reachHalfAngle = Math.acos(Math.max(-1, Math.min(1, cosine)));
    low = Math.max(low, bearing - reachHalfAngle);
    high = Math.min(high, bearing + reachHalfAngle);
  }
  if (low > high + 1e-12) return null;

  // Split at blocker corners and at intersections between the collider circle
  // and blocker edges. The latter matter when a wall overlaps the collider:
  // they mark where the first circle contact enters or leaves the wall. Test
  // every critical boundary and one representative from each open interval.
  const cuts = [low, high];
  if (bearing > low && bearing < high) cuts.push(bearing);
  for (let z = 0; z < input.grid.height; z += 1) {
    const top = z * CELL_SIZE_METERS;
    const bottom = top + CELL_SIZE_METERS;
    if (bottom < input.origin.z - reach || top > input.origin.z + reach) continue;
    for (let x = 0; x < input.grid.width; x += 1) {
      if (isWalkable(input.grid, { x, z })) continue;
      const left = x * CELL_SIZE_METERS;
      const right = left + CELL_SIZE_METERS;
      if (right < input.origin.x - reach || left > input.origin.x + reach) continue;
      for (const corner of [
        { x: left, z: top }, { x: left, z: bottom },
        { x: right, z: top }, { x: right, z: bottom },
      ]) {
        const angle = bearing + wrapAngle(Math.atan2(-(corner.x - input.origin.x), -(corner.z - input.origin.z)) - bearing);
        if (angle > low && angle < high) cuts.push(angle);
      }
      for (const point of circleRectEdgeIntersections(target.position, target.radius, left, top, right, bottom)) {
        const angle = bearing + wrapAngle(Math.atan2(-(point.x - input.origin.x), -(point.z - input.origin.z)) - bearing);
        if (angle > low && angle < high) cuts.push(angle);
      }
    }
  }
  cuts.sort((a, b) => a - b);
  const uniqueCuts = cuts.filter((angle, index) => index === 0 || angle - (cuts[index - 1] ?? angle) > 1e-12);
  const candidateAngles = [...uniqueCuts];
  for (let index = 0; index + 1 < uniqueCuts.length; index += 1) {
    const left = uniqueCuts[index];
    const right = uniqueCuts[index + 1];
    if (left !== undefined && right !== undefined && right > left) candidateAngles.push(left + (right - left) / 2);
  }

  let best: MeleeHit | null = null;
  for (const angle of candidateAngles) {
    const rayX = -Math.sin(angle);
    const rayZ = -Math.cos(angle);
    const projection = dx * rayX + dz * rayZ;
    const discriminant = target.radius * target.radius - (centerDistance * centerDistance - projection * projection);
    if (projection < 0 || discriminant < -1e-12) continue;
    const rayDistance = projection - Math.sqrt(Math.max(0, discriminant));
    if (rayDistance < 0) continue;
    const point = Object.freeze({ x: input.origin.x + rayX * rayDistance, z: input.origin.z + rayZ * rayDistance });
    const distance = Math.hypot(point.x - input.origin.x, point.z - input.origin.z);
    if (distance > reach + 1e-12 || !hasClearLine(input.grid, input.origin, point)) continue;
    const candidate = Object.freeze({ targetId: target.id, distanceMeters: distance, hitPoint: point });
    if (!best || candidate.distanceMeters < best.distanceMeters
      || (candidate.distanceMeters === best.distanceMeters && comparePoint(candidate.hitPoint, best.hitPoint) < 0)) best = candidate;
  }
  return best;
}

function circleRectEdgeIntersections(center: MeleeXZ, radius: number, left: number, top: number, right: number, bottom: number): MeleeXZ[] {
  const points: MeleeXZ[] = [];
  for (const x of [left, right]) {
    const remaining = radius * radius - (x - center.x) * (x - center.x);
    if (remaining < 0) continue;
    const offset = Math.sqrt(remaining);
    for (const z of [center.z - offset, center.z + offset]) if (z >= top && z <= bottom) points.push({ x, z });
  }
  for (const z of [top, bottom]) {
    const remaining = radius * radius - (z - center.z) * (z - center.z);
    if (remaining < 0) continue;
    const offset = Math.sqrt(remaining);
    for (const x of [center.x - offset, center.x + offset]) if (x >= left && x <= right) points.push({ x, z });
  }
  return points;
}

function hasClearLine(grid: Grid, start: MeleeXZ, end: MeleeXZ): boolean {
  const minX = 0;
  const minZ = 0;
  const maxX = grid.width * CELL_SIZE_METERS;
  const maxZ = grid.height * CELL_SIZE_METERS;
  // Any excursion beyond the map is solid, including an endpoint outside it.
  if (Math.min(start.x, end.x) < minX || Math.max(start.x, end.x) > maxX
    || Math.min(start.z, end.z) < minZ || Math.max(start.z, end.z) > maxZ) return false;

  // The grid is at most 80×80. Checking real tile rectangles avoids sampling
  // gaps at thin walls or corner grazes.
  for (let z = 0; z < grid.height; z += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (isWalkable(grid, { x, z })) continue;
      const left = x * CELL_SIZE_METERS;
      const top = z * CELL_SIZE_METERS;
      if (segmentTouchesRect(start, end, left, top, left + CELL_SIZE_METERS, top + CELL_SIZE_METERS)) return false;
    }
  }
  return true;
}

function segmentTouchesRect(start: MeleeXZ, end: MeleeXZ, left: number, top: number, right: number, bottom: number): boolean {
  let low = 0;
  let high = 1;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  for (const [p, q] of [[-dx, start.x - left], [dx, right - start.x], [-dz, start.z - top], [dz, bottom - start.z]] as const) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) low = Math.max(low, ratio);
    else high = Math.min(high, ratio);
    if (low > high) return false;
  }
  return high >= 0 && low <= 1;
}

function validInput(input: MeleeQueryInput): boolean {
  return Boolean(input && typeof input === "object" && validPoint(input.origin)
    && Number.isFinite(input.yawRadians) && input.grid && Number.isInteger(input.grid.width)
    && Number.isInteger(input.grid.height) && input.grid.width > 0 && input.grid.height > 0
    && input.grid.width <= 80 && input.grid.height <= 80 && Array.isArray(input.grid.tiles)
    && input.grid.tiles.length === input.grid.width * input.grid.height
    && Array.isArray(input.targets)
    && (input.reachMeters === undefined || (Number.isFinite(input.reachMeters) && input.reachMeters >= 0))
    && (input.arcWidthRadians === undefined || (Number.isFinite(input.arcWidthRadians)
      && input.arcWidthRadians >= 0 && input.arcWidthRadians <= Math.PI * 2)));
}

function validTarget(target: MeleeTargetCollider): boolean {
  return Boolean(target && typeof target === "object" && typeof target.id === "string" && target.id.trim().length > 0
    && validPoint(target.position) && Number.isFinite(target.radius) && target.radius >= 0);
}

function validPoint(point: MeleeXZ): boolean {
  return Boolean(point && typeof point === "object" && Number.isFinite(point.x) && Number.isFinite(point.z));
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function comparePoint(a: MeleeXZ, b: MeleeXZ): number {
  return a.x - b.x || a.z - b.z;
}
