# CK-ART-01 builder handoff

Owner-authorized preview experiment on `cartoon-art-preview`, based on `e225151713f33963dcae6ceef4dc20d302036439`. This is a reversible visual experiment; it does not adopt the art direction into the full campaign specification or establish a comfort/performance improvement.

## Implementation

- Generated floors now use beveled, chamfered instanced masonry over a dark mortar backing, with staggered rows, broad teal/slate tones and restrained wall-face moss. Masonry faces sit beyond the walkable tile bounds; the floor unit test checks every transformed masonry footprint against only the walkable tile cells it could overlap. The decorative layout derives from the floor plan and does not touch generation/gameplay RNG, tile occupancy, role placement or collision.
- Up to four deterministic amber sconces are drawn as shared instances; two are selected nearest the generated entry and two are spaced across the boundary set. Their four-or-fewer point lights are floor-owned and removed with the floor. Shared textures use deliberate broad block/slab bands, slate/teal palettes and linear mip sampling.
- The sword now uses a beveled faceted steel blade, brass guard/pommel, dark grip and the existing state-derived pose/charge cue. All new sword and floor resources are disposed by their existing owners.
- The renderer requests antialiasing, renders smoothly at viewport size using a device ratio capped at 1.5 and a 2.4-megapixel buffer limit, and uses restrained warm/cool lights with ACES tone mapping. Shell CSS and diagnostic harnesses no longer pixel-scale the canvas.
- Production browser coverage captures the normal generated `cryptkeep-preview` entry view after native pointer capture, checks the canvas resolution cap/antialiasing, resizes, pauses with Escape and checks console/page errors. Existing movement/pause/sword browser regressions remain in the workflow. The `cartoon-art-preview` push allowlist uploads `test-results/CK-ART-01/**` as a seven-day Actions artifact.

## Verification

- `npm run typecheck`: passed.
- `npm test`: passed, 171 Vitest tests and 1 tooling test.
- `npm run build`: passed. Vite emitted its existing-size class warning for the 671 KB minified Three.js bundle.
- `git diff --check`: passed.
- Browser suite and screenshot: not run locally. `docs/environment-start.md` says loopback binding is denied in this execution profile and directs browser verification to GitHub Actions; the new production screenshot test is ready for that hosted run. Do not report the screenshot, console, resize or native browser evidence as observed until the hosted artifact is inspected.
- No GPU performance measurement was made.

## Exact candidate file hashes

SHA-256 values for the implementation-owned source snapshot:

```text
171f4a305633b78b526451d12d3460cb6795b5bad11fb95c0620973f8e1afc8e  src/app/shell.ts
c2ca93fe719b0214c06e22708bc45be9638873bb9c39a065d35b50705f62880c  src/render/floor.test.ts
2cc3db253f0a55466ef53a08955d3e9c681376e2dca7cb6ef853dc0154821d82  src/render/floor.ts
0d0629b85c25f909e65fe2a82c76cb6bcfa98ba31322ed30c6679e75f5706c9a  src/render/materials.test.ts
e499074e090374915e6a1e4b94f15bd82481a4e8bb34229b7de27e07b8c68242  src/render/materials.ts
5e322482d283a797c334f8ee50883332c92fd6a5201a617fc3dbbdae4a16ab28  src/render/renderer.ts
8af1de40666725febc73a0639128234d7690b1f5811d894041896d433114f70c  src/render/textures/base.test.ts
9895744f399f0c1bb1cecc26a42a0880c72b2b5f158da5563165d1b631a72d0f  src/render/textures/base.ts
51a023465b3ff83d01a074df178727b8f3f5dbe6178cb944cc8d8376ad77e3a8  src/render/viewmodel.test.ts
d158f4b818a3c66f1bce53f04672f76877564f2e75d3957b2c41fd8ab7590bbf  src/render/weapons/sword.ts
499716c6745d4a94612e38e50f5116b4b9d411f0a5eb3b91830cf7cac7120b79  src/ui/shell.css
d060782031248e4d4ba9855eb183cbba54c15aa62af1b89b7225c9e1646cc7cf  tests/e2e/production.spec.ts
c82ce70a8328d62b3e829144484cbfa6d7d2d2c9fe1dde01a7421f0b5d771090  tests/e2e/renderer.spec.ts
ce18a8dc95d67e9aaff59511646a3c5818c732fd2701fdd8a9189f741f984cac  tests/e2e/shell.spec.ts
97d7a243278e684af890ef2b13ab95c1a3d2661532bd36c37b2522d6f0efe2ef  tests/e2e/viewmodel.spec.ts
e81e1f3f12b310e6002a3da549cc2b315543147e62e8a2e3fe4c52164654ba4a  tests/harness/combat-room.html
e36e67a727b074002c376a7b4d5871c2a97e48dfed15885263804ac866bba579  tests/harness/renderer.html
77b137a35cd643e3cb9c316b6f57f8c7d1a0560e637b1eed95720f8530a2aed7  tests/harness/viewmodel.html
0e816dc90234cbed89f8a9bf8487b8f28bb3d298103f17928316aed7df237550  .github/workflows/verify.yml
```

The coordinator-owned `CONTEXT.md`, `SPEC.md` and `decisions/cartoon-art-preview.md` are excluded. Main owns Git publication, hosted artifact inspection, independent Luna review and acceptance records.

## Coordinator acceptance

Accepted after one independent Luna review/repair round. Both confirmed findings resolved; [round-one verification](../reviews/CK-ART-01/round-1-verification.md) PASS on repaired source `66e5f46a748f4cd467d4be5c0154e72c617976a5` (tree `daca987abeb61dca3f933379368aff9105a0a50b`). [Hosted run37625873118](https://github.com/Guna210/CryptKeep/actions/runs/37625873118), job112807347541 passed typecheck,171 app tests, tooling stage, build and25 Chromium tests. The [repair report](CK-ART-01.round-1-fix.md) preserves final23source hashes; the initial manifest above remains historical.

Main and reviewer opened repaired production PNG SHA256 `dc2a2bc3a570061f3956bd077914dca4f1d981bcca46a761f868831d26ea0e7b`; artifact11483923109 archive digest `f11e36f59e0e798bfa432acdfa65b1983b558c826f55c275de4eb1110c84a2ae`. Default screenshot omits torches; source inspection confirms up to2 sconces. Initial run37623705432 failed6/25 browser checks and remains recorded. No GPU/comfort or finished-campaign claim. Published only on cartoon-art-preview; master unchanged, merge awaits owner instruction. Cloudflare deployment not independently verified.
