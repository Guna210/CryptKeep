import {
  MeshBasicMaterial, MeshStandardMaterial, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping,
  SRGBColorSpace, Texture, UnsignedByteType, RGBAFormat, DataTexture,
} from "three";
import { BASE_TILE_KINDS, createBaseTile, type BaseTileKind } from "./textures/base";
import { createPaintedArtwork, type PaintedSurface } from "./textures/painted";

export const PAINTED_SURFACES = ["stone", "floor", "door", "entry", "boss", "reward", "exit", "steel", "leather", "brass", "wood", "iron", "trim"] as const;

export type BaseMaterial = MeshStandardMaterial | MeshBasicMaterial;
export interface MaterialLibrary {
  readonly textures: Readonly<Record<PaintedSurface, DataTexture>>;
  readonly materials: Readonly<Record<PaintedSurface, BaseMaterial>>;
  readonly counts: Readonly<{ textures: number; materials: number }>;
  /** The library owns each listed material and texture once. Borrowers must never dispose them. */
  dispose(): void;
}

/** Owns one texture and one material per recipe. Meshes may borrow material instances until disposal. */
export function createMaterialLibrary(seed: string, size = 128): MaterialLibrary {
  const textures = {} as Record<PaintedSurface, DataTexture>;
  const materials = {} as Record<PaintedSurface, BaseMaterial>;
  for (const kind of PAINTED_SURFACES) {
    let recipe;
    if(kind==="stone"){
      const atlasSize=size*2,data=new Uint8Array(atlasSize*atlasSize*4);
      for(let variant=0;variant<4;variant++){
        const tile=createPaintedArtwork("stone",size,variant), ox=(variant%2)*size,oy=Math.floor(variant/2)*size;
        for(let y=0;y<size;y++)data.set(tile.data.subarray(y*size*4,(y+1)*size*4),((oy+y)*atlasSize+ox)*4);
      }
      recipe={width:atlasSize,height:atlasSize,data};
    } else recipe = (kind === "entry" || kind === "boss" || kind === "reward" || kind === "exit")
      ? createBaseTile(seed, kind as BaseTileKind, size)
      : createPaintedArtwork(kind, size);
    const texture = new DataTexture(recipe.data, recipe.width, recipe.height, RGBAFormat, UnsignedByteType);
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = kind === "stone" || kind === "floor" || kind === "door" ? RepeatWrapping : texture.wrapS;
    texture.wrapT = kind === "stone" || kind === "floor" || kind === "door" ? RepeatWrapping : texture.wrapT;
    texture.needsUpdate = true;
    textures[kind] = texture;
    materials[kind] = kind === "entry" || kind === "boss" || kind === "reward" || kind === "exit"
      ? new MeshBasicMaterial({ map: texture })
      : new MeshStandardMaterial({ map: texture, roughness: kind === "steel" ? 0.52 : kind === "brass" || kind === "iron" ? 0.72 : 0.94, metalness: kind === "steel" ? 0.28 : kind === "brass" || kind === "iron" ? 0.18 : 0 })
    if (kind === "stone" || kind === "floor" || kind === "door") {
      texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping;
    }
  }
  Object.freeze(textures);
  Object.freeze(materials);
  let disposed = false;
  return Object.freeze({
    textures,
    materials,
    counts: Object.freeze({ textures: PAINTED_SURFACES.length, materials: PAINTED_SURFACES.length }),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const kind of PAINTED_SURFACES) materials[kind].dispose();
      for (const kind of PAINTED_SURFACES) textures[kind].dispose();
    },
  });
}
