import { describe, expect, it, vi } from "vitest";
import { Group, PerspectiveCamera, Scene } from "three";
import { generateFloor } from "../dungeon/generate";
import type { EventBatch } from "../core/events";
import { createMaterialLibrary } from "../render/materials";
import { FloorSession, type FloorSessionOptions } from "./floor-session";
import type { WorldRenderer } from "../render/renderer";

function harness(options: FloorSessionOptions = {}) {
  const scene = new Scene();
  const world = { scene, camera: new PerspectiveCamera(), renderer: {} } as unknown as WorldRenderer;
  return { scene, session: new FloorSession(world, { yieldFrame: async () => {}, ...options }) };
}

describe("FloorSession", () => {
  it("loads generated floors, replaces once, and exposes detached deterministic diagnostics", async () => {
    const disposed: number[] = [];
    const { scene, session } = harness({ createFloor: (floor) => {
      const root = new Group();
      return { root, counts: { geometries: 0, instances: 0, markers: 4 }, dispose: vi.fn(() => { disposed.push(floor.plan.floorNumber); root.removeFromParent(); }) };
    } });
    const events: string[] = [];
    session.subscribe((batch) => events.push(...batch.map((event) => event.type)));
    const one = await session.load(" one ");
    expect(session.snapshot().contentHash).toBe(one.contentHash);
    const firstHash = one.contentHash;
    await session.load("two");
    expect(session.snapshot().contentHash).not.toBe(firstHash);
    expect(session.snapshot().currentFloors).toBe(1);
    expect(scene.children.filter((child) => child.type === "Group")).toHaveLength(1);
    expect(disposed).toEqual([1]);
    expect(events).toEqual(["session-ready"]);
    expect(Object.isFrozen(session.snapshot().roleMarkers?.entry)).toBe(true);
    session.dispose(); session.dispose();
    expect(disposed).toEqual([1, 1]);
    expect(events.at(-1)).toBe("session-disposed");
  });

  it("rejects invalid input before generation and retains the previous floor on generator failure", async () => {
    const generate = vi.fn((seed: string) => {
      if (seed === "bad") throw new Error("injected generation failure");
      return generateFloor({ campaignSeed: seed, floorNumber: 1 });
    });
    const { session } = harness({ generate });
    await expect(session.load("   ")).rejects.toThrow(/seed/i);
    expect(generate).not.toHaveBeenCalled();
    await session.load("good");
    const previousHash = session.snapshot().contentHash;
    await expect(session.load("bad")).rejects.toThrow("injected generation failure");
    expect(session.snapshot().contentHash).toBe(previousHash);
    expect(session.snapshot().currentFloors).toBe(1);
    session.dispose();
  });

  it("keeps a committed floor and library live when ready observers throw, and emits ready once", async () => {
    const base = createMaterialLibrary("observer");
    const libraryDispose = vi.fn(() => base.dispose());
    const library = { ...base, dispose: libraryDispose };
    const floorDisposals: number[] = [];
    const { scene, session } = harness({
      createLibrary: () => library,
      createFloor: (floor) => {
        const root = new Group();
        return { root, counts: { geometries: 0, instances: 0, markers: 4 }, dispose: vi.fn(() => { floorDisposals.push(floor.plan.floorNumber); root.removeFromParent(); }) };
      },
    });
    const readyObserver = vi.fn(() => { throw new Error("ready observer failed"); });
    session.subscribe((batch) => { if (batch.some((event) => event.type === "session-ready")) readyObserver(); });

    await expect(session.load("first")).resolves.toBeDefined();
    expect(readyObserver).toHaveBeenCalledTimes(1);
    expect(libraryDispose).not.toHaveBeenCalled();
    expect(session.snapshot().currentFloors).toBe(1);
    expect(session.snapshot().sessionErrors).toBe(1);
    expect(session.snapshot().lastSessionError).toMatch(/ready observer failed/);

    await session.load("replacement");
    expect(readyObserver).toHaveBeenCalledTimes(1);
    expect(libraryDispose).not.toHaveBeenCalled();
    expect(floorDisposals).toEqual([1]);
    expect(scene.children.filter((child) => child.type === "Group")).toHaveLength(1);
    session.dispose();
    expect(floorDisposals).toEqual([1, 1]);
    expect(libraryDispose).toHaveBeenCalledTimes(1);
  });

  it("completes floor, library, and subscriber cleanup when disposed observers throw", async () => {
    const base = createMaterialLibrary("dispose-observer");
    const libraryDispose = vi.fn(() => base.dispose());
    const library = { ...base, dispose: libraryDispose };
    const floorDispose = vi.fn();
    const { session } = harness({
      createLibrary: () => library,
      createFloor: () => {
        const root = new Group();
        return { root, counts: { geometries: 0, instances: 0, markers: 4 }, dispose: vi.fn(() => { floorDispose(); root.removeFromParent(); }) };
      },
    });
    const delivered: string[] = [];
    const observer = vi.fn((batch: EventBatch) => {
      delivered.push(...batch.map((event) => event.type));
      if (batch.some((event) => event.type === "session-disposed")) throw new Error("dispose observer failed");
    });
    session.subscribe(observer);
    await session.load("dispose");
    session.dispose();
    session.dispose();
    expect(delivered).toEqual(["session-ready", "session-disposed"]);
    expect(floorDispose).toHaveBeenCalledTimes(1);
    expect(libraryDispose).toHaveBeenCalledTimes(1);
    expect(session.snapshot().currentFloors).toBe(0);
    expect(session.snapshot().lifecycle).toBe("disposed");
    expect(() => session.subscribe(() => {})).toThrow(/disposed/i);
  });

  it("preserves normalized Unicode seeds up to 64 code points", async () => {
    const seen: string[] = [];
    const { session } = harness({ generate: (seed) => {
      seen.push(seed);
      return generateFloor({ campaignSeed: seed, floorNumber: 1 });
    } });
    await session.load(`  e\u0301${"😀".repeat(63)}  `);
    expect(seen[0]).toBe(`é${"😀".repeat(63)}`);
    expect([...seen[0]!]).toHaveLength(64);
    expect(session.snapshot().campaignSeed).toBe(seen[0]);
    await expect(session.load(`a${"😀".repeat(64)}`)).rejects.toThrow(/64 Unicode code points/i);
    session.dispose();
  });

  it("latest request wins and pending completion after dispose cannot revive the session", async () => {
    const gates: Array<() => void> = [];
    const { session } = harness({ yieldFrame: () => new Promise<void>((resolve) => gates.push(resolve)) });
    const old = session.load("old");
    const latest = session.load("latest");
    gates[0]!();
    await expect(old).rejects.toThrow(/superseded/i);
    gates[1]!();
    await latest;
    expect(session.snapshot().campaignSeed).toBe("latest");
    const pending = session.load("pending");
    session.dispose();
    gates[2]!();
    await expect(pending).rejects.toThrow(/disposed|superseded/i);
    expect(session.snapshot().currentFloors).toBe(0);
    expect(session.snapshot().lifecycle).toBe("disposed");
  });

  it("bounds ticks and resets the pause baseline while emitting lifecycle events once", async () => {
    const { session } = harness();
    const batches: string[][] = [];
    session.subscribe((batch) => batches.push(batch.map((event) => event.type)));
    await session.load("clock");
    session.advance(0); session.advance(1000);
    expect(session.snapshot().tick).toBeLessThanOrEqual(6);
    expect(session.snapshot().droppedTimeSeconds).toBeGreaterThan(0);
    session.pause("blur"); session.pause("hidden");
    session.advance(5000);
    session.resume(5000, "focus"); session.resume(6000, "visible");
    session.advance(5000); session.advance(5017);
    expect(session.snapshot().tick).toBeLessThanOrEqual(7);
    expect(batches.flat()).toEqual(["session-ready", "session-paused", "session-resumed"]);
    session.dispose();
  });

  it("owns its material library once", async () => {
    const base = createMaterialLibrary("test");
    const dispose = vi.fn(() => base.dispose());
    const lib = { ...base, dispose };
    const { session } = harness({ createLibrary: () => lib });
    await session.load("one"); await session.load("two");
    expect(dispose).not.toHaveBeenCalled();
    session.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
