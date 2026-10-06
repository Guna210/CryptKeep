import type { InputCancellationReason } from "../core/commands";
import type { InputSampler } from "../core/input";

export type PointerCaptureState = "idle" | "waiting" | "requesting" | "captured" | "failed" | "disposed";
export type PointerCaptureReason = InputCancellationReason | "denied";

export interface PointerCaptureOptions {
  readonly onStateChange?: (state: PointerCaptureState, reason?: PointerCaptureReason) => void;
  readonly document?: Document;
  readonly window?: Window;
}

interface NativeRequest {
  readonly id: number;
  mode: "unknown" | "promise" | "legacy";
  canceled: boolean;
  issued: boolean;
}

/** Owns pointer lock for one surface. Call requestFromGesture directly from a trusted click handler. */
export class PointerCapture {
  private readonly document: Document;
  private readonly window: Window;
  private readonly onStateChange?: PointerCaptureOptions["onStateChange"];
  private stateValue: PointerCaptureState = "idle";
  private disposed = false;
  private nextRequestId = 0;
  private outstanding: NativeRequest | null = null;
  private logicalRequestId: number | null = null;
  private retainedLegacyGuards = false;

  constructor(private readonly surface: HTMLElement, private readonly input: InputSampler, options: PointerCaptureOptions = {}) {
    this.document = options.document ?? surface.ownerDocument;
    this.window = options.window ?? this.document.defaultView ?? window;
    this.onStateChange = options.onStateChange;
    this.document.addEventListener("pointerlockchange", this.handleLockChange);
    this.document.addEventListener("pointerlockerror", this.handleLockError);
    this.document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.window.addEventListener("blur", this.handleBlur);
    this.window.addEventListener("keydown", this.handleKeyDown);
    this.surface.addEventListener("mousemove", this.handleMouseMove);
    this.surface.addEventListener("contextmenu", this.handleContextMenu);
  }

  get state(): PointerCaptureState { return this.stateValue; }

  /** Cancel pending input and release this surface's lock through the normal policy path. */
  release(reason: InputCancellationReason = "pause"): void {
    if (this.disposed) return;
    this.cancel(reason);
  }

  /** Invoke from a trusted click/Resume gesture. Failed capture never retries automatically. */
  requestFromGesture(): void {
    if (this.disposed || this.stateValue === "captured" || this.stateValue === "requesting") return;
    if (this.outstanding) {
      if (this.stateValue !== "waiting") this.setState("waiting");
      return;
    }

    const request = this.surface.requestPointerLock;
    if (typeof request !== "function") {
      this.failRequest();
      return;
    }

    const attempt: NativeRequest = {
      id: ++this.nextRequestId,
      mode: "unknown",
      canceled: false,
      issued: false,
    };
    this.outstanding = attempt;
    this.logicalRequestId = attempt.id;
    this.setState("requesting");
    // Observers can synchronously blur or dispose. Do not turn an expired gesture into a request.
    if (this.disposed || this.outstanding !== attempt || attempt.canceled || this.logicalRequestId !== attempt.id) {
      if (!attempt.issued && this.outstanding === attempt) this.outstanding = null;
      return;
    }

    attempt.issued = true;
    try {
      const result = request.call(this.surface);
      if (result && typeof (result as Promise<void>).then === "function") {
        attempt.mode = "promise";
        Promise.resolve(result).then(
          () => this.finishPromiseRequest(attempt, true),
          () => this.finishPromiseRequest(attempt, false),
        );
      } else {
        attempt.mode = "legacy";
        // A synchronous lockchange may have arrived before the call returned.
        if (this.document.pointerLockElement === this.surface) this.finishLegacyRequest(attempt, true);
      }
    } catch {
      this.finishSynchronousFailure(attempt);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    const pendingLegacy = this.outstanding?.mode === "legacy" && this.document.pointerLockElement !== this.surface;
    this.cancel("pointer-lock-lost");
    this.disposed = true;
    this.setState("disposed");
    this.removeOrdinaryListeners();
    if (pendingLegacy) {
      // Legacy void requests have no promise callback. Keep only terminal document guards.
      this.retainedLegacyGuards = true;
    } else {
      this.removeTerminalGuards();
      if (this.outstanding?.mode === "legacy") this.outstanding = null;
    }
    this.releaseOwnedLock();
  }

  private readonly handleLockChange = (): void => {
    const ownsLock = this.document.pointerLockElement === this.surface;
    if (this.disposed) {
      if (this.retainedLegacyGuards && ownsLock) {
        this.releaseOwnedLock();
        this.outstanding = null;
        this.finishLegacyGuardSettlement();
      }
      return;
    }

    const attempt = this.outstanding;
    if (ownsLock) {
      if (attempt && (attempt.canceled || this.logicalRequestId !== attempt.id)) {
        // A canceled native request can never reactivate input. A late owned acquisition is released.
        this.releaseOwnedLock();
        if (attempt.mode === "legacy") this.finishLegacyRequest(attempt, false);
        return;
      }
      if (!attempt && this.stateValue !== "captured") {
        this.releaseOwnedLock();
        return;
      }
      if (attempt || this.stateValue === "requesting") this.setState("captured");
      if (attempt?.mode === "legacy") this.finishLegacyRequest(attempt, true);
      return;
    }

    if (this.stateValue === "captured") {
      this.cancel("pointer-lock-lost");
      return;
    }
    // A null/global lock change cannot identify which promise or legacy request ended.
    // Keep the single physical request outstanding until its own promise/error/acquisition settles.
  };

  private readonly handleLockError = (): void => {
    const attempt = this.outstanding;
    if (this.disposed) {
      if (this.retainedLegacyGuards && attempt?.mode === "legacy") {
        this.outstanding = null;
        this.finishLegacyGuardSettlement();
      }
      return;
    }
    // Promise APIs settle through their own promise; a document-global error event has no request ID.
    if (attempt?.mode === "legacy") this.finishLegacyRequest(attempt, false);
  };

  private readonly handleBlur = (): void => {
    if (this.stateValue === "captured" || this.stateValue === "requesting" || this.stateValue === "waiting") {
      this.cancel("blur");
    }
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.document.visibilityState === "hidden" &&
      (this.stateValue === "captured" || this.stateValue === "requesting" || this.stateValue === "waiting")) {
      this.cancel("hidden");
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" &&
      (this.stateValue === "captured" || this.stateValue === "requesting" || this.stateValue === "waiting")) {
      this.cancel("pause");
    }
  };

