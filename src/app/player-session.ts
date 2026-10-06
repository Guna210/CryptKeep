import { FIXED_STEP_SECONDS } from "../core/clock";
import { InputSampler } from "../core/input";
import { applyMouseLook } from "../player/look";
import { stepLocomotion } from "../player/movement";
import { moveCircleOnGrid } from "../player/collision";
import { createPlayerState, type PlayerState } from "../player/state";
import type { WorldRenderer } from "../render/renderer";
import type { RoleFloorPlan } from "../dungeon/roles";
import type { FloorSession } from "./floor-session";
import { createPointerCapture, type PointerCapture, type PointerCaptureState } from "./pointer-capture";

const KEY_ACTIONS: Readonly<Record<string, "moveForward" | "moveBackward" | "moveLeft" | "moveRight" | "primary" | "secondary" | "interact" | "heal" | "slotOne" | "slotTwo" | "inventory" | "map">> = {
  w:"moveForward", W:"moveForward", s:"moveBackward", S:"moveBackward", a:"moveLeft", A:"moveLeft", d:"moveRight", D:"moveRight",
  e:"interact", E:"interact", q:"heal", Q:"heal", "1":"slotOne", "2":"slotTwo", i:"inventory", I:"inventory", Tab:"map",
};

export interface PlayerSessionSnapshot {
  readonly pose: PlayerState["pose"] | null;
  readonly velocity: PlayerState["velocity"] | null;
  readonly radius: number;
  readonly cameraHeight: number;
  readonly active: boolean;
  readonly capture: PointerCaptureState;
  readonly lastSample: ReturnType<InputSampler["sample"]> | null;
}

