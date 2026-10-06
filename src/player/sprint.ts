import { spendResource, type ResourceValue } from "./resources";
import type { MovementAxes } from "./movement";
import type { PlayerState } from "./state";

export const SPRINT_SPEED_METERS_PER_SECOND = 5.5;
export const SPRINT_STAMINA_PER_SECOND = 18;
export const SPRINT_MOVEMENT_EPSILON_METERS = 1e-8;

export interface SprintEligibility {
  readonly held: boolean;
  readonly active: boolean;
  readonly axes: MovementAxes;
  readonly secondaryHeld?: boolean;
  readonly healing?: boolean;
  readonly stanceRestricted?: boolean;
}

export interface SprintDecision {
  readonly eligible: boolean;
  readonly maximumSpeed: number;
  readonly staminaCost: number;
}

/** Ignore collision-solver skin/jitter below this world-space displacement. */
export function hasSprintMovement(displacement: Readonly<{ x:number; z:number }>): boolean {
  return Number.isFinite(displacement.x) && Number.isFinite(displacement.z) && Math.hypot(displacement.x, displacement.z) > SPRINT_MOVEMENT_EPSILON_METERS;
}

/** Pure pre-movement eligibility. A full tick's cost must be affordable; there is no free partial tick. */
export function decideSprint(stamina: ResourceValue, dtSeconds: number, input: SprintEligibility): SprintDecision {
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) throw new RangeError("dtSeconds must be finite and positive");
  const intent = Number.isFinite(input.axes?.x) && Number.isFinite(input.axes?.y) && Math.hypot(input.axes.x, input.axes.y) > 0;
  const cost = SPRINT_STAMINA_PER_SECOND * dtSeconds;
  const eligible = input.held && input.active && intent && !input.secondaryHeld && !input.healing && !input.stanceRestricted && stamina.current >= cost;
  return Object.freeze({ eligible, maximumSpeed: eligible ? SPRINT_SPEED_METERS_PER_SECOND : 3.5, staminaCost: eligible ? cost : 0 });
}

/** Commit the one per-tick charge only after collision reports real applied movement. */
export function commitSprintMovement(
  player: PlayerState,
  decision: SprintDecision,
  appliedDisplacement: Readonly<{ x: number; z: number }>,
): Readonly<{ state: PlayerState; spent: boolean }> {
  const moved = hasSprintMovement(appliedDisplacement);
  if (!decision.eligible || !moved) return Object.freeze({ state: player, spent: false });
  const result = spendResource(player.stamina, decision.staminaCost);
  if (!result.success) return Object.freeze({ state: player, spent: false });
  return Object.freeze({ state: Object.freeze({ ...player, stamina: result.resource }), spent: true });
}