  private readonly handleContextMenu = (event: MouseEvent): void => { event.preventDefault(); };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.disposed && this.stateValue === "captured" && this.document.pointerLockElement === this.surface) {
      this.input.addLookDelta(event.movementX, event.movementY);
    }
  };

  private cancel(reason: InputCancellationReason): void {
    this.input.clearInput(reason);
    const attempt = this.outstanding;
    if (attempt && this.logicalRequestId === attempt.id) attempt.canceled = true;
    this.logicalRequestId = null;
    this.releaseOwnedLock();
    if (!this.disposed) this.setState("idle", reason);
  }

  private finishPromiseRequest(attempt: NativeRequest, resolved: boolean): void {
    if (this.outstanding !== attempt) return;
    this.outstanding = null;
    const stillCurrent = !attempt.canceled && this.logicalRequestId === attempt.id && !this.disposed;
    if (!stillCurrent) {
      if (this.document.pointerLockElement === this.surface) this.releaseOwnedLock();
      if (this.disposed) return;
      if (this.stateValue === "waiting") this.setState("idle");
      return;
    }

    this.logicalRequestId = null;
    if (resolved && this.document.pointerLockElement === this.surface) {
      this.setState("captured");
    } else if (resolved) {
      this.failRequest();
    } else {
      this.failRequest();
    }
  }

  private finishLegacyRequest(attempt: NativeRequest, acquired: boolean): void {
    if (this.outstanding !== attempt) return;
    this.outstanding = null;
    const stillCurrent = !attempt.canceled && this.logicalRequestId === attempt.id && !this.disposed;
    if (stillCurrent && acquired && this.document.pointerLockElement === this.surface) {
      this.logicalRequestId = null;
      this.setState("captured");
    } else if (stillCurrent) {
      this.logicalRequestId = null;
      this.failRequest();
    } else {
      if (this.document.pointerLockElement === this.surface) this.releaseOwnedLock();
      if (this.disposed) this.finishLegacyGuardSettlement();
      else if (this.stateValue === "waiting") this.setState("idle");
    }
  }

  private finishSynchronousFailure(attempt: NativeRequest): void {
    if (this.outstanding !== attempt) return;
    this.outstanding = null;
    if (!attempt.canceled && this.logicalRequestId === attempt.id && !this.disposed) {
      this.logicalRequestId = null;
      this.failRequest();
    } else if (this.disposed) {
      this.finishLegacyGuardSettlement();
    } else if (this.stateValue === "waiting") {
      this.setState("idle");
    }
  }

  private failRequest(): void {
    this.logicalRequestId = null;
    this.input.clearInput("pointer-lock-lost");
    this.releaseOwnedLock();
    this.setState("failed", "denied");
  }

  private releaseOwnedLock(): void {
    if (this.document.pointerLockElement !== this.surface) return;
    try { this.document.exitPointerLock(); } catch { /* The browser may already be releasing it. */ }
  }

  private removeOrdinaryListeners(): void {
    this.document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.window.removeEventListener("blur", this.handleBlur);
    this.window.removeEventListener("keydown", this.handleKeyDown);
    this.surface.removeEventListener("mousemove", this.handleMouseMove);
    this.surface.removeEventListener("contextmenu", this.handleContextMenu);
  }

  private removeTerminalGuards(): void {
    this.document.removeEventListener("pointerlockchange", this.handleLockChange);
    this.document.removeEventListener("pointerlockerror", this.handleLockError);
    this.retainedLegacyGuards = false;
  }

  private finishLegacyGuardSettlement(): void {
    this.retainedLegacyGuards = false;
    this.removeTerminalGuards();
  }

  private setState(state: PointerCaptureState, reason?: PointerCaptureReason): void {
    this.stateValue = state;
    try { this.onStateChange?.(state, reason); } catch { /* Observers cannot prevent input cleanup or lock release. */ }
  }
}

export function createPointerCapture(surface: HTMLElement, input: InputSampler, options?: PointerCaptureOptions): PointerCapture {
  return new PointerCapture(surface, input, options);
}
