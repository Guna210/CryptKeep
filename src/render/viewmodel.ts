import type { SwordState } from "../weapons/sword";
import type { Group } from "three";
import type { WorldRenderer } from "./renderer";
import { attachSwordViewmodel, type SwordViewmodel } from "./weapons/sword";

/** Small owner adapter for a first-person model; it only reads simulation snapshots. */
export interface ViewmodelController {
  readonly root: Group;
  attach(): void;
  update(state: SwordState): void;
  detach(): void;
  dispose(): void;
}

export function createSwordViewmodel(world: Pick<WorldRenderer, "scene" | "camera">): ViewmodelController {
  const model: SwordViewmodel = attachSwordViewmodel(world);
  let disposed = false;
  return {
    root: model.root,
    attach() { if (!disposed) model.attach(); },
    update(state) { if (!disposed) model.update(state); },
    detach() { if (!disposed) model.detach(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      model.dispose();
    },
  };
}
