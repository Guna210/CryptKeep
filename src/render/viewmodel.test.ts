import { describe, expect, it, vi } from "vitest";
import { Group, Mesh, PerspectiveCamera, Scene } from "three";
import { createSwordState, cancelSword, type SwordState } from "../weapons/sword";
import type { WorldRenderer } from "./renderer";
import { createSwordViewmodel } from "./viewmodel";
import { getSwordPose } from "./weapons/sword";

const timing = Object.freeze({ windupSeconds: 0.1, activeSeconds: 0.16, recoverySeconds: 0.5 });
function state(phase: SwordState["phase"], elapsedSeconds: number, kind: "sword-light" | "sword-heavy" | null = null): SwordState {
  return Object.freeze({ ...createSwordState(), phase, elapsedSeconds, attackId: kind ? "attack-1" : null,
    committedKind: kind, committedDamage: kind === "sword-heavy" ? 42 : kind ? 18 : null,
    committedTiming: kind ? timing : null });
}

describe("sword viewmodel", () => {
  it("follows anticipation, the exact active window, and settles after recovery", () => {
    const charging = state("anticipation", 0.725);
    const before = JSON.stringify(charging);
    const chargePose = getSwordPose(charging);
    const activeLight = getSwordPose(state("active", 0.08, "sword-light"));
    const activeHeavy = getSwordPose(state("active", 0.08, "sword-heavy"));
    expect(chargePose.charge).toBe(0.5);
    expect(chargePose.active).toBe(false);
    expect(activeLight.active).toBe(true);
    expect(activeHeavy.rotation[2]).toBeGreaterThan(activeLight.rotation[2]);
    expect(activeHeavy.scale).toBeGreaterThan(activeLight.scale);
    expect(getSwordPose(state("recovery", 0.5, "sword-heavy")).position).toEqual(getSwordPose(createSwordState()).position);
    expect(JSON.stringify(charging)).toBe(before);
  });

  it("returns canceled simulation state to idle pose without charge residue", () => {
    const pending = state("anticipation", 0.9);
    const canceled = cancelSword(pending, "pause");
    expect(getSwordPose(canceled)).toEqual(getSwordPose(createSwordState()));
    expect(getSwordPose(canceled).charge).toBe(0);
  });

  it("attaches to the supplied camera and disposes only its own render resources idempotently", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const sibling = new Group(); camera.add(sibling);
    const world = { scene, camera } as Pick<WorldRenderer, "scene" | "camera">;
    const model = createSwordViewmodel(world);
    expect(scene.children).toContain(model.root);
    expect(camera.parent).toBeNull();
    expect(camera.children).toEqual([sibling]);
    const owned = model.root.children.slice();
    const disposals = owned.map((object) => {
      const part = object as Mesh;
      const geometryDispose = vi.fn();
      part.geometry.addEventListener("dispose", geometryDispose);
      const material = (part as any).material;
      const materialDispose = vi.fn();
      material.addEventListener("dispose", materialDispose);
      return { geometryDispose, materialDispose };
    });
    const texture = ((owned[0] as any).material.map);
    const textureDispose = vi.fn(); texture.addEventListener("dispose", textureDispose);
    model.detach();
    expect(camera.children).toEqual([sibling]);
    expect(scene.children).not.toContain(model.root);
    model.attach();
    model.update(state("active", 0, "sword-heavy"));
    model.dispose(); model.dispose();
    expect(camera.children).toEqual([sibling]);
    expect(scene.children).not.toContain(model.root);
    expect(camera.parent).toBeNull();
    expect(disposals.every((entry) => entry.geometryDispose.mock.calls.length === 1 && entry.materialDispose.mock.calls.length === 1)).toBe(true);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(camera.parent).toBeNull();
  });
});
