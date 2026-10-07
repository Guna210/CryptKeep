import { describe, expect, it } from "vitest";
import type { GameCommand } from "../core/commands";
import { createResource, createResourceRegenTimers } from "../player/resources";
import { createWeaponRuntime, dispatchWeapon } from "./weapon-dispatch";
import type { CurrentWeapon, WeaponState } from "../weapons/types";

const idle: WeaponState = Object.freeze({ weaponClass:"sword", phase:"idle", elapsedSeconds:0, attackId:null, primaryHeld:false });
function command(edges: GameCommand["edges"] = [], cancellations: GameCommand["cancellations"] = [], held: GameCommand["held"] = []): GameCommand {
  return Object.freeze({ movement:Object.freeze({x:0,y:0}), look:Object.freeze({x:0,y:0}), held, pressed:[], released:[], edges, cancellations });
}
function weapon(update: CurrentWeapon["update"], cancel: CurrentWeapon["cancel"] = (state) => idle): CurrentWeapon {
  return Object.freeze({ weaponClass:"sword", update, cancel });
}
const base = () => ({ weapon: weapon((_s,_c) => ({state:idle,attacks:[],events:[]})), state:idle,
  command:command(), dtSeconds:1/60, stamina:createResource(40,100), regenTimers:Object.freeze({staminaIdleSeconds:.4,manaIdleSeconds:.2}), runtime:createWeaponRuntime("floor-1") });

describe("weapon dispatcher transaction contract", () => {
  it("preserves shared stamina identity and resets the shared regen delay on one accepted release cost", () => {
    let attackId = "";
    const input = base();
    input.weapon = weapon((_s,_c,ctx) => {
      attackId = ctx.nextAttackId();
      const commit = ctx.commitStamina(attackId, 12);
      return { state:idle, events:[], attacks:commit.accepted ? [{attackId,weaponClass:"sword",kind:"sword-light",phase:"active-hit",damage:8,costCommitmentId:attackId}] : [] };
    });
    const result = dispatchWeapon(input);
    expect(result.stamina).toEqual(createResource(28,100));
    expect(result.attacks).toHaveLength(1);
    expect(result.attacks[0]?.attackId).toBe(attackId);
    expect(result.regenTimers.staminaIdleSeconds).toBe(0);
  });

  it("rejects insufficient stamina without attack emission, charge, or cost", () => {
    const input = base(); input.stamina = createResource(3,100);
    input.weapon = weapon((_s,_c,ctx) => {
      const id = ctx.nextAttackId();
      const commit = ctx.commitStamina(id, 12);
      return { state:idle, events:[], attacks:commit.accepted ? [{attackId:id,weaponClass:"sword",kind:"sword-heavy",phase:"active-hit",damage:30,costCommitmentId:id}] : [] };
    });
    const result = dispatchWeapon(input);
    expect(result.stamina).toEqual(input.stamina);
    expect(result.attacks).toEqual([]);
    expect(result.regenTimers).toBe(input.regenTimers);
    expect(result.events).toContainEqual(expect.objectContaining({type:"attack-rejected",reason:"insufficient-resource"}));
  });

  it("prevents duplicate attack commitment IDs from charging twice", () => {
    const input = base();
    input.runtime = Object.freeze({...input.runtime,nextSequence:1,committedAttackIds:Object.freeze(["floor-1:0"])});
    input.weapon = weapon((_s,_c,ctx) => {
      const first = ctx.commitStamina("floor-1:0", 10);
      expect(ctx.stamina.current).toBe(40);
      const second = ctx.commitStamina(ctx.nextAttackId(), 10);
      expect(ctx.stamina.current).toBe(second.accepted ? 30 : 40);
      expect(first.accepted).toBe(false);
      return {state:idle,events:[],attacks:[]};
    });
    const result = dispatchWeapon(input);
    expect(result.stamina.current).toBe(30);
    expect(result.events).toContainEqual(expect.objectContaining({type:"attack-rejected",reason:"duplicate-commitment"}));
    expect(result.attacks).toEqual([]);
  });

  it("lets active-hit requests after release use the ID without another cost", () => {
    const input = base();
    input.runtime = Object.freeze({...input.runtime,nextSequence:1,committedAttackIds:Object.freeze(["floor-1:0"])});
    input.weapon = weapon((_s,_c) => ({state:idle,events:[],attacks:[{attackId:"floor-1:0",costCommitmentId:"floor-1:0",weaponClass:"sword",kind:"sword-heavy",phase:"active-hit",damage:30}]}));
    const result = dispatchWeapon(input);
    expect(result.attacks).toHaveLength(1);
    expect(result.stamina).toBe(input.stamina);
  });

  it("cancels old state then processes fresh post-clear press/release edges in the same command", () => {
    let seenFreshEdges = false, canceled = 0;
    const input = base();
    input.weapon = weapon((_s,c,ctx) => { seenFreshEdges = c.cancellations.length === 0 && c.edges.length === 2 && c.edges[0]?.type === "pressed" && c.edges[1]?.type === "released"; ctx.commitStamina(ctx.nextAttackId(), 10); return {state:idle,events:[],attacks:[]}; }, () => { canceled++; return idle; });
    input.command = command([{action:"primary",type:"pressed"},{action:"primary",type:"released"}], ["pause"], []);
    const result = dispatchWeapon(input);
    expect(canceled).toBe(1);
    expect(seenFreshEdges).toBe(true);
    expect(result.attacks).toEqual([]);
    expect(result.stamina.current).toBe(30);
    expect(result.runtime.nextSequence).toBe(1);
  });

  it("passes an ordinary primary release through the update path", () => {
    let releaseSeen = false;
    const input = base();
    input.weapon = weapon((_s,c) => { releaseSeen = c.edges.some((e) => e.action === "primary" && e.type === "released"); return {state:idle,attacks:[],events:[]}; });
    dispatchWeapon({...input, command:command([{action:"primary",type:"pressed"},{action:"primary",type:"released"}])});
    expect(releaseSeen).toBe(true);
  });

  it("preserves concrete weapon state extensions through the dispatch boundary", () => {
    interface ChargedSwordState extends WeaponState { readonly chargeSeconds: number }
    const state: ChargedSwordState = Object.freeze({...idle,chargeSeconds:.4});
    const current: CurrentWeapon<ChargedSwordState> = Object.freeze({weaponClass:"sword",
      update:(s:ChargedSwordState) => ({state:Object.freeze({...s,chargeSeconds:s.chargeSeconds + .1}),attacks:[],events:[]}),
      cancel:(s:ChargedSwordState) => Object.freeze({...s,phase:"idle",chargeSeconds:0}),
    });
    const result = dispatchWeapon({...base(),state,weapon:current});
    expect(result.state.chargeSeconds).toBe(.5);
  });
});
