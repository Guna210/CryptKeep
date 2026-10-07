import { describe, expect, it } from "vitest";
import type { GameCommand, InputEdge } from "../core/commands";
import { createResource, createResourceRegenTimers } from "../player/resources";
import { createWeaponRuntime, dispatchWeapon } from "../combat/weapon-dispatch";
import { createSwordState, SWORD_LIGHT_ACTIVE_SECONDS, SWORD_LIGHT_RECOVERY_SECONDS, SWORD_LIGHT_STAMINA_COST, SWORD_LIGHT_WINDUP_SECONDS, sword, updateSword } from "./sword";
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
