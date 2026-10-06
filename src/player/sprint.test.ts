import { describe, expect, it } from "vitest";
import { generateFloor } from "../dungeon/generate";
import { createResource } from "./resources";
import { createPlayerState } from "./state";
import { commitSprintMovement, decideSprint, SPRINT_SPEED_METERS_PER_SECOND, SPRINT_STAMINA_PER_SECOND } from "./sprint";
import { InputSampler } from "../core/input";

describe("sprint eligibility and applied movement cost", () => {
  const dt = 1 / 60;
  const axes = {x:0,y:1};

  it("uses the sprint cap only for held, active, affordable nonzero movement", () => {
    const stamina = createResource(100,100);
    expect(decideSprint(stamina, dt, {held:true,active:true,axes})).toEqual({eligible:true,maximumSpeed:SPRINT_SPEED_METERS_PER_SECOND,staminaCost:SPRINT_STAMINA_PER_SECOND*dt});
    for (const restricted of [
      {held:false,active:true,axes}, {held:true,active:false,axes}, {held:true,active:true,axes:{x:0,y:0}},
      {held:true,active:true,axes:{x:1,y:0},secondaryHeld:true}, {held:true,active:true,axes,healing:true},
      {held:true,active:true,axes,stanceRestricted:true},
    ]) expect(decideSprint(stamina,dt,restricted)).toMatchObject({eligible:false,maximumSpeed:3.5,staminaCost:0});
    const sampler = new InputSampler();
    sampler.press("moveForward"); sampler.press("moveBackward");
    expect(decideSprint(stamina,dt,{held:true,active:true,axes:sampler.sample().movement})).toMatchObject({eligible:false,maximumSpeed:3.5,staminaCost:0});
    expect(decideSprint(createResource(SPRINT_STAMINA_PER_SECOND*dt-1e-6,100),dt,{held:true,active:true,axes}).eligible).toBe(false);
  });

  it("charges exactly once only when collision-resolved displacement is nonzero", () => {
    const player = createPlayerState(generateFloor({campaignSeed:"sprint-pure",floorNumber:1}).plan).state;
    const decision = decideSprint(player.stamina,dt,{held:true,active:true,axes});
    expect(commitSprintMovement(player,decision,{x:0,z:0})).toEqual({state:player,spent:false});
    expect(commitSprintMovement(player,decision,{x:0,z:1e-10})).toEqual({state:player,spent:false});
    const moved = commitSprintMovement(player,decision,{x:0,z:-0.01});
    expect(moved.spent).toBe(true);
    expect(moved.state.stamina.current).toBeCloseTo(100-SPRINT_STAMINA_PER_SECOND*dt);
    const opposing = decideSprint(player.stamina,dt,{held:true,active:true,axes:{x:0,y:0}});
    expect(commitSprintMovement(player,opposing,{x:0,z:0}).spent).toBe(false);
  });
});
