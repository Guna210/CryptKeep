import { CELL_SIZE_METERS } from "../dungeon/grid";
import { Tile, type WorldXZ } from "../dungeon/types";
import type { RoleFloorPlan } from "../dungeon/roles";
import type { Grid } from "../dungeon/types";
import { createResource, INITIAL_HEALTH, INITIAL_MANA, INITIAL_STAMINA, type ResourceValue } from "./resources";

export const PLAYER_RADIUS_METERS = 0.28;
export const PLAYER_CAMERA_HEIGHT_METERS = 1.6;

export interface PlayerPose extends WorldXZ {
  readonly y: number;
  /** Radians around +Y; zero looks toward -Z in Three.js camera convention. */
  readonly yaw: number;
  /** Radians, positive looks upward. */
  readonly pitch: number;
}

export interface PlayerPoseInput extends WorldXZ {
  readonly y?: number;
  readonly yaw?: number;
  readonly pitch?: number;
}

export interface PlayerVelocity extends WorldXZ {
  readonly y: number;
}

export interface PlayerState {
  readonly pose: PlayerPose;
  readonly velocity: PlayerVelocity;
  readonly radius: number;
  readonly cameraHeight: number;
  readonly health: ResourceValue;
  readonly stamina: ResourceValue;
  readonly mana: ResourceValue;
}

export interface SpawnResult {
  readonly state: PlayerState;
  readonly repaired: boolean;
}

/** Return the center of a generated entry cell in the same X/Z world as the renderer. */
export function entrySpawnPosition(floor: RoleFloorPlan): WorldXZ {
  assertFloor(floor);
  const { x, z } = floor.roles.entry;
  return Object.freeze({ x: (x + 0.5) * CELL_SIZE_METERS, z: (z + 0.5) * CELL_SIZE_METERS });
}

/**
 * A supplied pose is retained only when its full circle clears walkable tile
 * edges, solids, and the outside of the map. Otherwise it repairs to the
 * validated generated entry cell center. The fallback is validated too.
 */
export function createPlayerState(floor: RoleFloorPlan, suppliedPose?: PlayerPoseInput): SpawnResult {
  assertFloor(floor);
  const validSupplied = isPoseValid(floor, suppliedPose);
  const position = validSupplied ? suppliedPose! : entrySpawnPosition(floor);
  if (!isPoseValid(floor, position)) {
    throw new RangeError("Generated entry position does not provide player-radius clearance");
  }
  const pose = Object.freeze({
    x: position.x!, y: PLAYER_CAMERA_HEIGHT_METERS, z: position.z!,
    yaw: position.yaw ?? 0, pitch: position.pitch ?? 0,
  });
  return Object.freeze({
    state: Object.freeze({
      pose,
      velocity: Object.freeze({ x: 0, y: 0, z: 0 }),
      radius: PLAYER_RADIUS_METERS,
      cameraHeight: PLAYER_CAMERA_HEIGHT_METERS,
      health: createResource(INITIAL_HEALTH, INITIAL_HEALTH),
      stamina: createResource(INITIAL_STAMINA, INITIAL_STAMINA),
      mana: createResource(INITIAL_MANA, INITIAL_MANA),
    }),
    repaired: !validSupplied,
  });
}

/** Check finite pose angles and circular clearance against tile AABBs. */
export function isPoseValid(floor: Grid, pose: PlayerPoseInput | undefined): pose is PlayerPoseInput {
  if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.z) ||
    (pose.y !== undefined && !Number.isFinite(pose.y)) ||
    (pose.yaw !== undefined && !Number.isFinite(pose.yaw)) ||
    (pose.pitch !== undefined && !Number.isFinite(pose.pitch))) return false;

  const radius = PLAYER_RADIUS_METERS;
  const minX = pose.x - radius, maxX = pose.x + radius;
  const minZ = pose.z - radius, maxZ = pose.z + radius;
  const minCellX = Math.floor(minX / CELL_SIZE_METERS);
  const maxCellX = Math.floor(maxX / CELL_SIZE_METERS);
  const minCellZ = Math.floor(minZ / CELL_SIZE_METERS);
  const maxCellZ = Math.floor(maxZ / CELL_SIZE_METERS);
  if (minCellX < 0 || minCellZ < 0 || maxCellX >= floor.width || maxCellZ >= floor.height) return false;

  for (let z = minCellZ; z <= maxCellZ; z++) for (let x = minCellX; x <= maxCellX; x++) {
    const left = x * CELL_SIZE_METERS, right = (x + 1) * CELL_SIZE_METERS;
    const top = z * CELL_SIZE_METERS, bottom = (z + 1) * CELL_SIZE_METERS;
    const dx = Math.max(left - pose.x, 0, pose.x - right);
    const dz = Math.max(top - pose.z, 0, pose.z - bottom);
    const distanceSquared = dx * dx + dz * dz;
    // Coordinate subtraction at larger world coordinates can round a
    // mathematical tangent a few ULPs outside the radius. Bound the squared
    // distance error using the local coordinate scale and radius.
    const coordinateScale = Math.max(1, Math.abs(pose.x), Math.abs(pose.z), Math.abs(left), Math.abs(right), Math.abs(top), Math.abs(bottom));
    const tangentTolerance = 8 * Number.EPSILON * coordinateScale * radius;
    if (distanceSquared >= radius * radius - tangentTolerance) continue;
    if (floor.tiles[z * floor.width + x] !== Tile.Walkable) return false;
  }
  return true;
}

/** Initialize a player at an explicitly supplied, clearance-validated diagnostic Grid pose. */
export function createGridPlayerState(grid: Grid, suppliedPose: PlayerPoseInput): SpawnResult {
  if (!grid || !Array.isArray(grid.tiles) || grid.tiles.length !== grid.width * grid.height) throw new TypeError("A valid grid is required");
  if (!isPoseValid(grid, suppliedPose)) throw new RangeError("Supplied diagnostic pose must clear the Grid");
  const pose = Object.freeze({ x:suppliedPose.x, y:PLAYER_CAMERA_HEIGHT_METERS, z:suppliedPose.z, yaw:suppliedPose.yaw ?? 0, pitch:suppliedPose.pitch ?? 0 });
  return Object.freeze({ state:Object.freeze({ pose, velocity:Object.freeze({x:0,y:0,z:0}), radius:PLAYER_RADIUS_METERS,
    cameraHeight:PLAYER_CAMERA_HEIGHT_METERS, health:createResource(INITIAL_HEALTH, INITIAL_HEALTH),
    stamina:createResource(INITIAL_STAMINA, INITIAL_STAMINA), mana:createResource(INITIAL_MANA, INITIAL_MANA) }), repaired:false });
}

function assertFloor(floor: RoleFloorPlan): void {
  if (!floor || typeof floor !== "object" || !floor.roles?.entry || !Array.isArray(floor.tiles)) {
    throw new TypeError("A generated role floor is required to create player state");
  }
}
