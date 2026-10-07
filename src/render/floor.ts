import {
  BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry,
  Color, Mesh, MeshStandardMaterial, OctahedronGeometry, PointLight, Shape, Vector3, BufferGeometry,
  TubeGeometry, CatmullRomCurve3, Path,
} from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { RoleFloorPlan, SpawnPadKind } from "../dungeon/roles";
import { Tile } from "../dungeon/types";
import { validateFloor } from "../dungeon/validate";
import type { MaterialLibrary } from "./materials";
import type { Grid } from "../dungeon/types";

export const FLOOR_CELL_METERS = 2;
export const FLOOR_WALL_HEIGHT = 3;
export const MASONRY_CHUNK_METERS = 8;
export interface RenderedFloorOptions { readonly ceilingVisible?: boolean }
export interface RenderedFloor {
  readonly root: Group;
  readonly counts: Readonly<{ geometries: number; instances: number; markers: number; masonryChunks: number }>;
  dispose(): void;
}

const MARKERS: readonly SpawnPadKind[] = ["entry", "boss", "reward", "exit"];
const matrix = new Matrix4();
const blockShape = new Shape();
const cornerRadius=0.13,faceHalf=0.45,cornerCenter=faceHalf-cornerRadius;
blockShape.moveTo(-cornerCenter,-faceHalf); blockShape.lineTo(cornerCenter,-faceHalf);
blockShape.absarc(cornerCenter,-cornerCenter,cornerRadius,-Math.PI/2,0,false); blockShape.lineTo(faceHalf,cornerCenter);
blockShape.absarc(cornerCenter,cornerCenter,cornerRadius,0,Math.PI/2,false); blockShape.lineTo(-cornerCenter,faceHalf);
blockShape.absarc(-cornerCenter,cornerCenter,cornerRadius,Math.PI/2,Math.PI,false); blockShape.lineTo(-faceHalf,-cornerCenter);
blockShape.absarc(-cornerCenter,-cornerCenter,cornerRadius,Math.PI,Math.PI*1.5,false); blockShape.closePath();
const STONE_TONES = [0xe1e2d7, 0xf0eadc, 0xd5e1df, 0xe2eee0, 0xd0d8d8, 0xe8dfcc] as const;

