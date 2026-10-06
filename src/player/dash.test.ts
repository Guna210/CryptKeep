import { describe, expect, it } from "vitest";
import { createResource } from "./resources";
import { activateDash, advanceDash, cancelDash, createDashState, DASH_COOLDOWN_SECONDS, DASH_DURATION_SECONDS, DASH_EVASION_SECONDS, DASH_STAMINA_COST, resolveDashCollision } from "./dash";
import { createGrid } from "../dungeon/grid";
import { Tile } from "../dungeon/types";
import { moveCircleOnGrid } from "./collision";

describe("dash", () => {
  it("charges exactly once for a fresh edge and rejects held, cooldown, and insufficient stamina", () => {
    const ready = createDashState();
    const accepted = activateDash(ready, createResource(25,100), true, 0, {x:0,y:0});
    expect(accepted.accepted).toBe(true);
    expect(accepted.stamina.current).toBe(0);
    expect(activateDash(accepted.state, accepted.stamina, false, 0, {x:0,y:1}).accepted).toBe(false);
    expect(activateDash(accepted.state, createResource(100,100), true, 0, {x:0,y:1}).accepted).toBe(false);
    expect(activateDash(ready, createResource(24.999,100), true, 0, {x:0,y:1}).accepted).toBe(false);
    expect(DASH_STAMINA_COST).toBe(25);
  });

  it("locks normalized diagonal/yaw direction and defaults to yaw-forward", () => {
    const diagonal = activateDash(createDashState(),createResource(100,100),true,Math.PI/2,{x:1,y:1}).state;
    const step = advanceDash(diagonal,0.05);
    expect(step.displacement.x).toBeCloseTo(-10/Math.sqrt(2)*0.05);
    expect(step.displacement.z).toBeCloseTo(-10/Math.sqrt(2)*0.05);
    const forward = activateDash(createDashState(),createResource(100,100),true,0,{x:0,y:0}).state;
    expect(forward.direction).toEqual({x:0,z:-1});
  });

  it("caps distance and duration, with a partial final tick and shorter evasion", () => {
    let state = activateDash(createDashState(),createResource(100,100),true,0,{x:0,y:1}).state;
    let distance = 0;
    let firstEvasion = 0;
    for (let i=0;i<20;i++) { const s=advanceDash(state,0.02); distance+=Math.hypot(s.displacement.x,s.displacement.z); if(s.evading) firstEvasion+=0.02; state=s.state; }
    expect(distance).toBeCloseTo(2.2);
    expect(state.active).toBe(false);
    expect(firstEvasion).toBeCloseTo(DASH_EVASION_SECONDS);
    expect(firstEvasion).toBeLessThan(DASH_DURATION_SECONDS);
    expect(state.cooldownRemainingSeconds).toBeCloseTo(DASH_COOLDOWN_SECONDS-0.4);
    const partial = advanceDash({...activateDash(createDashState(),createResource(100,100),true,0,{x:0,y:1}).state,remainingSeconds:0.005},0.02);
    expect(partial.displacement.z).toBeCloseTo(-0.05);
    expect(partial.state.active).toBe(false);
  });

  it("makes cooldown ready exactly at its simulation-time boundary", () => {
    let state=activateDash(createDashState(),createResource(100,100),true,0,{x:0,y:1}).state;
    state=advanceDash(state,DASH_DURATION_SECONDS).state;
    state=advanceDash(state,DASH_COOLDOWN_SECONDS-DASH_DURATION_SECONDS).state;
    expect(state.cooldownRemainingSeconds).toBe(0);
    expect(activateDash(state,createResource(75,100),true,0,{x:0,y:1}).accepted).toBe(true);
  });

  it("cancels motion/evasion while retaining cooldown", () => {
    const state=activateDash(createDashState(),createResource(100,100),true,0,{x:0,y:1}).state;
    const canceled=cancelDash(state);
    expect(canceled.active).toBe(false);
    expect(canceled.evasionRemainingSeconds).toBe(0);
    expect(canceled.cooldownRemainingSeconds).toBe(state.cooldownRemainingSeconds);
  });

  it("ends on the first circle contact and discards wall-slide distance", () => {
    const grid=createGrid(7,5,Array.from({length:35},(_,i)=>Math.floor(i/7)>=1&&Math.floor(i/7)<=3&&i%7===3?Tile.Solid:Tile.Walkable));
    const state=activateDash(createDashState(),createResource(100,100),true,0,{x:1,y:0}).state;
    const step=advanceDash(state,DASH_DURATION_SECONDS);
    const moved=moveCircleOnGrid(grid,{x:5,z:8.2},step.displacement,0.28);
    expect(moved.contacts.length).toBeGreaterThan(0);
    const resolved=resolveDashCollision(step,moved);
    expect(resolved.position).toEqual({x:moved.contacts[0]!.x,z:moved.contacts[0]!.z});
    expect(resolved.state.active).toBe(false);
    expect(resolved.state.evasionRemainingSeconds).toBe(0);
    expect(resolved.velocity).toEqual({x:0,y:0,z:0});
    expect(resolved.position.x).toBeLessThan(moved.position.x);
  });
});
