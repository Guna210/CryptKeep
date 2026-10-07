import {
  BoxGeometry, BufferGeometry, DataTexture, Group, Mesh, MeshStandardMaterial,
  NearestFilter, RGBAFormat, Shape, ShapeGeometry, SRGBColorSpace,
} from "three";
import type { WorldRenderer } from "../renderer";
import type { SwordState } from "../../weapons/sword";

export interface SwordViewmodel {
  readonly root: Group;
  attach(): void;
  update(state: SwordState): void;
  detach(): void;
  dispose(): void;
}

export interface SwordPose {
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
  readonly scale: number;
  readonly charge: number;
  readonly active: boolean;
}

/** Pure camera-space pose calculation. State is read only and the active phase owns the hit window. */
export function getSwordPose(state: SwordState): SwordPose {
  const idle: SwordPose = { position: [0.39, -0.34, -0.82], rotation: [-0.12, -0.42, -0.58], scale: 1, charge: 0, active: false };
  if (state.phase === "anticipation") {
    const charge = Math.max(0, Math.min(1, (state.elapsedSeconds - 0.25) / 0.95));
    const windup = Math.min(1, state.elapsedSeconds / 0.25);
    return { position: [0.39 + charge * 0.025, -0.34 - windup * 0.025, -0.82],
      rotation: [-0.12 - charge * 0.12, -0.42 + windup * 0.1, -0.58 - windup * 0.18], scale: 1 + charge * 0.05,
      charge, active: false };
  }
  if (state.phase === "windup") {
    const heavy = state.committedKind === "sword-heavy";
    const t = Math.min(1, state.elapsedSeconds / (state.committedTiming?.windupSeconds ?? 0.1));
    return { position: [0.39 + t * (heavy ? 0.045 : 0.025), -0.34 + t * 0.045, -0.82],
      rotation: [-0.12, -0.42, -0.58 - t * (heavy ? 0.5 : 0.36)], scale: heavy ? 1.06 : 1, charge: heavy ? 0.18 : 0, active: false };
  }
  if (state.phase === "active") {
    const heavy = state.committedKind === "sword-heavy";
    // Full broadside sweep begins at the exact simulation active-window boundary.
    const t = Math.min(1, state.elapsedSeconds / (state.committedTiming?.activeSeconds ?? 0.12));
    const sweep = Math.sin(t * Math.PI);
    return { position: [0.39 - sweep * (heavy ? 0.24 : 0.19), -0.34 + sweep * 0.07, -0.72],
      rotation: [-0.12 - sweep * 0.18, -0.42 + sweep * (heavy ? 0.42 : 0.35), -0.58 + sweep * (heavy ? 1.02 : 0.82)],
      scale: heavy ? 1.08 : 1, charge: heavy ? 0.22 : 0, active: true };
  }
  if (state.phase === "recovery") {
    const heavy = state.committedKind === "sword-heavy";
    const t = Math.min(1, state.elapsedSeconds / (state.committedTiming?.recoverySeconds ?? 0.3));
    const ease = (1 - t) ** 2;
    return { position: [idle.position[0] - ease * (heavy ? 0.08 : 0.045), idle.position[1] - ease * 0.035, idle.position[2]],
      rotation: [idle.rotation[0], idle.rotation[1], idle.rotation[2] + ease * (heavy ? 0.26 : 0.18)],
      scale: 1 + ease * (heavy ? 0.05 : 0), charge: 0, active: false };
  }
  return idle;
}

