import { describe, expect, it } from "vitest";
import {
  FIXED_STEP_SECONDS,
  FixedStepClock,
  MAX_ACCUMULATED_SECONDS,
  MAX_STEPS_PER_ADVANCE,
} from "./clock";

function runSchedule(frameRate: number, durationSeconds: number): number {
  const clock = new FixedStepClock();
  clock.advance(0);
  let steps = 0;
  const frameCount = frameRate * durationSeconds;
  for (let frame = 1; frame <= frameCount; frame += 1) {
    steps += clock.advance((frame * 1000) / frameRate).steps;
  }
  return steps;
}

describe("FixedStepClock", () => {
  it("produces the same fixed tick count for common frame schedules", () => {
    for (const frameRate of [30, 60, 120, 144]) {
      expect(runSchedule(frameRate, 2)).toBe(120);
    }

    const clock = new FixedStepClock();
    clock.advance(0);
    let totalSteps = 0;
    let clockTime = 0;
    // Irregular sub-frame intervals total exactly one second without a long-frame clamp.
    for (const elapsedMs of [7, 11, 3, 19, 13, 5, 17, 23, 2, 29, 31, 41, 67, 79, 79, 79, 79, 79, 79, 79, 79, 79, 21]) {
      clockTime += elapsedMs;
      totalSteps += clock.advance(clockTime).steps;
    }
    expect(totalSteps).toBe(60);
  });

  it("primes on the first sample and handles exact step boundaries with interpolation", () => {
    const clock = new FixedStepClock();
    expect(clock.advance(100)).toEqual({ steps: 0, alpha: 0, droppedTimeSeconds: 0 });
    expect(clock.advance(100 + FIXED_STEP_SECONDS * 1000 - 0.01).steps).toBe(0);

    const boundary = clock.advance(100 + FIXED_STEP_SECONDS * 1000);
    expect(boundary.steps).toBe(1);
    expect(boundary.alpha).toBeGreaterThanOrEqual(0);
    expect(boundary.alpha).toBeLessThan(1);

    const halfStep = new FixedStepClock();
    halfStep.advance(0);
    const result = halfStep.advance((FIXED_STEP_SECONDS * 500));
    expect(result.steps).toBe(0);
    expect(result.alpha).toBeCloseTo(0.5, 8);
  });

  it("caps total accumulated time, reports discarded seconds, and retains no backlog", () => {
    const clock = new FixedStepClock();
    clock.advance(0);
    const stalled = clock.advance(1000);
    expect(stalled.steps).toBe(MAX_STEPS_PER_ADVANCE);
    expect(stalled.alpha).toBeLessThan(1);
    expect(stalled.droppedTimeSeconds).toBeCloseTo(1 - MAX_ACCUMULATED_SECONDS, 10);

    expect(clock.advance(1000 + FIXED_STEP_SECONDS * 1000).steps).toBe(1);

    const accumulated = new FixedStepClock();
    accumulated.advance(0);
    accumulated.advance(10); // Existing fractional time participates in the total cap.
    const capped = accumulated.advance(1010);
    expect(capped.steps).toBe(MAX_STEPS_PER_ADVANCE);
    expect(capped.droppedTimeSeconds).toBeCloseTo(0.91, 10);
  });

  it("does not advance while paused and resets its baseline across hidden time", () => {
    const clock = new FixedStepClock();
    clock.advance(100);
    expect(clock.advance(100 + FIXED_STEP_SECONDS * 1000).steps).toBe(1);
    clock.pause();
    expect(clock.paused).toBe(true);
    expect(clock.advance(500_000)).toEqual({ steps: 0, alpha: 0, droppedTimeSeconds: 0 });
    clock.resume(500_000);
    expect(clock.paused).toBe(false);
    expect(clock.advance(500_000 + FIXED_STEP_SECONDS * 1000).steps).toBe(1);

    clock.pause();
    clock.resume(800_000);
    expect(clock.advance(800_000).steps).toBe(0);
    expect(clock.advance(800_000 + FIXED_STEP_SECONDS * 1000).steps).toBe(1);
  });

  it("ignores invalid and backwards samples without corrupting the valid baseline", () => {
    const clock = new FixedStepClock();
    expect(clock.advance(Number.NaN).steps).toBe(0);
    expect(clock.advance(100).steps).toBe(0);
    expect(clock.advance(Number.POSITIVE_INFINITY).steps).toBe(0);
    expect(clock.advance(90).steps).toBe(0);
    expect(clock.advance(100 + FIXED_STEP_SECONDS * 1000).steps).toBe(1);

    clock.pause();
    clock.resume(Number.NaN);
    expect(clock.advance(1_000).steps).toBe(0); // First valid post-resume sample primes only.
    expect(clock.advance(1_000 + FIXED_STEP_SECONDS * 1000).steps).toBe(1);
  });
});
