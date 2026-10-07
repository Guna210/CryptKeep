import { describe, expect, it } from "vitest";
import { createRenderScheduler } from "./render-scheduler";

describe("inactive render scheduling", () => {
  it("draws the initial frame, skips stable previews, and invalidates changed scene or viewport", () => {
    const scheduler = createRenderScheduler();
    expect(scheduler.shouldRender(false, "room-a", "960x600@1", true)).toBe(true);
    expect(scheduler.shouldRender(false, "room-a", "960x600@1", true)).toBe(false);
    expect(scheduler.shouldRender(false, "room-b", "960x600@1", true)).toBe(true);
    expect(scheduler.shouldRender(false, "room-b", "960x600@1", true)).toBe(false);
    expect(scheduler.shouldRender(false, "room-b", "1200x800@1", true)).toBe(true);
    scheduler.invalidate();
    expect(scheduler.shouldRender(false, "room-b", "1200x800@1", true)).toBe(true);
  });

  it("keeps active play continuous and defers invisible frames until visibility returns", () => {
    const scheduler = createRenderScheduler();
    expect(scheduler.shouldRender(true, "play", "960x600@1", true)).toBe(true);
    expect(scheduler.shouldRender(true, "play", "960x600@1", true)).toBe(true);
    expect(scheduler.shouldRender(false, "hidden-change", "960x600@1", false)).toBe(false);
    expect(scheduler.shouldRender(false, "hidden-change", "960x600@1", true)).toBe(true);
    expect(scheduler.shouldRender(false, "hidden-change", "960x600@1", true)).toBe(false);
  });
});
