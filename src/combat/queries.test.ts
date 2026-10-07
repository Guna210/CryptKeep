import { describe, expect, it } from "vitest";
import { createGrid } from "../dungeon/grid";
import { Tile } from "../dungeon/types";
import { queryMeleeTargets, type MeleeQueryInput, type MeleeTargetCollider } from "./queries";

function grid(wallCells: readonly (readonly [number, number])[] = []) {
  const width = 6;
  const height = 6;
  const tiles = Array<number>(width * height).fill(Tile.Walkable);
  for (const [x, z] of wallCells) tiles[z * width + x] = Tile.Solid;
  return createGrid(width, height, tiles);
}

const target = (id: string, x: number, z: number, radius = 0.2): MeleeTargetCollider => ({ id, position: { x, z }, radius });
const base = (targets: readonly MeleeTargetCollider[], overrides: Partial<MeleeQueryInput> = {}): MeleeQueryInput => ({
  origin: { x: 5, z: 9 }, yawRadians: 0, grid: grid(), targets, ...overrides,
});

describe("queryMeleeTargets", () => {
  it("uses the default sword reach and full 90-degree arc, while allowing supplied geometry", () => {
    expect(queryMeleeTargets(base([target("near", 5, 7)])).map((hit) => hit.targetId)).toEqual(["near"]);
    expect(queryMeleeTargets(base([target("far", 5, 6.9, 0.01)])).map((hit) => hit.targetId)).toEqual([]);
    expect(queryMeleeTargets(base([target("side", 7, 8)])).map((hit) => hit.targetId)).toEqual([]);
    expect(queryMeleeTargets(base([target("side", 7, 8)], { reachMeters: 3, arcWidthRadians: Math.PI })).map((hit) => hit.targetId)).toEqual(["side"]);
  });

  it("blocks actual tile walls and permits a clear line", () => {
    const wall = grid([[2, 3]]);
    expect(queryMeleeTargets(base([target("behind-wall", 5, 5)], { grid: wall }))).toEqual([]);
    expect(queryMeleeTargets(base([target("clear", 5, 7)])).map((hit) => hit.targetId)).toEqual(["clear"]);
  });

  it("treats target circles intersecting range or arc as eligible at their closest point", () => {
    const rangeEdge = queryMeleeTargets(base([target("range-edge", 5, 6.9, 0.2)]));
    expect(rangeEdge).toHaveLength(1);
    expect(rangeEdge[0]?.distanceMeters).toBeCloseTo(1.9);

    // Center bearing is outside the 90-degree sector, but the circle reaches its edge.
    const arcEdge = queryMeleeTargets(base([target("arc-edge", 7.2, 7.2, 0.4)], { reachMeters: 3 }));
    expect(arcEdge.map((hit) => hit.targetId)).toEqual(["arc-edge"]);

    // Reach contains every first-contact ray (sqrt(d²-r²) < 2), so it must not
    // clip away the collider's arc-edge overlap.
    const wideCollider = target("wide-close", 5 + 1.5 * Math.sin(0.5), 9 - 1.5 * Math.cos(0.5), 0.8);
    expect(queryMeleeTargets(base([wideCollider], { reachMeters: 2, arcWidthRadians: 0.9 })).map((hit) => hit.targetId)).toEqual(["wide-close"]);
  });

  it("uses exact segment geometry so a thin wall and a corner graze block", () => {
    // This segment crosses the one-cell-thick wall without any sampling step.
    expect(queryMeleeTargets(base([target("thin", 5, 5)], { grid: grid([[2, 3]]) }))).toEqual([]);
    const corner = base([target("corner", 7, 7)], {
      origin: { x: 1, z: 5 }, yawRadians: Math.PI / 4, reachMeters: 5, arcWidthRadians: Math.PI,
      grid: grid([[1, 2]]),
    });
    expect(queryMeleeTargets(corner)).toEqual([]);
  });

  it("finds a clear exposed collider arc when its closest contact is behind a wall", () => {
    const wall = grid([[2, 3]]);
    for (const side of [1, -1]) {
      const originX = side === 1 ? 5.99 : 4.01;
      const centerX = originX;
      const centerZ = 5;
      const collider = target(`exposed-${side}`, centerX, centerZ, 1.5);
      const query = base([collider], {
        origin: { x: originX, z: 9 }, yawRadians: 0, grid: wall,
        reachMeters: 5, arcWidthRadians: Math.PI / 2,
      });
      const [hit] = queryMeleeTargets(query);
      expect(hit).toBeDefined();
      if (!hit) continue;

      const dx = hit.hitPoint.x - centerX;
      const dz = hit.hitPoint.z - centerZ;
      expect(Math.hypot(dx, dz)).toBeCloseTo(1.5, 8);
      expect(Math.hypot(hit.hitPoint.x - originX, hit.hitPoint.z - 9)).toBeLessThanOrEqual(5 + 1e-10);
      expect(Math.abs(Math.atan2(-(hit.hitPoint.x - originX), -(hit.hitPoint.z - 9)))).toBeLessThanOrEqual(Math.PI / 4 + 1e-10);

      // A point collider at the returned contact independently verifies that
      // the same segment remains clear under the query's wall/arc/range rules.
      expect(queryMeleeTargets({ ...query, targets: [target("contact", hit.hitPoint.x, hit.hitPoint.z, 0)] })).toHaveLength(1);
    }
  });

  it("handles yaw wrapping and the zero-width and full-circle limits", () => {
    expect(queryMeleeTargets(base([target("wrapped", 5.2, 7)], { yawRadians: Math.PI * 2 - 0.05 })).map((hit) => hit.targetId)).toEqual(["wrapped"]);
    expect(queryMeleeTargets(base([target("exact", 5, 7)], { arcWidthRadians: 0 })).map((hit) => hit.targetId)).toEqual(["exact"]);
    expect(queryMeleeTargets(base([target("behind", 5, 11)], { arcWidthRadians: Math.PI * 2 })).map((hit) => hit.targetId)).toEqual(["behind"]);
  });

  it("treats outside-map space as solid and keeps nearby targets selectable", () => {
    expect(queryMeleeTargets(base([target("outside", 5, -1)], { reachMeters: 10 }))).toEqual([]);
    expect(queryMeleeTargets(base([target("near", 5, 8.5, 0.1)])).map((hit) => hit.targetId)).toEqual(["near"]);
  });

  it("filters bad finite values and colliders, and returns unique sorted IDs", () => {
    const result = queryMeleeTargets(base([
      target("z", 5, 7), target("a", 4.8, 7), target("a", 5, 7),
      target("bad-radius", 5, 7, Number.NaN), target("bad-position", Number.POSITIVE_INFINITY, 7),
    ]));
    expect(result.map((hit) => hit.targetId)).toEqual(["a", "z"]);
    expect(queryMeleeTargets(base([target("valid", 5, 7)], { yawRadians: Number.NaN }))).toEqual([]);
    expect(queryMeleeTargets(base([target("valid", 5, 7)], { reachMeters: Number.POSITIVE_INFINITY }))).toEqual([]);
    expect(queryMeleeTargets(base([target("valid", 5, 7)], { arcWidthRadians: -0.1 }))).toEqual([]);
  });
});
