import { FIXED_STEP_SECONDS } from "../core/clock";
import { InputSampler } from "../core/input";
import { applyMouseLook } from "../player/look";
import { stepLocomotion } from "../player/movement";
import { moveCircleOnGrid } from "../player/collision";
import { createPlayerState, createGridPlayerState, type PlayerState, type PlayerPoseInput } from "../player/state";
import { advanceResourceRegeneration, createResourceRegenTimers, recordStaminaSpend, type ResourceRegenTimers } from "../player/resources";
import { commitSprintMovement, decideSprint, hasSprintMovement } from "../player/sprint";
import { activateDash, advanceDash, cancelDash, createDashState, resolveDashCollision, type DashState } from "../player/dash";
import type { WorldRenderer } from "../render/renderer";
import type { RoleFloorPlan } from "../dungeon/roles";
import type { Grid } from "../dungeon/types";
import type { CombatSession } from "./combat-session";
import type { FloorSession } from "./floor-session";
import { createPointerCapture, type PointerCapture, type PointerCaptureReason, type PointerCaptureState } from "./pointer-capture";

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
  readonly resources: Readonly<{ health: PlayerState["health"]; stamina: PlayerState["stamina"]; mana: PlayerState["mana"] }> | null;
  readonly regenTimers: ResourceRegenTimers;
  readonly sprinting: boolean;
  readonly dash: DashState;
  readonly evading: boolean;
}

