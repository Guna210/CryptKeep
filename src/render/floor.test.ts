import { Frustum, Group, Matrix4, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";
import { generateFloor } from "../dungeon/generate";
import { createMaterialLibrary } from "./materials";
import { createRenderedFloor, createRenderedGrid } from "./floor";
import { createGrid } from "../dungeon/grid";
import { Tile } from "../dungeon/types";

describe("rendered floor ownership and placement", () => {
  it("renders diagnostic Grid occupancy with 2m tiles and 3m boundary walls while borrowing materials",()=>{
    const library=createMaterialLibrary("grid-render",16);const grid=createGrid(3,3,[Tile.Solid,Tile.Solid,Tile.Solid,Tile.Solid,Tile.Walkable,Tile.Solid,Tile.Solid,Tile.Solid,Tile.Solid]);
    const rendered=createRenderedGrid(grid,library);expect(rendered.counts.markers).toBe(0);expect(rendered.counts.instances).toBe(5);
    const [floor,walls]=rendered.root.children as any[];expect(floor.material).toBe(library.materials.floor);expect(floor.geometry.parameters.height).toBe(.1);expect(floor.count).toBe(1);
    expect(walls.material).toBe(library.materials.stone);expect(walls.geometry.parameters.height).toBe(2);expect(walls.count).toBe(4);
    rendered.dispose();rendered.dispose();expect(rendered.root.children).toHaveLength(0);expect(library.materials.floor).toBeTruthy();library.dispose();
  });
  it("covers walkable centers, bounds walls at solid edges, and places four role markers", () => {
    const plan = generateFloor({ campaignSeed: "floor-render-contract", floorNumber: 3 }).plan;
    const library = createMaterialLibrary("floor-render-contract", 16);
    const floor = createRenderedFloor(plan, library, { ceilingVisible: false });
    const group = new Group(); group.add(floor.root); group.updateMatrixWorld(true);
    const floors = floor.root.children.find((item: any) => item.material === library.materials.floor) as any;
    expect(floors.count).toBe(plan.tiles.filter((tile) => tile === 1).length);
    const actual = new Set<string>();
    const point = new Matrix4();
    for (let i = 0; i < floors.count; i++) {
      floors.getMatrixAt(i, point);
      actual.add(`${Math.round(point.elements[12] / 2 - 0.5)},${Math.round(point.elements[14] / 2 - 0.5)}`);
    }
    for (let z = 0; z < plan.height; z++) for (let x = 0; x < plan.width; x++) if (plan.tiles[z * plan.width + x] === 1) expect(actual.has(`${x},${z}`)).toBe(true);
    const ceilings = floor.root.children.find((item: any) => {
      if (item.material !== library.materials.floor || item.geometry.parameters?.height !== 0.1) return false;
      item.getMatrixAt(0, point);
      return Math.abs(point.elements[13] - 3.05) < 0.001;
    }) as any;
    expect(ceilings.count).toBe(floors.count);
    const ceilingCenters = new Set<string>();
    for (let i = 0; i < floors.count; i++) {
      floors.getMatrixAt(i, point);
      expect(point.elements[13]).toBeCloseTo(-0.05);
      ceilings.getMatrixAt(i, point);
      expect(point.elements[13]).toBeCloseTo(3.05);
      ceilingCenters.add(`${Math.round(point.elements[12] / 2 - 0.5)},${Math.round(point.elements[14] / 2 - 0.5)}`);
    }
    expect(ceilingCenters).toEqual(actual);
    expect(floor.counts.markers).toBe(4);
    expect(floor.counts.instances).toBeGreaterThan(floors.count * 2);
    expect(floor.root.children.length).toBeLessThanOrEqual(23+floor.counts.masonryChunks); // fixed decor batches plus one spatial stone batch per chunk
    const masonry=floor.root.children.filter((item:any)=>item.name?.startsWith("rounded-stone-course:")) as any[];
    expect(masonry.length).toBe(floor.counts.masonryChunks);
    expect(masonry.every(mesh=>mesh.count>0&&mesh.instanceColor!==null)).toBe(true);
    expect(masonry.every(mesh=>mesh.frustumCulled)).toBe(true);
    expect(masonry.every(mesh=>mesh.material===masonry[0].material)).toBe(true);
    expect(masonry.every(mesh=>mesh.geometry.getAttribute("atlasOffset").count===mesh.count)).toBe(true);
    expect(masonry.every(mesh=>mesh.geometry.getAttribute("atlasOffset").isInstancedBufferAttribute)).toBe(true);
    const selectedQuadrants = new Set<number>();
    for (const mesh of masonry) {
      const offsets=mesh.geometry.getAttribute("atlasOffset");
      for(let i=0;i<offsets.count;i++) selectedQuadrants.add(offsets.getX(i)*2+offsets.getY(i)*4);
    }
    expect(selectedQuadrants).toEqual(new Set([0,1,2,3]));
    expect(masonry[0].material.map).toBe(library.textures.stone);
    const shader={vertexShader:"#include <common>\nvoid main(){\n#include <uv_vertex>\n}",fragmentShader:""};
    masonry[0].material.onBeforeCompile(shader as any, {} as any);
    expect(shader.vertexShader).toContain("attribute vec2 atlasOffset;");
    expect(shader.vertexShader).toContain("vMapUv = vMapUv * 0.5 + atlasOffset;");
    expect(masonry[0].material.customProgramCacheKey()).toContain("stone-atlas-instanced");
    expect(masonry[0].geometry.index).not.toBeNull();
    expect(masonry[0].geometry.attributes.position.count).toBe(80);
    expect(masonry[0].geometry.index.count/3).toBe(156);
    expect(masonry[0].geometry.attributes.normal.count).toBe(masonry[0].geometry.attributes.position.count);
    for(let i=0;i<masonry[0].geometry.attributes.normal.count;i++){
      const normal=masonry[0].geometry.attributes.normal;
      expect(new Vector3(normal.getX(i),normal.getY(i),normal.getZ(i)).length()).toBeCloseTo(1,3);
    }
    const profilePoints=masonry[0].geometry.attributes.position;
    expect(Array.from({length:profilePoints.count},(_,i)=>[profilePoints.getX(i),profilePoints.getY(i)]).some(([x,y])=>x>0.32&&x<0.45&&y>0.32&&y<0.45)).toBe(true);
    const faceUv=masonry[0].geometry.attributes.uv;
    expect(Math.min(...faceUv.array)).toBeGreaterThanOrEqual(-1e-6);
    expect(Math.max(...faceUv.array)).toBeLessThanOrEqual(1+1e-6);
    expect(Math.min(...faceUv.array)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...faceUv.array)).toBeLessThanOrEqual(1);
    expect(Math.max(...masonry.map(mesh=>Math.max(...mesh.geometry.attributes.uv.array)))).toBeGreaterThan(.5);
    expect(masonry[0].material.emissiveIntensity).toBeLessThan(0.2);
    if(!masonry[0].geometry.boundingBox) masonry[0].geometry.computeBoundingBox();
    const bounds=masonry[0].geometry.boundingBox;
    expect(bounds).toBeTruthy();
    const halfAlong=Math.max(Math.abs(bounds!.min.x),Math.abs(bounds!.max.x));
    expect(halfAlong).toBeCloseTo(0.485,2);
    expect(Math.max(Math.abs(bounds!.min.y),Math.abs(bounds!.max.y))*2).toBeCloseTo(0.97,2);
    expect(Math.max(Math.abs(bounds!.min.z),Math.abs(bounds!.max.z))*2).toBeCloseTo(0.19,2);
    const wallCourses=new Map<string,number[]>();
    for(const mesh of masonry)for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,point);
      const e=point.elements, isXWall=Math.abs(e[0])<0.001;
      const lineKey=`${isXWall?"x":"z"}:${(isXWall?e[12]:e[14]).toFixed(3)}:${e[13].toFixed(3)}`;
      const along=isXWall?e[14]:e[12];
      wallCourses.set(lineKey,[...(wallCourses.get(lineKey)??[]),along]);
    }
    const modularJoints=[...wallCourses.values()].flatMap((centers)=>{const sorted=centers.sort((a,b)=>a-b);return sorted.slice(1).map((v,i)=>v-sorted[i]!).filter((pitch)=>Math.abs(pitch-1)<0.001).map((pitch)=>pitch-halfAlong*2);});
    expect(modularJoints.length).toBeGreaterThan(80);
    for(const joint of modularJoints) expect(joint).toBeCloseTo(0.03,3); // includes every 2m tile boundary
    masonry[0].geometry.computeBoundingBox();
    const stoneBounds=masonry[0].geometry.boundingBox!;
    let wallBottom=Infinity,wallTop=-Infinity;
    for(const mesh of masonry)for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,point);
      const halfHeight=Math.max(Math.abs(stoneBounds.min.y),Math.abs(stoneBounds.max.y))*Math.abs(point.elements[5]);
      wallBottom=Math.min(wallBottom,point.elements[13]-halfHeight);
      wallTop=Math.max(wallTop,point.elements[13]+halfHeight);
    }
    expect(wallTop-wallBottom).toBeGreaterThan(2.8);
    expect(masonry.reduce((total,mesh)=>total+mesh.count,0)).toBeGreaterThan(100);
    const camera=new PerspectiveCamera(70,1,0.1,24);
    const first=masonry[0].boundingSphere!;
    const target=first.center.clone();camera.position.copy(target).add(new Vector3(0,2,6));camera.lookAt(target);camera.updateMatrixWorld();camera.updateProjectionMatrix();
    const frustum=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const visibleChunks=masonry.filter(mesh=>{mesh.updateMatrixWorld(true);return frustum.intersectsObject(mesh);});
    expect(visibleChunks.length).toBeGreaterThan(0);
    expect(visibleChunks.length).toBeLessThan(masonry.length);
    const mortar=floor.root.children.find((item:any)=>item.geometry?.parameters?.width===1&&item.geometry?.parameters?.height===1&&item.geometry?.parameters?.depth===1) as any;
    expect(mortar.count).toBeGreaterThan(0);
    for(const mesh of masonry){
      mesh.geometry.computeBoundingBox();
      const bounds=mesh.geometry.boundingBox!;
      const halfX=Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x));
      const halfZ=Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z));
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,point);
        const ex=Math.abs(point.elements[0])*halfX+Math.abs(point.elements[8])*halfZ;
        const ez=Math.abs(point.elements[2])*halfX+Math.abs(point.elements[10])*halfZ;
        const minX=Math.max(0,Math.floor((point.elements[12]-ex)/2)),maxX=Math.min(plan.width-1,Math.floor((point.elements[12]+ex)/2));
        const minZ=Math.max(0,Math.floor((point.elements[14]-ez)/2)),maxZ=Math.min(plan.height-1,Math.floor((point.elements[14]+ez)/2));
        for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++)if(plan.tiles[z*plan.width+x]===1){
          const cx=x*2+1,cz=z*2+1;
          const overlapsX=Math.abs(cx-point.elements[12])<1+ex-1e-5;
          const overlapsZ=Math.abs(cz-point.elements[14])<1+ez-1e-5;
          expect(overlapsX&&overlapsZ,`stone footprint overlaps walkable tile ${x},${z}: ${JSON.stringify({center:[point.elements[12],point.elements[14]],extent:[ex,ez],tile:[cx,cz]})}`).toBe(false);
        }
      }
    }
    expect(floor.root.children.filter((item:any)=>item.type==="PointLight").length).toBeGreaterThan(0);
    expect(floor.root.children.filter((item:any)=>item.type==="PointLight").length).toBeLessThanOrEqual(2);
    expect(floor.root.children.filter((item:any)=>item.name?.startsWith("torch-")).map((item:any)=>item.name)).toEqual([
      "torch-iron-mount","torch-wood-shaft","torch-head-wrap","torch-orange-flame","torch-yellow-core","torch-alcove-jambs","torch-alcove-lintels",
    ]);
    const outer=floor.root.children.find((item:any)=>item.name==="torch-orange-flame") as any;
    const core=floor.root.children.find((item:any)=>item.name==="torch-yellow-core") as any;
    expect(outer.geometry.type).toBe("ExtrudeGeometry");
    expect(core.geometry.type).toBe("ExtrudeGeometry");
    expect(outer.geometry.parameters.shapes.holes).toHaveLength(1);
    expect(outer.material).not.toBe(core.material);
    outer.getMatrixAt(0,point);const outerCenter=point.elements.slice(12,15);
    core.getMatrixAt(0,point);const coreCenter=point.elements.slice(12,15);
    expect(Math.hypot(coreCenter[0]!-outerCenter[0]!,coreCenter[2]!-outerCenter[2]!)).toBeCloseTo(0.04,4);
    expect(core.geometry.attributes.position.count).toBeGreaterThan(400);
    const moss=floor.root.children.find((item:any)=>item.geometry?.type==="PlaneGeometry") as any;
    expect(moss.count).toBeGreaterThan(0);
    expect(moss.count).toBeLessThanOrEqual(16);
    for (const kind of ["entry", "boss", "reward", "exit"] as const) {
      const markerMaterial = library.materials[kind];
      const mesh = floor.root.children.find((item: any) => item.material === markerMaterial) as any;
      expect(mesh.count).toBe(1);
      mesh.getMatrixAt(0, point);
      expect(point.elements[12]).toBe(plan.roles[kind].x * 2 + 1);
      expect(point.elements[14]).toBe(plan.roles[kind].z * 2 + 1);
      expect(mesh.geometry.parameters.height ?? mesh.geometry.parameters.radius).toBeGreaterThan(0.7);
    }
    floor.dispose(); floor.dispose();
    expect(floor.root.parent).toBeNull();
    expect(floor.root.children).toHaveLength(0);
    library.dispose();
  });

  it("rejects invalid plans before allocating owned resources and preserves borrowed materials", () => {
    const plan = generateFloor({ campaignSeed: "floor-render-invalid", floorNumber: 1 }).plan;
    const library = createMaterialLibrary("floor-render-invalid", 16);
    const ownedDispose = vi.fn();
    const instanceDispose = vi.fn();
    const borrowedDispose = vi.fn();
    const borrowedTextureDispose = vi.fn();
    const original = library.materials.floor.dispose.bind(library.materials.floor);
    library.materials.floor.dispose = () => { borrowedDispose(); original(); };
    for (const texture of Object.values(library.textures)) texture.addEventListener("dispose", borrowedTextureDispose);
    expect(() => createRenderedFloor({ ...plan, tiles: [] } as any, library)).toThrow(/invalid floor/i);
    expect(borrowedDispose).not.toHaveBeenCalled();
    const rendered = createRenderedFloor(plan, library);
    const ownedGeometries = new Set<any>();
    const ownedMeshes=(rendered.root.children as any[]).filter((mesh)=>mesh.geometry);
    const ownedMeshCount=ownedMeshes.length;
    const ownedMaterials=new Set<any>();
    for (const mesh of ownedMeshes) {
      ownedGeometries.add(mesh.geometry);
      mesh.addEventListener("dispose", instanceDispose);
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      for(const material of materials) if(!Object.values(library.materials).includes(material)) ownedMaterials.add(material);
    }
    for (const geometry of ownedGeometries) geometry.addEventListener("dispose", ownedDispose);
    const materialDisposals=[...ownedMaterials].map((material)=>{const listener=vi.fn();material.addEventListener("dispose",listener);return listener;});
    rendered.dispose(); rendered.dispose();
    expect(ownedGeometries.size).toBe(rendered.counts.geometries);
    expect(ownedDispose).toHaveBeenCalledTimes(ownedGeometries.size);
    expect(instanceDispose).toHaveBeenCalledTimes(ownedMeshCount);
    expect(materialDisposals.every((listener)=>listener.mock.calls.length===1)).toBe(true);
    expect(borrowedDispose).not.toHaveBeenCalled();
    expect(borrowedTextureDispose).not.toHaveBeenCalled();
    expect(library.materials.floor).toBeTruthy();
    library.dispose();
  });

  it("puts the primary preview torch on the forward-left wall in both default and slight-turn views",()=>{
    const plan=generateFloor({campaignSeed:"cryptkeep-preview",floorNumber:1}).plan;
    const library=createMaterialLibrary("cryptkeep-preview",16);
    const floor=createRenderedFloor(plan,library,{ceilingVisible:false});
    const outer=floor.root.children.find((item:any)=>item.name==="torch-orange-flame") as any;
    const point=new Matrix4();outer.getMatrixAt(0,point);
    const dx=plan.roles.entry.x*2+1-point.elements[12],dz=plan.roles.entry.z*2+1-point.elements[14];
    expect(dx).toBeGreaterThan(0);expect(dz).toBeGreaterThan(0);
    const bearingLeft=Math.atan2(dx,dz);
    expect(bearingLeft).toBeLessThan(0.5); // yaw-zero horizontal frustum
    expect(Math.abs(bearingLeft-0.2)).toBeLessThan(0.25); // native ~100px left turn keeps it framed
    floor.dispose();library.dispose();
  });
});