/** Attach a disposable camera-relative sword. The viewmodel never owns the scene, camera or renderer. */
export function attachSwordViewmodel(world: Pick<WorldRenderer, "scene" | "camera">): SwordViewmodel {
  const root = new Group();
  root.name = "sword-viewmodel";
  const texture = makeSwordTexture();
  const bladeMaterial = new MeshStandardMaterial({ map: texture, roughness: 0.42, metalness: 0.58, emissive: 0x000000 });
  const leatherMaterial = new MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0 });
  const goldMaterial = new MeshStandardMaterial({ map: texture, roughness: 0.65, metalness: 0.52 });
  const glowMaterial = new MeshStandardMaterial({ map: texture, roughness: 0.45, metalness: 0.1, emissive: 0x000000 });
  const geometries: BufferGeometry[] = [];
  const materials = [bladeMaterial, leatherMaterial, goldMaterial, glowMaterial];
  const mesh = (geometry: BufferGeometry, material: MeshStandardMaterial, name: string) => {
    geometries.push(geometry);
    const part = new Mesh(geometry, material);
    part.name = name;
    root.add(part);
    return part;
  };
  const bladeShape = new Shape();
  bladeShape.moveTo(-0.055, 0.02); bladeShape.lineTo(0.055, 0.02); bladeShape.lineTo(0.052, 0.56);
  bladeShape.lineTo(0, 0.73); bladeShape.lineTo(-0.052, 0.56); bladeShape.closePath();
  const blade = mesh(new ShapeGeometry(bladeShape), bladeMaterial, "pixel-steel-blade");
  blade.position.z = 0.01;
  mesh(new BoxGeometry(0.31, 0.055, 0.075), goldMaterial, "crossguard").position.y = -0.015;
  mesh(new BoxGeometry(0.085, 0.31, 0.085), leatherMaterial, "wrapped-grip").position.y = -0.19;
  mesh(new BoxGeometry(0.14, 0.095, 0.095), goldMaterial, "pommel").position.y = -0.36;
  const charge = mesh(new BoxGeometry(0.16, 0.17, 0.045), glowMaterial, "charge-rune");
  charge.position.set(0, 0.34, 0.035);
  charge.visible = false;

  let detached = false;
  let disposed = false;
  const attach = () => {
    if (detached || disposed) return;
    world.camera.add(root);
    detached = true;
  };
  attach();
  return {
    root,
    attach,
    update(state) {
      if (disposed) return;
      const pose = getSwordPose(state);
      root.position.set(...pose.position);
      root.rotation.set(...pose.rotation);
      root.scale.setScalar(pose.scale);
      charge.visible = pose.charge > 0;
      const glow = pose.charge * 0.8;
      glowMaterial.emissive.setRGB(0.06 * glow, 0.42 * glow, 0.62 * glow);
      bladeMaterial.emissive.setRGB(pose.active ? (state.committedKind === "sword-heavy" ? 0.24 : 0.12) : 0, 0.035, 0.045);
    },
    detach() {
      if (!detached) return;
      world.camera.remove(root);
      detached = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (detached) world.camera.remove(root);
      detached = false;
      // These are the only resources created here; the supplied renderer and camera remain caller-owned.
      root.clear();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      texture.dispose();
    },
  };
}

function makeSwordTexture(): DataTexture {
  const width = 16, height = 16;
  // Four deliberately blocky bands provide steel, leather, brass and rune pixels on one nearest-sampled atlas.
  const palette = [
    [34, 47, 58, 255], [82, 108, 119, 255], [161, 180, 181, 255], [215, 223, 210, 255],
    [48, 29, 23, 255], [101, 55, 33, 255], [163, 105, 57, 255], [229, 184, 103, 255],
    [13, 42, 58, 255], [23, 103, 133, 255], [39, 195, 206, 255], [186, 250, 231, 255],
    [0, 0, 0, 255], [255, 255, 255, 255], [69, 69, 69, 255], [120, 132, 134, 255],
  ];
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let p = 0;
    if (y < 8) p = (x % 7 === 0 || y === 2) ? 3 : ((x + y) % 4 === 0 ? 2 : 1);
    else if (y < 11) p = x % 4 < 2 ? 7 : 6;
    else if (y < 15) p = (x + y) % 5 < 2 ? 5 : 4;
    else p = x % 4 < 2 ? 7 : 6;
    if (x === 12 && y > 2 && y < 8) p = 10;
    data.set(palette[p]!, (y * width + x) * 4);
  }
  const result = new DataTexture(data, width, height, RGBAFormat);
  result.magFilter = NearestFilter;
  result.minFilter = NearestFilter;
  result.colorSpace = SRGBColorSpace;
  result.needsUpdate = true;
  return result;
}
