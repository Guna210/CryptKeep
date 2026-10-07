import { EventCollector, type EventBatch, type Unsubscribe } from "../core/events";
import type { GameCommand } from "../core/commands";
import type { Grid } from "../dungeon/types";
import { PhysicalDamageResolver } from "../combat/damage";
import { queryMeleeTargets, type MeleeTargetCollider } from "../combat/queries";
import { createSwordState, sword, type SwordState } from "../weapons/sword";
import { createWeaponRuntime, dispatchWeapon, type WeaponRuntime } from "../combat/weapon-dispatch";
import type { DamageableCombatant } from "../combat/types";
import type { PlayerState } from "../player/state";
import type { ResourceRegenTimers } from "../player/resources";
import type { InputCancellationReason } from "../core/commands";

let runtimeSequence = 0;
export interface CombatActor extends DamageableCombatant { readonly position: Readonly<{x:number;z:number}>; readonly radius:number }
export interface CombatStepResult { readonly state:SwordState; readonly stamina:PlayerState["stamina"]; readonly regenTimers:ResourceRegenTimers; readonly staminaSpent:boolean }
export interface CombatSnapshot { readonly sword:SwordState; readonly actors:readonly CombatActor[]; readonly disposed:boolean }

/** Native sword simulation. The caller owns player resources and the session clock. */
export class CombatSession {
  readonly events = new EventCollector();
  private resolver = new PhysicalDamageResolver(this.events);
  private runtime: WeaponRuntime = this.newRuntime();
  private swordState = createSwordState();
  private actors: CombatActor[];
  private disposed = false;
  constructor(private grid:Grid, actors:readonly CombatActor[] = [], private readonly playerIdentity:Readonly<{id:string;team:string}> = Object.freeze({id:"player",team:"players"})) { this.actors = actors.map(copyActor); }
  subscribe(listener:(batch:EventBatch)=>void):Unsubscribe { this.assertLive(); return this.events.subscribe(listener); }
  step(player:PlayerState, command:GameCommand, dtSeconds:number, tick:number, regenTimers:ResourceRegenTimers):CombatStepResult {
    this.assertLive(); this.events.beginTick(tick);
    const result = dispatchWeapon({weapon:sword,state:this.swordState,command,dtSeconds,stamina:player.stamina,regenTimers,runtime:this.runtime});
    this.swordState=result.state; this.runtime=result.runtime;
    for(const attack of result.attacks) {
      const targets: MeleeTargetCollider[] = this.actors.filter(a=>a.health.current>0).map(a=>({id:a.id,position:a.position,radius:a.radius}));
      const hits=queryMeleeTargets({origin:player.pose,yawRadians:player.pose.yaw,grid:this.grid,targets});
      for(const hit of hits) {
        const index=this.actors.findIndex(a=>a.id===hit.targetId); const target=this.actors[index];
        if(!target) continue;
        const applied=this.resolver.resolve(this.playerIdentity,target,{sourceId:this.playerIdentity.id,targetId:target.id,attackId:attack.attackId,damageType:"physical",amount:attack.damage});
        if(applied.applied) this.actors[index]=copyActor({...target,health:applied.target.health});
      }
    }
    this.events.flush();
    return Object.freeze({state:this.swordState,stamina:result.stamina,regenTimers:result.regenTimers,staminaSpent:result.stamina.current!==player.stamina.current});
  }
  cancel(reason:InputCancellationReason):void { this.assertLive(); this.swordState=sword.cancel(this.swordState,reason); }
  setWorld(grid:Grid, actors:readonly CombatActor[]):void { this.assertLive(); this.grid=grid; this.actors=actors.map(copyActor); this.resolver=new PhysicalDamageResolver(this.events); this.swordState=createSwordState(); this.runtime=this.newRuntime(); }
  snapshot():CombatSnapshot { this.assertLive(); return Object.freeze({sword:this.swordState,actors:Object.freeze(this.actors.map(copyActor)),disposed:false}); }
  dispose():void { if(this.disposed)return; this.disposed=true; this.events.dispose(); this.actors=[]; this.swordState=createSwordState(); }
  private newRuntime():WeaponRuntime { return createWeaponRuntime(`sword-runtime-${++runtimeSequence}`); }
  private assertLive():void { if(this.disposed) throw new Error("Combat session is disposed"); }
}
function copyActor(actor:CombatActor):CombatActor { return Object.freeze({...actor,position:Object.freeze({...actor.position}),health:Object.freeze({...actor.health})}); }
