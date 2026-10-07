import { describe, expect, it, vi } from "vitest";
import { MeshBasicMaterial, MeshStandardMaterial, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, UnsignedByteType, RGBAFormat } from "three";
import { BASE_TILE_KINDS } from "./textures/base";
import { createMaterialLibrary } from "./materials";

describe("material library ownership", () => {
  it("creates correctly configured textures and shareable material instances", () => {
    const library = createMaterialLibrary("seed", 16);
    expect(library.counts).toEqual({ textures: 13, materials: 13 });
    for (const kind of BASE_TILE_KINDS) {
      const texture = library.textures[kind];
      const atlasSize=kind==="stone"?32:16;
      expect(texture.image).toMatchObject({ width: atlasSize, height: atlasSize });
      expect(texture.type).toBe(UnsignedByteType);
      expect(texture.format).toBe(RGBAFormat);
      expect(texture.magFilter).toBe(LinearFilter);
      expect(texture.minFilter).toBe(LinearMipmapLinearFilter);
      expect(texture.generateMipmaps).toBe(true);
      expect(texture.colorSpace).toBe(SRGBColorSpace);
      expect(library.materials[kind].map).toBe(texture);
      expect(library.materials[kind]).toBe(library.materials[kind]);
      if (["stone", "floor", "door", "steel", "leather", "brass", "wood", "iron", "trim"].includes(kind)) {
        expect(library.materials[kind]).toBeInstanceOf(MeshStandardMaterial);
        expect((library.materials[kind] as MeshStandardMaterial).roughness).toBeGreaterThanOrEqual(.47);
        if (["stone", "floor", "door"].includes(kind)) expect(texture.wrapS).toBe(RepeatWrapping);
      } else expect(library.materials[kind]).toBeInstanceOf(MeshBasicMaterial);
    }
  });

  it("disposes each owned resource once, with fresh libraries remaining usable", () => {
    const library = createMaterialLibrary("seed");
    const events = new Map<object, ReturnType<typeof vi.fn>>();
    for (const resource of [...Object.values(library.materials), ...Object.values(library.textures)]) {
      const listener = vi.fn();
      resource.addEventListener("dispose", listener);
      events.set(resource, listener);
    }
    library.dispose();
    library.dispose();
    expect(events.size).toBe(26);
    for (const listener of events.values()) expect(listener).toHaveBeenCalledTimes(1);
    const replacement = createMaterialLibrary("seed");
    expect(replacement.materials.stone).not.toBe(library.materials.stone);
    replacement.dispose();
  });
});
