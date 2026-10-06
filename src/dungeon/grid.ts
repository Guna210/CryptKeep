import { Tile, type Cell, type Grid, type TileValue, type WorldXZ } from "./types";

export const CELL_SIZE_METERS = 2;
export const MAX_GRID_DIMENSION = 80;

function validateDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError("Grid width and height must be positive integers");
  }
  if (width > MAX_GRID_DIMENSION || height > MAX_GRID_DIMENSION) {
    throw new RangeError(`Grid dimensions must not exceed ${MAX_GRID_DIMENSION} cells`);
  }
}

function validateCell(cell: Cell): void {
  if (!cell || typeof cell !== "object" || !Number.isSafeInteger(cell.x) || !Number.isSafeInteger(cell.z)) {
    throw new TypeError("Cell coordinates must be safe integers");
  }
}

/** Construct a detached immutable grid. Tiles use row-major z * width + x order. */
export function createGrid(width: number, height: number, tiles: readonly number[]): Grid {
  validateDimensions(width, height);
  if (!Array.isArray(tiles)) throw new TypeError("Grid tiles must be an array");
  if (tiles.length !== width * height) throw new RangeError("Grid tile count must equal width × height");
  const copy: TileValue[] = [];
  for (let index = 0; index < tiles.length; index += 1) {
    const value = tiles[index];
    if (value !== Tile.Solid && value !== Tile.Walkable) {
      throw new TypeError(`Grid tile at index ${index} must be Tile.Solid or Tile.Walkable`);
    }
    copy.push(value);
  }
  return Object.freeze({ width, height, tiles: Object.freeze(copy) });
}

/** True only for integral coordinates inside the grid. */
export function isInBounds(grid: Grid, cell: Cell): boolean {
  validateCell(cell);
  return cell.x >= 0 && cell.z >= 0 && cell.x < grid.width && cell.z < grid.height;
}

/** Row-major index, or null for a valid integer cell outside the grid. */
export function cellIndex(grid: Grid, cell: Cell): number | null {
  return isInBounds(grid, cell) ? cell.z * grid.width + cell.x : null;
}

/** Tile value at a cell, or null outside bounds. */
export function tileAt(grid: Grid, cell: Cell): TileValue | null {
  const index = cellIndex(grid, cell);
  return index === null ? null : grid.tiles[index] ?? null;
}

/** Whether a cell contains walkable floor; out-of-bounds cells are false. */
export function isWalkable(grid: Grid, cell: Cell): boolean {
  return tileAt(grid, cell) === Tile.Walkable;
}

/**
 * Bounded orthogonal neighbors in fixed order: +X (east), -X (west),
 * +Z (south), -Z (north). Returned cell values are detached and immutable.
 */
export function orthogonalNeighbors(grid: Grid, cell: Cell): readonly Cell[] {
  if (!isInBounds(grid, cell)) return Object.freeze([]);
  const candidates: readonly Cell[] = [
    { x: cell.x + 1, z: cell.z },
    { x: cell.x - 1, z: cell.z },
    { x: cell.x, z: cell.z + 1 },
    { x: cell.x, z: cell.z - 1 },
  ];
  return Object.freeze(candidates.filter((neighbor) =>
    neighbor.x >= 0 && neighbor.z >= 0 && neighbor.x < grid.width && neighbor.z < grid.height,
  ).map(({ x, z }) => Object.freeze({ x, z })));
}

/** Convert world X/Z to a cell using floor, including for negative positions. */
export function worldToCell(position: WorldXZ): Cell {
  if (!position || typeof position !== "object" || !Number.isFinite(position.x) || !Number.isFinite(position.z)) {
    throw new TypeError("World coordinates must be finite numbers");
  }
  const x = Math.floor(position.x / CELL_SIZE_METERS);
  const z = Math.floor(position.z / CELL_SIZE_METERS);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z)) {
    throw new RangeError("World coordinates must map to safe integer cell coordinates");
  }
  return Object.freeze({ x, z });
}

/** Return the world-space center of an integer cell, including negative cells. */
export function cellToWorld(cell: Cell): WorldXZ {
  validateCell(cell);
  return Object.freeze({
    x: (cell.x + 0.5) * CELL_SIZE_METERS,
    z: (cell.z + 0.5) * CELL_SIZE_METERS,
  });
}
