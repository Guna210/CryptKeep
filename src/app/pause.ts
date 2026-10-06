import type { PointerCaptureReason, PointerCaptureState } from "./pointer-capture";

export type PausePhase = "loading" | "available" | "playing" | "paused" | "requesting" | "waiting" | "unavailable" | "unsupported" | "disposed";
export interface PauseSnapshot {
  readonly phase: PausePhase;
  readonly reason: string;
}

const REASONS: Readonly<Partial<Record<PointerCaptureReason, string>>> = {
  pause: "Paused. Resume when you are ready.",
  blur: "Paused because the window lost focus.",
  hidden: "Paused while this page was hidden.",
  "pointer-lock-lost": "Mouse capture ended. Resume to continue.",
  "floor-loading": "Loading the dungeon…",
  denied: "Mouse capture was denied. Choose Resume to try again.",
};

/** High-level session state. Native capture and the fixed simulation clock stay with PlayerSession/FloorSession. */
export class PauseCoordinator {
  private phase: PausePhase;
  private reason = "Preparing the dungeon…";
  private hasPlayed = false;
  private disposed = false;
  constructor(unsupported = false, private readonly changed: (snapshot: PauseSnapshot) => void = () => {}) {
    this.phase = unsupported ? "unsupported" : "loading";
    this.publish();
  }
  snapshot(): PauseSnapshot { return Object.freeze({ phase: this.phase, reason: this.reason }); }
  loading(): void { if (this.disposed) return; this.phase = "loading"; this.reason = "Loading the dungeon…"; this.publish(); }
  unavailable(): void { if (this.disposed || this.phase === "unsupported") return; this.phase = "unavailable"; this.reason = "Dungeon unavailable. Enter a seed and generate a floor to begin."; this.publish(); }
  ready(): void { if (this.disposed || this.phase === "unsupported") return; this.phase = this.hasPlayed ? "paused" : "available"; this.reason = this.hasPlayed ? "Dungeon ready. Resume when you are ready." : "Dungeon ready. Choose Explore dungeon to begin."; this.publish(); }
  resumeRequested(): void { if (this.disposed || (this.phase !== "paused" && this.phase !== "available")) return; this.phase = "requesting"; this.reason = "Requesting mouse capture…"; this.publish(); }
  captureChanged(state: PointerCaptureState, reason?: PointerCaptureReason): void {
    if (this.disposed || this.phase === "loading" || this.phase === "unavailable" || this.phase === "unsupported") return;
    if (state === "captured") { this.hasPlayed = true; this.phase = "playing"; this.reason = "Playing."; }
    else if (state === "requesting") { this.phase = "requesting"; this.reason = "Requesting mouse capture…"; }
    else if (state === "waiting") { this.phase = "waiting"; this.reason = "Waiting for the previous mouse request to finish. Choose Resume again when it settles."; }
    else if (state === "failed") { this.phase = "paused"; this.reason = REASONS[reason ?? "denied"] ?? REASONS.denied!; }
    else if (state === "idle") { this.phase = this.hasPlayed ? "paused" : "available"; this.reason = REASONS[reason ?? "pause"] ?? REASONS.pause!; }
    this.publish();
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.phase = "disposed"; this.reason = ""; this.publish(); }
  private publish(): void { try { this.changed(this.snapshot()); } catch { /* UI observers cannot interrupt lifecycle cleanup. */ } }
}
