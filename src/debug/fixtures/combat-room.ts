import { EventCollector, type EventBatch } from "../../core/events";
import { createGrid } from "../../dungeon/grid";
import { Tile, type Grid } from "../../dungeon/types";
import { PhysicalDamageResolver } from "../../combat/damage";
import { queryMeleeTargets, type MeleeHit, type MeleeTargetCollider } from "../../combat/queries";
import type { DamageableCombatant, DamageResult, PhysicalDamagePacket } from "../../combat/types";
import { createResource } from "../../player/resources";

export const TRAINING_TARGET_ID = "dev-training-dummy";
export const TRAINING_PLAYER = Object.freeze({ id: "dev-training-player", team: "players" });
export const TRAINING_START = Object.freeze({ x: 10.3, z: 10.5, yawRadians: Math.atan2(1, 0.9) });
export const TRAINING_TARGET_POSITION = Object.freeze({ x: 9.3, z: 9.6 });
export const TRAINING_TARGET_RADIUS = 0.35;

export interface CombatRoomSnapshot {
  readonly label: "DEV TRAINING ROOM";
  readonly variant: "clear" | "obstructed";
  readonly grid: Grid;
  readonly player: typeof TRAINING_START;
  readonly target: DamageableCombatant;
  readonly aliveColliders: readonly MeleeTargetCollider[];
  readonly disposed: boolean;
}
export interface CombatRoomFixture {
  snapshot(): CombatRoomSnapshot;
  queryTargets(): readonly MeleeHit[];
  applyDamage(packet: PhysicalDamagePacket): DamageResult;
  subscribe(listener: (batch: EventBatch) => void): () => void;
  dispose(): void;
}

/** Small hand-authored diagnostic room, independent of procedural campaign generation. */
export function createCombatRoomFixture(options: { readonly obstructed?: boolean } = {}): CombatRoomFixture {
  if (!import.meta.env.DEV && import.meta.env.MODE !== "test") throw new Error("Combat training fixtures are available only in development or tests");
  if (options === null || typeof options !== "object" || Object.keys(options).some((key) => key !== "obstructed") || (options.obstructed !== undefined && typeof options.obstructed !== "boolean")) throw new TypeError("Invalid training room options");
  const width = 9, height = 9;
  const tiles = Array<number>(width * height).fill(Tile.Walkable);
  for (let x = 0; x < width; x++) { tiles[x] = Tile.Solid; tiles[(height - 1) * width + x] = Tile.Solid; }
  for (let z = 0; z < height; z++) { tiles[z * width] = Tile.Solid; tiles[z * width + width - 1] = Tile.Solid; }
  if (options.obstructed) tiles[5 * width + 4] = Tile.Solid;
  const grid = createGrid(width, height, tiles);
  const events = new EventCollector();
  const resolver = new PhysicalDamageResolver(events);
  const source = TRAINING_PLAYER;
  let target: DamageableCombatant = Object.freeze({ id: TRAINING_TARGET_ID, team: "enemies", health: createResource(100, 100) });
  let disposed = false, tick = 0;
  const colliders = () => target.health.current > 0 ? Object.freeze([Object.freeze({ id: TRAINING_TARGET_ID, position: TRAINING_TARGET_POSITION, radius: TRAINING_TARGET_RADIUS })]) : Object.freeze([] as MeleeTargetCollider[]);
  const assertAlive = () => { if (disposed) throw new Error("Combat room fixture is disposed"); };
  return {
    snapshot() {
      assertAlive();
      return Object.freeze({ label: "DEV TRAINING ROOM", variant: options.obstructed ? "obstructed" : "clear", grid, player: TRAINING_START, target, aliveColliders: colliders(), disposed });
    },
    queryTargets() {
      assertAlive();
      return queryMeleeTargets({ origin: TRAINING_START, yawRadians: TRAINING_START.yawRadians, grid, targets: colliders() });
    },
    applyDamage(packet) {
      assertAlive();
      events.beginTick(tick++);
      const result = resolver.resolve(source, target, packet);
      if (result.applied) target = result.target;
      events.flush();
      return result;
    },
    subscribe(listener) { assertAlive(); return events.subscribe(listener); },
    dispose() { if (disposed) return; disposed = true; events.dispose(); },
  };
}
