import { describe, expect, it } from "vitest";
import { stableId } from "./ids";

describe("stable IDs", () => {
  it("reproduces IDs from normalized seed and distinct legal components", () => {
    expect(stableId(" e\u0301 ", 4, "enemy", 12)).toBe(stableId("é", 4, "enemy", 12));
    expect(new Set([
      stableId("s", 1, "enemy", 0),
      stableId("s", 1, "enemy", 1),
      stableId("s", 2, "enemy", 0),
      stableId("s", 1, "boss", 0),
    ]).size).toBe(4);
  });

  it("preserves component boundaries when seed or domain contains delimiters", () => {
    expect(stableId("a|b", 1, "c", 0)).not.toBe(stableId("a", 1, "b|c", 0));
    expect(stableId("a\",1,\"b", 1, "c", 0)).not.toBe(stableId("a", 1, "b\",1,\"c", 0));
  });

  it("rejects invalid floor, ordinal, seed and domain values", () => {
    for (const floor of [0, 101, 1.5, Number.NaN]) expect(() => stableId("s", floor, "enemy", 0)).toThrow();
    for (const ordinal of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => stableId("s", 1, "enemy", ordinal)).toThrow();
    }
    expect(() => stableId("s", 1, "", 0)).toThrow(RangeError);
    expect(() => stableId(2 as unknown as string, 1, "enemy", 0)).toThrow(TypeError);
  });
});
