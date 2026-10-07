import { describe, expect, it } from "vitest";
import type { GameCommand, InputEdge } from "../core/commands";
import { createResource, createResourceRegenTimers } from "../player/resources";
import { createWeaponRuntime, dispatchWeapon } from "../combat/weapon-dispatch";
import { createSwordState, isSwordCharging, SWORD_CHARGE_THRESHOLD_SECONDS, SWORD_FULL_CHARGE_SECONDS, SWORD_HEAVY_ACTIVE_SECONDS, SWORD_HEAVY_MAX_DAMAGE, SWORD_HEAVY_MAX_STAMINA_COST, SWORD_HEAVY_RECOVERY_SECONDS, SWORD_HEAVY_WINDUP_SECONDS, SWORD_LIGHT_ACTIVE_SECONDS, SWORD_LIGHT_RECOVERY_SECONDS, SWORD_LIGHT_STAMINA_COST, SWORD_LIGHT_WINDUP_SECONDS, sword, swordChargeFraction, updateSword } from "./sword";
import type { WeaponUpdateContext } from "./types";

function command(edges: readonly InputEdge[] = [], cancellations: GameCommand["cancellations"] = []): GameCommand {
  return Object.freeze({ movement:Object.freeze({x:0,y:0}), look:Object.freeze({x:0,y:0}), held:Object.freeze([]), pressed:Object.freeze([]), released:Object.freeze([]), edges:Object.freeze([...edges]), cancellations:Object.freeze([...cancellations]) });
}
const press: InputEdge = Object.freeze({ action:"primary", type:"pressed" });
const release: InputEdge = Object.freeze({ action:"primary", type:"released" });
function context(dtSeconds: number, commit: WeaponUpdateContext["commitStamina"] = () => ({accepted:true, stamina:createResource(90,100)}), nextAttackId: () => string = () => "test:0"): WeaponUpdateContext {
  return Object.freeze({ dtSeconds, stamina:createResource(100,100), nextAttackId, commitStamina:commit });
}
function dispatched(state = createSwordState(), edges: readonly InputEdge[] = [], dtSeconds = 1/60, stamina = createResource(100,100), runtimeId = "sword-test", cancellations: GameCommand["cancellations"] = []) {
  return dispatchWeapon({ weapon:sword, state, command:command(edges,cancellations), dtSeconds, stamina, regenTimers:createResourceRegenTimers(), runtime:createWeaponRuntime(runtimeId) });
}

