import { describe, expect, it } from "vitest";
import {
  CELL_SIZE_METERS, cellIndex, cellToWorld, createGrid, isInBounds, isWalkable,
  orthogonalNeighbors, tileAt, worldToCell,
} from "./grid";
import { createFloorPlan, createRoom, createRoomRect, DEFAULT_GENERATOR_VERSION, Tile } from "./types";

describe("dungeon grid coordinates and queries", () => {
  it("maps exact positive and negative boundaries with floor semantics", () => {
    expect(CELL_SIZE_METERS).toBe(2);
    expect(worldToCell({ x: 0, z: 0 })).toEqual({ x: 0, z: 0 });
    expect(worldToCell({ x: 2, z: 2 })).toEqual({ x: 1, z: 1 });
    expect(worldToCell({ x: -2, z: -2 })).toEqual({ x: -1, z: -1 });
    expect(worldToCell({ x: -Number.EPSILON, z: -Number.EPSILON })).toEqual({ x: -1, z: -1 });
    expect(worldToCell({ x: 2 - 1e-10, z: -2 - 1e-10 })).toEqual({ x: 0, z: -2 });
    expect(cellToWorld({ x: 0, z: 0 })).toEqual({ x: 1, z: 1 });
    expect(cellToWorld({ x: -1, z: -2 })).toEqual({ x: -1, z: -3 });
    for (const cell of [{ x: -3, z: 8 }, { x: 0, z: 0 }, { x: 12, z: -1 }]) {
      expect(worldToCell(cellToWorld(cell))).toEqual(cell);
    }
  });

  it("queries a 1x1 grid and keeps outside coordinates out of adjacent rows", () => {
    const grid = createGrid(1, 1, [Tile.Walkable]);
    expect(isInBounds(grid, { x: 0, z: 0 })).toBe(true);
    expect(isWalkable(grid, { x: 0, z: 0 })).toBe(true);
    expect(cellIndex(grid, { x: 0, z: 0 })).toBe(0);
    expect(tileAt(grid, { x: 1, z: 0 })).toBeNull();
    expect(tileAt(grid, { x: 0, z: 1 })).toBeNull();
    expect(isWalkable(grid, { x: 1, z: 0 })).toBe(false);
    expect(cellIndex(grid, { x: -1, z: 1 })).toBeNull();
    expect(orthogonalNeighbors(grid, { x: 0, z: 0 })).toEqual([]);
  });

  it("returns bounded neighbors in documented order for center and corners", () => {
    const grid = createGrid(3, 3, Array(9).fill(Tile.Solid));
    expect(orthogonalNeighbors(grid, { x: 1, z: 1 })).toEqual([
      { x: 2, z: 1 }, { x: 0, z: 1 }, { x: 1, z: 2 }, { x: 1, z: 0 },
    ]);
    expect(orthogonalNeighbors(grid, { x: 0, z: 0 })).toEqual([{ x: 1, z: 0 }, { x: 0, z: 1 }]);
    expect(orthogonalNeighbors(grid, { x: 2, z: 2 })).toEqual([{ x: 1, z: 2 }, { x: 2, z: 1 }]);
  });

  it("rejects nonfinite worlds and malformed or unsafe cell coordinates", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => worldToCell({ x: value, z: 0 })).toThrow(TypeError);
    }
    expect(() => worldToCell({ x: 0, z: "1" as unknown as number })).toThrow(TypeError);
    expect(() => cellToWorld({ x: 1.5, z: 0 })).toThrow(TypeError);
    expect(() => tileAt(createGrid(1, 1, [Tile.Solid]), { x: Number.MAX_SAFE_INTEGER + 1, z: 0 })).toThrow(TypeError);
  });

  it("validates dimensions and tile arrays while returning detached frozen data", () => {
    for (const [width, height] of [[0, 1], [1, 0], [-1, 1], [1.5, 1], [81, 1], [1, 81]] as const) {
      expect(() => createGrid(width, height, [])).toThrow();
    }
    expect(() => createGrid(2, 2, [Tile.Solid])).toThrow(RangeError);
    expect(() => createGrid(1, 1, [2])).toThrow(TypeError);
    const source: number[] = [Tile.Walkable];
    const grid = createGrid(1, 1, source);
    source[0] = Tile.Solid;
    expect(grid.tiles[0]!).toBe(Tile.Walkable);
    expect(Object.isFrozen(grid)).toBe(true);
    expect(Object.isFrozen(grid.tiles)).toBe(true);
  });
});

describe("room and floor plan records", () => {
  it("creates detached frozen records with normalized seeds and default version", () => {
    const rectInput = { x: 0, z: 0, width: 2, height: 1 };
    const roomInput = { id: " hall ", rect: rectInput };
    const tiles = [Tile.Walkable, Tile.Solid, Tile.Walkable, Tile.Walkable];
    const plan = createFloorPlan({ floorNumber: 3, floorSeed: " e\u0301 ", width: 2, height: 2, tiles, rooms: [roomInput] });
    rectInput.x = 1;
    tiles[0] = Tile.Solid;
    expect(plan.floorSeed).toBe("é");
    expect(plan.generatorVersion).toBe(DEFAULT_GENERATOR_VERSION);
    expect(plan.rooms[0]).toEqual({ id: "hall", rect: { x: 0, z: 0, width: 2, height: 1 } });
    expect(plan.tiles[0]!).toBe(Tile.Walkable);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.tiles)).toBe(true);
    expect(Object.isFrozen(plan.rooms)).toBe(true);
    expect(Object.isFrozen(plan.rooms[0])).toBe(true);
    expect(Object.isFrozen(plan.rooms[0]?.rect)).toBe(true);
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
  });

  it("validates floor numbers, room geometry, IDs, bounds, and tile consistency", () => {
    for (const floorNumber of [0, 101, 1.5, Number.NaN]) {
      expect(() => createFloorPlan({ floorNumber, floorSeed: "s", width: 1, height: 1, tiles: [Tile.Solid] })).toThrow(RangeError);
    }
    for (const args of [[0, 0, 0, 1], [0, 0, 1, -1], [0.5, 0, 1, 1], [Number.MAX_SAFE_INTEGER, 0, 1, 1]]) {
      expect(() => createRoomRect(...args as [number, number, number, number])).toThrow();
    }
    expect(() => createRoom(" ", createRoomRect(0, 0, 1, 1))).toThrow(RangeError);
    expect(() => createRoom(2 as unknown as string, createRoomRect(0, 0, 1, 1))).toThrow(TypeError);
    expect(() => createFloorPlan({ floorNumber: 1, floorSeed: "s", width: 2, height: 2, tiles: [0, 0, 0, 0], rooms: [
      { id: "same", rect: createRoomRect(0, 0, 1, 1) }, { id: "same", rect: createRoomRect(1, 1, 1, 1) },
    ] })).toThrow(RangeError);
    expect(() => createFloorPlan({ floorNumber: 1, floorSeed: "s", width: 2, height: 2, tiles: [0, 0, 0, 0], rooms: [
      { id: "outside", rect: createRoomRect(1, 1, 2, 1) },
    ] })).toThrow(RangeError);
    expect(() => createFloorPlan({ floorNumber: 1, floorSeed: "s", width: 1, height: 1, tiles: [0], generatorVersion: " " })).toThrow(RangeError);
    expect(() => createFloorPlan({ floorNumber: 1, floorSeed: "s", width: 1, height: 1, tiles: [0], rooms: new Array(1) })).toThrow(TypeError);
  });
});
