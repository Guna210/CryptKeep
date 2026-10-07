import { Group, Matrix4 } from "three";
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
    const ceilings = floor.root.children.find((item: any) => item.material === library.materials.stone) as any;
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
    expect(floor.root.children.length).toBeLessThanOrEqual(16);
    const wallMeshes = floor.root.children.filter((item: any) => item.material === library.materials.stone) as any[];
    expect(wallMeshes).toHaveLength(1); // ceiling retains the shared stone library material
    const masonry=floor.root.children.filter((item:any)=>item.geometry?.type==="ExtrudeGeometry") as any[];
    expect(masonry).toHaveLength(1); // both wall orientations share one geometry/material batch
    expect(masonry.every(mesh=>mesh.count>0&&mesh.instanceColor!==null)).toBe(true);
    expect(masonry[0].material.map).toBeNull();
    expect(masonry[0].material.emissiveIntensity).toBeGreaterThan(0);
    masonry[0].geometry.computeBoundingBox();
    const stoneBounds=masonry[0].geometry.boundingBox!;
    let wallBottom=Infinity,wallTop=-Infinity;
    for(let i=0;i<masonry[0].count;i++){
      masonry[0].getMatrixAt(i,point);
      const halfHeight=Math.max(Math.abs(stoneBounds.min.y),Math.abs(stoneBounds.max.y))*Math.abs(point.elements[5]);
      wallBottom=Math.min(wallBottom,point.elements[13]-halfHeight);
      wallTop=Math.max(wallTop,point.elements[13]+halfHeight);
    }
    expect(wallTop-wallBottom).toBeGreaterThan(2.8);
    expect(masonry[0].count).toBeGreaterThan(100);
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
});
