import {
  MeshBasicMaterial, MeshStandardMaterial, NearestFilter, RepeatWrapping,
  SRGBColorSpace, Texture, UnsignedByteType, RGBAFormat, DataTexture,
} from "three";
import { BASE_TILE_KINDS, createBaseTile, type BaseTileKind } from "./textures/base";

export type BaseMaterial = MeshStandardMaterial | MeshBasicMaterial;
export interface MaterialLibrary {
  readonly textures: Readonly<Record<BaseTileKind, DataTexture>>;
  readonly materials: Readonly<Record<BaseTileKind, BaseMaterial>>;
  readonly counts: Readonly<{ textures: number; materials: number }>;
  /** The library owns each listed material and texture once. Borrowers must never dispose them. */
  dispose(): void;
}

/** Owns one texture and one material per recipe. Meshes may borrow material instances until disposal. */
export function createMaterialLibrary(seed: string, size = 32): MaterialLibrary {
  const textures = {} as Record<BaseTileKind, DataTexture>;
  const materials = {} as Record<BaseTileKind, BaseMaterial>;
  for (const kind of BASE_TILE_KINDS) {
    const recipe = createBaseTile(seed, kind, size);
    const texture = new DataTexture(recipe.data, recipe.width, recipe.height, RGBAFormat, UnsignedByteType);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = kind === "stone" || kind === "floor" || kind === "door" ? RepeatWrapping : texture.wrapS;
    texture.wrapT = kind === "stone" || kind === "floor" || kind === "door" ? RepeatWrapping : texture.wrapT;
    texture.needsUpdate = true;
    textures[kind] = texture;
    materials[kind] = kind === "stone" || kind === "floor" || kind === "door"
      ? new MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 })
      : new MeshBasicMaterial({ map: texture });
  }
  Object.freeze(textures);
  Object.freeze(materials);
  let disposed = false;
  return Object.freeze({
    textures,
    materials,
    counts: Object.freeze({ textures: BASE_TILE_KINDS.length, materials: BASE_TILE_KINDS.length }),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const kind of BASE_TILE_KINDS) materials[kind].dispose();
      for (const kind of BASE_TILE_KINDS) textures[kind].dispose();
    },
  });
}
