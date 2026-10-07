import { describe, expect, it } from "vitest";
import { deriveStream } from "../../core/rng";
import { BASE_TILE_KINDS, createBaseTile } from "./base";

describe("base tile recipes", () => {
  it("is deterministic per seed, kind and valid pixel size", () => {
    for (const size of [16, 32, 64, 128]) for (const kind of BASE_TILE_KINDS) {
      const a = createBaseTile("  cryptkeep  ", kind, size);
      const b = createBaseTile("cryptkeep", kind, size);
      expect([a.width, a.height, a.data.length]).toEqual([size, size, size * size * 4]);
      expect(a.data).toEqual(b.data);
      for (let i = 3; i < a.data.length; i += 4) expect(a.data[i]).toBe(255);
      expect(new Set(Array.from({ length: size * size }, (_, i) => `${a.data[i * 4]},${a.data[i * 4 + 1]},${a.data[i * 4 + 2]}`)).size).toBeGreaterThan(2);
    }
    expect(createBaseTile("painted-high-res", "stone", 256).data).toHaveLength(256*256*4);
  });

  it("isolates each recipe's cosmetic stream from gameplay streams and other kinds", () => {
    const gameplay = deriveStream("seed", "loot");
    const before = gameplay.snapshot();
    const stone = createBaseTile("seed", "stone");
    const floor = createBaseTile("seed", "floor");
    expect(stone.data).not.toEqual(floor.data);
    expect(gameplay.snapshot()).toEqual(before);
    expect(createBaseTile("other", "stone").data).not.toEqual(stone.data);
  });

  it("paints broad stone value variation without a second grid",()=>{
    const stone=createBaseTile("painted-value-range","stone",128).data;
    let minimum=255,maximum=0;
    for(let i=0;i<stone.length;i+=4){minimum=Math.min(minimum,stone[i]!);maximum=Math.max(maximum,stone[i]!);}
    expect(maximum-minimum).toBeGreaterThan(35);
  });

  it("rejects malformed seed, kind and dimensions", () => {
    expect(() => createBaseTile(3 as unknown as string, "stone")).toThrow(TypeError);
    expect(() => createBaseTile("seed", "invalid" as never)).toThrow(RangeError);
    for (const size of [0, 8, 17, 512, NaN]) expect(() => createBaseTile("seed", "stone", size)).toThrow(RangeError);
    expect(() => createBaseTile("x".repeat(65), "stone")).toThrow(RangeError);
  });
});
