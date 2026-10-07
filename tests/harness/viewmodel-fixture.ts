import { createWorldRenderer, type WorldRenderer } from "../../src/render/renderer";
import { createSwordViewmodel, type ViewmodelController } from "../../src/render/viewmodel";
import { createSwordState, type SwordState } from "../../src/weapons/sword";

declare global {
  interface Window {
    swordFixture: {
      renderer: WorldRenderer;
      model: ViewmodelController;
      setState(state: SwordState): void;
      dispose(): { contextLost: boolean; cameraKept: boolean; rootRemoved: boolean };
    };
  }
}
const host = document.querySelector<HTMLElement>("#fixture")!;
const canvas = document.createElement("canvas");
host.append(canvas);
const context = canvas.getContext("webgl2");
if (!context) throw new Error("WebGL 2 unavailable in viewmodel fixture");
const renderer = createWorldRenderer(canvas, { context, resizeTarget: host, includeDiagnosticFixture: false });
const model = createSwordViewmodel(renderer);
const initialChildren = renderer.camera.children.length;
window.swordFixture = {
  renderer, model,
  setState(state) { model.update(state); renderer.renderer.render(renderer.scene, renderer.camera); },
  dispose() {
    model.dispose(); model.dispose();
    const rootRemoved = !renderer.camera.children.includes(model.root);
    const cameraKept = renderer.scene.children.includes(renderer.camera);
    renderer.dispose();
    return { contextLost: context.isContextLost(), cameraKept, rootRemoved: rootRemoved && initialChildren === 1 };
  },
};
const idle = createSwordState();
model.update(idle);
renderer.renderer.render(renderer.scene, renderer.camera);
document.querySelector("#state")!.textContent = "fixture ready";
