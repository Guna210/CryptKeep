import { describe, expect, it } from "vitest";
import { assignRoles, type RoleFloorPlan } from "./roles";
import type { ConnectedFloorPlan } from "./corridors";
import { Tile } from "./types";
import { connectRooms } from "./corridors";
import { layoutDefaults, placeRooms } from "./rooms";

function fixture(blockBoss = false) {
  const width = 42, height = 32, tiles = Array<number>(width * height).fill(Tile.Solid);
  const rooms = [
    { id: "entry", rect: { x: 2, z: 2, width: 7, height: 7 } },
    { id: "arena", rect: { x: 20, z: 2, width: 11, height: 11 } },
    { id: "side", rect: { x: 3, z: 22, width: 6, height: 6 } },
  ];
  for (const room of rooms) for (let z = room.rect.z; z < room.rect.z + room.rect.height; z++) for (let x = room.rect.x; x < room.rect.x + room.rect.width; x++) tiles[z * width + x] = Tile.Walkable;
  for (let x = 9; x < 20; x++) for (let z = 6; z <= 7; z++) tiles[z * width + x] = Tile.Walkable;
  if (blockBoss) for (let z = 2; z < 13; z++) for (let x = 20; x < 31; x++) if ((x + z) % 2) tiles[z * width + x] = Tile.Solid;
  return { floorNumber: 7, floorSeed: "roles-fixture", generatorVersion: "test-v1", width, height, tiles, rooms,
    edges: [{ fromRoomId: "entry", toRoomId: "arena", kind: "tree" as const, fromCell: { x: 7, z: 6 }, toCell: { x: 20, z: 6 }, path: Array.from({ length: 14 }, (_, i) => ({ x: 7 + i, z: 6 })) }] } as unknown as ConnectedFloorPlan;
}

function independentlyCheck(result: RoleFloorPlan) {
  const key = (c: { x: number; z: number }) => `${c.x},${c.z}`;
  const tileWalkable = (c: { x: number; z: number }) => c.x >= 0 && c.z >= 0 && c.x < result.width && c.z < result.height && result.tiles[c.z * result.width + c.x] === Tile.Walkable;
  for (const path of result.reservedPaths) {
    expect(path.cells.length).toBeGreaterThan(0);
    for (let i = 0; i < path.cells.length; i++) {
      expect(tileWalkable(path.cells[i]!)).toBe(true);
      if (i) expect(Math.abs(path.cells[i]!.x - path.cells[i - 1]!.x) + Math.abs(path.cells[i]!.z - path.cells[i - 1]!.z)).toBe(1);
    }
  }
  const entryToApproach = result.reservedPaths[0]!.cells;
  const seen = new Set([key(entryToApproach[0]!)]), queue = [entryToApproach[0]!];
  for (let i = 0; i < queue.length; i++) for (const d of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]) {
    const next = { x: queue[i]!.x + d.x, z: queue[i]!.z + d.z }, k = key(next);
    if (tileWalkable(next) && !seen.has(k)) { seen.add(k); queue.push(next); }
  }
  expect(seen.has(key(result.roles.approach))).toBe(true);
  const centers = result.spawnPads.map(p => p.center);
  for (let i = 0; i < centers.length; i++) for (let j = i + 1; j < centers.length; j++) {
    expect(Math.max(Math.abs(centers[i]!.x - centers[j]!.x), Math.abs(centers[i]!.z - centers[j]!.z))).toBeGreaterThanOrEqual(3);
  }
  expect(new Set(result.reservedCells.map(key)).size).toBe(result.reservedCells.length);
  expect(result.reservedCells).toEqual([...result.reservedCells].sort((a, b) => a.z - b.z || a.x - b.x));
  for (const c of [result.roles.entry, result.roles.approach, result.roles.boss, result.roles.reward, result.roles.exit]) {
    expect(Number.isFinite(c.x) && Number.isFinite(c.z)).toBe(true);
    expect(tileWalkable(c)).toBe(true);
  }
}

