import { describe, expect, it } from "vitest";
import { InputSampler } from "../core/input";
import { generateFloor } from "../dungeon/generate";
import { createPlayerState } from "./state";
import { stepLocomotion } from "./movement";

const base = () => createPlayerState(generateFloor({ campaignSeed: "ck-02-02-motion", floorNumber: 1 }).plan).state;

function simulate(axes: { x: number; y: number }, count: number, dt: number, initial = base()) {
  let state = initial;
  for (let i = 0; i < count; i++) state = stepLocomotion(state, axes, dt).state;
  return state;
}

describe("yaw-relative planar locomotion", () => {
  it("normalizes diagonals to the same speed and travel distance as straight movement", () => {
    const straight = simulate({ x: 0, y: 1 }, 120, 1 / 60);
    const diagonal = simulate({ x: 1, y: 1 }, 120, 1 / 60);
    expect(Math.hypot(straight.velocity.x, straight.velocity.z)).toBeCloseTo(3.5, 8);
    expect(Math.hypot(diagonal.velocity.x, diagonal.velocity.z)).toBeCloseTo(3.5, 8);
    expect(Math.hypot(straight.pose.x - base().pose.x, straight.pose.z - base().pose.z))
      .toBeCloseTo(Math.hypot(diagonal.pose.x - base().pose.x, diagonal.pose.z - base().pose.z), 8);
  });

  it("uses right-positive X at yaw zero and turns positive yaw left", () => {
    const player = base();
    const right = stepLocomotion(player, { x: 1, y: 0 }, 1 / 60);
    expect(right.state.velocity.x).toBeGreaterThan(0);
    expect(Math.abs(right.state.velocity.z)).toBeLessThan(1e-10);
    const leftTurn = stepLocomotion({ ...player, pose: { ...player.pose, yaw: Math.PI / 2 } }, { x: 0, y: 1 }, 1 / 60);
    expect(leftTurn.state.velocity.x).toBeLessThan(0);
    expect(Math.abs(leftTurn.state.velocity.z)).toBeLessThan(1e-10);
  });

  it("ignores pitch when converting forward input", () => {
    const player = base();
    const level = stepLocomotion({ ...player, pose: { ...player.pose, pitch: 0 } }, { x: 0, y: 1 }, 1 / 60);
    const lookingUp = stepLocomotion({ ...player, pose: { ...player.pose, pitch: Math.PI / 2 } }, { x: 0, y: 1 }, 1 / 60);
    expect(lookingUp.displacement).toEqual(level.displacement);
    expect(lookingUp.state.velocity.y).toBe(0);
  });

  it("cancels opposing sampled directions", () => {
    const sampler = new InputSampler();
    sampler.press("moveForward"); sampler.press("moveBackward");
    sampler.press("moveLeft"); sampler.press("moveRight");
    const { movement } = sampler.sample();
    expect(movement).toEqual({ x: 0, y: 0 });
    expect(simulate(movement, 2, 1 / 60).velocity).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("applies acceleration and deceleration limits using seconds, and clears inactive movement", () => {
    const player = base();
    const quarter = stepLocomotion(player, { x: 0, y: 1 }, 0.25);
    expect(Math.hypot(quarter.state.velocity.x, quarter.state.velocity.z)).toBeCloseTo(3.5, 8);
    const tiny = stepLocomotion(player, { x: 0, y: 1 }, 0.01);
    expect(Math.hypot(tiny.state.velocity.x, tiny.state.velocity.z)).toBeCloseTo(0.24, 8);
    const decel = stepLocomotion(tiny.state, { x: 0, y: 0 }, 0.001);
    expect(Math.hypot(tiny.state.velocity.x - decel.state.velocity.x, tiny.state.velocity.z - decel.state.velocity.z)).toBeCloseTo(0.032, 8);
    const stopped = stepLocomotion(tiny.state, { x: 0, y: 1 }, 1 / 60, { active: false });
    expect(stopped.state.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(stopped.displacement).toEqual({ x: 0, z: 0 });
  });

  it("sanitizes nonfinite axes and rejects invalid dt without producing nonfinite output", () => {
    const result = stepLocomotion(base(), { x: Number.NaN, y: Number.POSITIVE_INFINITY }, 1 / 60);
    expect(result.state.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(Object.values(result.displacement).every(Number.isFinite)).toBe(true);
    expect(() => stepLocomotion(base(), { x: 0, y: 0 }, 0)).toThrow(RangeError);
    expect(() => stepLocomotion(base(), { x: 0, y: 0 }, Number.NaN)).toThrow(RangeError);
  });
});
