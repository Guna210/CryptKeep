import { spendResource, type ResourceValue } from "./resources";
import type { CircleMoveResult } from "./collision";
import type { MovementAxes } from "./movement";

export const DASH_SPEED_METERS_PER_SECOND = 10;
export const DASH_DURATION_SECONDS = 0.22;
export const DASH_DISTANCE_METERS = DASH_SPEED_METERS_PER_SECOND * DASH_DURATION_SECONDS;
export const DASH_COOLDOWN_SECONDS = 0.8;
export const DASH_EVASION_SECONDS = 0.1;
export const DASH_STAMINA_COST = 25;
const TIMER_EPSILON_SECONDS = 1e-10;

export interface DashState {
  readonly active: boolean;
  readonly remainingSeconds: number;
  readonly cooldownRemainingSeconds: number;
  readonly evasionRemainingSeconds: number;
  readonly direction: Readonly<{ x: number; z: number }>;
}

export interface DashActivation { readonly state: DashState; readonly stamina: ResourceValue; readonly accepted: boolean }
export interface DashStep { readonly state: DashState; readonly displacement: Readonly<{ x: number; z: number }>; readonly evading: boolean }
export interface DashCollisionResult { readonly state: DashState; readonly position: Readonly<{x:number;z:number}>; readonly velocity: Readonly<{x:number;y:number;z:number}>; readonly contacted: boolean }

export function createDashState(): DashState {
  return Object.freeze({ active:false, remainingSeconds:0, cooldownRemainingSeconds:0, evasionRemainingSeconds:0, direction:Object.freeze({x:0,z:0}) });
}

/** A fresh semantic edge is required; callers also gate this on active captured gameplay. */
export function activateDash(state: DashState, stamina: ResourceValue, pressed: boolean, yaw: number, axes: MovementAxes): DashActivation {
  if (!pressed || state.active || state.cooldownRemainingSeconds > 0 || stamina.current < DASH_STAMINA_COST) {
    return Object.freeze({ state, stamina, accepted:false });
  }
  const paid = spendResource(stamina, DASH_STAMINA_COST);
  if (!paid.success) return Object.freeze({ state, stamina, accepted:false });
  let x = Number.isFinite(axes?.x) ? axes.x : 0;
  let forward = Number.isFinite(axes?.y) ? axes.y : 0;
  if (Math.hypot(x, forward) < 1e-12) forward = 1;
  const length = Math.hypot(x, forward);
  x /= length; forward /= length;
  const safeYaw = Number.isFinite(yaw) ? yaw : 0;
  const direction = Object.freeze({ x:x*Math.cos(safeYaw)-forward*Math.sin(safeYaw), z:-x*Math.sin(safeYaw)-forward*Math.cos(safeYaw) });
  return Object.freeze({
    state:Object.freeze({active:true, remainingSeconds:DASH_DURATION_SECONDS, cooldownRemainingSeconds:DASH_COOLDOWN_SECONDS, evasionRemainingSeconds:DASH_EVASION_SECONDS, direction}),
    stamina:paid.resource, accepted:true,
  });
}

/** Advance only with the shared fixed simulation dt. `evading` describes the tick interval just consumed; near-zero timer residue is expired. A contact terminates the dash before this is called. */
export function advanceDash(state: DashState, dtSeconds: number): DashStep {
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) throw new RangeError("dtSeconds must be finite and positive");
  const cooldownRaw = Math.max(0, state.cooldownRemainingSeconds - dtSeconds);
  const cooldownRemainingSeconds = cooldownRaw <= TIMER_EPSILON_SECONDS ? 0 : cooldownRaw;
  // State is sampled at the beginning of this tick; a remainder below numeric
  // precision is treated as expired so 0.10s cannot spill into a seventh 60Hz tick.
  const evading = state.active && state.evasionRemainingSeconds > TIMER_EPSILON_SECONDS;
  if (!state.active) return Object.freeze({ state:Object.freeze({...state,cooldownRemainingSeconds}), displacement:Object.freeze({x:0,z:0}), evading:false });
  const duration = Math.min(dtSeconds, state.remainingSeconds);
  const distance = Math.min(DASH_SPEED_METERS_PER_SECOND * duration, DASH_DISTANCE_METERS);
  const remainingSeconds = Math.max(0, state.remainingSeconds - duration);
  const active = remainingSeconds > 1e-12;
  return Object.freeze({
    state:Object.freeze({...state, active, remainingSeconds, cooldownRemainingSeconds, evasionRemainingSeconds:(state.evasionRemainingSeconds-dtSeconds <= TIMER_EPSILON_SECONDS ? 0 : state.evasionRemainingSeconds-dtSeconds), direction:active ? state.direction : Object.freeze({x:0,z:0})}),
    displacement:Object.freeze({x:state.direction.x*distance,z:state.direction.z*distance}), evading,
  });
}

export function cancelDash(state: DashState): DashState {
  return Object.freeze({...state,active:false,remainingSeconds:0,evasionRemainingSeconds:0,direction:Object.freeze({x:0,z:0})});
}

/** Dash collision policy: stop at first contact center and discard the collision solver's slide. */
export function resolveDashCollision(step: DashStep, moved: CircleMoveResult): DashCollisionResult {
  const contact = moved.contacts[0];
  const state = contact ? cancelDash(step.state) : step.state;
  const ended = !!contact || !step.state.active;
  return Object.freeze({
    state,
    position:Object.freeze(contact ? {x:contact.x,z:contact.z} : {...moved.position}),
    velocity:Object.freeze(ended ? {x:0,y:0,z:0} : {x:state.direction.x*DASH_SPEED_METERS_PER_SECOND,y:0,z:state.direction.z*DASH_SPEED_METERS_PER_SECOND}),
    contacted:!!contact,
  });
}