describe("sword tap timing", () => {
  it("keeps a press in anticipation without spending or attacking, and commits a same-tick tap once", () => {
    const held = dispatched(createSwordState(), [press]);
    expect(held.state.phase).toBe("anticipation");
    expect(held.state.primaryHeld).toBe(true);
    expect(held.stamina.current).toBe(100);
    expect(held.attacks).toEqual([]);

    const tap = dispatched(createSwordState(), [press,release], SWORD_LIGHT_WINDUP_SECONDS);
    expect(tap.stamina.current).toBe(90);
    expect(tap.regenTimers.staminaIdleSeconds).toBe(0);
    expect(tap.state.phase).toBe("active");
    expect(tap.state.elapsedSeconds).toBe(0);
    expect(tap.attacks).toEqual([expect.objectContaining({attackId:"sword-test:0", costCommitmentId:"sword-test:0", kind:"sword-light", damage:18})]);
  });

  it("does not auto-fire during a long hold and emits the light attack only after release", () => {
    const hold = updateSword(createSwordState(), command([press]), context(2));
    expect(hold.state.phase).toBe("anticipation");
    expect(hold.state.elapsedSeconds).toBe(2);
    expect(hold.attacks).toEqual([]);
    const committed = updateSword(hold.state, command([release]), context(0));
    expect(committed.state.phase).toBe("windup");
    expect(committed.attacks).toEqual([]);
  });

  it("emits exactly at the active boundary and spends only once through later active ticks", () => {
    const first = dispatched(createSwordState(), [press,release], SWORD_LIGHT_WINDUP_SECONDS - 0.001);
    expect(first.state.phase).toBe("windup");
    expect(first.attacks).toEqual([]);
    const onset = dispatched(first.state, [], 0.001, first.stamina, "sword-test-next");
    // A separately supplied runtime would invalidate an ID commitment, so use same runtime below for the transaction case.
    expect(onset.state.phase).toBe("active");
    const transaction = dispatchWeapon({ weapon:sword, state:createSwordState(), command:command([press,release]), dtSeconds:SWORD_LIGHT_WINDUP_SECONDS,
      stamina:createResource(100,100), regenTimers:createResourceRegenTimers(), runtime:createWeaponRuntime("active-test") });
    expect(transaction.attacks).toHaveLength(1);
    const activeTick = dispatchWeapon({ weapon:sword, state:transaction.state, command:command(), dtSeconds:SWORD_LIGHT_ACTIVE_SECONDS / 2,
      stamina:transaction.stamina, regenTimers:transaction.regenTimers, runtime:transaction.runtime });
    expect(activeTick.attacks).toEqual([]);
    expect(activeTick.stamina.current).toBe(90);
  });

  it("carries elapsed time across active, recovery, and idle boundaries", () => {
    const total = SWORD_LIGHT_WINDUP_SECONDS + SWORD_LIGHT_ACTIVE_SECONDS + SWORD_LIGHT_RECOVERY_SECONDS;
    const exact = dispatched(createSwordState(), [press,release], total);
    expect(exact.state.phase).toBe("idle");
    expect(exact.attacks).toHaveLength(1);
    const overflow = dispatched(createSwordState(), [press,release], total + 0.05);
    expect(overflow.state.phase).toBe("idle");
    expect(overflow.state.elapsedSeconds).toBe(0);
    const blocks = dispatched(createSwordState(), [press,release], SWORD_LIGHT_WINDUP_SECONDS + SWORD_LIGHT_ACTIVE_SECONDS + 0.1);
    const rejectedDuringRecovery = dispatched(blocks.state, [press,release], 0.01, blocks.stamina, "separate-runtime");
    expect(rejectedDuringRecovery.state.phase).toBe("recovery");
  });

  it("preserves timing across different tick schedules", () => {
    const run = (parts: number[]) => {
      let state = createSwordState(); let stamina = createResource(100,100); let regen = createResourceRegenTimers();
      let runtime = createWeaponRuntime("schedule"); const attacks = [] as unknown[];
      const edgesByTick = [[press,release] as const, ...parts.slice(1).map(() => [] as const)];
      for (let i = 0; i < parts.length; i++) {
        const result = dispatchWeapon({weapon:sword,state,command:command(edgesByTick[i] ?? []),dtSeconds:parts[i]!,stamina,regenTimers:regen,runtime});
        state=result.state; stamina=result.stamina; regen=result.regenTimers; runtime=result.runtime; attacks.push(...result.attacks);
      }
      return {state,stamina,attacks};
    };
    const single = run([0.5]);
    const sixtyHz = run(Array.from({length:30}, () => 1/60));
    const mixed = run([0.011,0.017,0.093,0.006,0.14,0.233]);
    expect(single.state).toEqual(sixtyHz.state);
    expect(single.state).toEqual(mixed.state);
    expect(single.attacks).toHaveLength(1);
    expect(sixtyHz.attacks).toHaveLength(1);
    expect(mixed.attacks).toHaveLength(1);
  });

  it("rejects insufficient stamina cleanly without issuing an attack ID or spending", () => {
    let allocated = 0;
    const result = updateSword(createSwordState(), command([press,release]), context(0,
      (_id,amount) => ({accepted:amount <= 5,reason:"insufficient-resource",stamina:createResource(5,100)}), () => `test:${allocated++}`));
    expect(result.state.phase).toBe("idle");
    expect(result.state.attackId).toBeNull();
    expect(result.attacks).toEqual([]);
    expect(allocated).toBe(1);
    expect(SWORD_LIGHT_STAMINA_COST).toBe(10);
  });

  it("cancels pending anticipation without release, and preserves already committed stamina", () => {
    const pending = dispatched(createSwordState(), [press]);
    const canceled = dispatched(pending.state, [], 0.2, pending.stamina, "cancel-pending", ["pause"]);
    expect(canceled.state).toEqual(createSwordState());
    expect(canceled.stamina.current).toBe(100);

    const committed = dispatched(createSwordState(), [press,release], 0.02);
    const canceledAfterCommit = dispatched(committed.state, [], 0, committed.stamina, "cancel-committed", ["blur"]);
    expect(canceledAfterCommit.state).toEqual(createSwordState());
    expect(canceledAfterCommit.stamina.current).toBe(90);
  });

  it("issues distinct runtime IDs after repeated sword resets", () => {
    let state = createSwordState(); let stamina=createResource(100,100); let regen=createResourceRegenTimers(); let runtime=createWeaponRuntime("repeat");
    const ids: string[] = [];
    for (let n=0;n<3;n++) {
      const commit=dispatchWeapon({weapon:sword,state,command:command([press,release]),dtSeconds:SWORD_LIGHT_WINDUP_SECONDS,stamina,regenTimers:regen,runtime});
      ids.push(...commit.attacks.map((attack)=>attack.attackId));
      // Complete recovery, retaining dispatcher's monotonic runtime ID counter.
      const done=dispatchWeapon({weapon:sword,state:commit.state,command:command(),dtSeconds:SWORD_LIGHT_ACTIVE_SECONDS+SWORD_LIGHT_RECOVERY_SECONDS,stamina:commit.stamina,regenTimers:commit.regenTimers,runtime:commit.runtime});
      state=done.state; stamina=done.stamina; regen=done.regenTimers; runtime=done.runtime;
    }
    expect(ids).toEqual(["repeat:0","repeat:1","repeat:2"]);
  });

  it("rejects invalid simulation time as a programmer error", () => {
    for (const dt of [NaN, Infinity, -0.01]) expect(() => updateSword(createSwordState(), command(), context(dt))).toThrow(RangeError);
  });
});

