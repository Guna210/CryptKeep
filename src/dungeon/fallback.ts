import { createFloorPlan, createRoom, createRoomRect, Tile, type FloorPlan } from "./types";
import { connectRooms } from "./corridors";
import { assignRoles, type RoleFloorPlan } from "./roles";
import { validateFloor } from "./validate";
import { stableId } from "../core/ids";

/** Deterministic four-room safe layout for a floor whose procedural attempts failed. */
export function createFallbackFloor(floorSeed: string, floorNumber: number, generatorVersion: string): RoleFloorPlan {
  const width=36,height=36, rooms=[
    createRoom(stableId(floorSeed,floorNumber,"fallback-room",0),createRoomRect(2,2,10,10)),
    createRoom(stableId(floorSeed,floorNumber,"fallback-room",1),createRoomRect(2,20,8,8)),
    createRoom(stableId(floorSeed,floorNumber,"fallback-room",2),createRoomRect(23,2,8,8)),
    createRoom(stableId(floorSeed,floorNumber,"fallback-room",3),createRoomRect(20,19,13,13)),
  ];
  const tiles=Array<number>(width*height).fill(Tile.Solid);
  for(const room of rooms)for(let z=room.rect.z;z<room.rect.z+room.rect.height;z++)for(let x=room.rect.x;x<room.rect.x+room.rect.width;x++)tiles[z*width+x]=Tile.Walkable;
  const base:FloorPlan=createFloorPlan({floorNumber,floorSeed,generatorVersion,width,height,tiles,rooms});
  const output=assignRoles(connectRooms(base,{loopFraction:0}));
  const result=validateFloor(output);
  if(!result.valid)throw new Error(`Internal fallback layout failed validation: ${result.issues.join("; ")}`);
  return output;
}
