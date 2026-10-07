import { AmbientLight, BoxGeometry, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { createCombatRoomFixture, TRAINING_PLAYER, TRAINING_TARGET_ID } from "../../src/debug/fixtures/combat-room";
import { createTrainingTargetView, type TrainingTargetView } from "../../src/render/training-target";
import type { CombatRoomFixture } from "../../src/debug/fixtures/combat-room";

declare global { interface Window { combatRoomFixture: { snapshot: () => ReturnType<CombatRoomFixture["snapshot"]>; queryTargets: () => ReturnType<CombatRoomFixture["queryTargets"]>; apply: (attackId: string, amount: number) => void; toggleWall: () => void; drawCalls: () => number; dispose: () => void; }; } }
const host = document.querySelector<HTMLElement>("#fixture")!;
const label = document.querySelector<HTMLOutputElement>("#label")!;
const variant = document.querySelector<HTMLOutputElement>("#variant")!;
const renderer = new WebGLRenderer({ antialias: false, alpha: false });
renderer.setPixelRatio(1); renderer.setSize(480, 270, false); renderer.outputColorSpace = "srgb";
renderer.domElement.setAttribute("aria-label", "DEV combat training room rendering"); renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%"; host.append(renderer.domElement);
const scene = new Scene(); scene.background = null;
scene.add(new AmbientLight(0xffffff, 1.1)); const light = new DirectionalLight(0xffd39b, 2.1); light.position.set(-3, 7, 4); scene.add(light);
const camera = new PerspectiveCamera(68, 16 / 9, 0.1, 50);
let room = createCombatRoomFixture(); let targetView: TrainingTargetView | null = null; let roomObjects: Mesh[] = []; let serial = 0;
const floorMaterial = new MeshStandardMaterial({ color: 0x51584f, roughness: 1 });
const wallMaterial = new MeshStandardMaterial({ color: 0x454a4b, roughness: 1 });
const floorGeometry = new BoxGeometry(2, 0.12, 2); const wallGeometry = new BoxGeometry(2, 3, 2);

function build(): void {
  for (const object of roomObjects) { scene.remove(object); }
  roomObjects = [];
  targetView?.dispose(); targetView = null;
  const snapshot = room.snapshot();
  for (let z = 0; z < snapshot.grid.height; z++) for (let x = 0; x < snapshot.grid.width; x++) {
    const solid = snapshot.grid.tiles[z * snapshot.grid.width + x] === 0;
    const mesh = new Mesh(solid ? wallGeometry : floorGeometry, solid ? wallMaterial : floorMaterial);
    mesh.position.set(x * 2 + 1, solid ? 1.5 : -0.06, z * 2 + 1); scene.add(mesh); roomObjects.push(mesh);
  }
  targetView = createTrainingTargetView(snapshot.target); targetView.root.position.set(9, 0, 9.9); scene.add(targetView.root);
  camera.position.set(snapshot.player.x, 1.6, snapshot.player.z); camera.lookAt(9, 1, 9.9); camera.updateProjectionMatrix();
  variant.textContent = snapshot.variant.toUpperCase();
  updateLabel(); renderer.render(scene, camera);
}
function updateLabel(): void {
  const state = room.snapshot(); label.textContent = `${state.label} · HP ${state.target.health.current} / ${state.target.health.maximum} · ${state.target.health.current > 0 ? "ALIVE" : "DEAD"}`;
  targetView?.update(state.target); renderer.render(scene, camera);
}
function apply(attackId: string, amount: number): void {
  room.applyDamage({ sourceId: TRAINING_PLAYER.id, targetId: TRAINING_TARGET_ID, attackId, damageType: "physical", amount }); updateLabel();
}
document.querySelector("#light")!.addEventListener("click", () => apply(`light-${serial++}`, 18));
document.querySelector("#heavy")!.addEventListener("click", () => apply(`heavy-${serial++}`, 54));
document.querySelector("#finish")!.addEventListener("click", () => apply(`finish-${serial++}`, 100));
document.querySelector("#wall")!.addEventListener("click", () => { room.dispose(); room = createCombatRoomFixture({ obstructed: variant.textContent !== "OBSTRUCTED" }); build(); });
window.combatRoomFixture = { snapshot: () => room.snapshot(), queryTargets: () => room.queryTargets(), apply, toggleWall: () => document.querySelector<HTMLButtonElement>("#wall")!.click(), drawCalls: () => renderer.info.render.calls, dispose() { room.dispose(); targetView?.dispose(); for (const object of roomObjects) scene.remove(object); renderer.dispose(); floorGeometry.dispose(); wallGeometry.dispose(); floorMaterial.dispose(); wallMaterial.dispose(); host.replaceChildren(); } };
build();
