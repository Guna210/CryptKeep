import { deriveStream, normalizeSeed } from "../../core/rng";

export const BASE_TILE_KINDS = ["stone", "floor", "door", "entry", "boss", "reward", "exit"] as const;
export type BaseTileKind = (typeof BASE_TILE_KINDS)[number];
export interface BaseTileRecipe { readonly kind: BaseTileKind; readonly width: number; readonly height: number; readonly data: Uint8Array; }
type RGB = readonly [number, number, number];
const palettes: Record<BaseTileKind, readonly RGB[]> = {
  stone: [[53,79,91],[70,101,113],[91,124,133],[119,149,153],[39,62,75],[151,170,164]],
  floor: [[65,86,87],[77,101,100],[91,113,108],[51,70,75],[113,128,119]],
  door: [[56,40,31],[91,61,42],[127,83,52],[39,54,58],[167,116,67]],
  entry: [[15,42,53],[15,113,139],[25,202,215],[172,253,246]],
  boss: [[57,23,30],[132,36,43],[203,58,46],[255,153,65]],
  reward: [[22,55,40],[44,132,79],[96,210,103],[211,255,154]],
  exit: [[67,44,15],[172,116,25],[246,195,53],[255,240,145]],
};

/** Deterministic painted material recipes. The stone image depicts one softly worn face, not a second brick grid. */
export function createBaseTile(seed: string, kind: BaseTileKind, size = 128): BaseTileRecipe {
  if (!BASE_TILE_KINDS.includes(kind)) throw new RangeError(`Unsupported base tile kind: ${String(kind)}`);
  if (typeof seed !== "string") throw new TypeError("Tile seed must be a string");
  const normalized = normalizeSeed(seed);
  if (!Number.isInteger(size) || ![16,32,64,128,256].includes(size)) throw new RangeError("Tile size must be 16, 32, 64, 128 or 256 pixels");
  const rng = deriveStream(normalized, "cosmetics", `base/${kind}/${size}`);
  const colors = palettes[kind];
  const colorAt = (index: number): RGB => colors[index]!;
  const data = new Uint8Array(size * size * 4);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const put = (x: number, y: number, c: RGB) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const at = (y * size + x) * 4;
    data[at] = clamp(c[0]); data[at + 1] = clamp(c[1]); data[at + 2] = clamp(c[2]); data[at + 3] = 255;
  };
  const line = (x0: number, y0: number, x1: number, y1: number, color: RGB, width: number) => {
    const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 1.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(1, steps), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const radius = width / 2;
      for (let yy = Math.floor(y - radius); yy <= Math.ceil(y + radius); yy++) for (let xx = Math.floor(x - radius); xx <= Math.ceil(x + radius); xx++) {
        if ((xx-x)**2 + (yy-y)**2 > radius*radius) continue;
        const at = (yy * size + xx) * 4;
        if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
        data[at] = color[0]; data[at+1] = color[1]; data[at+2] = color[2]; data[at+3] = 255;
      }
    }
  };
  if (kind === "stone" || kind === "floor") {
    const base = colorAt(kind === "stone" ? 1 : 1);
    const sizeScale = size / 128;
    const patchX = [0.2,0.68,0.44][rng.nextInt(0,3)]! * size;
    const patchY = [0.32,0.58,0.74][rng.nextInt(0,3)]! * size;
    const crackX = rng.nextInt(Math.floor(size*.18),Math.floor(size*.7));
    const crackY = rng.nextInt(Math.floor(size*.2),Math.floor(size*.64));
    for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const edge = Math.min(x,y,size-1-x,size-1-y) / size;
      const broadA = Math.sin((x/size*1.17 + y/size*.23 + patchX/size)*Math.PI*2);
      const broadB = Math.cos((y/size*1.45 - x/size*.16 + patchY/size)*Math.PI*2);
      const patch = Math.max(0,1-Math.hypot((x-patchX)/(size*.7),(y-patchY)/(size*.55)));
      const directional = kind === "stone" ? (0.5-x/size)*12 + (0.55-y/size)*15 : (0.5-x/size)*5;
      const edgeWear = kind === "stone" ? (edge < .045 ? 10 : edge < .08 ? 4 : 0) : (edge < .025 ? 5 : 0);
      const amount = broadA*3.2 + broadB*2.2 + patch*8 + directional + edgeWear;
      const micro = Math.sin(x*12.9898 + y*78.233) * (kind === "stone" ? .65 : .35);
      put(x,y,[base[0]+amount+micro,base[1]+amount+micro,base[2]+amount+micro]);
    }
    if (kind === "stone") {
      // Broken edge scuffs catch light without outlining the whole face like an inset frame.
      line(size*.10,size*.11,size*.31,size*.105,[137,162,166],Math.max(1,size*.008));
      line(size*.105,size*.10,size*.105,size*.23,[133,157,161],Math.max(1,size*.008));
      line(size*.72,size*.895,size*.87,size*.895,[45,69,80],Math.max(1,size*.009));
      const cx=crackX,cy=crackY;
      const crack:[[number,number],[number,number],[number,number],[number,number]] = [[cx,cy],[cx-size*.025,cy+size*.035],[cx+size*.015,cy+size*.068],[cx-size*.005,cy+size*.10]];
      for(let i=0;i<3;i++) line(crack[i]![0],crack[i]![1],crack[i+1]![0],crack[i+1]![1],[37,61,71],Math.max(1,size*.012));
      line(cx-size*.012,cy+size*.038,cx-size*.045,cy+size*.061,[45,69,77],Math.max(1,size*.009));
      // A few broad chipped flecks, kept sparse and clustered near an edge.
      for(let i=0;i<3;i++) {
        const x=rng.nextInt(0,size), y=rng.nextInt(0,size);
        const c=i===0?[142,163,163] as RGB:[50,74,84] as RGB;
        line(x,y,x+rng.nextInt(2,Math.max(3,Math.floor(7*sizeScale))),y+rng.nextInt(-2,3),c,Math.max(1,size*.009));
      }
    } else {
      line(size*.16,size*.18,size*.31,size*.16,[113,131,122],Math.max(1,size*.008));
      line(size*.72,size*.68,size*.77,size*.72,[45,66,70],Math.max(1,size*.008));
    }
  } else {
    // Small icon tiles retain their crisp graphic silhouettes, while world surfaces use painted recipes above.
    for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
      let c=colorAt(0); const cx=(size-1)/2,cy=(size-1)/2,dx=Math.abs(x-cx),dy=Math.abs(y-cy);
      if(kind==="door") c=x<3||x>=size-3||y<2||y>=size-2||y===size/4||y===size/2||y===size*3/4?colorAt(3):colorAt(x%4===0?0:1);
      else if(kind==="entry" && ((dx<=1&&dy<size*.34)||(dy<=1&&dx<size*.34)||(Math.abs(dx-dy)<=1&&dx<size*.25))) c=colorAt(2);
      else if(kind==="boss" && ((dy>size*.14&&dy<size*.31&&dx>size*.11&&dx<size*.32)||(dy<size*.25&&dx<size*.1))) c=colorAt(2);
      else if(kind==="reward" && dx+dy<size*.36) c=colorAt(dx+dy<size*.15?3:2);
      else if(kind==="exit" && dy<size*.06&&dx<size*.32) c=colorAt(3);
      const wash=Math.sin(x/size*Math.PI*2)*2+Math.cos(y/size*Math.PI*2)*1.5;
      put(x,y,[c[0]+wash,c[1]+wash,c[2]+wash]);
    }
  }
  return Object.freeze({ kind, width: size, height: size, data });
}
