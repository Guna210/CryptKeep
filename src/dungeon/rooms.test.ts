import { describe, expect, it, vi } from "vitest";
import type { FloorPlan } from "./types";

const { deriveStreamSpy } = vi.hoisted(() => ({ deriveStreamSpy: vi.fn() }));
vi.mock("../core/rng", async (importOriginal) => {
  const original = await importOriginal<typeof import("../core/rng")>();
  return {
    ...original,
    deriveStream: (...args: Parameters<typeof original.deriveStream>) => {
      deriveStreamSpy(...args);
      return original.deriveStream(...args);
    },
  };
});

import { placeRooms, layoutDefaults } from "./rooms";
import { createFloorPlan, Tile } from "./types";

function emptyPlan(floorNumber: number, floorSeed: string, width = 36, height = 36, generatorVersion?: string) {
  return createFloorPlan({
    floorNumber, floorSeed, width, height,
    ...(generatorVersion === undefined ? {} : { generatorVersion }),
    tiles: Array(width * height).fill(Tile.Solid),
  });
}

describe("seeded room placement", () => {
  it("uses the documented floor defaults and limits room count", () => {
    expect(layoutDefaults(1)).toEqual({ width: 36, height: 36, roomCount: 7 });
    expect(layoutDefaults(10)).toEqual({ width: 36, height: 36, roomCount: 8 });
    expect(layoutDefaults(11)).toEqual({ width: 40, height: 40, roomCount: 8 });
    expect(layoutDefaults(100)).toEqual({ width: 72, height: 72, roomCount: 18 });
    expect(() => layoutDefaults(0)).toThrow(RangeError);
    expect(() => layoutDefaults(101)).toThrow(RangeError);
  });

  it("is deterministic across the seed corpus and isolates seed and floor streams", () => {
    const corpus = [1, 10, 11, 50, 99, 100].flatMap((floor) => ["amber", "cobalt"].map((seed) => [floor, seed] as const));
    for (const [floor, seed] of corpus) {
      const plan = emptyPlan(floor, seed);
      const first = placeRooms(plan);
      const again = placeRooms(plan);
      expect(again).toEqual(first);
      expect(again.plan.rooms.map((room) => room.id)).toEqual(first.plan.rooms.map((room) => room.id));
      expect(again.plan.tiles).toEqual(first.plan.tiles);
      expect(first.attempts).toBeLessThanOrEqual(1024);
    }
    const baseline = placeRooms(emptyPlan(20, "amber"));
    expect(placeRooms(emptyPlan(21, "amber"))).not.toEqual(baseline);
    expect(placeRooms(emptyPlan(20, "cobalt"))).not.toEqual(baseline);
    expect(placeRooms(emptyPlan(20, "amber", 36, 36, "future-layout-v2"))).not.toEqual(baseline);
  });

  it("places bounded rectangles with solid border and clearance and carves exact interiors", () => {
    for (const [floor, seed] of [[1, "a"], [10, "b"], [11, "c"], [50, "d"], [99, "e"], [100, "f"]] as const) {
      const source = emptyPlan(floor, seed);
      const before = JSON.stringify(source);
      const result = placeRooms(source);
      expect(JSON.stringify(source)).toBe(before);
      expect(Object.isFrozen(source)).toBe(true);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.plan)).toBe(true);
      expect(Object.isFrozen(result.plan.rooms)).toBe(true);
      expect(Object.isFrozen(result.plan.tiles)).toBe(true);
      for (const [ordinal, room] of result.plan.rooms.entries()) {
        const { x, z, width, height } = room.rect;
        expect(width).toBeGreaterThanOrEqual(5);
        expect(width).toBeLessThanOrEqual(12);
        expect(height).toBeGreaterThanOrEqual(5);
        expect(height).toBeLessThanOrEqual(12);
        expect(x).toBeGreaterThanOrEqual(1);
        expect(z).toBeGreaterThanOrEqual(1);
        expect(x + width).toBeLessThanOrEqual(source.width - 1);
        expect(z + height).toBeLessThanOrEqual(source.height - 1);
        expect(room.id).toBe(`ckid:${JSON.stringify([seed, floor, "room", ordinal])}`);
      }
      for (let row = 0; row < source.height; row += 1) {
        for (let column = 0; column < source.width; column += 1) {
          const inside = result.plan.rooms.some(({ rect }) =>
            column >= rect.x && column < rect.x + rect.width && row >= rect.z && row < rect.z + rect.height,
          );
          expect(result.plan.tiles[row * source.width + column]).toBe(inside ? Tile.Walkable : Tile.Solid);
        }
      }
      for (let i = 0; i < result.plan.rooms.length; i += 1) {
        for (let j = i + 1; j < result.plan.rooms.length; j += 1) {
          const a = result.plan.rooms[i]!.rect;
          const b = result.plan.rooms[j]!.rect;
          const separatedX = a.x + a.width + 1 <= b.x || b.x + b.width + 1 <= a.x;
          const separatedZ = a.z + a.height + 1 <= b.z || b.z + b.height + 1 <= a.z;
          expect(separatedX || separatedZ).toBe(true);
        }
      }
    }
  });

  it("reports impossible geometry and exhausted budgets honestly", () => {
    const tiny = emptyPlan(1, "tiny", 6, 10);
    const impossible = placeRooms(tiny, { targetRoomCount: 4 });
    expect(impossible).toMatchObject({ requestedRoomCount: 4, attempts: 0, complete: false });
    expect(impossible.plan.rooms).toEqual([]);
    const noBudget = placeRooms(emptyPlan(1, "budget"), { targetRoomCount: 2, maxAttempts: 0 });
    expect(noBudget).toMatchObject({ requestedRoomCount: 2, attempts: 0, complete: false });
    const exhausted = placeRooms(emptyPlan(1, "packed", 16, 16), {
      targetRoomCount: 18, minRoomSize: 5, maxRoomSize: 5, maxAttempts: 9,
    });
    expect(exhausted.attempts).toBeLessThanOrEqual(9);
    expect(exhausted.complete).toBe(false);
    expect(exhausted.plan.rooms.length).toBeLessThan(18);
  });

  it("rejects invalid options and plans before placement", () => {
    const plan = emptyPlan(1, "invalid");
    for (const options of [
      { targetRoomCount: 0 }, { targetRoomCount: 19 }, { minRoomSize: 4 }, { maxRoomSize: 13 },
      { minRoomSize: 8, maxRoomSize: 7 }, { clearance: 0 }, { clearance: 5 },
      { border: 0 }, { border: 5 }, { maxAttempts: -1 }, { maxAttempts: 4097 },
      { unknown: 1 },
    ]) expect(() => placeRooms(plan, options)).toThrow();
    expect(() => placeRooms(plan, null as never)).toThrow(TypeError);
    expect(() => placeRooms(createFloorPlan({
      floorNumber: 1, floorSeed: "occupied", width: 7, height: 7, tiles: Array(49).fill(Tile.Walkable),
    }))).toThrow(/only solid tiles/);
    expect(() => placeRooms(createFloorPlan({
      floorNumber: 1, floorSeed: "rooms", width: 7, height: 7, tiles: Array(49).fill(Tile.Solid),
      rooms: [{ id: "preexisting", rect: { x: 1, z: 1, width: 5, height: 5 } }],
    }))).toThrow(/no existing rooms/);
  });

  it("validates malformed dimensions and tile counts before deriving a placement stream", () => {
    const valid = emptyPlan(1, "malformed");
    const malformed = [
      { ...valid, width: 81 } as unknown as FloorPlan,
      { ...valid, tiles: valid.tiles.slice(1) } as unknown as FloorPlan,
    ];
    for (const plan of malformed) {
      deriveStreamSpy.mockClear();
      expect(() => placeRooms(plan, { targetRoomCount: 1, maxAttempts: 1 })).toThrow();
      expect(deriveStreamSpy).not.toHaveBeenCalled();
    }
  });
});
