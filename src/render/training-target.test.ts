import { afterEach, describe, expect, it, vi } from "vitest";
import { BufferGeometry, Scene } from "three";
import { createResource } from "../player/resources";
import { createTrainingTargetView } from "./training-target";

describe("training target rendering", () => {
  afterEach(() => vi.restoreAllMocks());
  it("renders health state and a visible death pose, then releases only owned resources once", () => {
    const geometryDisposals = vi.spyOn(BufferGeometry.prototype, "dispose");
    const scene = new Scene();
    const alive = Object.freeze({ id: "dummy", team: "enemies", health: createResource(100, 100) });
    const view = createTrainingTargetView(alive);
    scene.add(view.root);
    expect(view.root.visible).toBe(true);
    expect(view.root.children.length).toBeGreaterThan(5);
    view.update(Object.freeze({ ...alive, health: createResource(0, 100) }));
    expect(view.root.rotation.z).toBeCloseTo(-Math.PI / 2);
    expect(view.root.visible).toBe(true);
    view.dispose(); view.dispose();
    expect(geometryDisposals).toHaveBeenCalledTimes(8);
    expect(scene.children).toHaveLength(0);
  });
});
