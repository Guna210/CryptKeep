import { describe, expect, it } from "vitest";
import { createPaintedArtwork } from "./painted";

describe("authored painted surface recipes",()=>{
  it("produce opaque repeatable artwork and four distinct coordinated masonry designs",()=>{
    const stone=[0,1,2,3].map(variant=>createPaintedArtwork("stone",128,variant));
    expect(stone.map(image=>image.data)).toEqual([0,1,2,3].map(variant=>createPaintedArtwork("stone",128,variant).data));
    expect(new Set(stone.map(image=>Array.from(image.data).join(","))).size).toBe(4);
    for(const image of [...stone,createPaintedArtwork("steel",128),createPaintedArtwork("leather",128),createPaintedArtwork("brass",128)]){
      expect(image.data).toHaveLength(image.width*image.height*4);
      for(let i=3;i<image.data.length;i+=4)expect(image.data[i]).toBe(255);
      const reds=Array.from({length:image.width*image.height},(_,i)=>image.data[i*4]!);
      expect(Math.max(...reds)-Math.min(...reds)).toBeGreaterThan(35);
    }
  });
});