describe("assignRoles", () => {
  it("assigns detached, frozen roles with a reachable critical path and complete reservations", () => {
    const input = fixture(), before = JSON.stringify(input);
    const result = assignRoles(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(result.tiles).toEqual(input.tiles);
    expect(result.rooms).toEqual(input.rooms);
    expect(result.edges).not.toBe(input.edges);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.roles.entryRoomId).not.toBe(result.roles.bossRoomId);
    expect(result.roles.bossRoomId).toBe(result.roles.exitRoomId);
    expect(result.roles.arena.width).toBeGreaterThanOrEqual(7);
    expect(result.roles.arena.height).toBeGreaterThanOrEqual(7);
    independentlyCheck(result);
  });

  it("is deterministic and insensitive to room record ordering", () => {
    const base = fixture();
    const a = assignRoles(base);
    const b = assignRoles({ ...base, rooms: [...base.rooms].reverse() });
    expect(a.roles).toEqual(b.roles);
    expect(a.reservedPaths).toEqual(b.reservedPaths);
    expect(a.reservedCells).toEqual(b.reservedCells);
  });

  it("validates and preserves copied corridor endpoint metadata", () => {
    const original = fixture();
    const result = assignRoles(original);
    expect(result.edges[0]!.fromCell).toEqual(original.edges[0]!.fromCell);
    expect(result.edges[0]!.toCell).toEqual(original.edges[0]!.toCell);
    expect(result.edges[0]!.fromCell).not.toBe(original.edges[0]!.fromCell);
    expect(Object.isFrozen(result.edges[0]!.fromCell)).toBe(true);

    const variant = (changes: Record<string, unknown>) => ({ ...original, edges: [{ ...original.edges[0], ...changes }] } as unknown as ConnectedFloorPlan);
    expect(() => assignRoles(variant({ fromCell: undefined }))).toThrow(RangeError);
    expect(() => assignRoles(variant({ toCell: { x: 20.5, z: 6 } }))).toThrow(RangeError);
    expect(() => assignRoles(variant({ fromCell: { x: 6, z: 6 } }))).toThrow(/match its path endpoint/);
    expect(() => assignRoles(variant({ toRoomId: "missing" }))).toThrow(/distinct existing rooms/);
    expect(() => assignRoles(variant({ fromRoomId: "arena" }))).toThrow(/distinct existing rooms/);
    expect(() => assignRoles(variant({ fromCell: { x: 8, z: 6 }, path: [{ x: 8, z: 6 }, ...original.edges[0]!.path.slice(2)] }))).toThrow(/2×2 anchor/);
  });

  it("rejects blocked corridor footprints even when an alternate route remains walkable", () => {
    const original = fixture();
    const blockedAt = (x: number, z: number) => {
      const tiles = [...original.tiles];
      for (let cx = 9; cx <= 20; cx++) tiles[8 * original.width + cx] = Tile.Walkable;
      tiles[z * original.width + x] = Tile.Solid;
      return { ...original, tiles } as unknown as ConnectedFloorPlan;
    };
    for (const malformed of [blockedAt(14, 6), blockedAt(15, 7)]) {
      const seen = new Set<string>(["5,5"]), queue = [{ x: 5, z: 5 }];
      for (let i = 0; i < queue.length; i++) for (const d of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]) {
        const next = { x: queue[i]!.x + d.x, z: queue[i]!.z + d.z }, k = `${next.x},${next.z}`;
        if (next.x >= 0 && next.z >= 0 && next.x < malformed.width && next.z < malformed.height &&
          malformed.tiles[next.z * malformed.width + next.x] === Tile.Walkable && !seen.has(k)) { seen.add(k); queue.push(next); }
      }
      expect(seen.has("20,6")).toBe(true);
      expect(() => assignRoles(malformed)).toThrow(/footprint must be walkable/);
    }
  });

  it("rejects a path anchor whose 2×2 footprint escapes the grid border", () => {
    const original = fixture(), path = [...original.edges[0]!.path];
    for (let z = 7; z <= 31; z++) path.push({ x: 7, z });
    for (let x = 8; x <= 20; x++) path.push({ x, z: 31 });
    for (let z = 30; z >= 6; z--) path.push({ x: 20, z });
    const tiles = [...original.tiles];
    for (const c of path) for (let dz = 0; dz <= 1; dz++) for (let dx = 0; dx <= 1; dx++)
      if (c.x + dx < original.width && c.z + dz < original.height) tiles[(c.z + dz) * original.width + c.x + dx] = Tile.Walkable;
    const invalid = { ...original, tiles, edges: [{ ...original.edges[0], path }] } as unknown as ConnectedFloorPlan;
    expect(() => assignRoles(invalid)).toThrow(/footprint must remain inside the grid/);
  });

  it("rejects undersized or blocked arena geometry and unreachable declared connections", () => {
    expect(() => assignRoles(fixture(true))).toThrow(RangeError);
    const small = fixture() as unknown as { rooms: { rect: { width: number } }[]; [key: string]: unknown };
    for (const room of small.rooms) room.rect.width = 6;
    expect(() => assignRoles(small as unknown as ConnectedFloorPlan)).toThrow(RangeError);
    const disconnected = fixture() as unknown as { width: number; tiles: number[]; [key: string]: unknown };
    for (let x = 9; x < 20; x++) for (let z = 6; z <= 7; z++) disconnected.tiles[z * disconnected.width + x] = Tile.Solid;
    expect(() => assignRoles(disconnected as unknown as ConnectedFloorPlan)).toThrow(RangeError);
  });

  it("covers representative campaign depths when generated topology is suitable", () => {
    for (const floorNumber of [1, 10, 11, 50, 99, 100]) for (const floorSeed of ["roles-seed-a", "roles-seed-b"]) {
      const defaults = layoutDefaults(floorNumber);
      const floor = placeRooms({ floorNumber, floorSeed, generatorVersion: "cryptkeep-layout-v1", width: defaults.width, height: defaults.height, tiles: Array(defaults.width * defaults.height).fill(Tile.Solid), rooms: [] });
      if (!floor.complete) continue;
      const connected = connectRooms(floor.plan, { loopFraction: 0.2 });
      try { independentlyCheck(assignRoles(connected)); } catch (error) { expect(error).toBeInstanceOf(RangeError); }
    }
  });
});
