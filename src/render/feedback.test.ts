import { describe, expect, it } from "vitest";
import { EventCollector } from "../core/events";
import { CombatFeedback, hurtOpacity } from "./feedback";

function damage(collector: EventCollector, sourceId: string, targetId: string): void {
  collector.beginTick(0); collector.emit({ type: "damage-applied", sourceId, targetId, attackId: `${sourceId}-${targetId}`, damageType: "physical", amount: 1, hpRemaining: 99 }); collector.flush();
}

describe("combat presentation feedback", () => {
  it("filters actors, bounds and restarts feedback, and advances only by caller simulation time", () => {
    const events = new EventCollector(), feedback = new CombatFeedback(events, "player");
    damage(events, "other", "target"); expect(feedback.snapshot().hitMarkerSeconds).toBe(0); expect(feedback.snapshot().hurtSeconds).toBe(0);
    damage(events, "player", "target"); expect(feedback.snapshot().hitMarkerSeconds).toBe(0.15);
    damage(events, "enemy", "player"); expect(feedback.snapshot().hurtSeconds).toBe(0.25); expect(hurtOpacity(feedback.snapshot())).toBe(0.22);
    feedback.advance(0.1); expect(feedback.snapshot().hurtSeconds).toBeCloseTo(0.15);
    damage(events, "enemy", "player"); expect(feedback.snapshot().hurtSeconds).toBe(0.25);
    feedback.advance(10, true); expect(feedback.snapshot().hurtSeconds).toBe(0.25);
    feedback.setDamageFlashesEnabled(false); expect(hurtOpacity(feedback.snapshot())).toBe(0);
    expect(feedback.snapshot().hitMarkerSeconds).toBeGreaterThan(0);
    feedback.advance(0.25); expect(feedback.snapshot().hurtSeconds).toBe(0); feedback.reset();
    feedback.dispose(); feedback.dispose(); events.dispose();
  });
});
