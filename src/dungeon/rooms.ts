import { deriveStream } from "../core/rng";
import { stableId } from "../core/ids";
import { createFloorPlan, createRoom, createRoomRect, Tile, type FloorPlan, type Room } from "./types";

const MAX_ROOM_COUNT = 18;
const MAX_PLACEMENT_ATTEMPTS = 4096;

export interface RoomLayoutDefaults {
  readonly width: number;
  readonly height: number;
  readonly roomCount: number;
}

/** Base floor dimensions and room budget for a supported campaign floor. */
export function layoutDefaults(floorNumber: number): RoomLayoutDefaults {
  if (!Number.isSafeInteger(floorNumber) || floorNumber < 1 || floorNumber > 100) {
    throw new RangeError("Floor number must be an integer from 1 through 100");
  }
  const tier = Math.floor((floorNumber - 1) / 10);
  return Object.freeze({
    width: Math.min(80, 36 + 4 * tier),
    height: Math.min(80, 36 + 4 * tier),
    roomCount: Math.min(MAX_ROOM_COUNT, 7 + Math.floor((floorNumber - 1) / 8)),
  });
}

export interface PlaceRoomsOptions {
  readonly targetRoomCount?: number;
  readonly minRoomSize?: number;
  readonly maxRoomSize?: number;
  readonly clearance?: number;
  readonly border?: number;
  readonly maxAttempts?: number;
}

export interface PlaceRoomsResult {
  readonly plan: FloorPlan;
  readonly requestedRoomCount: number;
  readonly attempts: number;
  readonly complete: boolean;
}

function validateOptions(options: PlaceRoomsOptions | undefined, defaultRoomCount: number) {
  if (options === undefined) options = {};
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Room placement options must be an object");
  }
  const allowed = new Set(["targetRoomCount", "minRoomSize", "maxRoomSize", "clearance", "border", "maxAttempts"]);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) throw new TypeError(`Unknown room placement option: ${key}`);
  }
  const result = {
    targetRoomCount: options.targetRoomCount ?? defaultRoomCount,
    minRoomSize: options.minRoomSize ?? 5,
    maxRoomSize: options.maxRoomSize ?? 12,
    clearance: options.clearance ?? 1,
    border: options.border ?? 1,
    maxAttempts: options.maxAttempts ?? 1024,
  };
  if (!Number.isInteger(result.targetRoomCount) || result.targetRoomCount < 1 || result.targetRoomCount > MAX_ROOM_COUNT) {
    throw new RangeError("targetRoomCount must be an integer from 1 through 18");
  }
  if (!Number.isInteger(result.minRoomSize) || !Number.isInteger(result.maxRoomSize) ||
      result.minRoomSize < 5 || result.minRoomSize > 12 || result.maxRoomSize < 5 || result.maxRoomSize > 12 ||
      result.minRoomSize > result.maxRoomSize) {
    throw new RangeError("Room sizes must be ordered integers from 5 through 12");
  }
  if (!Number.isInteger(result.clearance) || result.clearance < 1 || result.clearance > 4) {
    throw new RangeError("clearance must be an integer from 1 through 4");
  }
  if (!Number.isInteger(result.border) || result.border < 1 || result.border > 4) {
    throw new RangeError("border must be an integer from 1 through 4");
  }
  if (!Number.isInteger(result.maxAttempts) || result.maxAttempts < 0 || result.maxAttempts > MAX_PLACEMENT_ATTEMPTS) {
    throw new RangeError("maxAttempts must be an integer from 0 through 4096");
  }
  return result;
}

function overlapsWithClearance(candidate: Room["rect"], existing: Room["rect"], clearance: number): boolean {
  return candidate.x < existing.x + existing.width + clearance &&
    candidate.x + candidate.width + clearance > existing.x &&
    candidate.z < existing.z + existing.height + clearance &&
    candidate.z + candidate.height + clearance > existing.z;
}

/**
 * Place deterministic, bounded room rectangles into a valid empty solid plan.
 * `attempts` counts every sampled candidate, including rejected candidates. A
 * geometrically impossible or exhausted request returns its valid partial plan
 * with `complete: false`; it never relaxes the requested constraints.
 */
export function placeRooms(plan: FloorPlan, options?: PlaceRoomsOptions): PlaceRoomsResult {
  if (!plan || typeof plan !== "object") throw new TypeError("A floor plan is required");
  // Normalize the entire caller-provided record through the accepted constructor
  // before deriving randomness or calculating placement bounds. This also
  // detaches placement from mutable input arrays/records.
  const input = createFloorPlan({
    floorNumber: plan.floorNumber,
    floorSeed: plan.floorSeed,
    generatorVersion: plan.generatorVersion,
    width: plan.width,
    height: plan.height,
    tiles: plan.tiles,
    rooms: plan.rooms,
  });
  const defaults = layoutDefaults(input.floorNumber);
  const config = validateOptions(options, defaults.roomCount);
  if (input.rooms.length !== 0) {
    throw new RangeError("Room placement requires a floor plan with no existing rooms");
  }
  if (input.tiles.some((tile) => tile !== Tile.Solid)) {
    throw new RangeError("Room placement requires a floor plan with only solid tiles");
  }

  const rooms: Room[] = [];
  const widthLimit = Math.min(config.maxRoomSize, input.width - 2 * config.border);
  const heightLimit = Math.min(config.maxRoomSize, input.height - 2 * config.border);
  let attempts = 0;
  const stream = deriveStream(input.floorSeed, "layout", JSON.stringify([
    input.generatorVersion, input.floorNumber, "rooms",
  ]));

  // Impossible minimum dimensions return immediately without asking the RNG
  // for a range that cannot contain a candidate.
  if (widthLimit >= config.minRoomSize && heightLimit >= config.minRoomSize) {
    while (rooms.length < config.targetRoomCount && attempts < config.maxAttempts) {
      attempts += 1;
      const width = stream.nextInt(config.minRoomSize, widthLimit + 1);
      const height = stream.nextInt(config.minRoomSize, heightLimit + 1);
      const x = stream.nextInt(config.border, input.width - config.border - width + 1);
      const z = stream.nextInt(config.border, input.height - config.border - height + 1);
      const rect = { x, z, width, height };
      if (rooms.some((room) => overlapsWithClearance(rect, room.rect, config.clearance))) continue;
      const ordinal = rooms.length;
      rooms.push(createRoom(stableId(input.floorSeed, input.floorNumber, "room", ordinal), createRoomRect(x, z, width, height)));
    }
  }

  const tiles = [...input.tiles];
  for (const room of rooms) {
    const { x, z, width, height } = room.rect;
    for (let row = z; row < z + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
      tiles[row * input.width + column] = Tile.Walkable;
      }
    }
  }
  const resultPlan = createFloorPlan({
    floorNumber: input.floorNumber,
    floorSeed: input.floorSeed,
    generatorVersion: input.generatorVersion,
    width: input.width,
    height: input.height,
    tiles,
    rooms,
  });
  return Object.freeze({
    plan: resultPlan,
    requestedRoomCount: config.targetRoomCount,
    attempts,
    complete: rooms.length === config.targetRoomCount,
  });
}
