import { normalizeSeed } from "../core/rng";

const MAX_GRID_DIMENSION = 80;

function validateGridDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError("Grid width and height must be positive integers");
  }
  if (width > MAX_GRID_DIMENSION || height > MAX_GRID_DIMENSION) {
    throw new RangeError(`Grid dimensions must not exceed ${MAX_GRID_DIMENSION} cells`);
  }
}

function copyAndValidateTiles(tiles: readonly number[], width: number, height: number): readonly TileValue[] {
  if (!Array.isArray(tiles)) throw new TypeError("Grid tiles must be an array");
  if (tiles.length !== width * height) throw new RangeError("Grid tile count must equal width × height");
  const copy: TileValue[] = [];
  for (let index = 0; index < tiles.length; index += 1) {
    const value = tiles[index];
    if (value !== Tile.Solid && value !== Tile.Walkable) {
      throw new TypeError(`Grid tile at index ${index} must be Tile.Solid or Tile.Walkable`);
    }
    copy.push(value);
  }
  return Object.freeze(copy);
}

function isCellInGrid(x: number, z: number, width: number, height: number): boolean {
  return Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < width && z < height;
}

/** One floor cell, indexed from the grid's lower-left corner in X/Z. */
export interface Cell {
  readonly x: number;
  readonly z: number;
}

/** Horizontal world position. Three.js uses +Y as up; navigation is X/Z. */
export interface WorldXZ {
  readonly x: number;
  readonly z: number;
}

/** Integer, half-open room bounds: [x, x + width) × [z, z + height). */
export interface RoomRect {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
}

export interface Room {
  readonly id: string;
  readonly rect: RoomRect;
}

export const DEFAULT_GENERATOR_VERSION = "cryptkeep-layout-v1";

/** Tile encodings are distinct and stable in the serialized row-major array. */
export const Tile = Object.freeze({
  Solid: 0,
  Walkable: 1,
} as const);
export type TileValue = (typeof Tile)[keyof typeof Tile];

export interface Grid {
  readonly width: number;
  readonly height: number;
  /** Row-major: tile index = z * width + x. */
  readonly tiles: readonly TileValue[];
}

/** The immediately used, serializable floor-generation record. */
export interface FloorPlan extends Grid {
  readonly floorNumber: number;
  readonly floorSeed: string;
  readonly generatorVersion: string;
  readonly rooms: readonly Room[];
}

export interface FloorPlanInput {
  readonly floorNumber: number;
  readonly floorSeed: string;
  readonly generatorVersion?: string;
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly number[];
  readonly rooms?: readonly Room[];
}

/** Make a detached, frozen room rectangle with safe half-open bounds. */
export function createRoomRect(x: number, z: number, width: number, height: number): RoomRect {
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z)) {
    throw new TypeError("Room origin must use safe integer cell coordinates");
  }
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError("Room width and height must be positive safe integers");
  }
  if (!Number.isSafeInteger(x + width) || !Number.isSafeInteger(z + height)) {
    throw new RangeError("Room bounds must remain safe integers");
  }
  return Object.freeze({ x, z, width, height });
}

/** Make a detached, frozen room value. IDs are trimmed and must remain nonempty. */
export function createRoom(id: string, rect: RoomRect): Room {
  if (typeof id !== "string") throw new TypeError("Room ID must be a string");
  const normalizedId = id.trim();
  if (normalizedId.length === 0) throw new RangeError("Room ID must not be empty");
  const copiedRect = createRoomRect(rect?.x, rect?.z, rect?.width, rect?.height);
  return Object.freeze({ id: normalizedId, rect: copiedRect });
}

/**
 * Create an immutable, JSON-serializable FloorPlan. Every nested value is copied
 * before freezing, so neither the input arrays nor returned arrays can mutate it.
 */
export function createFloorPlan(input: FloorPlanInput): FloorPlan {
  if (input === null || typeof input !== "object") throw new TypeError("Floor plan input must be an object");
  if (!Number.isSafeInteger(input.floorNumber) || input.floorNumber < 1 || input.floorNumber > 100) {
    throw new RangeError("Floor number must be an integer from 1 through 100");
  }
  if (typeof input.generatorVersion !== "undefined" &&
      (typeof input.generatorVersion !== "string" || input.generatorVersion.trim().length === 0)) {
    throw new RangeError("Generator version must be a nonempty string");
  }
  validateGridDimensions(input.width, input.height);
  const tiles = copyAndValidateTiles(input.tiles, input.width, input.height);
  if (!Array.isArray(input.rooms ?? [])) throw new TypeError("Floor plan rooms must be an array");
  const rooms = Array.from(input.rooms ?? [], (room) => createRoom(room?.id, room?.rect));
  const ids = new Set<string>();
  for (const room of rooms) {
    if (ids.has(room.id)) throw new RangeError(`Duplicate room ID: ${room.id}`);
    ids.add(room.id);
    const { x, z, width, height } = room.rect;
    if (!isCellInGrid(x, z, input.width, input.height) ||
        !isCellInGrid(x + width - 1, z + height - 1, input.width, input.height)) {
      throw new RangeError(`Room ${room.id} must fit inside the floor grid`);
    }
  }
  return Object.freeze({
    floorNumber: input.floorNumber,
    floorSeed: normalizeSeed(input.floorSeed),
    generatorVersion: input.generatorVersion?.trim() ?? DEFAULT_GENERATOR_VERSION,
    width: input.width,
    height: input.height,
    tiles,
    rooms: Object.freeze(rooms),
  });
}
