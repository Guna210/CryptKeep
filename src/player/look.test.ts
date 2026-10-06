import { describe, expect, it } from "vitest";
import { applyMouseLook, DEFAULT_MOUSE_SENSITIVITY, MAX_LOOK_PITCH } from "./look";

describe("applyMouseLook", () => {
  it("turns rightward mouse motion left and keeps yaw unbounded through full turns", () => {
    let pose = { yaw: 0, pitch: 0 };
    for (let i = 0; i < 5; i += 1) {
      pose = applyMouseLook(pose, { x: 2 * Math.PI / DEFAULT_MOUSE_SENSITIVITY, y: 0 });
    }
    expect(pose.yaw).toBeCloseTo(-10 * Math.PI);
  });

  it("looks upward for upward mouse motion and clamps pitch to 85 degrees", () => {
    expect(applyMouseLook({ yaw: 0, pitch: 0 }, { x: 0, y: -10 })).toEqual({ yaw: 0, pitch: 0.02 });
    expect(applyMouseLook({ yaw: 0, pitch: 0 }, { x: 0, y: -1e9 }).pitch).toBe(MAX_LOOK_PITCH);
    expect(applyMouseLook({ yaw: 0, pitch: 0 }, { x: 0, y: 1e9 }).pitch).toBe(-MAX_LOOK_PITCH);
  });

  it("supports sensitivity and inverted Y and ignores nonfinite values", () => {
    expect(applyMouseLook({ yaw: 1, pitch: 0 }, { x: 2, y: -3 }, { sensitivity: 0.01, invertY: true }))
      .toEqual({ yaw: 0.98, pitch: -0.03 });
    expect(applyMouseLook({ yaw: 1, pitch: 0.25 }, { x: Number.NaN, y: Infinity }))
      .toEqual({ yaw: 1, pitch: 0.25 });
    expect(applyMouseLook({ yaw: Infinity, pitch: Infinity }, { x: 1, y: 1 }))
      .toEqual({ yaw: -DEFAULT_MOUSE_SENSITIVITY, pitch: -DEFAULT_MOUSE_SENSITIVITY });
    expect(applyMouseLook({ yaw: 0.5, pitch: 0 }, { x: Number.MAX_VALUE, y: 0 }, { sensitivity: Number.MAX_VALUE }).yaw)
      .toBe(0.5);
  });
});
