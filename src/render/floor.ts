import {
  BoxGeometry, ConeGeometry, CylinderGeometry, Group, InstancedMesh, Matrix4, OctahedronGeometry,
} from "three";
import type { RoleFloorPlan, SpawnPadKind } from "../dungeon/roles";
import { Tile } from "../dungeon/types";
import { validateFloor } from "../dungeon/validate";
import type { MaterialLibrary } from "./materials";
import type { Grid } from "../dungeon/types";

export const FLOOR_CELL_METERS = 2;
export const FLOOR_WALL_HEIGHT = 3;
export interface RenderedFloorOptions { readonly ceilingVisible?: boolean }
export interface RenderedFloor {
  readonly root: Group;
  readonly counts: Readonly<{ geometries: number; instances: number; markers: number }>;
  dispose(): void;
}

const MARKERS: readonly SpawnPadKind[] = ["entry", "boss", "reward", "exit"];
const matrix = new Matrix4();

/** Build instanced floor, ceiling, boundary walls and role markers. Materials are borrowed. */
export function createRenderedFloor(plan: RoleFloorPlan, library: MaterialLibrary, options: RenderedFloorOptions = {}): RenderedFloor {
  if (!library || !library.materials) throw new TypeError("A live material library is required");
  if (!options || Object.keys(options).some((key) => key !== "ceilingVisible") ||
    (options.ceilingVisible !== undefined && typeof options.ceilingVisible !== "boolean")) throw new TypeError("Invalid rendered floor options");
  const validation = validateFloor(plan);
  if (!validation.valid) throw new RangeError(`Cannot render invalid floor: ${validation.issues.slice(0, 5).join("; ")}`);

  const root = new Group();
  const geometries = new Set<BoxGeometry | ConeGeometry | CylinderGeometry | OctahedronGeometry>();
  const meshes: InstancedMesh[] = [];
  let disposed = false;
  const addInstances = (geometry: BoxGeometry | ConeGeometry | CylinderGeometry | OctahedronGeometry, material: MaterialLibrary["materials"][keyof MaterialLibrary["materials"]], positions: readonly { x:number;y:number;z:number; sx?:number;sy?:number;sz?:number }[], visible = true) => {
    geometries.add(geometry);
    if (!positions.length) return;
    const mesh = new InstancedMesh(geometry, material, positions.length);
    mesh.visible = visible;
    positions.forEach((p, index) => {
      matrix.makeScale(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
      matrix.setPosition(p.x, p.y, p.z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    root.add(mesh); meshes.push(mesh);
  };
  try {
    const walkable: { x:number;y:number;z:number }[] = [];
    const wallX: { x:number;y:number;z:number; sx:number;sy:number;sz:number }[] = [];
    const wallZ: typeof wallX = [];
    for (let z = 0; z < plan.height; z++) for (let x = 0; x < plan.width; x++) {
      if (plan.tiles[z * plan.width + x] !== Tile.Walkable) continue;
      const wx = x * FLOOR_CELL_METERS + FLOOR_CELL_METERS / 2;
      const wz = z * FLOOR_CELL_METERS + FLOOR_CELL_METERS / 2;
      walkable.push({ x: wx, y: -0.05, z: wz });
      const solid = (cx: number, cz: number) => cx >= 0 && cz >= 0 && cx < plan.width && cz < plan.height && plan.tiles[cz * plan.width + cx] === Tile.Solid;
      if (solid(x - 1, z)) wallX.push({ x: wx - 1.08, y: FLOOR_WALL_HEIGHT / 2, z: wz, sx: 0.08, sy: 1.5, sz: 1 });
      if (solid(x + 1, z)) wallX.push({ x: wx + 1.08, y: FLOOR_WALL_HEIGHT / 2, z: wz, sx: 0.08, sy: 1.5, sz: 1 });
      if (solid(x, z - 1)) wallZ.push({ x: wx, y: FLOOR_WALL_HEIGHT / 2, z: wz - 1.08, sx: 1, sy: 1.5, sz: 0.08 });
      if (solid(x, z + 1)) wallZ.push({ x: wx, y: FLOOR_WALL_HEIGHT / 2, z: wz + 1.08, sx: 1, sy: 1.5, sz: 0.08 });
    }
    const surface = new BoxGeometry(2, 0.1, 2);
    addInstances(surface, library.materials.floor, walkable);
    const ceiling = new BoxGeometry(2, 0.1, 2);
    addInstances(ceiling, library.materials.stone, walkable.map((p) => ({ ...p, y: FLOOR_WALL_HEIGHT + 0.05 })), options.ceilingVisible !== false);
    const xWall = new BoxGeometry(2, 2, 2);
    addInstances(xWall, library.materials.stone, wallX);
    const zWall = new BoxGeometry(2, 2, 2);
    addInstances(zWall, library.materials.stone, wallZ);

    const markerGeometry = {
      entry: new CylinderGeometry(0.68, 0.82, 1.1, 4),
      boss: new ConeGeometry(0.86, 2.2, 5),
      reward: new OctahedronGeometry(0.85),
      exit: new BoxGeometry(1.2, 1.6, 1.2),
    };
    for (const kind of MARKERS) {
      const marker = plan.roles[kind];
      addInstances(markerGeometry[kind], library.materials[kind], [{ x: marker.x * 2 + 1, y: kind === "boss" ? 1.1 : kind === "reward" ? 0.85 : kind === "exit" ? 0.8 : 0.55, z: marker.z * 2 + 1 }]);
    }
    const instances = meshes.reduce((sum, mesh) => sum + mesh.count, 0);
    return {
      root,
      counts: Object.freeze({ geometries: geometries.size, instances, markers: MARKERS.length }),
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        root.clear();
        for (const mesh of meshes) mesh.dispose();
        for (const geometry of geometries) geometry.dispose();
        meshes.length = 0; geometries.clear();
      },
    };
  } catch (error) {
    root.removeFromParent(); root.clear();
    for (const mesh of meshes) mesh.dispose();
    for (const geometry of geometries) geometry.dispose();
    throw error;
  }
}

/** Render a DEV Grid directly, preserving its exact occupancy for collision and melee LOS. */
export function createRenderedGrid(grid:Grid,library:MaterialLibrary):RenderedFloor {
  if(!library?.materials||!grid||!Number.isInteger(grid.width)||!Number.isInteger(grid.height)||grid.width<1||grid.height<1||grid.tiles.length!==grid.width*grid.height) throw new TypeError("A valid diagnostic Grid and material library are required");
  const root=new Group(), geometries=new Set<BoxGeometry>(), meshes:InstancedMesh[]=[]; let disposed=false;
  try {
    type GridInstance={x:number;y:number;z:number;sx?:number;sy?:number;sz?:number};
    const floors:GridInstance[]=[], walls:GridInstance[]=[];
    for(let z=0;z<grid.height;z++) for(let x=0;x<grid.width;x++) {
      if(grid.tiles[z*grid.width+x]===Tile.Walkable) {
        const wx=x*2+1,wz=z*2+1; floors.push({x:wx,y:-.05,z:wz});
        const solid=(cx:number,cz:number)=>cx<0||cz<0||cx>=grid.width||cz>=grid.height||grid.tiles[cz*grid.width+cx]===Tile.Solid;
        if(solid(x-1,z))walls.push({x:wx-1.02,y:1.5,z:wz,sx:.08,sy:1.5,sz:1});
        if(solid(x+1,z))walls.push({x:wx+1.02,y:1.5,z:wz,sx:.08,sy:1.5,sz:1});
        if(solid(x,z-1))walls.push({x:wx,y:1.5,z:wz-1.02,sx:1.0,sy:1.5,sz:.08});
        if(solid(x,z+1))walls.push({x:wx,y:1.5,z:wz+1.02,sx:1.0,sy:1.5,sz:.08});
      }
    }
    const add=(positions:readonly GridInstance[],material:MaterialLibrary["materials"][keyof MaterialLibrary["materials"]],height:number)=>{if(!positions.length)return; const geo=new BoxGeometry(2,height,2); geometries.add(geo); const mesh=new InstancedMesh(geo,material,positions.length); positions.forEach((p,i)=>{matrix.makeScale(p.sx??1,p.sy??1,p.sz??1);matrix.setPosition(p.x,p.y,p.z);mesh.setMatrixAt(i,matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);meshes.push(mesh);};
    add(floors,library.materials.floor,.1); add(walls,library.materials.stone,2);
    return {root,counts:Object.freeze({geometries:geometries.size,instances:meshes.reduce((n,m)=>n+m.count,0),markers:0}),dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.clear();for(const mesh of meshes)mesh.dispose();for(const geo of geometries)geo.dispose();}};
  } catch(error) {root.clear();for(const mesh of meshes)mesh.dispose();for(const geo of geometries)geo.dispose();throw error;}
}
