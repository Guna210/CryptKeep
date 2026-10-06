import { createMaterialLibrary } from "../../src/render/materials";
import { createWorldRenderer, type WorldRenderer } from "../../src/render/renderer";
import { generateFloor, type GeneratedFloor } from "../../src/dungeon/generate";
import { createRenderedFloor, type RenderedFloor } from "../../src/render/floor";

declare global { interface Window { floorRendererFixture: { replace(seed:string): void; cycle(count:number): unknown[]; dispose(): void; active(): unknown } } }
const host = document.querySelector<HTMLElement>("#fixture")!;
const canvas = document.createElement("canvas"); host.append(canvas);
const context = canvas.getContext("webgl2"); if (!context) throw new Error("WebGL2 unavailable");
const renderer = createWorldRenderer(canvas, { context, resizeTarget: host, includeDiagnosticFixture: false });
renderer.scene.background!.set?.(0x18202a);
let generated: GeneratedFloor | null = null;
let library: ReturnType<typeof createMaterialLibrary> | null = null;
let floor: RenderedFloor | null = null;
function replace(seed: string) {
  const nextGenerated = generateFloor({ campaignSeed: seed, floorNumber: 1 });
  const nextLibrary = createMaterialLibrary(seed, 16);
  let nextFloor: RenderedFloor;
  try { nextFloor = createRenderedFloor(nextGenerated.plan, nextLibrary, { ceilingVisible: false }); }
  catch (error) { nextLibrary.dispose(); throw error; }
  if (floor) { floor.dispose(); }
  if (generated?.plan && library) library.dispose();
  generated = nextGenerated; library = nextLibrary; floor = nextFloor;
  renderer.scene.add(floor.root);
  const centerX = generated.plan.width;
  const centerZ = generated.plan.height;
  renderer.camera.position.set(centerX, 55, centerZ + 15);
  renderer.camera.lookAt(centerX, 0, centerZ);
  renderer.camera.far = 140; renderer.camera.updateProjectionMatrix();
  renderer.renderer.render(renderer.scene, renderer.camera);
  return window.floorRendererFixture.active();
}
window.floorRendererFixture = {
  replace,
  cycle(count) { const reports=[]; for(let i=0;i<count;i++) reports.push(replace(i%2?"CK-01-07-seed-a":"CK-01-07-seed-b")); return reports; },
  active() { return { seed: generated?.diagnostics.baseFloorSeed, hash: generated?.contentHash, width: generated?.plan.width, height: generated?.plan.height, counts: floor?.counts, rendererCounts: renderer.getResourceCounts(), rootCount: renderer.scene.children.filter((child)=>child.type==="Group").length, walkable: generated?.plan.tiles.filter((t)=>t===1).length }; },
  dispose() { floor?.dispose(); floor=null; library?.dispose(); library=null; renderer.dispose(); canvas.remove(); },
};
replace("CK-01-07-seed-a");
