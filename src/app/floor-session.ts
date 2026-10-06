import { EventCollector, type EventSubscriber, type Unsubscribe } from "../core/events";
import { FixedStepClock } from "../core/clock";
import { normalizeSeed } from "../core/rng";
import { generateFloor, type GeneratedFloor } from "../dungeon/generate";
import { createMaterialLibrary, type MaterialLibrary } from "../render/materials";
import { createRenderedFloor, FLOOR_CELL_METERS, type RenderedFloor } from "../render/floor";
import { Tile } from "../dungeon/types";
import type { WorldRenderer } from "../render/renderer";

export interface FloorSessionSnapshot {
  readonly lifecycle: "loading" | "ready" | "paused" | "failed" | "disposed";
  readonly campaignSeed: string | null;
  readonly floorSeed: string | null;
  readonly floorNumber: number | null;
  readonly contentHash: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly roomCount: number;
  readonly walkableCount: number;
  readonly roleMarkers: Readonly<{ entry: Readonly<{x:number;z:number}>; boss: Readonly<{x:number;z:number}>; reward: Readonly<{x:number;z:number}>; exit: Readonly<{x:number;z:number}> }> | null;
  readonly attempts: number | null;
  readonly usedFallback: boolean | null;
  readonly currentFloors: 0 | 1;
  readonly tick: number;
  readonly alpha: number;
  readonly droppedTimeSeconds: number;
  readonly sessionErrors: number;
  readonly lastSessionError: string | null;
}
export interface FloorSessionOptions {
  readonly generate?: (seed:string, floorNumber:number) => GeneratedFloor;
  readonly createLibrary?: (seed:string) => MaterialLibrary;
  readonly createFloor?: (floor:GeneratedFloor, library:MaterialLibrary) => RenderedFloor;
  readonly yieldFrame?: () => Promise<void>;
}

/** Owns the active generated/rendered floor and the shared material library. */
export class FloorSession {
  private readonly generate: NonNullable<FloorSessionOptions["generate"]>;
  private readonly makeLibrary: NonNullable<FloorSessionOptions["createLibrary"]>;
  private readonly makeFloor: NonNullable<FloorSessionOptions["createFloor"]>;
  private readonly yieldFrame: NonNullable<FloorSessionOptions["yieldFrame"]>;
  private readonly clock = new FixedStepClock();
  private readonly events = new EventCollector();
  private readonly unsubs = new Set<Unsubscribe>();
  private request = 0;
  private disposed = false;
  private library: MaterialLibrary | null = null;
  private rendered: RenderedFloor | null = null;
  private generated: GeneratedFloor | null = null;
  private lifecycle: FloorSessionSnapshot["lifecycle"] = "loading";
  private campaignSeed: string | null = null;
  private tick = 0;
  private alpha = 0;
  private droppedTimeSeconds = 0;
  private readyEmitted = false;
  private sessionErrors = 0;
  private lastSessionError: string | null = null;

