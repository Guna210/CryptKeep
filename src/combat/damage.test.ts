import { describe, expect, it } from "vitest";
import { EventCollector } from "../core/events";
import { createResource } from "../player/resources";
import { PhysicalDamageResolver } from "./damage";
import type { DamageableCombatant, PhysicalDamagePacket } from "./types";

const hero = { id: "hero", team: "players" };
const goblin = (id = "goblin", hp = 10): DamageableCombatant => Object.freeze({ id, team: "enemies", health: createResource(hp, 10) });
const packet = (overrides: Partial<PhysicalDamagePacket> = {}): PhysicalDamagePacket => ({ sourceId: hero.id, targetId: "goblin", attackId: "slash-1", damageType: "physical", amount: 4, ...overrides });

describe("PhysicalDamageResolver", () => {
  it("applies immutable bounded damage, a minimum of one, and reports actual overkill loss", () => {
    const resolver = new PhysicalDamageResolver();
    const target = goblin();
    const fractional = resolver.resolve(hero, target, packet({ amount: 0.2 }));
    expect(fractional).toMatchObject({ applied: true, amount: 1, killed: false, target: { health: { current: 9, maximum: 10 } } });
    expect(target.health.current).toBe(10);

    const overkill = resolver.resolve(hero, goblin("goblin", 3), packet({ attackId: "slash-2", amount: 99 }));
    expect(overkill).toMatchObject({ applied: true, amount: 3, killed: true, target: { health: { current: 0, maximum: 10 } } });
  });

  it("deduplicates even nonlethal packets, but permits one attack against multiple targets", () => {
    const resolver = new PhysicalDamageResolver();
    expect(resolver.resolve(hero, goblin(), packet()).applied).toBe(true);
    expect(resolver.resolve(hero, goblin(), packet()).applied).toBe(false);
    expect(resolver.resolve(hero, goblin("second"), packet({ targetId: "second" })).applied).toBe(true);
  });

  it("rejects invalid packets and identity mismatches without consuming the hit", () => {
    const resolver = new PhysicalDamageResolver();
    const target = goblin();
    for (const amount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(resolver.resolve(hero, target, packet({ amount })).applied).toBe(false);
    }
    expect(resolver.resolve(hero, target, packet({ attackId: "" })).applied).toBe(false);
    expect(resolver.resolve(hero, target, packet({ targetId: "other" })).applied).toBe(false);
    expect(resolver.resolve({ id: "intruder", team: "players" }, target, packet()).applied).toBe(false);
    expect(resolver.resolve(hero, target, packet()).applied).toBe(true);
  });

  it("filters friendly and self damage, and ignores dead targets", () => {
    const resolver = new PhysicalDamageResolver();
    expect(resolver.resolve(hero, { ...goblin("ally"), team: "players" }, packet({ targetId: "ally" }))).toMatchObject({ applied: false, reason: "friendly-fire" });
    expect(resolver.resolve(hero, { ...goblin("hero"), team: "players" }, packet({ targetId: "hero" }))).toMatchObject({ applied: false, reason: "friendly-fire" });
    expect(resolver.resolve(hero, goblin("dead", 0), packet({ targetId: "dead" }))).toMatchObject({ applied: false, reason: "dead-target" });
  });

  it("emits detached tick-stamped damage and once-only death events", () => {
    const events = new EventCollector();
    const resolver = new PhysicalDamageResolver(events);
    events.beginTick(7);
    resolver.resolve(hero, goblin("goblin", 3), packet({ amount: 9 }));
    expect(resolver.resolve(hero, goblin("goblin", 3), packet({ amount: 9 })).applied).toBe(false);
    const batch = events.flush();
    expect(batch).toEqual([
      { type: "damage-applied", sourceId: "hero", targetId: "goblin", attackId: "slash-1", damageType: "physical", amount: 3, hpRemaining: 0, tick: 7 },
      { type: "entity-died", sourceId: "hero", targetId: "goblin", attackId: "slash-1", damageType: "physical", tick: 7 },
    ]);
    expect(Object.isFrozen(batch[0])).toBe(true);
    expect(Object.isFrozen(batch)).toBe(true);
  });

  it("guards a committed death across distinct attacks using a stale snapshot", () => {
    const staleTarget = goblin("one-hp", 1);

    const withoutCollector = new PhysicalDamageResolver();
    expect(withoutCollector.resolve(hero, staleTarget, packet({ targetId: "one-hp", attackId: "first" }))).toMatchObject({ applied: true, killed: true });
    expect(withoutCollector.resolve(hero, staleTarget, packet({ targetId: "one-hp", attackId: "second" }))).toMatchObject({ applied: false, reason: "dead-target" });

    const events = new EventCollector();
    const withCollector = new PhysicalDamageResolver(events);
    events.beginTick(20);
    expect(withCollector.resolve(hero, staleTarget, packet({ targetId: "one-hp", attackId: "first" })).applied).toBe(true);
    expect(withCollector.resolve(hero, staleTarget, packet({ targetId: "one-hp", attackId: "second" })).applied).toBe(false);
    expect(events.flush().filter((event) => event.type === "entity-died")).toHaveLength(1);
    events.beginTick(21);
    expect(withCollector.resolve(hero, staleTarget, packet({ targetId: "one-hp", attackId: "third" }))).toMatchObject({ applied: false, reason: "dead-target" });
    expect(events.flush()).toEqual([]);
  });
});
