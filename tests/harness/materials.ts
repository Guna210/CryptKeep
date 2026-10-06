import { BASE_TILE_KINDS, createBaseTile } from "../../src/render/textures/base";
import { createMaterialLibrary } from "../../src/render/materials";

const seed = "ck-01-06";
const library = createMaterialLibrary(seed, 32);
const sheet = document.querySelector<HTMLElement>("#sheet");
if (!sheet) throw new Error("Contact sheet root missing");
for (const kind of BASE_TILE_KINDS) {
  const recipe = createBaseTile(seed, kind, 32);
  const figure = document.createElement("figure");
  const canvas = document.createElement("canvas");
  canvas.width = recipe.width;
  canvas.height = recipe.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas unavailable");
  const pixels = context.createImageData(recipe.width, recipe.height);
  pixels.data.set(recipe.data);
  context.putImageData(pixels, 0, 0);
  const caption = document.createElement("figcaption");
  caption.textContent = kind;
  figure.append(canvas, caption);
  sheet.append(figure);
}
// Exercise borrower use without adding a renderer; this fixture has no GPU lifecycle.
document.documentElement.dataset.materialCount = String(Object.keys(library.materials).length);
window.addEventListener("pagehide", () => library.dispose(), { once: true });
