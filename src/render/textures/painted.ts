import type { BaseTileKind } from "./base";

export type PaintedSurface = BaseTileKind | "steel" | "leather" | "brass" | "wood" | "iron" | "trim";
export interface PaintedArtwork { readonly width: number; readonly height: number; readonly data: Uint8Array }
type RGB = readonly [number, number, number];

/**
 * Reproducible, original vector-style artwork rasterizer. Every mark below is an authored
 * shape or broad glaze; there is no noise sampler. These recipes are the source artwork.
 */
export function createPaintedArtwork(kind: PaintedSurface, size = 256, variant = 0): PaintedArtwork {
  if (!Number.isInteger(size) || size < 16 || size > 512) throw new RangeError("Painted texture size must be 16–512 pixels");
  if(!Number.isInteger(variant)||variant<0||variant>3)throw new RangeError("Paint variant must be 0–3");
  const palettes: Record<PaintedSurface, { base: RGB; light: RGB; shade: RGB; accent: RGB }> = {
    stone: { base:[70,91,99], light:[137,151,146], shade:[42,59,68], accent:[177,166,139] },
    floor: { base:[66,81,79], light:[130,137,123], shade:[39,53,57], accent:[153,139,112] },
    door: { base:[87,57,39], light:[155,110,67], shade:[43,42,39], accent:[191,148,88] },
    entry: { base:[15,42,53], light:[25,202,215], shade:[10,24,32], accent:[172,253,246] },
    boss: { base:[57,23,30], light:[203,58,46], shade:[31,19,25], accent:[255,153,65] },
    reward: { base:[22,55,40], light:[96,210,103], shade:[15,34,29], accent:[211,255,154] },
    exit: { base:[67,44,15], light:[246,195,53], shade:[40,32,17], accent:[255,240,145] },
    steel: { base:[91,119,126], light:[222,230,217], shade:[35,56,66], accent:[160,198,201] },
    leather: { base:[67,43,32], light:[128,88,59], shade:[34,27,24], accent:[180,132,83] },
    brass: { base:[143,101,48], light:[231,194,111], shade:[72,59,37], accent:[91,113,102] },
    wood: { base:[111,70,43], light:[177,121,70], shade:[57,42,34], accent:[205,158,95] },
    iron: { base:[55,69,72], light:[128,145,137], shade:[29,40,45], accent:[164,135,91] },
    trim: { base:[83,62,45], light:[163,127,82], shade:[43,43,40], accent:[199,166,110] },
  };
  const p = palettes[kind];
  if (!p) throw new RangeError(`Unsupported painted surface: ${String(kind)}`);
  const data = new Uint8Array(size * size * 4);
  const put = (x:number,y:number,c:RGB,alpha=1) => {
    if(x<0||y<0||x>=size||y>=size)return;
    const i=(Math.floor(y)*size+Math.floor(x))*4, a=Math.max(0,Math.min(1,alpha));
    data[i]=Math.round(data[i]!*(1-a)+c[0]*a);data[i+1]=Math.round(data[i+1]!*(1-a)+c[1]*a);data[i+2]=Math.round(data[i+2]!*(1-a)+c[2]*a);data[i+3]=255;
  };
  const ellipse=(cx:number,cy:number,rx:number,ry:number,c:RGB,alpha=1)=>{
    const x0=Math.max(0,Math.floor(cx-rx)),x1=Math.min(size-1,Math.ceil(cx+rx)),y0=Math.max(0,Math.floor(cy-ry)),y1=Math.min(size-1,Math.ceil(cy+ry));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const d=Math.hypot((x-cx)/rx,(y-cy)/ry);if(d<=1)put(x,y,c,alpha*Math.min(1,(1-d)*9));}
  };
  const stroke=(x0:number,y0:number,x1:number,y1:number,width:number,c:RGB,alpha=1)=>{
    const steps=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))*1.4),r=width/2;
    for(let i=0;i<=steps;i++){const t=i/Math.max(steps,1),x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;ellipse(x,y,r,r,c,alpha);}
  };
  const polygon=(points:readonly (readonly [number,number])[],c:RGB,alpha=1)=>{
    const pts=points.map(([x,y])=>[x*size,y*size] as const),minX=Math.max(0,Math.floor(Math.min(...pts.map(p=>p[0])))),maxX=Math.min(size-1,Math.ceil(Math.max(...pts.map(p=>p[0]))));
    const minY=Math.max(0,Math.floor(Math.min(...pts.map(p=>p[1])))),maxY=Math.min(size-1,Math.ceil(Math.max(...pts.map(p=>p[1]))));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        const [xi,yi]=pts[i]!,[xj,yj]=pts[j]!;
        if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
      }
      if(inside)put(x,y,c,alpha);
    }
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size;
    const wash=Math.sin((u*.78+v*.24)*Math.PI*2)*.12+Math.cos((v*.63-u*.2)*Math.PI*2)*.08;
    const edge=(kind==="stone"||kind==="floor")?Math.max(0,1-Math.min(x,y,size-1-x,size-1-y)/(size*.12))*.16:0;
    put(x,y,p.base);
    if(wash>0)put(x,y,p.light,Math.min(.14,wash*.45));else put(x,y,p.shade,Math.min(.14,-wash*.45));
    if(edge>0)put(x,y,p.light,edge);
  }
  const s=size/256;
  if(kind==="stone"){
    const designs=[
      {light:[[.04,.12],[.33,.05],[.58,.18],[.46,.34],[.21,.4],[.04,.31]],dark:[[.52,.62],[.79,.51],[.98,.63],[.94,.88],[.7,.96],[.54,.83]],chip:[[.04,.76],[.18,.7],[.25,.76],[.2,.84],[.05,.87]]},
      {light:[[.44,.05],[.78,.08],[.96,.27],[.81,.38],[.58,.31],[.39,.2]],dark:[[.03,.49],[.27,.41],[.48,.55],[.43,.79],[.2,.93],[.02,.82]],chip:[[.74,.71],[.95,.66],[.97,.79],[.82,.86],[.7,.8]]},
      {light:[[.05,.59],[.23,.43],[.49,.48],[.59,.69],[.43,.91],[.14,.9]],dark:[[.56,.08],[.79,.03],[.98,.16],[.91,.4],[.68,.46],[.51,.29]],chip:[[.79,.61],[.96,.55],[.98,.65],[.87,.7],[.78,.68]]},
      {light:[[.12,.7],[.3,.53],[.54,.58],[.72,.78],[.55,.95],[.26,.92]],dark:[[.04,.09],[.31,.04],[.5,.16],[.46,.36],[.2,.43],[.03,.31]],chip:[[.73,.18],[.95,.1],[.98,.22],[.82,.29],[.7,.25]]},
    ] as const;
    const design=designs[variant]!;
    polygon(design.dark,p.shade,.56);polygon(design.light,p.light,.4);polygon(design.chip,p.accent,.48);
    const bevels=[[[.05,.14],[.32,.07],[.51,.19]],[[.46,.07],[.77,.1],[.9,.24]],[[.08,.6],[.24,.46],[.43,.5]],[[.16,.72],[.31,.56],[.52,.61]]] as const;
    const bevel=bevels[variant]!;for(let i=0;i<bevel.length-1;i++)stroke(bevel[i]![0]*size,bevel[i]![1]*size,bevel[i+1]![0]*size,bevel[i+1]![1]*size,5*s,p.accent,.75);
    const cracks=[[[.64,.4],[.7,.47],[.67,.55],[.75,.61]],[[.38,.32],[.33,.4],[.4,.46],[.36,.53]],[[.59,.49],[.65,.56],[.6,.65],[.69,.72]],[[.51,.44],[.46,.52],[.53,.59],[.49,.67]]] as const;
    const crack=cracks[variant]!;for(let i=0;i<crack.length-1;i++)stroke(crack[i]![0]*size,crack[i]![1]*size,crack[i+1]![0]*size,crack[i+1]![1]*size,(3-i*.45)*s,p.shade,.96);
    stroke(size*.11,size*.88,size*.23,size*.84,2*s,p.light,.82);
  } else if(kind==="floor"){
    ellipse(size*.28,size*.27,size*.31,size*.24,p.light,.2);ellipse(size*.72,size*.72,size*.3,size*.2,p.shade,.27);
    stroke(size*.08,size*.24,size*.92,size*.24,2*s,p.shade,.8);stroke(size*.08,size*.76,size*.92,size*.76,2*s,p.shade,.7);
    stroke(size*.25,size*.08,size*.25,size*.91,1.5*s,p.accent,.28);stroke(size*.75,size*.08,size*.75,size*.91,1.5*s,p.accent,.22);
    stroke(size*.11,size*.28,size*.18,size*.3,3*s,p.light,.62);stroke(size*.79,size*.72,size*.9,size*.7,2*s,p.light,.45);
  } else if(kind==="steel"){
    // Three longitudinal UV strips: face reflections/fuller's shadow, reverse gleam, and cutting edge.
    polygon([[.03,.03],[.22,.03],[.2,.75],[.13,.98],[.07,.84]],p.light,.92);
    polygon([[.23,.04],[.35,.04],[.34,.84],[.27,.96],[.24,.68]],p.shade,.78);
    polygon([[.36,.04],[.47,.04],[.43,.82],[.4,.96],[.36,.77]],p.accent,.76);
    polygon([[.51,.03],[.57,.03],[.59,.76],[.55,.97],[.51,.72]],p.light,.62);
    polygon([[.61,.04],[.68,.04],[.66,.87],[.62,.95]],p.shade,.46);
    polygon([[.73,.03],[.79,.03],[.81,.94],[.76,.98]],p.light,.96);
    polygon([[.82,.03],[.96,.03],[.94,.96],[.84,.95]],p.shade,.62);
    stroke(size*.06,size*.08,size*.07,size*.89,4*s,p.accent,.92);
    stroke(size*.78,size*.27,size*.84,size*.3,2*s,p.light,.95);stroke(size*.84,size*.3,size*.81,size*.36,1.5*s,p.shade,.95);
    stroke(size*.76,size*.62,size*.81,size*.66,1.7*s,p.light,.78);stroke(size*.79,size*.66,size*.83,size*.69,1.2*s,p.shade,.92);
    stroke(size*.59,size*.2,size*.62,size*.24,1.1*s,p.accent,.82);
  } else if(kind==="leather"){
    polygon([[.04,.12],[.22,.07],[.39,.16],[.31,.29],[.11,.33]],p.light,.27);polygon([[.62,.68],[.84,.64],[.97,.79],[.84,.94],[.65,.87]],p.shade,.38);
    for(let i=-1;i<9;i++){const y=(i/8)*size;stroke(size*.04,y,size*.96,y-size*.21,Math.max(2,5*s),p.accent,.52);stroke(size*.04,y+3*s,size*.96,y-size*.21+3*s,1.5*s,p.shade,.88);}
    stroke(size*.1,size*.12,size*.19,size*.09,2*s,p.light,.7);stroke(size*.78,size*.88,size*.89,size*.85,2*s,p.light,.6);
    for(const [x,y] of [[.16,.56],[.42,.31],[.68,.49],[.83,.2],[.29,.81]] as const){stroke(size*x,size*y,size*(x+.035),size*(y-.02),1.1*s,p.light,.46);}
  } else if(kind==="brass"){
    polygon([[.08,.12],[.32,.06],[.48,.14],[.4,.29],[.18,.34],[.05,.27]],p.light,.44);
    polygon([[.59,.66],[.81,.58],[.97,.7],[.91,.9],[.71,.95],[.56,.83]],p.shade,.46);
    // Engraved paired leaf-and-flame motif, with a worn interrupted border.
    stroke(size*.5,size*.13,size*.5,size*.86,3*s,p.accent,.92);
    for(const side of [-1,1])for(const [y,span] of [[.28,.16],[.43,.2],[.59,.17],[.74,.12]] as const){
      const x=.5+side*span;
      stroke(size*.5,size*y,size*x,size*(y-.08),2.2*s,p.accent,.95);
      stroke(size*x,size*(y-.08),size*(.5+side*.025),size*(y-.17),1.8*s,p.shade,.82);
      stroke(size*(.5+side*.025),size*(y-.17),size*.5,size*y,1.6*s,p.light,.9);
    }
    stroke(size*.22,size*.19,size*.32,size*.14,2*s,p.shade,.82);stroke(size*.7,size*.86,size*.82,size*.82,2*s,p.accent,.78);
    // Sparse tarnish specks are hand-placed larger patches rather than pixel noise.
    polygon([[.13,.73],[.22,.69],[.27,.76],[.19,.81]],p.accent,.42);polygon([[.78,.26],[.86,.22],[.9,.29],[.83,.33]],p.shade,.46);
  } else if(kind==="wood"||kind==="trim"){
    polygon([[.03,.09],[.21,.04],[.35,.16],[.31,.37],[.12,.44],[.02,.34]],p.light,.34);
    polygon([[.58,.61],[.81,.55],[.97,.67],[.94,.9],[.75,.96],[.57,.83]],p.shade,.4);
    const grain=[[[-.05,.2],[.24,.16],[.48,.22],[.76,.12],[1.05,.16]], [[-.04,.42],[.2,.36],[.43,.4],[.71,.33],[1.04,.38]], [[-.03,.68],[.21,.62],[.46,.66],[.73,.59],[1.03,.63]], [[-.02,.88],[.25,.82],[.49,.86],[.75,.79],[1.04,.83]]] as const;
    for(let line=0;line<grain.length;line++)for(let i=0;i<grain[line]!.length-1;i++){
      const a=grain[line]![i]!,b=grain[line]![i+1]!;
      stroke(size*a[0],size*a[1],size*b[0],size*b[1],(line===1?4:2.2)*s,p.accent,line===1?.58:.4);
      stroke(size*a[0],size*(a[1]+.022),size*b[0],size*(b[1]+.022),1.2*s,p.shade,.78);
    }
    // Two irregular knots stretch with the grain like real cut timber.
    polygon([[.24,.46],[.29,.43],[.35,.45],[.37,.49],[.32,.53],[.26,.51]],p.shade,.82);
    polygon([[.27,.47],[.31,.455],[.34,.47],[.32,.49],[.28,.49]],p.accent,.9);
    polygon([[.71,.72],[.76,.69],[.81,.71],[.82,.75],[.77,.78],[.72,.76]],p.shade,.78);
    polygon([[.74,.72],[.77,.71],[.79,.73],[.77,.75],[.74,.75]],p.accent,.86);
  } else if(kind==="iron"){
    polygon([[.08,.12],[.32,.08],[.53,.17],[.4,.31],[.17,.32]],p.light,.27);polygon([[.57,.7],[.79,.62],[.96,.73],[.89,.94],[.67,.91]],p.shade,.44);
    stroke(size*.13,size*.15,size*.86,size*.15,5*s,p.accent,.35);stroke(size*.13,size*.17,size*.86,size*.17,2*s,p.light,.52);
    for(const [cx,cy] of [[.18,.18],[.82,.18],[.18,.82],[.82,.82]] as const){ellipse(size*cx,size*cy,5*s,5*s,p.shade,.9);ellipse(size*cx-1*s,size*cy-1*s,1.5*s,1.5*s,p.light,.85);}
  } else {
    for(let y=0;y<size;y+=Math.max(8,Math.round(16*s))){stroke(0,y,size,y,Math.max(2,3*s),p.accent,.45);}
  }
  return Object.freeze({width:size,height:size,data});
}
