import { describe, expect, it } from "vitest";
import { adjustResource, advanceResourceRegeneration, clampResource, createResource, createResourceRegenTimers, recordStaminaSpend, setResource, spendResource } from "./resources";

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

  it("applies only the portion of a tick after each independent regen delay", () => {
    const resources = { health:createResource(50,100), stamina:createResource(50,100), mana:createResource(20,60) };
    const first = advanceResourceRegeneration(resources, createResourceRegenTimers(), 0.5);
    expect(first.stamina.current).toBe(50);
    expect(first.mana.current).toBe(20);
    const second = advanceResourceRegeneration(resources, first.timers, 0.5);
    expect(second.stamina.current).toBeCloseTo(50 + 22 * 0.35);
    expect(second.mana.current).toBe(20);
    const third = advanceResourceRegeneration(resources, second.timers, 0.25);
    expect(third.mana.current).toBeCloseTo(20 + 6 * 0.25);
    expect(third.health.current).toBe(50);
  });

  it("resets only the spent resource timer, freezes inactive time, and clamps at maximum", () => {
    const resources = { health:createResource(100,100), stamina:createResource(90,100), mana:createResource(59,60) };
    const timers = { staminaIdleSeconds:0.6, manaIdleSeconds:0.9 };
    const spend = advanceResourceRegeneration(resources, timers, 1/60, { staminaSpent:true });
    expect(spend.timers.staminaIdleSeconds).toBe(0);
    expect(spend.stamina.current).toBe(90);
    expect(spend.timers.manaIdleSeconds).toBeCloseTo(0.9 + 1/60);
    const paused = advanceResourceRegeneration(resources, spend.timers, 2, {active:false});
    expect(paused).toEqual({ ...resources, timers:spend.timers });
    const maxed = advanceResourceRegeneration({ ...resources, stamina:createResource(100,100), mana:createResource(60,60) }, {staminaIdleSeconds:10,manaIdleSeconds:10}, 1/60);
    expect(maxed.stamina.current).toBe(100);
    expect(maxed.mana.current).toBe(60);
    expect(recordStaminaSpend(timers)).toEqual({ staminaIdleSeconds:0, manaIdleSeconds:0.9 });
  });

  it("rejects wall-clock-like invalid deltas and malformed timer state", () => {
    const resources = { health:createResource(100,100), stamina:createResource(100,100), mana:createResource(60,60) };
    expect(() => advanceResourceRegeneration(resources, createResourceRegenTimers(), 0)).toThrow(RangeError);
    expect(() => advanceResourceRegeneration(resources, {staminaIdleSeconds:NaN,manaIdleSeconds:0}, 1/60)).toThrow(TypeError);
  });
});
