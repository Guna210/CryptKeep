import { describe, expect, it } from "vitest";
import { deriveStream, fnv1aUtf8, normalizeSeed, SeededRng } from "./rng";

describe("seeded random streams", () => {
  it("matches published FNV-1a UTF-8 and xoshiro128** vectors", () => {
    expect(fnv1aUtf8("")).toBe(0x811c9dc5);
    expect(fnv1aUtf8("hello")).toBe(0x4f9f2cab);
    expect(fnv1aUtf8("é")).toBe(513665217); // UTF-8 C3 A9, not UTF-16 code units.
    // Reference xoshiro128** stream for initial words [1, 2, 3, 4].
    const rng = new SeededRng([1, 2, 3, 4]);
    expect(Array.from({ length: 6 }, () => rng.nextUint32())).toEqual([
      11520, 0, 5927040, 70819200, 2031721883, 1637235492,
    ]);
  });

  it("normalizes trim and NFC, counts code points, and handles malformed UTF-16 deterministically", () => {
    expect(normalizeSeed("  e\u0301  ")).toBe("é");
    expect(normalizeSeed("😀".repeat(64))).toBe("😀".repeat(64));
    expect(() => normalizeSeed("😀".repeat(65))).toThrow(RangeError);
    expect(normalizeSeed("\ud800")).toBe("\ud800");
    expect(fnv1aUtf8("\ud800")).toBe(fnv1aUtf8("�"));
    expect(() => normalizeSeed(12 as unknown as string)).toThrow(TypeError);
  });

  it("reproduces seeds and isolates named sources and cosmetic draws", () => {
    const first = deriveStream("café", "enemy", "spawn:1");
    const same = deriveStream("cafe\u0301", "enemy", "spawn:1");
    expect(Array.from({ length: 8 }, () => first.nextUint32())).toEqual(
      Array.from({ length: 8 }, () => same.nextUint32()),
    );
    const gameplay = deriveStream("campaign", "combat", "player");
    const expected = deriveStream("campaign", "combat", "player");
    deriveStream("campaign", "cosmetics", "art").nextUint32();
    expect(gameplay.nextUint32()).toBe(expected.nextUint32());
    expect(deriveStream("campaign", "layout").nextUint32()).not.toBe(
      deriveStream("campaign", "cosmetics").nextUint32(),
    );
  });

  it("round-trips exact continuation through detached, strictly validated cursors", () => {
    const rng = deriveStream("seed", "combat");
    rng.nextUint32();
    const cursor = rng.snapshot();
    const restored = SeededRng.restore(cursor);
    cursor.state[0] = cursor.state[0] ^ 1;
    expect(rng.nextUint32()).toBe(restored.nextUint32());
    expect(() => SeededRng.restore(null)).toThrow(TypeError);
    expect(() => SeededRng.restore({ algorithm: "other", state: [1, 2, 3, 4] })).toThrow(TypeError);
    expect(() => SeededRng.restore({ algorithm: "xoshiro128**", state: [1, 2, 3] })).toThrow(TypeError);
    expect(() => SeededRng.restore({ algorithm: "xoshiro128**", state: [0, 0, 0, 0] })).toThrow(RangeError);
    expect(() => SeededRng.restore({ algorithm: "xoshiro128**", state: [1, 2, 3, 4], extra: true })).toThrow(TypeError);
    expect(() => new SeededRng([1, 2, -1, 4])).toThrow(TypeError);
    expect(() => new SeededRng([1, , 3, 4] as number[])).toThrow(TypeError);
    expect(() => new SeededRng([1, undefined as unknown as number, 3, 4])).toThrow(TypeError);
    expect(() => new SeededRng([1, Number.NaN, 3, 4])).toThrow(TypeError);
    expect(() => new SeededRng([1, 2.5, 3, 4])).toThrow(TypeError);
    expect(() => new SeededRng([1, 2, 0x1_0000_0000, 4])).toThrow(TypeError);
    expect(() => new SeededRng([0, 0, 0, 0])).toThrow(RangeError);
    expect(() => SeededRng.restore({ algorithm: "xoshiro128**", state: [1, , 3, 4] as number[] })).toThrow(TypeError);
  });

  it("uses bounded unbiased integer sampling and validates requested ranges", () => {
    const rng = new SeededRng([1, 2, 3, 4]);
    const values = Array.from({ length: 100 }, () => rng.nextInt(-3, 4));
    expect(values.every((value) => Number.isInteger(value) && value >= -3 && value < 4)).toBe(true);
    expect(() => rng.nextInt(1, 1)).toThrow(RangeError);
    expect(() => rng.nextInt(0, 0x1_0000_0001)).toThrow(RangeError);
    expect(() => rng.nextInt(0.5, 2)).toThrow(TypeError);
  });
});
