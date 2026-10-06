import { describe, expect, it, vi } from "vitest";
import { MeshBasicMaterial, MeshStandardMaterial, NearestFilter, RepeatWrapping, SRGBColorSpace, UnsignedByteType, RGBAFormat } from "three";
import { BASE_TILE_KINDS } from "./textures/base";
import { createMaterialLibrary } from "./materials";

describe("material library ownership", () => {
  it("creates correctly configured textures and shareable material instances", () => {
    const library = createMaterialLibrary("seed", 16);
    expect(library.counts).toEqual({ textures: 7, materials: 7 });
    for (const kind of BASE_TILE_KINDS) {
      const texture = library.textures[kind];
      expect(texture.image).toMatchObject({ width: 16, height: 16 });
      expect(texture.type).toBe(UnsignedByteType);
      expect(texture.format).toBe(RGBAFormat);
      expect(texture.magFilter).toBe(NearestFilter);
      expect(texture.minFilter).toBe(NearestFilter);
      expect(texture.generateMipmaps).toBe(false);
      expect(texture.colorSpace).toBe(SRGBColorSpace);
      expect(library.materials[kind].map).toBe(texture);
      expect(library.materials[kind]).toBe(library.materials[kind]);
      if (["stone", "floor", "door"].includes(kind)) {
        expect(library.materials[kind]).toBeInstanceOf(MeshStandardMaterial);
        expect((library.materials[kind] as MeshStandardMaterial).roughness).toBe(1);
        expect(texture.wrapS).toBe(RepeatWrapping);
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
    expect(events.size).toBe(14);
    for (const listener of events.values()) expect(listener).toHaveBeenCalledTimes(1);
    const replacement = createMaterialLibrary("seed");
    expect(replacement.materials.stone).not.toBe(library.materials.stone);
    replacement.dispose();
  });
});
