/** Fixed-step simulation clock. Timestamps are monotonic milliseconds; durations are seconds. */
export const FIXED_STEP_SECONDS = 1 / 60;
export const MAX_ACCUMULATED_SECONDS = 0.1;
export const MAX_STEPS_PER_ADVANCE = 6;

export interface ClockAdvance {
  /** Number of fixed simulation ticks available to the caller. */
  steps: number;
  /** Remaining fraction of a fixed tick, always finite and in [0, 1). */
  alpha: number;
  /** Wall time discarded during this advance, in seconds. */
  droppedTimeSeconds: number;
}

const EMPTY_ADVANCE: ClockAdvance = { steps: 0, alpha: 0, droppedTimeSeconds: 0 };
// Accommodate normal floating-point error when timestamps represent exact tick boundaries.
const BOUNDARY_EPSILON_SECONDS = 1e-10;

/**
 * Accumulates caller-supplied monotonic timestamps without depending on RAF, DOM, or Three.js.
 * The caller runs `steps` fixed updates and may render using `alpha`. Invalid and backwards
 * timestamps are ignored and do not alter the last valid baseline.
 */
export class FixedStepClock {
  private lastTimestampMs: number | undefined;
  private accumulatorSeconds = 0;
  private isPaused = false;

  advance(timestampMs: number): ClockAdvance {
    if (this.isPaused || !Number.isFinite(timestampMs)) return { ...EMPTY_ADVANCE };

    if (this.lastTimestampMs === undefined) {
      this.lastTimestampMs = timestampMs;
      return { ...EMPTY_ADVANCE };
    }

    if (timestampMs < this.lastTimestampMs) return { ...EMPTY_ADVANCE };

    const elapsedSeconds = (timestampMs - this.lastTimestampMs) / 1000;
    this.lastTimestampMs = timestampMs;

    const totalSeconds = this.accumulatorSeconds + elapsedSeconds;
    const acceptedSeconds = Math.min(totalSeconds, MAX_ACCUMULATED_SECONDS);
    let droppedTimeSeconds = totalSeconds - acceptedSeconds;
    this.accumulatorSeconds = acceptedSeconds;

    let steps = Math.floor((this.accumulatorSeconds + BOUNDARY_EPSILON_SECONDS) / FIXED_STEP_SECONDS);
    steps = Math.min(steps, MAX_STEPS_PER_ADVANCE);
    this.accumulatorSeconds -= steps * FIXED_STEP_SECONDS;

    // Avoid negative residues introduced by the boundary epsilon.
    if (this.accumulatorSeconds < 0) this.accumulatorSeconds = 0;
    // This is defensive against future changes to the cap or step size.
    if (steps === MAX_STEPS_PER_ADVANCE && this.accumulatorSeconds >= FIXED_STEP_SECONDS) {
      const retainedSeconds = Math.min(this.accumulatorSeconds, FIXED_STEP_SECONDS - BOUNDARY_EPSILON_SECONDS);
      droppedTimeSeconds += this.accumulatorSeconds - retainedSeconds;
      this.accumulatorSeconds = retainedSeconds;
    }

    const alpha = this.accumulatorSeconds / FIXED_STEP_SECONDS;
    return { steps, alpha: Math.min(alpha, 1 - Number.EPSILON), droppedTimeSeconds };
  }

  /** Stop producing ticks. Time passed while paused is never accumulated. */
  pause(): void {
    this.isPaused = true;
  }

  /** Resume at this monotonic millisecond timestamp, establishing a fresh timing baseline. */
  resume(timestampMs: number): void {
    this.isPaused = false;
    this.accumulatorSeconds = 0;
    this.lastTimestampMs = Number.isFinite(timestampMs) ? timestampMs : undefined;
  }

  get paused(): boolean {
    return this.isPaused;
  }
}
