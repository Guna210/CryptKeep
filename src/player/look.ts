import type { PlayerPose } from "./state";

export const DEFAULT_MOUSE_SENSITIVITY = 0.002;
export const MAX_LOOK_PITCH = (85 * Math.PI) / 180;

export interface LookSettings {
  readonly sensitivity?: number;
  readonly invertY?: boolean;
}

/** Apply relative mouse pixels to a pose using the game's Three.js angle convention. */
export function applyMouseLook(
  pose: Pick<PlayerPose, "yaw" | "pitch">,
  delta: Readonly<{ x: number; y: number }>,
  settings: LookSettings = {},
): Pick<PlayerPose, "yaw" | "pitch"> {
  const sensitivity = settings.sensitivity ?? DEFAULT_MOUSE_SENSITIVITY;
  const yaw = Number.isFinite(pose.yaw) ? pose.yaw : 0;
  const pitch = Number.isFinite(pose.pitch) ? pose.pitch : 0;
  if (!Number.isFinite(sensitivity) || sensitivity < 0) {
    return { yaw, pitch: clampPitch(pitch) };
  }

  const dx = Number.isFinite(delta.x) ? delta.x : 0;
  const dy = Number.isFinite(delta.y) ? delta.y : 0;
  const invert = settings.invertY === true ? -1 : 1;
  const nextYaw = yaw - dx * sensitivity;
  return {
    yaw: Number.isFinite(nextYaw) ? nextYaw : yaw,
    pitch: clampPitch(pitch - dy * sensitivity * invert),
  };
}

function clampPitch(pitch: number): number {
  return Math.max(-MAX_LOOK_PITCH, Math.min(MAX_LOOK_PITCH, pitch));
}