  constructor(private readonly world: WorldRenderer, options: FloorSessionOptions = {}) {
    this.generate = options.generate ?? ((seed, floor) => generateFloor({ campaignSeed: seed, floorNumber: floor }));
    this.makeLibrary = options.createLibrary ?? createMaterialLibrary;
    this.makeFloor = options.createFloor ?? ((floor, library) => createRenderedFloor(floor.plan, library, { ceilingVisible: false }));
    this.yieldFrame = options.yieldFrame ?? (() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
  }

  async load(seedInput: string): Promise<GeneratedFloor> {
    if (this.disposed) throw new Error("Floor session is disposed");
    const seed = normalizeSeed(seedInput);
    if (!seed) throw new RangeError("Enter a seed with 1 to 64 characters");
    const request = ++this.request;
    this.lifecycle = "loading";
    await this.yieldFrame();
    if (this.disposed || request !== this.request) throw new Error("Floor load superseded");

    let pendingLibrary: MaterialLibrary | null = null;
    let pendingFloor: RenderedFloor | null = null;
    try {
      const generated = this.generate(seed, 1);
      // Reuse one session-owned library across floor replacements.
      const library = this.library ?? (pendingLibrary = this.makeLibrary(seed));
      pendingFloor = this.makeFloor(generated, library);
      if (this.disposed || request !== this.request) {
        throw new Error("Floor load superseded");
      }
      const oldFloor = this.rendered;
      this.world.scene.add(pendingFloor.root);
      pendingFloor.root.updateMatrixWorld(true);
      this.fitCamera(generated);
      if (pendingLibrary) {
        this.library = pendingLibrary;
        pendingLibrary = null;
      }
      this.rendered = pendingFloor;
      this.generated = generated;
      this.campaignSeed = seed;
      pendingFloor = null;
      if (oldFloor) this.cleanup(() => oldFloor.dispose());
      this.lifecycle = "ready";
      if (!this.readyEmitted) {
        this.readyEmitted = true;
        this.dispatch({ type: "session-ready" });
      }
      return generated;
    } catch (error) {
      if (pendingFloor) this.cleanup(() => pendingFloor!.dispose());
      if (pendingLibrary) this.cleanup(() => pendingLibrary!.dispose());
      if (!this.disposed && request === this.request) this.lifecycle = this.rendered ? "ready" : "failed";
      throw error;
    }
  }

  private fitCamera(floor: GeneratedFloor): void {
    const { width, height } = floor.plan;
    const cx = width * FLOOR_CELL_METERS / 2;
    const cz = height * FLOOR_CELL_METERS / 2;
    const span = Math.max(width * FLOOR_CELL_METERS, height * FLOOR_CELL_METERS);
    const distance = span * 0.78;
    this.world.camera.position.set(cx, distance * 0.8, cz + distance);
    this.world.camera.lookAt(cx, 0, cz);
    this.world.camera.near = 0.1;
    this.world.camera.far = Math.max(100, distance * 4);
    this.world.camera.updateProjectionMatrix();
  }

  advance(timestampMs: number): Readonly<{ steps:number; alpha:number; droppedTimeSeconds:number }> {
    if (this.disposed || this.clock.paused) return Object.freeze({ steps:0, alpha:this.alpha, droppedTimeSeconds:0 });
    const result = this.clock.advance(timestampMs);
    for (let i = 0; i < result.steps; i++) this.tick++;
    this.alpha = result.alpha;
    this.droppedTimeSeconds += result.droppedTimeSeconds;
    return Object.freeze({ ...result });
  }

  pause(reason = "hidden"): void {
    if (this.disposed || this.clock.paused) return;
    this.clock.pause(); this.lifecycle = "paused";
    this.dispatch({ type: "session-paused", reason });
  }
  resume(timestampMs: number, reason = "visible"): void {
    if (this.disposed || !this.clock.paused) return;
    this.clock.resume(timestampMs); this.lifecycle = this.rendered ? "ready" : "loading";
    this.dispatch({ type: "session-resumed", reason });
  }
  subscribe(subscriber: EventSubscriber): Unsubscribe {
    if (this.disposed) throw new Error("Floor session is disposed");
    const unsubscribe = this.events.subscribe(subscriber); this.unsubs.add(unsubscribe);
    return () => { unsubscribe(); this.unsubs.delete(unsubscribe); };
  }
  snapshot(): Readonly<FloorSessionSnapshot> {
    const p = this.generated?.plan;
    let walkableCount = 0;
    if (p) for (const tile of p.tiles) if (tile === Tile.Walkable) walkableCount++;
    const markers = p ? Object.freeze({ entry:Object.freeze({...p.roles.entry}), boss:Object.freeze({...p.roles.boss}), reward:Object.freeze({...p.roles.reward}), exit:Object.freeze({...p.roles.exit}) }) : null;
    return Object.freeze({ lifecycle:this.lifecycle, campaignSeed:this.campaignSeed, floorSeed:p?.floorSeed ?? null, floorNumber:p?.floorNumber ?? null,
      contentHash:this.generated?.contentHash ?? null, width:p?.width ?? null, height:p?.height ?? null, roomCount:p?.rooms.length ?? 0,
      walkableCount, roleMarkers:markers, attempts:this.generated?.diagnostics.attempts ?? null, usedFallback:this.generated?.diagnostics.usedFallback ?? null,
      currentFloors:this.rendered ? 1 : 0, tick:this.tick, alpha:this.alpha, droppedTimeSeconds:this.droppedTimeSeconds,
      sessionErrors:this.sessionErrors, lastSessionError:this.lastSessionError });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; ++this.request;
    this.dispatch({ type:"session-disposed" });
    const rendered = this.rendered; this.rendered = null;
    const library = this.library; this.library = null;
    this.cleanup(() => rendered?.dispose());
    this.cleanup(() => library?.dispose());
    for (const unsubscribe of this.unsubs) this.cleanup(unsubscribe);
    this.unsubs.clear();
    this.cleanup(() => this.events.dispose());
    this.generated = null; this.campaignSeed = null; this.lifecycle = "disposed";
  }
  private dispatch(event: {type:"session-ready"}|{type:"session-paused"|"session-resumed";reason:string}|{type:"session-disposed"}):void {
    try {
      this.events.beginTick(this.tick); this.events.emit(event); this.events.flush();
    } catch (error) {
      this.sessionErrors++;
      this.lastSessionError = this.describeError(error);
    }
  }
  private cleanup(action: () => void): void {
    try { action(); }
    catch (error) {
      this.sessionErrors++;
      this.lastSessionError = this.describeError(error);
    }
  }
  private describeError(error: unknown): string {
    if (error instanceof AggregateError) {
      const details = error.errors.map((cause) => cause instanceof Error ? cause.message : String(cause));
      return details.length ? `${error.message}: ${details.join("; ")}` : error.message;
    }
    return error instanceof Error ? error.message : String(error);
  }
}
