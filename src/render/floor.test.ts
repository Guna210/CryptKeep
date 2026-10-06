import { Group, Matrix4 } from "three";
import { describe, expect, it, vi } from "vitest";
import { generateFloor } from "../dungeon/generate";
import { createMaterialLibrary } from "./materials";
import { createRenderedFloor } from "./floor";

describe("rendered floor ownership and placement", () => {
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
    expect(floor.root.children.length).toBeLessThanOrEqual(8);
    const wallMeshes = floor.root.children.filter((item: any) => item.material === library.materials.stone) as any[];
    expect(wallMeshes).toHaveLength(3); // ceiling plus the two oriented boundary batches
    for (const wallMesh of wallMeshes.slice(1)) for (let i = 0; i < wallMesh.count; i++) {
      wallMesh.getMatrixAt(i, point);
      expect(point.elements[13]).toBe(1.5);
      const wx = point.elements[12], wz = point.elements[14];
      const width = 2 * Math.abs(point.elements[0]), depth = 2 * Math.abs(point.elements[10]);
      expect(width < 0.2 || depth < 0.2).toBe(true);
      for (let z = 0; z < plan.height; z++) for (let x = 0; x < plan.width; x++) if (plan.tiles[z * plan.width + x] === 1) {
        const cx = x * 2 + 1, cz = z * 2 + 1;
        const overlapsX = Math.abs(cx - wx) < 1 + width / 2 - 1e-4;
        const overlapsZ = Math.abs(cz - wz) < 1 + depth / 2 - 1e-4;
        expect(overlapsX && overlapsZ).toBe(false);
      }
    }
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
    for (const mesh of rendered.root.children as any) {
      ownedGeometries.add(mesh.geometry);
      mesh.addEventListener("dispose", instanceDispose);
    }
    for (const geometry of ownedGeometries) geometry.addEventListener("dispose", ownedDispose);
    rendered.dispose(); rendered.dispose();
    expect(ownedGeometries.size).toBe(rendered.counts.geometries);
    expect(ownedDispose).toHaveBeenCalledTimes(ownedGeometries.size);
    expect(instanceDispose).toHaveBeenCalledTimes(rendered.root.children.length === 0 ? 8 : 0);
    expect(borrowedDispose).not.toHaveBeenCalled();
    expect(borrowedTextureDispose).not.toHaveBeenCalled();
    expect(library.materials.floor).toBeTruthy();
    library.dispose();
  });
});
