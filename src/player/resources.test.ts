import { describe, expect, it } from "vitest";
import { adjustResource, clampResource, createResource, setResource, spendResource } from "./resources";

describe("bounded player resources", () => {
  it("clamps values and ignores non-finite additions without making energy", () => {
    expect(clampResource(-4, 10)).toBe(0);
    expect(clampResource(14, 10)).toBe(10);
    expect(clampResource(Number.NaN, 10)).toBe(0);
    expect(adjustResource(createResource(3, 10), Number.POSITIVE_INFINITY).current).toBe(3);
    expect(setResource(createResource(3, 10), Number.POSITIVE_INFINITY).current).toBe(0);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects invalid spend amount %s without changing the resource", (amount) => {
      const resource = createResource(5, 10);
      const result = spendResource(resource, amount);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe("invalid-amount");
      expect(resource.current).toBe(5);
    },
  );

  it("rejects insufficient spending and permits exact bounded spending", () => {
    const resource = createResource(5, 10);
    expect(spendResource(resource, 6)).toMatchObject({ success: false, reason: "insufficient-resource" });
    expect(spendResource(resource, 5)).toMatchObject({ success: true, resource: { current: 0, maximum: 10 } });
    expect(adjustResource(resource, 99).current).toBe(10);
    expect(adjustResource(resource, -99).current).toBe(0);
  });
});
