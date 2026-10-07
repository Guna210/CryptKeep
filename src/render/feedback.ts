import type { EventBatch, EventCollector, Unsubscribe } from "../core/events";

export const HIT_MARKER_SECONDS = 0.15;
export const HURT_FEEDBACK_SECONDS = 0.25;
export const HURT_OPACITY_MAX = 0.22;

export interface FeedbackSnapshot {
  readonly hitMarkerSeconds: number;
  readonly hurtSeconds: number;
  readonly flashEnabled: boolean;
}

/** Caller-driven simulation-time feedback. Owns only its EventCollector subscription. */
export class CombatFeedback {
  private hitSeconds = 0;
  private hurtSeconds = 0;
  private enabled: boolean;
  private readonly unsubscribe: Unsubscribe;
  private disposed = false;

  constructor(collector: EventCollector, private readonly playerId: string, options: { damageFlashesEnabled?: boolean } = {}, private readonly onChange?: (snapshot: FeedbackSnapshot) => void) {
    if (!playerId) throw new TypeError("playerId is required");
    this.enabled = options.damageFlashesEnabled ?? true;
    this.unsubscribe = collector.subscribe((batch) => this.consume(batch));
  }

  setDamageFlashesEnabled(enabled: boolean): void {
    this.assertActive(); this.enabled = enabled;
  }
  advance(dtSeconds: number, paused = false): FeedbackSnapshot {
    this.assertActive();
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) throw new RangeError("feedback dt must be finite nonnegative seconds");
    if (!paused) { this.hitSeconds = Math.max(0, this.hitSeconds - dtSeconds); this.hurtSeconds = Math.max(0, this.hurtSeconds - dtSeconds); }
    return this.snapshot();
  }
  snapshot(): FeedbackSnapshot {
    this.assertActive();
    return Object.freeze({ hitMarkerSeconds: this.hitSeconds, hurtSeconds: this.hurtSeconds, flashEnabled: this.enabled });
  }
  reset(): void { this.assertActive(); this.hitSeconds = 0; this.hurtSeconds = 0; }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.unsubscribe(); this.hitSeconds = 0; this.hurtSeconds = 0; }

  private consume(batch: EventBatch): void {
    if (this.disposed) return;
    for (const event of batch) {
      if (event.type !== "damage-applied") continue;
      if (event.sourceId === this.playerId && event.targetId !== this.playerId) this.hitSeconds = HIT_MARKER_SECONDS;
      if (event.targetId === this.playerId) this.hurtSeconds = HURT_FEEDBACK_SECONDS;
    }
    this.onChange?.(this.snapshot());
  }
  private assertActive(): void { if (this.disposed) throw new Error("combat feedback is disposed"); }
}

export function hurtOpacity(snapshot: FeedbackSnapshot): number {
  if (!snapshot.flashEnabled || snapshot.hurtSeconds <= 0) return 0;
  return HURT_OPACITY_MAX * Math.min(1, snapshot.hurtSeconds / HURT_FEEDBACK_SECONDS);
}
