import { deriveStream, normalizeSeed } from "../../core/rng";

export const BASE_TILE_KINDS = ["stone", "floor", "door", "entry", "boss", "reward", "exit"] as const;
export type BaseTileKind = (typeof BASE_TILE_KINDS)[number];
export interface BaseTileRecipe { readonly kind: BaseTileKind; readonly width: number; readonly height: number; readonly data: Uint8Array; }
type RGB = readonly [number, number, number];
const palettes: Record<BaseTileKind, readonly RGB[]> = {
  stone: [[37,57,62],[53,76,81],[75,100,102],[102,125,121],[25,41,46]],
  floor: [[56,75,73],[72,91,87],[89,105,99],[38,55,56],[108,119,106]],
  door: [[56,40,31],[91,61,42],[127,83,52],[39,54,58],[167,116,67]],
  entry: [[15,42,53],[15,113,139],[25,202,215],[172,253,246]],
  boss: [[57,23,30],[132,36,43],[203,58,46],[255,153,65]],
  reward: [[22,55,40],[44,132,79],[96,210,103],[211,255,154]],
  exit: [[67,44,15],[172,116,25],[246,195,53],[255,240,145]],
};

/** Produce deterministic, original pixel art. Cosmetic RNG is isolated by kind and tile size. */
export function createBaseTile(seed: string, kind: BaseTileKind, size = 32): BaseTileRecipe {
  if (!BASE_TILE_KINDS.includes(kind)) throw new RangeError(`Unsupported base tile kind: ${String(kind)}`);
  if (typeof seed !== "string") throw new TypeError("Tile seed must be a string");
  const normalized = normalizeSeed(seed);
  if (!Number.isInteger(size) || ![16,32,64].includes(size)) throw new RangeError("Tile size must be 16, 32 or 64 pixels");
  const rng = deriveStream(normalized, "cosmetics", `base/${kind}/${size}`);
  const colors = palettes[kind];
  const colorAt = (index: number): RGB => colors[index]!;
  const data = new Uint8Array(size * size * 4);
  const set = (x: number, y: number, color: RGB) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const at = (y * size + x) * 4;
    data[at] = color[0]; data[at + 1] = color[1]; data[at + 2] = color[2]; data[at + 3] = 255;
  };
  const pick = () => colorAt(rng.nextInt(0, colors.length));
  // Distinct structural silhouettes; random variation only decorates these forms.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let c: RGB;
    if (kind === "stone") {
      const row = Math.floor(y / (size / 4));
      const offset = row % 2 ? size / 4 : 0;
      const localY = y % (size / 4), localX = (x + offset) % (size / 2);
      const seam = localY < 2 || localX < 2;
      const band = Math.floor(localY / Math.max(1, size / 16));
      c = seam ? colorAt(4) : colorAt(band === 0 ? 3 : band >= 3 ? 0 : 1);
      if (!seam && localX > size / 2 - 4) c = colorAt(0);
      // Sparse broad chips keep each block readable instead of covering it in pixel noise.
      if (!seam && rng.nextInt(0, 96) === 0) c = colorAt(2);
    } else if (kind === "floor") {
      const localX=x%(size/2),localY=y%(size/2);
      const gap = localX < 2 || localY < 2;
      const slab = (Math.floor(x/(size/2))+Math.floor(y/(size/2)))%3;
      c = gap ? colorAt(3) : colorAt(slab===0?1:slab===1?2:0);
      if (!gap && localX < 5 && localY < 5) c=colorAt(4);
    } else if (kind === "door") {
      const frame = x < 3 || x >= size - 3 || y < 2 || y >= size - 2;
      const ironBand = y === size / 4 || y === size / 2 || y === size * 3 / 4;
      c = frame || ironBand ? colorAt(3) : (x % 4 === 0 ? colorAt(0) : colorAt(1));
    } else {
      c = colorAt(0);
      const cx = (size - 1) / 2, cy = (size - 1) / 2;
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      if (kind === "entry") {
        if ((dx <= 1 && dy < size * .34) || (dy <= 1 && dx < size * .34) || (Math.abs(dx - dy) <= 1 && dx < size * .25)) c = colorAt(2);
        if (Math.max(dx, dy) < 2) c = colorAt(3);
      } else if (kind === "boss") {
        if ((dy > size * .14 && dy < size * .31 && dx > size * .11 && dx < size * .32) || (dy < size * .25 && dx < size * .1)) c = colorAt(2);
        if (dy > size * .25 && dy < size * .34 && dx < size * .1) c = colorAt(3);
      } else if (kind === "reward") {
        const diamond = dx + dy < size * .36;
        if (diamond) c = colorAt(2);
        if (diamond && dx + dy < size * .15) c = colorAt(3);
        if (dy > size * .18 && dy < size * .31 && dx < size * .18) c = colorAt(1);
      } else {
        const tier = Math.floor((y - (size * .28)) / (size * .1));
        const stairs = tier >= 0 && tier < 4 && Math.abs(x - cx) <= (tier + 1) * size * .055;
        if (stairs) c = colorAt(2);
        if (dy < size * .06 && dx < size * .32) c = colorAt(3);
      }
    }
    set(x, y, c);
  }
  // Sparse deterministic chips / rune glints provide dithered variation without erasing silhouettes.
  if (kind === "stone" || kind === "floor" || kind === "door") {
    for (let i = 0; i < size; i++) {
      const x = rng.nextInt(0, size), y = rng.nextInt(0, size);
      if (kind === "door" && (x < 3 || x >= size - 3)) continue;
      set(x, y, pick());
    }
  }
  return Object.freeze({ kind, width: size, height: size, data });
}
