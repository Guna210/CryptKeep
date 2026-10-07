import { BoxGeometry, CylinderGeometry, DataTexture, Group, Mesh, MeshStandardMaterial, NearestFilter, SRGBColorSpace, UnsignedByteType, RGBAFormat } from "three";
import type { DamageableCombatant } from "../combat/types";

export interface TrainingTargetView { readonly root: Group; update(target: DamageableCombatant): void; dispose(): void }

/** Pixel-textured wood-and-iron dummy. Geometry/material/texture ownership stays with this view. */
export function createTrainingTargetView(target: DamageableCombatant): TrainingTargetView {
  const root = new Group();
  const data = new Uint8Array(16 * 16 * 4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const band = y < 2 || y > 13 || x < 2 || x > 13;
    const grain = ((x * 7 + y * 11) % 13) < 3;
    const color = band ? [55, 65, 69] : grain ? [111, 62, 35] : [155, 91, 49];
    const at = (y * 16 + x) * 4;
    data[at] = color[0]!; data[at + 1] = color[1]!; data[at + 2] = color[2]!; data[at + 3] = 255;
  }
  const texture = new DataTexture(data, 16, 16, RGBAFormat, UnsignedByteType);
  texture.magFilter = NearestFilter; texture.minFilter = NearestFilter; texture.colorSpace = SRGBColorSpace; texture.needsUpdate = true;
  const wood = new MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
  const iron = new MeshStandardMaterial({ color: 0x7b8584, roughness: 0.8, metalness: 0.25 });
  const dead = new MeshStandardMaterial({ color: 0x393536, roughness: 1 });
  const geometries = [new CylinderGeometry(0.13, 0.22, 1.05, 6), new BoxGeometry(0.58, 0.68, 0.34), new BoxGeometry(0.64, 0.12, 0.4), new CylinderGeometry(0.12, 0.12, 1.7, 5), new CylinderGeometry(0.21, 0.25, 0.34, 6), new BoxGeometry(0.8, 0.1, 0.14), new BoxGeometry(0.95, 0.13, 0.08), new BoxGeometry(0.9, 0.09, 0.09)];
  const mesh = (geometry: typeof geometries[number], material: MeshStandardMaterial, x: number, y: number, z: number) => { const value = new Mesh(geometry, material); value.position.set(x, y, z); root.add(value); return value; };
  const torso = mesh(geometries[1]!, wood, 0, 1.05, 0);
  mesh(geometries[0]!, wood, 0, 1.72, 0);
  mesh(geometries[2]!, iron, 0, 1.05, 0.19);
  const head = mesh(geometries[4]!, wood, 0, 1.82, 0);
  mesh(geometries[6]!, iron, 0, 2.28, 0);
  const barFillGeometry = geometries[7]!;
  const barFillMaterial = new MeshStandardMaterial({ color: 0x49d66b, roughness: 1 });
  const barFill = new Mesh(barFillGeometry, barFillMaterial); barFill.position.set(0, 2.28, 0.06); root.add(barFill);
  for (const x of [-0.2, 0.2]) {
    const arm = mesh(geometries[0]!, wood, x * 2, 1.12, 0); arm.scale.set(0.48, 0.72, 0.55); arm.rotation.z = x;
  }
  for (const x of [-0.14, 0.14]) { const leg = mesh(geometries[0]!, wood, x, 0.42, 0); leg.scale.set(0.56, 0.78, 0.7); }
  const label = mesh(geometries[5]!, iron, 0, 2.5, 0);
  let disposed = false;
  const update = (next: DamageableCombatant) => {
    if (disposed) throw new Error("Training target view is disposed");
    const ratio = next.health.maximum > 0 ? next.health.current / next.health.maximum : 0;
    barFill.scale.x = Math.max(0, ratio); barFill.position.x = -0.45 * (1 - ratio);
    barFillMaterial.color.set(ratio > 0.5 ? 0x49d66b : ratio > 0.2 ? 0xe6b642 : 0xe04b42);
    const isDead = next.health.current <= 0;
    torso.material = isDead ? dead : wood; head.material = isDead ? dead : wood;
    label.visible = !isDead;
    if (isDead) root.rotation.z = -Math.PI / 2;
  };
  update(target);
  return { root, update, dispose() { if (disposed) return; disposed = true; root.removeFromParent(); root.clear(); for (const geometry of geometries) geometry.dispose(); barFillMaterial.dispose(); wood.dispose(); iron.dispose(); dead.dispose(); texture.dispose(); } };
}