describe("sword charge and interruption", () => {
  function releasedAfter(heldSeconds: number, stamina = createResource(100,100)) {
    const held = updateSword(createSwordState(), command([press]), context(heldSeconds));
    return dispatchWeapon({ weapon:sword, state:held.state, command:command([release]), dtSeconds:0, stamina,
      regenTimers:createResourceRegenTimers(), runtime:createWeaponRuntime(`charge-${heldSeconds}`) });
  }

  it("uses the exact threshold convention and keeps the light path below it", () => {
    const below = releasedAfter(SWORD_CHARGE_THRESHOLD_SECONDS - 1e-8);
    const at = releasedAfter(SWORD_CHARGE_THRESHOLD_SECONDS);
    const above = releasedAfter(SWORD_CHARGE_THRESHOLD_SECONDS + 1e-8);
    expect(below.state.committedKind).toBe("sword-light");
    expect(below.state.committedDamage).toBe(18);
    expect(below.stamina.current).toBe(90);
    expect(at.state.committedKind).toBe("sword-heavy");
    expect(at.state.committedDamage).toBe(30);
    expect(at.stamina.current).toBe(82);
    expect(above.state.committedDamage).toBeGreaterThan(30);
    expect(above.stamina.current).toBeLessThan(82);
  });

  it("keeps representable durations immediately below the threshold light", () => {
    for (const heldSeconds of [0.25 - 1e-16, 0.25 - 2e-16]) {
      const result = releasedAfter(heldSeconds);
      expect(result.state.committedKind).toBe("sword-light");
      expect(result.state.committedDamage).toBe(18);
      expect(result.stamina.current).toBe(90);
    }
  });

  it("exposes charge to readers and caps damage, cost, and charge fraction at full power", () => {
    const initial = updateSword(createSwordState(), command([press]), context(0));
    const threshold = updateSword(initial.state, command(), context(SWORD_CHARGE_THRESHOLD_SECONDS));
    expect(isSwordCharging(threshold.state)).toBe(true);
    expect(swordChargeFraction(threshold.state)).toBe(0);
    const capped = updateSword(threshold.state, command(), context(4));
    expect(swordChargeFraction(capped.state)).toBe(1);
    const result = dispatchWeapon({ weapon:sword, state:capped.state, command:command([release]), dtSeconds:0,
      stamina:createResource(100,100), regenTimers:createResourceRegenTimers(), runtime:createWeaponRuntime("full-charge") });
    expect(result.state.committedDamage).toBe(SWORD_HEAVY_MAX_DAMAGE);
    expect(result.stamina.current).toBe(100 - SWORD_HEAVY_MAX_STAMINA_COST);
    const onset = dispatchWeapon({ weapon:sword, state:result.state, command:command(), dtSeconds:SWORD_HEAVY_WINDUP_SECONDS,
      stamina:result.stamina, regenTimers:result.regenTimers, runtime:result.runtime });
    expect(onset.attacks).toEqual([expect.objectContaining({kind:"sword-heavy",damage:54})]);
    expect(onset.state.committedTiming).toEqual({windupSeconds:SWORD_HEAVY_WINDUP_SECONDS,activeSeconds:SWORD_HEAVY_ACTIVE_SECONDS,recoverySeconds:SWORD_HEAVY_RECOVERY_SECONDS});
  });

  it("reaches threshold after 15 ticks and full charge after 72 ticks at 60 Hz", () => {
    let state = updateSword(createSwordState(), command([press]), context(0)).state;
    for (let i=0;i<15;i++) state = updateSword(state, command(), context(1/60)).state;
    expect(state.elapsedSeconds).toBe(0.25);
    expect(isSwordCharging(state)).toBe(true);
    expect(swordChargeFraction(state)).toBe(0);
    for (let i=15;i<72;i++) state = updateSword(state, command(), context(1/60)).state;
    expect(state.elapsedSeconds).toBe(1.2);
    expect(swordChargeFraction(state)).toBe(1);
  });

  it("uses heavy timings and never downgrades a rejected heavy release to light", () => {
    const short = releasedAfter(0.25);
    const hit = dispatchWeapon({weapon:sword,state:short.state,command:command(),dtSeconds:SWORD_HEAVY_WINDUP_SECONDS,
      stamina:short.stamina,regenTimers:short.regenTimers,runtime:short.runtime});
    expect(hit.attacks[0]).toMatchObject({kind:"sword-heavy",damage:30});
    const rejected = releasedAfter(0.8, createResource(20,100));
    expect(rejected.state).toEqual(createSwordState());
    expect(rejected.stamina.current).toBe(20);
    expect(rejected.events).toContainEqual(expect.objectContaining({type:"attack-rejected",reason:"insufficient-resource"}));
    expect(rejected.attacks).toEqual([]);
  });

  it("carries a heavy attack through all phase boundaries and preserves immutable committed state", () => {
    const held = updateSword(createSwordState(), command([press]), context(0.25));
    const committed = dispatchWeapon({weapon:sword,state:held.state,command:command([release]),dtSeconds:0,
      stamina:createResource(100,100),regenTimers:createResourceRegenTimers(),runtime:createWeaponRuntime("heavy-carry")});
    expect(Object.isFrozen(committed.state)).toBe(true);
    expect(Object.isFrozen(committed.state.committedTiming)).toBe(true);
    const elapsed = dispatchWeapon({weapon:sword,state:committed.state,command:command(),dtSeconds:SWORD_HEAVY_WINDUP_SECONDS+SWORD_HEAVY_ACTIVE_SECONDS+SWORD_HEAVY_RECOVERY_SECONDS,
      stamina:committed.stamina,regenTimers:committed.regenTimers,runtime:committed.runtime});
    expect(elapsed.state).toEqual(createSwordState());
    expect(elapsed.attacks).toHaveLength(1);
    expect(elapsed.attacks[0]).toMatchObject({kind:"sword-heavy",damage:30});
  });

  it("cancels an uncommitted hold and an already committed heavy without refund", () => {
    const held = dispatchWeapon({weapon:sword,state:createSwordState(),command:command([press]),dtSeconds:0.5,
      stamina:createResource(100,100),regenTimers:createResourceRegenTimers(),runtime:createWeaponRuntime("cancel-hold")});
    const canceled = dispatchWeapon({weapon:sword,state:held.state,command:command([], ["weapon-switch"]),dtSeconds:0.1,
      stamina:held.stamina,regenTimers:held.regenTimers,runtime:held.runtime});
    expect(canceled.state).toEqual(createSwordState());
    expect(canceled.stamina.current).toBe(100);
    expect(canceled.attacks).toEqual([]);
    const committed = dispatchWeapon({weapon:sword,state:createSwordState(),command:command([press]),dtSeconds:0.25,
      stamina:createResource(100,100),regenTimers:createResourceRegenTimers(),runtime:createWeaponRuntime("cancel-after")});
    const released = dispatchWeapon({weapon:sword,state:committed.state,command:command([release]),dtSeconds:0,
      stamina:committed.stamina,regenTimers:committed.regenTimers,runtime:committed.runtime});
    const after = dispatchWeapon({weapon:sword,state:released.state,command:command([], ["pause"]),dtSeconds:0,
      stamina:released.stamina,regenTimers:released.regenTimers,runtime:released.runtime});
    expect(after.state).toEqual(createSwordState());
    expect(after.stamina.current).toBe(82);
    expect(after.attacks).toEqual([]);
  });
});
