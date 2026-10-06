import { describe, expect, it } from "vitest";
import { createGrid } from "../dungeon/grid";
import { Tile, type Grid } from "../dungeon/types";
import { generateFloor } from "../dungeon/generate";
import { moveCircleOnGrid } from "./collision";

function fixture(rows: readonly string[]): Grid {
  const width = rows[0]!.length;
  return createGrid(width, rows.length, rows.flatMap((row) => [...row].map((c) => c === "." ? Tile.Walkable : Tile.Solid)));
}

describe("swept circle grid collision", () => {
  it("stops straight and long diagonal sweeps at a single-cell wall", () => {
    const grid = fixture([".......", "...#...", "...#...", "...#...", "......."]);
    const straight = moveCircleOnGrid(grid, { x: 3, z: 5 }, { x: 8, z: 0 });
    expect(straight.position.x).toBeCloseTo(6 - 0.28, 7);
    expect(straight.blockedX).toBe(true);
    const diagonal = moveCircleOnGrid(grid, { x: 3, z: 5 }, { x: 8, z: 0.5 });
    expect(diagonal.position.x).toBeLessThan(6);
    expect(diagonal.position.z).toBeGreaterThan(5);
    expect(diagonal.contacts.length).toBeGreaterThan(0);
  });

  it("slides along a wall and around an L corner without snagging", () => {
    const grid = fixture([".......", "...#...", "...#...", "...##..", "......."]);
    const slide = moveCircleOnGrid(grid, { x: 5.72, z: 3 }, { x: 0, z: 1.5 });
    expect(slide.position.x).toBeCloseTo(5.72, 6);
    expect(slide.position.z).toBeGreaterThan(4.4);
    const corner = moveCircleOnGrid(grid, { x: 5, z: 5.2 }, { x: 1.5, z: 1.5 });
    expect(corner.position.x).toBeLessThan(6);
    expect(corner.position.z).toBeGreaterThan(5.2);
  });

  it("uses radius clearance, accepts exact tangency, and rejects invalid starts", () => {
    const grid = fixture([".....", "..#..", "....."]);
    const tangent = moveCircleOnGrid(grid, { x: 3.72, z: 3 }, { x: 0, z: 0 });
    expect(tangent.position.x).toBe(3.72);
    expect(() => moveCircleOnGrid(grid, { x: 3.73, z: 3 }, { x: 0, z: 0 })).toThrow(/valid starting position/);
    const edge = moveCircleOnGrid(grid, { x: 1, z: 3 }, { x: -10, z: 0 });
    expect(edge.position.x).toBeCloseTo(0.28, 7);
  });

  it("does not tunnel through actual generated-floor occupancy or scale work with distance", () => {
    const floor = generateFloor({ campaignSeed: "ck0203-real-floor", floorNumber: 1 }).plan;
    let start: { x: number; z: number } | undefined;
    for (let z = 1; z < floor.height - 1 && !start; z += 1) for (let x = 1; x < floor.width - 1; x += 1) {
      if (floor.tiles[z * floor.width + x] === Tile.Walkable && floor.tiles[z * floor.width + x + 1] === Tile.Solid) {
        start = { x: x * 2 + 1, z: z * 2 + 1 }; break;
      }
    }
    expect(start).toBeDefined();
    const result = moveCircleOnGrid(floor, start!, { x: 1e9, z: 0 });
    expect(result.position.x).toBeLessThan(start!.x + 2);
    expect(result.position.x).toBeLessThan(floor.width * 2);
    expect(result.contacts.length).toBeLessThanOrEqual(4);
    const huge = moveCircleOnGrid(floor, start!, { x: Number.MAX_VALUE, z: 0 });
    expect(huge.position.x).toBeLessThan(floor.width * 2);
  });
});
