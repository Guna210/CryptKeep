import type { PlayerState } from "./state";

/** Raw semantic movement axes: x is right, y is forward. */
export interface MovementAxes {
  readonly x: number;
  readonly y: number;
}

export interface LocomotionOptions {
  /** Maximum planar speed in metres per second. Defaults to the 3.5 m/s walking speed. */
  readonly maxSpeed?: number;
  /** Planar acceleration in metres per second squared. */
  readonly acceleration?: number;
  /** Planar deceleration in metres per second squared. */
  readonly deceleration?: number;
  /** False represents an inactive/menu state and immediately clears velocity. */
  readonly active?: boolean;
}

export interface LocomotionStep {
  /** New immutable state, advanced without collision resolution. */
  readonly state: PlayerState;
  /** Requested X/Z displacement in metres for the collision stage. */
  readonly displacement: Readonly<{ x: number; z: number }>;
}

export const WALK_SPEED_METERS_PER_SECOND = 3.5;
export const DEFAULT_ACCELERATION_METERS_PER_SECOND_SQUARED = 24;
export const DEFAULT_DECELERATION_METERS_PER_SECOND_SQUARED = 32;

/**
 * Advance yaw-relative, planar locomotion by one explicit fixed-dt step.
 * The returned pose is the unconstrained candidate; callers with collision
 * handling should resolve `displacement` before committing its X/Z position.
 * Angles are radians and dt is seconds. Pitch never participates.
 */
export function stepLocomotion(
  player: PlayerState,
  axes: MovementAxes,
  dtSeconds: number,
  options: LocomotionOptions = {},
): LocomotionStep {
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) throw new RangeError("dtSeconds must be finite and positive");
  const maxSpeed = options.maxSpeed ?? WALK_SPEED_METERS_PER_SECOND;
  const acceleration = options.acceleration ?? DEFAULT_ACCELERATION_METERS_PER_SECOND_SQUARED;
  const deceleration = options.deceleration ?? DEFAULT_DECELERATION_METERS_PER_SECOND_SQUARED;
  if (![maxSpeed, acceleration, deceleration].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new RangeError("Locomotion speed and acceleration limits must be finite and nonnegative");
  }

  let vx = player.velocity.x;
  let vz = player.velocity.z;
  let dx = 0;
  let dz = 0;
  if (options.active === false) {
    vx = 0;
    vz = 0;
  } else {
    const x = Number.isFinite(axes?.x) ? axes.x : 0;
    const y = Number.isFinite(axes?.y) ? axes.y : 0;
    let localX = x, localForward = y;
    const inputLength = Math.hypot(localX, localForward);
    if (inputLength > 1) { localX /= inputLength; localForward /= inputLength; }

    const yaw = Number.isFinite(player.pose.yaw) ? player.pose.yaw : 0;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    // Three.js positive yaw turns left: forward -Z rotates toward -X.
    const targetX = (localX * cos - localForward * sin) * maxSpeed;
    const targetZ = (-localX * sin - localForward * cos) * maxSpeed;
    const deltaX = targetX - vx, deltaZ = targetZ - vz;
    const difference = Math.hypot(deltaX, deltaZ);
    const currentSpeed = Math.hypot(vx, vz);
    const targetSpeed = Math.hypot(targetX, targetZ);
    const limit = (targetSpeed < currentSpeed ? deceleration : acceleration) * dtSeconds;
    const scale = difference > limit && difference > 0 ? limit / difference : 1;
    vx += deltaX * scale;
    vz += deltaZ * scale;
  }

  dx = vx * dtSeconds;
  dz = vz * dtSeconds;
  if (![vx, vz, dx, dz, player.pose.x + dx, player.pose.z + dz].every(Number.isFinite)) {
    throw new RangeError("Locomotion step exceeds finite world-coordinate range");
  }
  const velocity = Object.freeze({ x: vx, y: 0, z: vz });
  const pose = Object.freeze({ ...player.pose, x: player.pose.x + dx, z: player.pose.z + dz });
  const state = Object.freeze({ ...player, pose, velocity });
  return Object.freeze({ state, displacement: Object.freeze({ x: dx, z: dz }) });
}