/** App-lifetime owner for native input, player simulation and camera presentation. */
export class PlayerSession {
  readonly input = new InputSampler();
  readonly capture: PointerCapture;
  private state: PlayerState | null = null;
  private plan: RoleFloorPlan | null = null;
  private grid: Grid | null = null;
  private combat: CombatSession | null = null;
  private previous: PlayerState["pose"] | null = null;
  private active = false;
  private disposed = false;
  private lastSample: ReturnType<InputSampler["sample"]> | null = null;
  private regenTimers = createResourceRegenTimers();
  private sprinting = false;
  private dash = createDashState();
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (this.capture.state !== "captured" || !this.active) return;
    if (event.code === "Space") { event.preventDefault(); if (!event.repeat) this.input.press("dash"); return; }
    if (event.code === "ShiftLeft") { event.preventDefault(); if (!event.repeat) this.input.press("sprint"); return; }
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
    if (event.code === "Space") { event.preventDefault(); this.input.release("dash"); return; }
    if (event.code === "ShiftLeft") { event.preventDefault(); this.input.release("sprint"); return; }
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
    private readonly onCaptureChange: (state: PointerCaptureState, reason?: PointerCaptureReason) => void = () => {}) {
    this.capture = createPointerCapture(surface, this.input, { onStateChange: (state, reason) => {
      if (state !== "captured") {
        this.combat?.cancel(reason === "blur" || reason === "hidden" ? reason : "pointer-lock-lost");
        this.input.clearInput(state === "failed" ? "pointer-lock-lost" : "pause");
        this.active = false;
        this.stopMotion();
        this.floor.pause(reason ?? "pause");
      }
      else this.active = !!this.state;
      this.onCaptureChange(state, reason);
    } });
    surface.ownerDocument.addEventListener("keydown", this.onKeyDown);
    surface.ownerDocument.addEventListener("focusin", this.onFocusIn);
    surface.ownerDocument.addEventListener("keyup", this.onKeyUp);
    surface.ownerDocument.addEventListener("mousedown", this.onMouseDown);
    surface.ownerDocument.addEventListener("mouseup", this.onMouseUp);
  }

  async load(seed: string) {
    this.active = false;
    this.combat?.cancel("floor-loading");
    this.capture.release("floor-loading");
    this.floor.pause("floor-loading");
    const generated = await this.floor.load(seed);
    if (this.disposed) throw new Error("Player session is disposed");
    this.plan = generated.plan;
    this.grid = generated.plan;
    const created = createPlayerState(generated.plan);
    this.state = created.state;
    this.regenTimers = createResourceRegenTimers();
    this.sprinting = false;
    this.dash = createDashState();
    this.previous = created.state.pose;
    this.applyCamera(1);
    return generated;
  }

  setCombatSession(combat:CombatSession|null):void { this.combat=combat; }
  loadDiagnostic(grid:Grid,pose:PlayerPoseInput):void {
    if (!import.meta.env.DEV && import.meta.env.MODE !== "test") throw new Error("Diagnostic player state is available only in development or tests");
    if (this.disposed) throw new Error("Player session is disposed");
    const created=createGridPlayerState(grid,pose);
    this.combat?.cancel("floor-loading");
    this.active=false; this.capture.release("floor-loading"); this.floor.pause("floor-loading");
    this.plan=null; this.grid=grid; this.state=created.state; this.regenTimers=createResourceRegenTimers(); this.sprinting=false;
    this.dash=createDashState(); this.previous=created.state.pose; this.lastSample=null; this.input.clearInput("floor-loading"); this.applyCamera(1);
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
    this.combat?.cancel(reason);
    this.capture.release(reason);
    this.floor.pause(reason);
  }

  advance(timestampMs: number): Readonly<{steps:number;alpha:number;droppedTimeSeconds:number}> {
    const result = this.floor.advance(timestampMs);
    if (!this.state || !this.active || this.capture.state !== "captured") { this.applyCamera(result.alpha); return result; }
    for (let i = 0; i < result.steps; i++) {
      const command = this.input.sample();
      this.lastSample = Object.freeze({ ...command, movement:Object.freeze({...command.movement}), look:Object.freeze({...command.look}), held:Object.freeze([...command.held]), pressed:Object.freeze([...command.pressed]), released:Object.freeze([...command.released]), edges:Object.freeze(command.edges.map((edge)=>Object.freeze({...edge}))), cancellations:Object.freeze([...command.cancellations]) });
      let pose: PlayerState["pose"] = this.state.pose;
      if (command.look.x !== 0 || command.look.y !== 0) pose = { ...pose, ...applyMouseLook(pose, command.look) };
      this.state = Object.freeze({ ...this.state, pose:Object.freeze(pose) });
      this.previous = this.state.pose;
      const activation = activateDash(this.dash, this.state.stamina, command.pressed.includes("dash"), this.state.pose.yaw, command.movement);
      let staminaSpent = activation.accepted;
      if (activation.accepted) {
        this.dash = activation.state;
        this.state = Object.freeze({ ...this.state, stamina:activation.stamina });
        this.regenTimers = recordStaminaSpend(this.regenTimers);
      }
      if (this.dash.active) {
        const dashStep = advanceDash(this.dash, FIXED_STEP_SECONDS);
        const moved = moveCircleOnGrid(this.grid!, this.state.pose, dashStep.displacement, this.state.radius);
        const resolvedDash = resolveDashCollision(dashStep, moved);
        this.dash = resolvedDash.state;
        this.sprinting = false;
        this.state = Object.freeze({...this.state, pose:Object.freeze({...this.state.pose,x:resolvedDash.position.x,z:resolvedDash.position.z}), velocity:resolvedDash.velocity});
        const weaponSpent=this.stepCombat(command,result.steps,i);
        const regenerated = advanceResourceRegeneration(this.state, this.regenTimers, FIXED_STEP_SECONDS, {staminaSpent:staminaSpent||weaponSpent,active:this.active});
        this.regenTimers = regenerated.timers;
        this.state=Object.freeze({...this.state,stamina:regenerated.stamina,mana:regenerated.mana});
        continue;
      }
      // Cooldown is gameplay simulation time and continues after the dash ends.
      this.dash = advanceDash(this.dash, FIXED_STEP_SECONDS).state;
      const sprint = decideSprint(this.state.stamina, FIXED_STEP_SECONDS, {
        held:command.held.includes("sprint"), active:this.active, axes:command.movement,
        secondaryHeld:command.held.includes("secondary"), healing:false, stanceRestricted:false,
      });
      let base = this.state;
      if (!sprint.eligible) base = capPlanarVelocity(base, 3.5);
      let locomotion = stepLocomotion(base, command.movement, FIXED_STEP_SECONDS, { maxSpeed:sprint.maximumSpeed });
      let moved = moveCircleOnGrid(this.grid!, base.pose, locomotion.displacement, base.radius);
      let sprintMovementCandidate = sprint.eligible;
      if (sprint.eligible && !hasSprintMovement(moved.appliedDisplacement)) {
        sprintMovementCandidate = false;
        base = capPlanarVelocity(base, 3.5);
        locomotion = stepLocomotion(base, command.movement, FIXED_STEP_SECONDS);
        moved = moveCircleOnGrid(this.grid!, base.pose, locomotion.displacement, base.radius);
      }
      const velocity = Object.freeze({ x:moved.blockedX ? 0 : locomotion.state.velocity.x, y:0, z:moved.blockedZ ? 0 : locomotion.state.velocity.z });
      const committed = commitSprintMovement(locomotion.state, sprintMovementCandidate ? sprint : { eligible:false, maximumSpeed:3.5, staminaCost:0 }, moved.appliedDisplacement);
      this.sprinting = committed.spent;
      this.state=Object.freeze({ ...committed.state, pose:Object.freeze({ ...locomotion.state.pose, x:moved.position.x, z:moved.position.z }), velocity });
      const weaponSpent=this.stepCombat(command,result.steps,i);
      const regenerated = advanceResourceRegeneration(this.state, this.regenTimers, FIXED_STEP_SECONDS, { staminaSpent:committed.spent || staminaSpent || weaponSpent, active:this.active });
      this.regenTimers = regenerated.timers;
      this.state = Object.freeze({ ...this.state, health:regenerated.health, stamina:regenerated.stamina, mana:regenerated.mana });
    }
    this.applyCamera(result.alpha);
    return result;
  }

  snapshot(): Readonly<PlayerSessionSnapshot> {
    return Object.freeze({ pose:this.state ? Object.freeze({...this.state.pose}) : null, velocity:this.state ? Object.freeze({...this.state.velocity}) : null,
      radius:this.state?.radius ?? 0.28, cameraHeight:this.state?.cameraHeight ?? 1.6, active:this.active, capture:this.capture.state,
      lastSample:this.lastSample ? Object.freeze({...this.lastSample}) : null,
      resources:this.state ? Object.freeze({ health:Object.freeze({...this.state.health}), stamina:Object.freeze({...this.state.stamina}), mana:Object.freeze({...this.state.mana}) }) : null,
      regenTimers:Object.freeze({...this.regenTimers}), sprinting:this.sprinting, dash:this.dash, evading:this.dash.active && this.dash.evasionRemainingSeconds > 0 });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.active = false; this.capture.dispose();
    const doc = this.surface.ownerDocument;
    doc.removeEventListener("keydown", this.onKeyDown); doc.removeEventListener("keyup", this.onKeyUp);
    doc.removeEventListener("focusin", this.onFocusIn);
    doc.removeEventListener("mousedown", this.onMouseDown); doc.removeEventListener("mouseup", this.onMouseUp);
    this.combat?.cancel("pause"); this.combat=null; this.input.clearInput("pause"); this.state = null; this.plan = null; this.grid=null; this.previous = null; this.lastSample = null;
  }

  private applyCamera(alpha: number): void {
    if (!this.state || !this.previous) return;
    const p = this.previous, c = this.state.pose, t = Math.max(0, Math.min(1, alpha));
    this.world.camera.position.set(p.x+(c.x-p.x)*t, c.y, p.z+(c.z-p.z)*t);
    this.world.camera.rotation.set(p.pitch+(c.pitch-p.pitch)*t, p.yaw+(c.yaw-p.yaw)*t, 0, "YXZ");
  }

  private stopMotion(): void {
    if (!this.state) return;
    this.sprinting = false;
    this.dash = cancelDash(this.dash);
    this.state = Object.freeze({ ...this.state, velocity:Object.freeze({x:0,y:0,z:0}) });
    this.previous = this.state.pose;
  }
  private stepCombat(command:ReturnType<InputSampler["sample"]>,steps:number,index:number):boolean {
    if(!this.combat||!this.state)return false;
    const before=this.state;
    const tick=this.floor.snapshot().tick-steps+index+1;
    const result=this.combat.step(before,command,FIXED_STEP_SECONDS,tick,this.regenTimers);
    this.state=Object.freeze({...before,stamina:result.stamina}); this.regenTimers=result.regenTimers;
    return result.staminaSpent;
  }
}

function capPlanarVelocity(player: PlayerState, maximum: number): PlayerState {
  const speed = Math.hypot(player.velocity.x, player.velocity.z);
  if (speed <= maximum || speed === 0) return player;
  const ratio = maximum / speed;
  return Object.freeze({ ...player, velocity:Object.freeze({ ...player.velocity, x:player.velocity.x * ratio, z:player.velocity.z * ratio }) });
}
