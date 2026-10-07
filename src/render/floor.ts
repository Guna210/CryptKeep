import {
  BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, InstancedMesh, Matrix4, PlaneGeometry,
  Color, MeshStandardMaterial, OctahedronGeometry, PointLight, Shape, Vector3,
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
const blockShape = new Shape();
blockShape.moveTo(-0.42, -0.34); blockShape.lineTo(0.42, -0.34); blockShape.lineTo(0.42, 0.34); blockShape.lineTo(-0.42, 0.34); blockShape.closePath();
const STONE_TONES = [0x57777b, 0x66868a, 0x49686e, 0x718c8c, 0x526f75, 0x809293] as const;

/** Build instanced floor, ceiling, boundary walls and role markers. Materials are borrowed. */
export function createRenderedFloor(plan: RoleFloorPlan, library: MaterialLibrary, options: RenderedFloorOptions = {}): RenderedFloor {
  if (!library || !library.materials) throw new TypeError("A live material library is required");
  if (!options || Object.keys(options).some((key) => key !== "ceilingVisible") ||
    (options.ceilingVisible !== undefined && typeof options.ceilingVisible !== "boolean")) throw new TypeError("Invalid rendered floor options");
  const validation = validateFloor(plan);
  if (!validation.valid) throw new RangeError(`Cannot render invalid floor: ${validation.issues.slice(0, 5).join("; ")}`);

  const root = new Group();
  const geometries = new Set<BoxGeometry | ConeGeometry | CylinderGeometry | OctahedronGeometry | ExtrudeGeometry | PlaneGeometry>();
  const meshes: InstancedMesh[] = [];
  const ownedMaterials: MeshStandardMaterial[] = [];
  const lights: PointLight[] = [];
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
    type WallEdge={ x:number;y:number;z:number; sx:number;sy:number;sz:number; normalX?:number; normalZ?:number };
    const wallX: WallEdge[] = [];
    const wallZ: WallEdge[] = [];
    for (let z = 0; z < plan.height; z++) for (let x = 0; x < plan.width; x++) {
      if (plan.tiles[z * plan.width + x] !== Tile.Walkable) continue;
      const wx = x * FLOOR_CELL_METERS + FLOOR_CELL_METERS / 2;
      const wz = z * FLOOR_CELL_METERS + FLOOR_CELL_METERS / 2;
      walkable.push({ x: wx, y: -0.05, z: wz });
      const solid = (cx: number, cz: number) => cx >= 0 && cz >= 0 && cx < plan.width && cz < plan.height && plan.tiles[cz * plan.width + cx] === Tile.Solid;
      if (solid(x - 1, z)) wallX.push({ x: wx - 1.16, y: FLOOR_WALL_HEIGHT / 2, z: wz, sx: 1, sy: 1, sz: 1, normalX:1 });
      if (solid(x + 1, z)) wallX.push({ x: wx + 1.16, y: FLOOR_WALL_HEIGHT / 2, z: wz, sx: 1, sy: 1, sz: 1, normalX:-1 });
      if (solid(x, z - 1)) wallZ.push({ x: wx, y: FLOOR_WALL_HEIGHT / 2, z: wz - 1.16, sx: 1, sy: 1, sz: 1, normalZ:1 });
      if (solid(x, z + 1)) wallZ.push({ x: wx, y: FLOOR_WALL_HEIGHT / 2, z: wz + 1.16, sx: 1, sy: 1, sz: 1, normalZ:-1 });
    }
    const surface = new BoxGeometry(2, 0.1, 2);
    addInstances(surface, library.materials.floor, walkable);
    const ceiling = new BoxGeometry(2, 0.1, 2);
    addInstances(ceiling, library.materials.stone, walkable.map((p) => ({ ...p, y: FLOOR_WALL_HEIGHT + 0.05 })), options.ceilingVisible !== false);
    const mortarMaterial = new MeshStandardMaterial({ color: 0x283c40, roughness: 1 }); ownedMaterials.push(mortarMaterial);
    addInstances(new BoxGeometry(0.14, 3, 2), mortarMaterial, wallX.map(p => ({...p, y:1.5, sx:1, sy:1, sz:1})));
    addInstances(new BoxGeometry(2, 3, 0.14), mortarMaterial, wallZ.map(p => ({...p, y:1.5, sx:1, sy:1, sz:1})));
    const masonry = new ExtrudeGeometry(blockShape, { depth: 0.18, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.045, bevelThickness: 0.04, curveSegments: 1 });
    masonry.translate(0, 0, -0.09);
    const placeBlocks = (edges: typeof wallX, rotated: boolean) => {
      const blocks: { x:number;y:number;z:number;sx:number;sy:number;sz:number }[] = [];
      for (const edge of edges) for (let row=0; row<4; row++) for (let half=0;half<2;half++) {
        const stagger = row % 2 ? 0.04 : -0.04;
        const along = (rotated ? edge.z : edge.x) + (half ? 0.45 : -0.45) + stagger;
        const vertical = 0.39 + row * 0.72;
        blocks.push(rotated ? {x:edge.x,y:vertical,z:along,sx:1,sy:1,sz:1} : {x:along,y:vertical,z:edge.z,sx:1,sy:1,sz:1});
      }
      const mesh = new InstancedMesh(masonry, library.materials.stone, blocks.length);
      geometries.add(masonry);
      blocks.forEach((p,i) => {
        matrix.makeRotationY(rotated ? Math.PI/2 : 0);
        matrix.scale(new Vector3(0.88 + ((i*13)%4)*0.035, 0.9 + ((i*7)%3)*0.045, 1));
        matrix.setPosition(p.x,p.y,p.z);
        mesh.setMatrixAt(i,matrix);
        mesh.setColorAt(i, new Color(STONE_TONES[(i * 7 + Math.floor(p.x + p.z)) % STONE_TONES.length]));
      });
      mesh.instanceMatrix.needsUpdate=true; mesh.computeBoundingSphere(); root.add(mesh); meshes.push(mesh);
    };
    // Block instances share a beveled, chamfered profile; row offsets expose the dark mortar seams.
    placeBlocks(wallX, true); placeBlocks(wallZ, false);
    // A small, deterministic set of warm sconces lights the route without per-cell lighting.
    const allSconceEdges = [...wallX.map(p=>({...p,face:"x" as const})), ...wallZ.map(p=>({...p,face:"z" as const}))];
    const entryX=plan.roles.entry.x*2+1, entryZ=plan.roles.entry.z*2+1;
    const nearest=[...allSconceEdges].sort((a,b)=>Math.hypot(a.x-entryX,a.z-entryZ)-Math.hypot(b.x-entryX,b.z-entryZ)).slice(0,2);
    const spread=[allSconceEdges[Math.floor(allSconceEdges.length/3)],allSconceEdges[Math.floor(2*allSconceEdges.length/3)]].filter((edge):edge is typeof allSconceEdges[number]=>Boolean(edge));
    const sconceEdges=[...nearest,...spread].filter((edge,index,array)=>array.findIndex(item=>item.x===edge.x&&item.z===edge.z&&item.face===edge.face)===index).slice(0,4);
    if (sconceEdges.length) {
      const flameMaterial = new MeshStandardMaterial({ color:0xffb45a, emissive:0xff6b20, emissiveIntensity:1.7, roughness:0.7 });
      const ironMaterial = new MeshStandardMaterial({ color:0x26363a, roughness:0.8, metalness:0.55 });
      ownedMaterials.push(flameMaterial, ironMaterial);
      const flameGeometry = new ConeGeometry(0.11,0.34,6);
      const bracketGeometry = new BoxGeometry(0.32,0.09,0.24);
      const flameMesh = new InstancedMesh(flameGeometry,flameMaterial,sconceEdges.length);
      const bracketMesh = new InstancedMesh(bracketGeometry,ironMaterial,sconceEdges.length);
      geometries.add(flameGeometry); geometries.add(bracketGeometry);
      sconceEdges.forEach((edge,i)=>{
        const x=edge.face==="x"?edge.x+(edge.normalX??0)*0.13:edge.x;
        const z=edge.face==="z"?edge.z+(edge.normalZ??0)*0.13:edge.z;
        matrix.makeScale(1,1,1); matrix.setPosition(x,2.13,z); flameMesh.setMatrixAt(i,matrix);
        matrix.setPosition(x,1.91,z); bracketMesh.setMatrixAt(i,matrix);
        const light=new PointLight(0xffb25c,18,8,1.8); light.position.set(x,2.18,z); root.add(light); lights.push(light);
      });
      flameMesh.instanceMatrix.needsUpdate=true; bracketMesh.instanceMatrix.needsUpdate=true;
      flameMesh.computeBoundingSphere(); bracketMesh.computeBoundingSphere(); root.add(flameMesh,bracketMesh); meshes.push(flameMesh,bracketMesh);
    }
    const mossEdges=[...wallX.map(p=>({...p,face:"x" as const})),...wallZ.map(p=>({...p,face:"z" as const}))]
      .filter((_,i)=>i%5===2).slice(0,16);
    if(mossEdges.length){
      const mossMaterial=new MeshStandardMaterial({color:0x687b5e,emissive:0x101b0d,roughness:1}); ownedMaterials.push(mossMaterial);
      const mossGeometry=new PlaneGeometry(0.32,0.13); geometries.add(mossGeometry);
      const mossMesh=new InstancedMesh(mossGeometry,mossMaterial,mossEdges.length);
      mossEdges.forEach((edge,i)=>{
        const normalX=edge.face==="x"?(edge.normalX??0):0, normalZ=edge.face==="z"?(edge.normalZ??0):0;
        const yaw=normalX?normalX*Math.PI/2:(normalZ<0?Math.PI:0);
        matrix.makeRotationY(yaw); matrix.setPosition(edge.x+normalX*0.13,0.24,edge.z+normalZ*0.13);
        mossMesh.setMatrixAt(i,matrix);
        mossMesh.setColorAt(i,new Color(i%2?0x6d805f:0x78866b));
      });
      mossMesh.instanceMatrix.needsUpdate=true; mossMesh.computeBoundingSphere(); root.add(mossMesh); meshes.push(mossMesh);
    }

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
        for (const material of ownedMaterials) material.dispose();
        lights.length=0;
        meshes.length = 0; geometries.clear();
      },
    };
  } catch (error) {
    root.removeFromParent(); root.clear();
    for (const mesh of meshes) mesh.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const material of ownedMaterials) material.dispose();
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