/** Build instanced floor, ceiling, boundary walls and role markers. Materials are borrowed. */
export function createRenderedFloor(plan: RoleFloorPlan, library: MaterialLibrary, options: RenderedFloorOptions = {}): RenderedFloor {
  if (!library || !library.materials) throw new TypeError("A live material library is required");
  if (!options || Object.keys(options).some((key) => key !== "ceilingVisible") ||
    (options.ceilingVisible !== undefined && typeof options.ceilingVisible !== "boolean")) throw new TypeError("Invalid rendered floor options");
  const validation = validateFloor(plan);
  if (!validation.valid) throw new RangeError(`Cannot render invalid floor: ${validation.issues.slice(0, 5).join("; ")}`);

  const root = new Group();
  const geometries = new Set<BufferGeometry>();
  const meshes: InstancedMesh[] = [];
  const decorMeshes: Mesh[] = [];
  const ownedMaterials: MeshStandardMaterial[] = [];
  const lights: PointLight[] = [];
  let masonryChunkCount=0;
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
    addInstances(ceiling, library.materials.floor, walkable.map((p) => ({ ...p, y: FLOOR_WALL_HEIGHT + 0.05 })), options.ceilingVisible !== false);
    const mortarMaterial = new MeshStandardMaterial({ color: 0x344c4e, roughness: 1 }); ownedMaterials.push(mortarMaterial);
    const mortarGeometry=new BoxGeometry(1,1,1); geometries.add(mortarGeometry);
    const mortarEdges=[...wallX.map(p=>({...p,normal:"x" as const})),...wallZ.map(p=>({...p,normal:"z" as const}))];
    if(mortarEdges.length){
      const mortar=new InstancedMesh(mortarGeometry,mortarMaterial,mortarEdges.length);
      mortarEdges.forEach((edge,i)=>{
        matrix.makeScale(edge.normal==="x"?0.14:2,3,edge.normal==="x"?2:0.14);
        matrix.setPosition(edge.x,1.5,edge.z); mortar.setMatrixAt(i,matrix);
      });
      mortar.instanceMatrix.needsUpdate=true; mortar.computeBoundingSphere(); root.add(mortar); meshes.push(mortar);
    }
    // Keep the 0.90m rounded face and narrow 0.035m bevel while using a compact indexed silhouette.
    // Two stones occupy each 2m module: 0.03m mortar remains within and across tile boundaries.
    const stoneSurface = new ExtrudeGeometry(blockShape, { depth: 0.10, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.035, bevelThickness: 0.045, curveSegments: 2 });
    stoneSurface.translate(0, 0, -0.05);
    stoneSurface.computeBoundingBox();
    const stoneBounds=stoneSurface.boundingBox!;
    const stonePositions=stoneSurface.getAttribute("position"), stoneUv=stoneSurface.getAttribute("uv");
    for(let vertex=0;vertex<stonePositions.count;vertex++) stoneUv.setXY(vertex,
      (stonePositions.getX(vertex)-stoneBounds.min.x)/(stoneBounds.max.x-stoneBounds.min.x),
      (stonePositions.getY(vertex)-stoneBounds.min.y)/(stoneBounds.max.y-stoneBounds.min.y));
    stoneUv.needsUpdate=true;
    // Weld duplicate triangle vertices before recomputing normals: this preserves UV seams while
    // sharing positions and creates smooth bevel/corner normals on one indexed geometry.
    stoneSurface.deleteAttribute("normal");
    const masonryBase=mergeVertices(stoneSurface,1e-4);
    stoneSurface.dispose();
    masonryBase.computeVertexNormals();
    geometries.add(masonryBase);
    const blocks: Array<{x:number;y:number;z:number;yaw:number;variant:number}>=[];
    for(const edge of wallX)for(let row=0;row<3;row++)for(let half=0;half<2;half++){
      const along=edge.z+(half?0.5:-0.5);
      blocks.push({x:edge.x,y:0.5+row,z:along,yaw:Math.PI/2,variant:Math.abs(Math.floor(edge.x*3+along*7+row*5))%4});
    }
    for(const edge of wallZ)for(let row=0;row<3;row++)for(let half=0;half<2;half++){
      const along=edge.x+(half?0.5:-0.5);
      blocks.push({x:along,y:0.5+row,z:edge.z,yaw:0,variant:Math.abs(Math.floor(along*3+edge.z*7+row*5))%4});
    }
    const masonryMaterial=new MeshStandardMaterial({map:library.textures.stone,color:0xffffff,roughness:0.92,metalness:0,emissive:0x10201f,emissiveIntensity:0.12});
    masonryMaterial.onBeforeCompile=(shader)=>{
      shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nattribute vec2 atlasOffset;");
      shader.vertexShader=shader.vertexShader.replace("#include <uv_vertex>","#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = vMapUv * 0.5 + atlasOffset;\n#endif");
    };
    masonryMaterial.customProgramCacheKey=()=>"cryptkeep-stone-atlas-instanced-v1";
    ownedMaterials.push(masonryMaterial);
    if(blocks.length){
      const chunks=new Map<string,typeof blocks>();
      for(const block of blocks){
        const cx=Math.floor(block.x/MASONRY_CHUNK_METERS),cz=Math.floor(block.z/MASONRY_CHUNK_METERS),key=`${cx}:${cz}`;
        const group=chunks.get(key)??[];group.push(block);chunks.set(key,group);
      }
      masonryChunkCount=chunks.size;
      for(const [key,chunk] of chunks){
        const geometry=masonryBase.clone();
        geometry.setAttribute("atlasOffset",new InstancedBufferAttribute(new Float32Array(chunk.length*2),2));
        const offsets=geometry.getAttribute("atlasOffset"),mesh=new InstancedMesh(geometry,masonryMaterial,chunk.length);geometries.add(geometry);
        chunk.forEach((p,i)=>{
          matrix.makeRotationY(p.yaw);matrix.scale(new Vector3(1,1,1));matrix.setPosition(p.x,p.y,p.z);mesh.setMatrixAt(i,matrix);
          offsets.setXY(i,(p.variant%2)*0.5,Math.floor(p.variant/2)*0.5);
          mesh.setColorAt(i,new Color(STONE_TONES[(i*7+Math.floor(p.x+p.z))%STONE_TONES.length]));
        });
        offsets.needsUpdate=true;mesh.name=`rounded-stone-course:${key}`;mesh.frustumCulled=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);meshes.push(mesh);
      }
    }
    masonryBase.dispose();geometries.delete(masonryBase);
    // The entry-facing wall torch sits in the yaw-zero forward view; one further fixture lights the route.
    const allSconceEdges = [...wallX.map(p=>({...p,face:"x" as const})), ...wallZ.map(p=>({...p,face:"z" as const}))];
    const entryX=plan.roles.entry.x*2+1, entryZ=plan.roles.entry.z*2+1;
    const forward=[...allSconceEdges].filter(edge=>edge.face==="z"&&edge.normalZ===1&&edge.z<entryZ)
      .sort((a,b)=>Math.abs(a.x-(entryX-2))-Math.abs(b.x-(entryX-2))||Math.abs(a.z-entryZ)-Math.abs(b.z-entryZ));
    const nearest=forward.length?[forward[0]!]:[...allSconceEdges].sort((a,b)=>Math.hypot(a.x-entryX,a.z-entryZ)-Math.hypot(b.x-entryX,b.z-entryZ)).slice(0,1);
    const spread=[allSconceEdges[Math.floor(allSconceEdges.length/2)]].filter((edge):edge is typeof allSconceEdges[number]=>Boolean(edge));
    const sconceEdges=[...nearest,...spread].filter((edge,index,array)=>array.findIndex(item=>item.x===edge.x&&item.z===edge.z&&item.face===edge.face)===index).slice(0,2);
    if (sconceEdges.length) {
      const flameMaterial = new MeshStandardMaterial({ color:0xff9b3f, emissive:0xff5a18, emissiveIntensity:1.15, roughness:0.8 });
      const coreMaterial = new MeshStandardMaterial({ color:0xffe89a, emissive:0xffbd45, emissiveIntensity:1.0, roughness:0.8 });
      const ironMaterial = library.materials.iron as MeshStandardMaterial;
      const woodMaterial = library.materials.wood as MeshStandardMaterial;
      const wrapMaterial = library.materials.leather as MeshStandardMaterial;
      ownedMaterials.push(flameMaterial,coreMaterial);
      const flameShape=new Shape();
      flameShape.moveTo(0,.012);flameShape.quadraticCurveTo(-.13,.16,-.12,.30);flameShape.quadraticCurveTo(-.12,.43,-.055,.53);flameShape.quadraticCurveTo(-.022,.58,0,.60);
      flameShape.quadraticCurveTo(.022,.58,.055,.53);flameShape.quadraticCurveTo(.12,.43,.12,.30);flameShape.quadraticCurveTo(.13,.16,0,.012);flameShape.closePath();
      const flameOpening=new Path();
      flameOpening.moveTo(0,.075);flameOpening.quadraticCurveTo(.085,.19,.08,.29);flameOpening.quadraticCurveTo(.077,.39,.038,.47);flameOpening.quadraticCurveTo(.018,.51,0,.535);
      flameOpening.quadraticCurveTo(-.018,.51,-.038,.47);flameOpening.quadraticCurveTo(-.077,.39,-.08,.29);flameOpening.quadraticCurveTo(-.085,.19,0,.075);flameOpening.closePath();
      flameShape.holes.push(flameOpening);
      const coreShape=new Shape();
      coreShape.moveTo(0,.075);coreShape.quadraticCurveTo(-.066,.18,-.062,.28);coreShape.quadraticCurveTo(-.06,.37,-.029,.44);coreShape.quadraticCurveTo(-.014,.48,0,.505);
      coreShape.quadraticCurveTo(.014,.48,.029,.44);coreShape.quadraticCurveTo(.06,.37,.062,.28);coreShape.quadraticCurveTo(.066,.18,0,.075);coreShape.closePath();
      const flameGeometry = new ExtrudeGeometry(flameShape,{depth:.055,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.01,bevelThickness:.008,curveSegments:8});
      flameGeometry.translate(0,0,-.0275);flameGeometry.computeVertexNormals();
      const coreGeometry = new ExtrudeGeometry(coreShape,{depth:.04,bevelEnabled:false,steps:1,curveSegments:8});
      coreGeometry.translate(0,0,-.02);coreGeometry.computeVertexNormals();
      const plateGeometry=new BoxGeometry(.22,.34,.055);
      const shaftGeometry=new CylinderGeometry(.046,.058,.38,14,1);
      const wrapPoints=Array.from({length:49},(_,i)=>{const t=i/48,angle=t*Math.PI*6;return new Vector3(Math.cos(angle)*.071,-.08+t*.16,Math.sin(angle)*.071);});
      const wrapGeometry=new TubeGeometry(new CatmullRomCurve3(wrapPoints),128,.009,6,false);
      const armGeometry=new TubeGeometry(new CatmullRomCurve3([new Vector3(0,1.82,0),new Vector3(0,1.90,.13),new Vector3(0,2.02,.18)]),12,.018,8,false);
      plateGeometry.translate(0,1.93,0);
      const ironGeometry=mergeGeometries([plateGeometry,armGeometry],false);
      if(!ironGeometry) throw new Error("Unable to combine the torch iron mount geometry");
      plateGeometry.dispose();armGeometry.dispose();
      const iron=new InstancedMesh(ironGeometry,ironMaterial,sconceEdges.length);
      const shaft=new InstancedMesh(shaftGeometry,woodMaterial,sconceEdges.length);
      const wrap=new InstancedMesh(wrapGeometry,wrapMaterial,sconceEdges.length);
      const flameMesh = new InstancedMesh(flameGeometry,flameMaterial,sconceEdges.length);
      const coreMesh = new InstancedMesh(coreGeometry,coreMaterial,sconceEdges.length);
      geometries.add(flameGeometry);geometries.add(coreGeometry);geometries.add(ironGeometry);geometries.add(shaftGeometry);geometries.add(wrapGeometry);
      sconceEdges.forEach((edge,i)=>{
        const normalX=edge.face==="x"?(edge.normalX??0):0, normalZ=edge.face==="z"?(edge.normalZ??0):0;
        const x=edge.x+normalX*0.13, z=edge.z+normalZ*0.13;
        const yaw=edge.face==="x"?(edge.normalX===1?Math.PI/2:-Math.PI/2):(edge.normalZ===1?0:Math.PI);
        const set=(mesh:InstancedMesh,py:number,forward:number)=>{matrix.makeRotationY(yaw);matrix.setPosition(x+normalX*forward,py,z+normalZ*forward);mesh.setMatrixAt(i,matrix);};
        set(iron,0,0);set(shaft,2.12,.07);set(wrap,2.34,.07);
        set(flameMesh,2.34,.07);set(coreMesh,2.34,.11);
        const light=new PointLight(0xffb25c,12,7,1.8); light.position.set(x+normalX*.13,2.53,z+normalZ*.13); root.add(light); lights.push(light);
      });
      for(const [mesh,name] of [[iron,"torch-iron-mount"],[shaft,"torch-wood-shaft"],[wrap,"torch-head-wrap"],[flameMesh,"torch-orange-flame"],[coreMesh,"torch-yellow-core"]] as const){mesh.name=name;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);meshes.push(mesh);}
      const jambGeometry=new BoxGeometry(.12,2.54,.12), lintelGeometry=new BoxGeometry(.82,.14,.12);
      geometries.add(jambGeometry);geometries.add(lintelGeometry);
      const jambs=new InstancedMesh(jambGeometry,library.materials.trim as MeshStandardMaterial,sconceEdges.length*2);
      const lintels=new InstancedMesh(lintelGeometry,library.materials.trim as MeshStandardMaterial,sconceEdges.length);
      sconceEdges.forEach((edge,i)=>{
        const nx=edge.face==="x"?(edge.normalX??0):0,nz=edge.face==="z"?(edge.normalZ??0):0,x=edge.x+nx*.16,z=edge.z+nz*.16;
        for(const side of [-1,1]){matrix.makeTranslation(x+(edge.face==="z"?side*.39:0),1.42,z+(edge.face==="x"?side*.39:0));jambs.setMatrixAt(i*2+(side===1?1:0),matrix);}
        matrix.makeTranslation(x,2.68,z);lintels.setMatrixAt(i,matrix);
      });
      jambs.name="torch-alcove-jambs";lintels.name="torch-alcove-lintels";
      for(const trim of [jambs,lintels]){trim.instanceMatrix.needsUpdate=true;trim.computeBoundingSphere();root.add(trim);meshes.push(trim);}
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

    const courseEdges=[...wallX.map(p=>({...p,face:"x" as const})),...wallZ.map(p=>({...p,face:"z" as const}))];
    if(courseEdges.length){
      const courseGeometry=new BoxGeometry(2,.16,.14);geometries.add(courseGeometry);
      const course=new InstancedMesh(courseGeometry,library.materials.trim as MeshStandardMaterial,courseEdges.length);
      courseEdges.forEach((edge,i)=>{matrix.makeRotationY(edge.face==="x"?Math.PI/2:0);matrix.setPosition(edge.x,.10,edge.z);course.setMatrixAt(i,matrix);});
      course.name="painted-stone-base-course";course.instanceMatrix.needsUpdate=true;course.computeBoundingSphere();root.add(course);meshes.push(course);
    }

    const entryRoom=plan.rooms.find((room)=>room.id===plan.roles.entryRoomId);
    if(entryRoom){
      const r=entryRoom.rect,cx=(r.x+1)*2+.58,cz=(r.z+1)*2+.52;
      const crate=new Mesh(new BoxGeometry(.76,.58,.66),library.materials.wood as MeshStandardMaterial);
      crate.position.set(cx,.31,cz);crate.name="entry-worn-crate";root.add(crate);decorMeshes.push(crate);geometries.add(crate.geometry);
      const rim=new Mesh(new BoxGeometry(.82,.09,.72),library.materials.trim as MeshStandardMaterial);
      rim.position.set(cx,.61,cz);rim.name="crate-worn-rim";root.add(rim);decorMeshes.push(rim);geometries.add(rim.geometry);
      const barrel=new Mesh(new CylinderGeometry(.31,.36,.83,12,1),library.materials.wood as MeshStandardMaterial);
      barrel.position.set((r.x+r.width-1)*2+.36,.42,(r.z+1)*2+.52);barrel.name="entry-ironbound-barrel";root.add(barrel);decorMeshes.push(barrel);geometries.add(barrel.geometry);
      for(const y of [.18,.68]){const hoop=new Mesh(new CylinderGeometry(.365,.365,.065,12,1),library.materials.iron as MeshStandardMaterial);hoop.position.copy(barrel.position);hoop.position.y=y;hoop.name="barrel-iron-hoop";root.add(hoop);decorMeshes.push(hoop);geometries.add(hoop.geometry);}
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
      counts: Object.freeze({ geometries: geometries.size, instances, markers: MARKERS.length, masonryChunks:masonryChunkCount }),
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        root.clear();
        for (const mesh of meshes) mesh.dispose();
        for (const geometry of geometries) geometry.dispose();
        for (const mesh of decorMeshes) mesh.dispatchEvent({ type:"dispose" });
        for (const material of ownedMaterials) material.dispose();
        lights.length=0;
        meshes.length = 0; geometries.clear();
      },
    };
  } catch (error) {
    root.removeFromParent(); root.clear();
    for (const mesh of meshes) mesh.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const mesh of decorMeshes) mesh.dispatchEvent({ type:"dispose" });
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
    return {root,counts:Object.freeze({geometries:geometries.size,instances:meshes.reduce((n,m)=>n+m.count,0),markers:0,masonryChunks:0}),dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.clear();for(const mesh of meshes)mesh.dispose();for(const geo of geometries)geo.dispose();}};
  } catch(error) {root.clear();for(const mesh of meshes)mesh.dispose();for(const geo of geometries)geo.dispose();throw error;}
}
