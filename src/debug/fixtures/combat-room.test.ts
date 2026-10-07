import { describe, expect, it } from "vitest";
import { queryMeleeTargets } from "../../combat/queries";
import { moveCircleOnGrid } from "../../player/collision";
import { PLAYER_RADIUS_METERS } from "../../player/state";
import { createCombatRoomFixture, TRAINING_PLAYER, TRAINING_START, TRAINING_TARGET_ID, TRAINING_TARGET_POSITION, TRAINING_TARGET_RADIUS } from "./combat-room";

const packet = (attackId: string, amount: number) => ({ sourceId: TRAINING_PLAYER.id, targetId: TRAINING_TARGET_ID, attackId, damageType: "physical" as const, amount });

describe("development combat training room", () => {
  it("exposes immutable real target state, records actual damage/death events, and retires the corpse", () => {
    const room = createCombatRoomFixture();
    const batches: unknown[] = [];
    room.subscribe((batch) => batches.push(...batch));
    const before = room.snapshot();
    expect(before.label).toBe("DEV TRAINING ROOM");
    expect(Object.isFrozen(before)).toBe(true);
    expect(Object.isFrozen(before.target.health)).toBe(true);
    expect(before.target.health.current).toBe(100);
    expect(room.queryTargets().map((hit) => hit.targetId)).toEqual([TRAINING_TARGET_ID]);
    expect(room.applyDamage(packet("light-1", 18))).toMatchObject({ applied: true, amount: 18, killed: false });
    expect(room.snapshot().target.health.current).toBe(82);
    expect(room.applyDamage(packet("heavy-1", 54))).toMatchObject({ applied: true, amount: 54, killed: false });
    expect(room.snapshot().target.health.current).toBe(28);
    expect(room.applyDamage(packet("finish-1", 28))).toMatchObject({ applied: true, amount: 28, killed: true, target: { health: { current: 0 } } });
    expect(room.snapshot().target.health.current).toBe(0);
    expect(room.snapshot().aliveColliders).toEqual([]);
    expect(room.queryTargets()).toEqual([]);
    expect(room.applyDamage(packet("finish-2", 100))).toMatchObject({ applied: false, reason: "dead-target" });
    expect(batches).toEqual([
      { type: "damage-applied", sourceId: TRAINING_PLAYER.id, targetId: TRAINING_TARGET_ID, attackId: "light-1", damageType: "physical", amount: 18, hpRemaining: 82, tick: 0 },
      { type: "damage-applied", sourceId: TRAINING_PLAYER.id, targetId: TRAINING_TARGET_ID, attackId: "heavy-1", damageType: "physical", amount: 54, hpRemaining: 28, tick: 1 },
      { type: "damage-applied", sourceId: TRAINING_PLAYER.id, targetId: TRAINING_TARGET_ID, attackId: "finish-1", damageType: "physical", amount: 28, hpRemaining: 0, tick: 2 },
      { type: "entity-died", sourceId: TRAINING_PLAYER.id, targetId: TRAINING_TARGET_ID, attackId: "finish-1", damageType: "physical", tick: 2 },
    ]);
    room.dispose(); room.dispose();
    expect(() => room.snapshot()).toThrow("disposed");
  });

  it("deduplicates an attack and uses the real tile grid to block the wall variant", () => {
    const room = createCombatRoomFixture();
    const first = room.applyDamage(packet("same-attack", 18));
    expect(first.applied).toBe(true);
    expect(room.applyDamage(packet("same-attack", 18))).toMatchObject({ applied: false, reason: "already-hit" });
    expect(room.snapshot().target.health.current).toBe(82);
    const wall = createCombatRoomFixture({ obstructed: true });
    expect(wall.snapshot().grid.tiles).not.toEqual(room.snapshot().grid.tiles);
    // The supplied native-player pose remains valid under the real swept-circle
    // collision validator, including with the obstruction enabled.
    expect(() => moveCircleOnGrid(wall.snapshot().grid, TRAINING_START, { x: 0, z: 0 }, PLAYER_RADIUS_METERS)).not.toThrow();
    expect(clearOfSolids(wall.snapshot().grid, TRAINING_TARGET_POSITION, TRAINING_TARGET_RADIUS)).toBe(true);
    expect(room.queryTargets()).toHaveLength(1);
    expect(queryMeleeTargets({ origin: wall.snapshot().player, yawRadians: wall.snapshot().player.yawRadians, grid: wall.snapshot().grid, targets: wall.snapshot().aliveColliders })).toEqual([]);
    expect(wall.queryTargets()).toEqual([]);
    expect(wall.snapshot().target.health.current).toBe(100);
    room.dispose(); wall.dispose();
  });
});

function clearOfSolids(grid: { width: number; height: number; tiles: readonly number[] }, point: { x: number; z: number }, radius: number): boolean {
  for (let z = 0; z < grid.height; z++) for (let x = 0; x < grid.width; x++) {
    if (grid.tiles[z * grid.width + x] !== 0) continue;
    const left = x * 2, top = z * 2;
    const dx = Math.max(left - point.x, 0, point.x - (left + 2));
    const dz = Math.max(top - point.z, 0, point.z - (top + 2));
    if (dx * dx + dz * dz < radius * radius) return false;
  }
  return true;
}
