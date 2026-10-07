import { createCombatRoomFixture } from "./combat-room";
import { createRenderedGrid, type RenderedFloor } from "../../render/floor";
import type { MaterialLibrary } from "../../render/materials";
import type { WorldRenderer } from "../../render/renderer";
import type { CombatActor } from "../../app/combat-session";
import { createTrainingTargetView as createPixelTargetView } from "../../render/training-target";

export type NativeTrainingVariant="clear"|"obstructed";
export function getNativeTraining(variant:NativeTrainingVariant) {
  if(!import.meta.env.DEV && import.meta.env.MODE!=="test") throw new Error("Native training is development only");
  const fixture=createCombatRoomFixture({obstructed:variant==="obstructed"});
  const snapshot=fixture.snapshot(); fixture.dispose();
  const actor:CombatActor=Object.freeze({...snapshot.target,position:snapshot.aliveColliders[0]!.position,radius:snapshot.aliveColliders[0]!.radius});
  return Object.freeze({grid:snapshot.grid,pose:Object.freeze({x:snapshot.player.x,z:snapshot.player.z,yaw:snapshot.player.yawRadians}),actor,label:snapshot.label,variant:snapshot.variant});
}

export function renderTrainingGrid(grid:Parameters<typeof createRenderedGrid>[0],library:MaterialLibrary):RenderedFloor {
  if(!import.meta.env.DEV && import.meta.env.MODE!=="test") throw new Error("Native training renderer is development only");
  return createRenderedGrid(grid,library);
}

/** A small DEV-only target mesh and health strip driven by CombatSession snapshots. */
export function createTrainingTargetView(world:Pick<WorldRenderer,"scene">,actor:CombatActor) {
  if(!import.meta.env.DEV && import.meta.env.MODE!=="test") throw new Error("Native training targets are development only");
  const view=createPixelTargetView(actor); view.root.name="DEV pixel training target"; view.root.position.set(actor.position.x,0,actor.position.z); world.scene.add(view.root);
  return {update(health:number,maximum:number) {view.update({...actor,health:{current:health,maximum}});},dispose(){view.dispose();}};
}
