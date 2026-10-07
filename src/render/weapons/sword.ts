import {
  BoxGeometry, BufferGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial,
  Quaternion, Shape, SphereGeometry, Vector3, CatmullRomCurve3, TubeGeometry, DataTexture, RGBAFormat,
  UnsignedByteType, SRGBColorSpace, LinearFilter, LinearMipmapLinearFilter,
} from "three";
import { createPaintedArtwork } from "../textures/painted";
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
  const idle: SwordPose = { position: [0.39, -0.18, -1], rotation: [-0.12, -0.42, -0.58], scale: 1, charge: 0, active: false };
  if (state.phase === "anticipation") {
    const charge = Math.max(0, Math.min(1, (state.elapsedSeconds - 0.25) / 0.95));
    const windup = Math.min(1, state.elapsedSeconds / 0.25);
    return { position: [0.39 + charge * 0.025, -0.18 - windup * 0.025, -1],
      rotation: [-0.12 - charge * 0.12, -0.42 + windup * 0.1, -0.58 - windup * 0.18], scale: 1 + charge * 0.05,
      charge, active: false };
  }
  if (state.phase === "windup") {
    const heavy = state.committedKind === "sword-heavy";
    const t = Math.min(1, state.elapsedSeconds / (state.committedTiming?.windupSeconds ?? 0.1));
    return { position: [0.39 + t * (heavy ? 0.045 : 0.025), -0.18 + t * 0.045, -1],
      rotation: [-0.12, -0.42, -0.58 - t * (heavy ? 0.5 : 0.36)], scale: heavy ? 1.06 : 1, charge: heavy ? 0.18 : 0, active: false };
  }
  if (state.phase === "active") {
    const heavy = state.committedKind === "sword-heavy";
    // Full broadside sweep begins at the exact simulation active-window boundary.
    const t = Math.min(1, state.elapsedSeconds / (state.committedTiming?.activeSeconds ?? 0.12));
    const sweep = Math.sin(t * Math.PI);
    return { position: [0.39 - sweep * (heavy ? 0.24 : 0.19), -0.18 + sweep * 0.07, -0.9],
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
  const ownedTextures = ["steel", "leather", "brass"].map((kind) => {
    const art = createPaintedArtwork(kind as "steel" | "leather" | "brass", 128);
    const texture = new DataTexture(art.data, art.width, art.height, RGBAFormat, UnsignedByteType);
    texture.colorSpace=SRGBColorSpace; texture.magFilter=LinearFilter; texture.minFilter=LinearMipmapLinearFilter;
    texture.generateMipmaps=true; texture.needsUpdate=true; return texture;
  });
  const [steelTexture, leatherTexture, brassTexture] = ownedTextures;
  const bladeMaterial = new MeshStandardMaterial({ map:steelTexture, color:0xe3eeee, roughness:0.47, metalness:0.22, emissive:0x18282d, emissiveIntensity:0.12 });
  const leatherMaterial = new MeshStandardMaterial({ map:leatherTexture, color:0xd2b39a, roughness:0.92, metalness:0 });
  const goldMaterial = new MeshStandardMaterial({ map:brassTexture, color:0xf2dfb1, roughness:0.52, metalness:0.2 });
  const wrapMaterial = new MeshStandardMaterial({ map:leatherTexture, color:0xe0c5a6, roughness:0.96, metalness:0.02 });
  const glowMaterial = new MeshStandardMaterial({ map:steelTexture, color:0xffd78a, roughness:0.48, metalness:0.12, emissive:0x000000 });
  const geometries: BufferGeometry[] = [];
  const materials = [bladeMaterial, leatherMaterial, goldMaterial, wrapMaterial, glowMaterial];
  const mesh = (geometry: BufferGeometry, material: MeshStandardMaterial, name: string) => {
    geometries.push(geometry);
    const part = new Mesh(geometry, material);
    part.name = name;
    root.add(part);
    return part;
  };
  const bladeShape = new Shape();
  bladeShape.moveTo(-0.052, 0.02); bladeShape.quadraticCurveTo(-0.058,0.31,-0.047,0.56);
  bladeShape.quadraticCurveTo(-0.035,0.65,0,0.73); bladeShape.quadraticCurveTo(0.035,0.65,0.047,0.56);
  bladeShape.quadraticCurveTo(0.058,0.31,0.052,0.02); bladeShape.closePath();
  const bladeGeometry = new ExtrudeGeometry(bladeShape, { depth: 0.075, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.018, bevelThickness: 0.018, curveSegments: 8 });
  bladeGeometry.computeVertexNormals();
  // Hand-authored UV panels: front (0–.50), reverse (0.52–.68), and narrow edge (0.72–.98).
  const bladeUv=bladeGeometry.getAttribute("uv"), bladePos=bladeGeometry.getAttribute("position"), bladeNorm=bladeGeometry.getAttribute("normal");
  const bounds=bladeGeometry.boundingBox ?? (bladeGeometry.computeBoundingBox(),bladeGeometry.boundingBox!);
  for(let i=0;i<bladeUv.count;i++){
    const x=(bladePos.getX(i)-bounds.min.x)/(bounds.max.x-bounds.min.x), y=(bladePos.getY(i)-bounds.min.y)/(bounds.max.y-bounds.min.y);
    const front=Math.abs(bladeNorm.getZ(i))>.72;
    const region=front?(bladeNorm.getZ(i)>0?[.035,.49]:[.515,.67]):[.73,.96];
    bladeUv.setXY(i,region[0]!+x*(region[1]!-region[0]!),.035+y*.93);
  }
  bladeUv.needsUpdate=true;
  bladeGeometry.translate(0, 0, -0.0375);
  const blade = mesh(bladeGeometry, bladeMaterial, "soft-edged-steel-blade");
  blade.position.z = 0.01;
  const guardShape=new Shape();
  guardShape.moveTo(-0.17,-0.025);guardShape.quadraticCurveTo(-0.14,0.005,-0.105,0.012);guardShape.quadraticCurveTo(0,0.035,0.105,0.012);
  guardShape.quadraticCurveTo(0.14,0.005,0.17,-0.025);guardShape.quadraticCurveTo(0.15,-0.055,0.12,-0.052);
  guardShape.quadraticCurveTo(0,-0.025,-0.12,-0.052);guardShape.quadraticCurveTo(-0.15,-0.055,-0.17,-0.025);guardShape.closePath();
  const guardGeometry=new ExtrudeGeometry(guardShape,{depth:.065,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.012,bevelThickness:.012,curveSegments:5});
  guardGeometry.translate(0,0,-.0325);guardGeometry.computeVertexNormals();
  mesh(guardGeometry,goldMaterial,"curved-brass-crossguard").position.y=-0.015;
  mesh(new CylinderGeometry(0.043,0.048,0.30,16,1), leatherMaterial, "rounded-leather-grip").position.y = -0.19;
  const wrapPoints=Array.from({length:65},(_,i)=>{const t=i/64,angle=t*Math.PI*8;return new Vector3(Math.cos(angle)*.049,-.33+t*.27,Math.sin(angle)*.049);});
  mesh(new TubeGeometry(new CatmullRomCurve3(wrapPoints),128,.005,6,false),wrapMaterial,"leather-wrap-stitch");
  mesh(new SphereGeometry(0.071,16,12), goldMaterial, "rounded-brass-pommel").position.y = -0.36;
  const charge = mesh(new BoxGeometry(0.16, 0.17, 0.045), glowMaterial, "charge-rune");
  charge.position.set(0, 0.34, 0.035);
  charge.visible = false;

  let detached = false;
  let disposed = false;
  const attach = () => {
    if (detached || disposed) return;
    // Cameras are commonly rendered separately and are not children of the scene.
    // Put our own root in the traversed scene and express its transform in camera space.
    world.scene.add(root);
    detached = true;
  };
  attach();
  return {
    root,
    attach,
    update(state) {
      if (disposed) return;
      const pose = getSwordPose(state);
      world.camera.updateWorldMatrix(true, false);
      const localPosition = new Vector3(...pose.position);
      root.position.copy(world.camera.localToWorld(localPosition));
      const cameraRotation = world.camera.getWorldQuaternion(new Quaternion());
      const localRotation = new Quaternion().setFromEuler(new Euler(...pose.rotation));
      root.quaternion.copy(cameraRotation).multiply(localRotation);
      root.scale.setScalar(pose.scale);
      charge.visible = pose.charge > 0;
      const glow = pose.charge * 0.8;
      glowMaterial.emissive.setRGB(0.06 * glow, 0.42 * glow, 0.62 * glow);
      bladeMaterial.emissive.setRGB(pose.active ? (state.committedKind === "sword-heavy" ? 0.24 : 0.12) : 0, 0.035, 0.045);
    },
    detach() {
      if (!detached) return;
      world.scene.remove(root);
      detached = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (detached) world.scene.remove(root);
      detached = false;
      // These are the only resources created here; the supplied renderer and camera remain caller-owned.
      root.clear();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of ownedTextures) texture.dispose();
    },
  };
}
