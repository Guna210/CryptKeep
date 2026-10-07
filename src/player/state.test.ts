import { describe, expect, it } from "vitest";
import { generateFloor } from "../dungeon/generate";
import { CELL_SIZE_METERS, createGrid } from "../dungeon/grid";
import { Tile } from "../dungeon/types";
import { PLAYER_CAMERA_HEIGHT_METERS, PLAYER_RADIUS_METERS, createGridPlayerState, createPlayerState, entrySpawnPosition, isPoseValid } from "./state";

describe("player safe spawn state", () => {
  it("validates explicit Grid poses with the same radius/resources without role metadata",()=>{
    const grid=createGrid(9,9,Array.from({length:81},(_,i)=>{const x=i%9,z=Math.floor(i/9);return x===0||z===0||x===8||z===8?Tile.Solid:Tile.Walkable;}));
    const pose={x:10.3,z:10.5,yaw:.8};
    const initialized=createGridPlayerState(grid,pose);
    expect(initialized.repaired).toBe(false);expect(initialized.state.pose).toMatchObject({...pose,y:PLAYER_CAMERA_HEIGHT_METERS});
    expect(initialized.state.health).toEqual({current:100,maximum:100});expect(initialized.state.stamina).toEqual({current:100,maximum:100});expect(initialized.state.mana).toEqual({current:60,maximum:60});
    expect(isPoseValid(grid,pose)).toBe(true);expect(()=>createGridPlayerState(grid,{x:2,z:2})).toThrow("must clear the Grid");
  });
  it("creates base resources and retains a valid supplied pose", () => {
    const floor = generateFloor({ campaignSeed: "player-valid-pose", floorNumber: 1 }).plan;
    const entry = entrySpawnPosition(floor);
    const result = createPlayerState(floor, { ...entry, yaw: 1.25, pitch: -0.2 });
    expect(result.repaired).toBe(false);
    expect(result.state.pose).toMatchObject({ ...entry, y: PLAYER_CAMERA_HEIGHT_METERS, yaw: 1.25, pitch: -0.2 });
    expect(result.state).toMatchObject({ radius: PLAYER_RADIUS_METERS, health: { current: 100, maximum: 100 }, stamina: { current: 100, maximum: 100 }, mana: { current: 60, maximum: 60 } });
    expect(result.state.velocity).toEqual({ x: 0, y: 0, z: 0 });
  });

  it.each([
    { x: Number.NaN, z: 2 },
    { x: -1, z: 2 },
    { x: 0.3, z: 0.3 },
  ])("repairs invalid pose $x,$z to the generated entry", (pose) => {
    const floor = generateFloor({ campaignSeed: "player-invalid-pose", floorNumber: 1 }).plan;
    const result = createPlayerState(floor, pose);
    expect(result.repaired).toBe(true);
    expect(result.state.pose.x).toBe(entrySpawnPosition(floor).x);
    expect(result.state.pose.z).toBe(entrySpawnPosition(floor).z);
    expect(isPoseValid(floor, result.state.pose)).toBe(true);
  });

  it("selects the same entry spawn for a repeated seed and rejects a solid-wall overlap", () => {
    const first = generateFloor({ campaignSeed: "player-determinism", floorNumber: 1 }).plan;
    const second = generateFloor({ campaignSeed: "player-determinism", floorNumber: 1 }).plan;
    expect(createPlayerState(first).state.pose).toEqual(createPlayerState(second).state.pose);

    let boundary: { x: number; z: number } | undefined;
    for (let z = 0; z < first.height && !boundary; z++) for (let x = 0; x < first.width - 1; x++) {
      if (first.tiles[z * first.width + x] === 1 && first.tiles[z * first.width + x + 1] === 0) {
        boundary = { x, z };
        break;
      }
    }
    expect(boundary).toBeDefined();
    const wallX = (boundary!.x + 1) * CELL_SIZE_METERS;
    const centerZ = (boundary!.z + 0.5) * CELL_SIZE_METERS;
    expect(isPoseValid(first, { x: wallX - PLAYER_RADIUS_METERS, z: centerZ })).toBe(true);
    expect(isPoseValid(first, { x: wallX - PLAYER_RADIUS_METERS / 2, z: centerZ })).toBe(false);
  });

  it("accepts exact diagonal corner tangency while rejecting a nearby overlap", () => {
    const floor = generateFloor({ campaignSeed: "ck0201-review-corner", floorNumber: 1 }).plan;
    const cornerX = 36;
    const cornerZ = 14;
    const offset = PLAYER_RADIUS_METERS / Math.SQRT2;
    const tangent = { x: cornerX - offset, z: cornerZ - offset };
    expect(isPoseValid(floor, tangent)).toBe(true);
    expect(isPoseValid(floor, { x: tangent.x + 1e-7, z: tangent.z + 1e-7 })).toBe(false);
  });

  it("throws if even the generated fallback entry has insufficient clearance", () => {
    const floor = generateFloor({ campaignSeed: "player-entry-valid", floorNumber: 1 }).plan;
    const corrupt = { ...floor, tiles: [...floor.tiles] } as typeof floor;
    const { x, z } = floor.roles.entry;
    (corrupt.tiles as number[])[z * floor.width + x] = 0;
    expect(() => createPlayerState(corrupt)).toThrow("Generated entry position does not provide player-radius clearance");
  });
});
