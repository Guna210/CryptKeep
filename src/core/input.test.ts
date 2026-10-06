import { describe, expect, it } from "vitest";
import { InputSampler } from "./input";

describe("InputSampler", () => {
  it("keeps held actions across samples and emits each ordinary edge once", () => {
    const input = new InputSampler();
    input.press("primary");
    input.press("primary"); // repeated keydown
    expect(input.sample()).toMatchObject({ held: ["primary"], pressed: ["primary"], released: [], edges: [{ action: "primary", type: "pressed" }] });
    expect(input.sample()).toMatchObject({ held: ["primary"], pressed: [], released: [], edges: [] });
    input.release("primary");
    expect(input.sample()).toMatchObject({ held: [], pressed: [], released: ["primary"], edges: [{ action: "primary", type: "released" }] });
    input.release("primary");
    expect(input.sample().edges).toEqual([]);
  });

  it("preserves rapid down/up/down order and a complete same-sample tap", () => {
    const input = new InputSampler();
    input.press("primary"); input.release("primary"); input.press("primary");
    const sequence = input.sample();
    expect(sequence.edges).toEqual([
      { action: "primary", type: "pressed" },
      { action: "primary", type: "released" },
      { action: "primary", type: "pressed" },
    ]);
    expect(sequence.held).toEqual(["primary"]);

    const tap = new InputSampler();
    tap.press("primary"); tap.release("primary");
    expect(tap.sample().edges).toEqual([
      { action: "primary", type: "pressed" }, { action: "primary", type: "released" },
    ]);
    expect(tap.sample().edges).toEqual([]);
  });

  it("reports clearInput cancellation separately and drops pre-cancel input", () => {
    const input = new InputSampler();
    input.press("primary"); input.addLookDelta(4, 2);
    input.clearInput("weapon-switch");
    input.press("secondary"); // input after clear belongs to resumed sampling
    const command = input.sample();
    expect(command).toMatchObject({ held: ["secondary"], pressed: ["secondary"], released: [], look: { x: 0, y: 0 }, cancellations: ["weapon-switch"] });
    expect(command.edges).toEqual([{ action: "secondary", type: "pressed" }]);
    expect(input.sample().cancellations).toEqual([]);
  });

  it("clears cancellation chronology and accepts another reason in order", () => {
    const input = new InputSampler();
    input.press("primary");
    input.clearInput("blur");
    input.release("primary"); // already cleared; does not create a release
    input.clearInput("hidden");
    expect(input.sample()).toMatchObject({ edges: [], pressed: [], released: [], cancellations: ["blur", "hidden"] });
  });

  it("returns raw keyboard axes, cancels opposition, and leaves diagonal normalization to locomotion", () => {
    const input = new InputSampler();
    input.setDirection("forward", true);
    input.setDirection("right", true);
    expect(input.sample().movement).toEqual({ x: 1, y: 1 });
    input.setDirection("backward", true);
    input.setDirection("left", true);
    expect(input.sample().movement).toEqual({ x: 0, y: 0 });
  });

  it("accumulates relative look and consumes it once", () => {
    const input = new InputSampler();
    input.addLookDelta(2.5, -3);
    input.addLookDelta(1.5, 8);
    expect(input.sample().look).toEqual({ x: 4, y: 5 });
    expect(input.sample().look).toEqual({ x: 0, y: 0 });
  });

  it("returns detached snapshots and ignores invalid look values", () => {
    const input = new InputSampler();
    input.press("primary"); input.addLookDelta(Number.NaN, Number.POSITIVE_INFINITY);
    const first = input.sample();
    (first.held as string[]).push("pause");
    (first.edges as { action: string; type: string }[])[0]!.action = "pause";
    (first.look as { x: number; y: number }).x = 999;
    expect(input.sample()).toMatchObject({ held: ["primary"], edges: [], look: { x: 0, y: 0 } });
    input.addLookDelta(2, Number.NEGATIVE_INFINITY);
    expect(input.sample().look).toEqual({ x: 2, y: 0 });
  });
});
