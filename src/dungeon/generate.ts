import { fnv1aUtf8, normalizeSeed, deriveStream } from "../core/rng";
import { createFloorPlan } from "./types";
import { layoutDefaults, placeRooms } from "./rooms";
import { connectRooms } from "./corridors";
import { assignRoles, type RoleFloorPlan } from "./roles";
import { createFallbackFloor } from "./fallback";
import { validateFloor } from "./validate";

export interface GenerateFloorConfig { readonly campaignSeed:string; readonly floorNumber:number; readonly generatorVersion?:string }
export type AttemptFactory = (context:Readonly<{floorSeed:string;floorNumber:number;generatorVersion:string;width:number;height:number;attemptIndex:number}>)=>unknown;
export interface GenerateFloorOptions { readonly attemptFactory?:AttemptFactory }
export interface GenerationDiagnostics { readonly baseFloorSeed:string; readonly attempts:number; readonly usedFallback:boolean; readonly rejections:readonly string[]; readonly fallbackReason?:string }
export interface GeneratedFloor { readonly plan:RoleFloorPlan; readonly diagnostics:GenerationDiagnostics; readonly contentHash:string }
const MAX_ATTEMPTS=8;
function freezeDeep<T>(value:T):T { if(value&&typeof value==="object"&&!Object.isFrozen(value)){for(const child of Object.values(value as any))freezeDeep(child);Object.freeze(value);}return value; }
function copyPlan(value:any):RoleFloorPlan {
  const cpCell=(c:any)=>({x:c.x,z:c.z});
  return {floorNumber:value.floorNumber,floorSeed:value.floorSeed,generatorVersion:value.generatorVersion,width:value.width,height:value.height,
    tiles:value.tiles.slice(),rooms:value.rooms.map((r:any)=>({id:r.id,rect:{x:r.rect.x,z:r.rect.z,width:r.rect.width,height:r.rect.height}})),
    edges:value.edges.map((e:any)=>({fromRoomId:e.fromRoomId,toRoomId:e.toRoomId,kind:e.kind,fromCell:cpCell(e.fromCell),toCell:cpCell(e.toCell),path:e.path.map(cpCell)})),
    roles:{entryRoomId:value.roles.entryRoomId,bossRoomId:value.roles.bossRoomId,exitRoomId:value.roles.exitRoomId,entry:cpCell(value.roles.entry),approach:cpCell(value.roles.approach),boss:cpCell(value.roles.boss),reward:cpCell(value.roles.reward),exit:cpCell(value.roles.exit),arena:{x:value.roles.arena.x,z:value.roles.arena.z,width:value.roles.arena.width,height:value.roles.arena.height}},
    spawnPads:value.spawnPads.map((p:any)=>({kind:p.kind,center:cpCell(p.center),cells:p.cells.map(cpCell)})),
    reservedPaths:value.reservedPaths.map((p:any)=>({from:p.from,to:p.to,cells:p.cells.map(cpCell)})),reservedCells:value.reservedCells.map(cpCell)} as RoleFloorPlan;
}
function validateConfig(config:unknown,options:unknown){
  if(!config||typeof config!=="object"||Array.isArray(config))throw new TypeError("config must be an object");
  const c=config as any, keys=Object.keys(c);
  if(keys.some(k=>!['campaignSeed','floorNumber','generatorVersion'].includes(k)))throw new TypeError("Unknown generation config field");
  if(typeof c.campaignSeed!=="string")throw new TypeError("campaignSeed must be a string");
  const seed=normalizeSeed(c.campaignSeed);if(!seed)throw new RangeError("campaignSeed must not be empty");
  if(!Number.isSafeInteger(c.floorNumber)||c.floorNumber<1||c.floorNumber>100)throw new RangeError("floorNumber must be an integer from 1 through 100");
  if(c.generatorVersion!==undefined&&(typeof c.generatorVersion!=="string"||!c.generatorVersion.trim()))throw new RangeError("generatorVersion must be nonempty");
  const version=(c.generatorVersion??"cryptkeep-layout-v1").trim().normalize("NFC");
  if(options!==undefined&&(!options||typeof options!=="object"||Array.isArray(options)))throw new TypeError("options must be an object");
  const o=(options??{}) as any;if(Object.keys(o).some(k=>k!=="attemptFactory"))throw new TypeError("Unknown generation option");
  if(o.attemptFactory!==undefined&&typeof o.attemptFactory!=="function")throw new TypeError("attemptFactory must be a function");
  return {campaignSeed:seed,floorNumber:c.floorNumber,generatorVersion:version,attemptFactory:o.attemptFactory as AttemptFactory|undefined};
}
function normalizePlan(raw:unknown,seed:string,floor:number,version:string):RoleFloorPlan {
  if(!raw||typeof raw!=="object")throw new TypeError("attempt factory must return a floor plan object");
  const p=raw as any;
  if(p.floorNumber!==floor||p.floorSeed!==seed||p.generatorVersion!==version)throw new RangeError("attempt output floor, seed, or generator version does not match its attempt");
  const result=validateFloor(raw);if(!result.valid)throw new RangeError(result.issues.slice(0,8).join("; "));
  const copy=copyPlan(raw);
  return freezeDeep(copy) as RoleFloorPlan;
}
function standardAttempt(ctx:Parameters<AttemptFactory>[0]):RoleFloorPlan {
  const defaults=layoutDefaults(ctx.floorNumber);
  const empty=createFloorPlan({floorNumber:ctx.floorNumber,floorSeed:ctx.floorSeed,generatorVersion:ctx.generatorVersion,width:defaults.width,height:defaults.height,tiles:Array(defaults.width*defaults.height).fill(0)});
  const placed=placeRooms(empty);if(!placed.complete)throw new Error(`room placement incomplete (${placed.plan.rooms.length}/${placed.requestedRoomCount})`);
  return assignRoles(connectRooms(placed.plan));
}
/** Generate an immutable deterministic floor. The injection seam is intended for bounded tests. */
export function generateFloor(config:GenerateFloorConfig,options?:GenerateFloorOptions):GeneratedFloor {
  const c=validateConfig(config,options);
  const baseRng=deriveStream(c.campaignSeed,"layout",JSON.stringify([c.generatorVersion,c.floorNumber,"base-floor-seed"]));
  const baseFloorSeed=`floor:${baseRng.nextUint32().toString(16).padStart(8,"0")}`;
  const defaults=layoutDefaults(c.floorNumber), rejections:string[]=[];
  for(let attemptIndex=0;attemptIndex<MAX_ATTEMPTS;attemptIndex++){
    const rng=deriveStream(baseFloorSeed,"layout",JSON.stringify([c.generatorVersion,c.floorNumber,"attempt",attemptIndex]));
    const floorSeed=`${baseFloorSeed}:attempt:${rng.nextUint32().toString(16).padStart(8,"0")}`;
    const ctx=Object.freeze({floorSeed,floorNumber:c.floorNumber,generatorVersion:c.generatorVersion,width:defaults.width,height:defaults.height,attemptIndex});
    try{
      const raw=c.attemptFactory?c.attemptFactory(ctx):standardAttempt(ctx);
      const plan=normalizePlan(raw,floorSeed,c.floorNumber,c.generatorVersion);
      return finish(plan,{baseFloorSeed,attempts:attemptIndex+1,usedFallback:false,rejections:Object.freeze([...rejections])});
    }catch(error){rejections.push(`attempt ${attemptIndex}: ${error instanceof Error?error.message:String(error)}`.slice(0,500));}
  }
  const fallbackSeed=`${baseFloorSeed}:fallback`;
  const plan=createFallbackFloor(fallbackSeed,c.floorNumber,c.generatorVersion);
  return finish(plan,{baseFloorSeed,attempts:MAX_ATTEMPTS,usedFallback:true,rejections:Object.freeze([...rejections]),fallbackReason:"all eight generation attempts failed"});
}
function finish(plan:RoleFloorPlan,diagnostics:GenerationDiagnostics):GeneratedFloor {
  const frozenPlan=freezeDeep(copyPlan(plan));
  const contentHash=`fnv1a:${fnv1aUtf8(JSON.stringify(frozenPlan)).toString(16).padStart(8,"0")}`;
  return freezeDeep({plan:frozenPlan,diagnostics,contentHash}) as GeneratedFloor;
}