/** App-lifetime owner for native input, player simulation and camera presentation. */
export class PlayerSession {
  readonly input = new InputSampler();
  readonly capture: PointerCapture;
  private state: PlayerState | null = null;
  private plan: RoleFloorPlan | null = null;
  private previous: PlayerState["pose"] | null = null;
  private active = false;
  private disposed = false;
  private lastSample: ReturnType<InputSampler["sample"]> | null = null;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (this.capture.state !== "captured" || !this.active) return;
    const action = KEY_ACTIONS[event.key];
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return;
    this.input.press(action);
  };
  private readonly onFocusIn = (event: FocusEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !(target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (this.capture.state === "captured" || this.capture.state === "requesting" || this.capture.state === "waiting") {
      this.release("pause");
    }
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.capture.state !== "captured") return;
    const action = KEY_ACTIONS[event.key];
    if (action) { event.preventDefault(); this.input.release(action); }
  };
  private readonly onMouseDown = (event: MouseEvent): void => {
    if (this.capture.state !== "captured" || !this.active) return;
    if (event.button === 0) this.input.press("primary");
    if (event.button === 2) this.input.press("secondary");
  };
  private readonly onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) this.input.release("primary");
    if (event.button === 2) this.input.release("secondary");
  };

  constructor(private readonly floor: FloorSession, private readonly world: WorldRenderer, private readonly surface: HTMLElement,
    private readonly onCaptureChange: (state: PointerCaptureState) => void = () => {}) {
    this.capture = createPointerCapture(surface, this.input, { onStateChange: (state, reason) => {
      if (state !== "captured") {
        this.input.clearInput(state === "failed" ? "pointer-lock-lost" : "pause");
        this.active = false;
        this.stopMotion();
        this.floor.pause(reason ?? "pause");
      }
      else this.active = !!this.state;
      this.onCaptureChange(state);
    } });
    surface.ownerDocument.addEventListener("keydown", this.onKeyDown);
    surface.ownerDocument.addEventListener("focusin", this.onFocusIn);
    surface.ownerDocument.addEventListener("keyup", this.onKeyUp);
    surface.ownerDocument.addEventListener("mousedown", this.onMouseDown);
    surface.ownerDocument.addEventListener("mouseup", this.onMouseUp);
  }

  async load(seed: string) {
    this.active = false;
    this.capture.release("floor-loading");
    this.floor.pause("floor-loading");
    const generated = await this.floor.load(seed);
    if (this.disposed) throw new Error("Player session is disposed");
    this.plan = generated.plan;
    const created = createPlayerState(generated.plan);
    this.state = created.state;
    this.previous = created.state.pose;
    this.applyCamera(1);
    return generated;
  }

  requestFromGesture(): void {
    if (this.disposed || !this.state) return;
    this.capture.requestFromGesture();
  }

  resumeAfterCapture(timestampMs: number): void {
    if (this.disposed || this.capture.state !== "captured" || !this.state) return;
    this.active = true;
    this.floor.resume(timestampMs, "pointer-captured");
  }

  release(reason: "pause" | "blur" | "hidden" = "pause"): void {
    this.active = false;
    this.capture.release(reason);
    this.floor.pause(reason);
  }

  advance(timestampMs: number): Readonly<{steps:number;alpha:number;droppedTimeSeconds:number}> {
    const result = this.floor.advance(timestampMs);
    if (!this.state || !this.active || this.capture.state !== "captured") { this.applyCamera(result.alpha); return result; }
    for (let i = 0; i < result.steps; i++) {
      const command = this.input.sample();
      this.lastSample = Object.freeze({ ...command, movement:Object.freeze({...command.movement}), look:Object.freeze({...command.look}), held:Object.freeze([...command.held]), pressed:Object.freeze([...command.pressed]), released:Object.freeze([...command.released]), edges:Object.freeze(command.edges.map((edge)=>Object.freeze({...edge}))), cancellations:Object.freeze([...command.cancellations]) });
      let pose = this.state.pose;
      if (command.look.x !== 0 || command.look.y !== 0) pose = { ...pose, ...applyMouseLook(pose, command.look) };
      this.state = Object.freeze({ ...this.state, pose:Object.freeze(pose) });
      this.previous = this.state.pose;
      const step = stepLocomotion(this.state, command.movement, FIXED_STEP_SECONDS);
      const moved = moveCircleOnGrid(this.plan!, this.state.pose, step.displacement, this.state.radius);
      const velocity = Object.freeze({ x:moved.blockedX ? 0 : step.state.velocity.x, y:0, z:moved.blockedZ ? 0 : step.state.velocity.z });
      this.state = Object.freeze({ ...step.state, pose:Object.freeze({ ...step.state.pose, x:moved.position.x, z:moved.position.z }), velocity });
    }
    this.applyCamera(result.alpha);
    return result;
  }

  snapshot(): Readonly<PlayerSessionSnapshot> {
    return Object.freeze({ pose:this.state ? Object.freeze({...this.state.pose}) : null, velocity:this.state ? Object.freeze({...this.state.velocity}) : null,
      radius:this.state?.radius ?? 0.28, cameraHeight:this.state?.cameraHeight ?? 1.6, active:this.active, capture:this.capture.state,
      lastSample:this.lastSample ? Object.freeze({...this.lastSample}) : null });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.active = false; this.capture.dispose();
    const doc = this.surface.ownerDocument;
    doc.removeEventListener("keydown", this.onKeyDown); doc.removeEventListener("keyup", this.onKeyUp);
    doc.removeEventListener("focusin", this.onFocusIn);
    doc.removeEventListener("mousedown", this.onMouseDown); doc.removeEventListener("mouseup", this.onMouseUp);
    this.input.clearInput("pause"); this.state = null; this.plan = null; this.previous = null; this.lastSample = null;
  }

  private applyCamera(alpha: number): void {
    if (!this.state || !this.previous) return;
    const p = this.previous, c = this.state.pose, t = Math.max(0, Math.min(1, alpha));
    this.world.camera.position.set(p.x+(c.x-p.x)*t, c.y, p.z+(c.z-p.z)*t);
    this.world.camera.rotation.set(p.pitch+(c.pitch-p.pitch)*t, p.yaw+(c.yaw-p.yaw)*t, 0, "YXZ");
  }

  private stopMotion(): void {
    if (!this.state) return;
    this.state = Object.freeze({ ...this.state, velocity:Object.freeze({x:0,y:0,z:0}) });
    this.previous = this.state.pose;
  }
}
