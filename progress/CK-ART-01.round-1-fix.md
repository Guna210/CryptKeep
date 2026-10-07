# CK-ART-01 round-one repair handoff

Repair scope: findings CK-ART-01-R1-F01/F02 from [round 1](../reviews/CK-ART-01/round-1.md). This is the same reversible visual experiment on `cartoon-art-preview`; it does not adopt this art direction into the full campaign specification.

## F02 wall readability

- Physical blocks now use one owned, untextured `MeshStandardMaterial`, so the broad teal/slate instance colors are not multiplied by a second tiled brick texture. Mild emissive fill preserves face readability under the fixed cool/warm scene lights; dark mortar, beveled edges and block color variation retain dimension.
- Six blocks per boundary cell (two across, three high) cover the 3m wall. Original transformed-footprint tests still require every masonry instance to clear every walkable tile footprint that it can overlap; the test also checks the full wall-height coverage, untextured material and nonzero instanced color variation.
- Floor and sword art remain unchanged. Two fixed amber sconces remain: one nearest the entry and one distributed across the wall edges.

## F01 hosted native regressions and batch budget

- Reduced masonry from eight to six blocks per edge. Merged X/Z mortar into one instanced mesh and both wall orientations into one masonry mesh; this removes two draw calls. With the ceiling hidden, the batch budget remains the existing maximum of 10: floor, mortar, masonry, moss, two sconce meshes and four role markers. Production with its ceiling is 11. `tests/e2e/floor-renderer.spec.ts` keeps its `<= 10` assertion unchanged.
- Reduced four point lights to two; at most two fixed sconce lights remain. The production page still renders full resolution with the existing 2.4MP cap and antialiasing.
- Dash, movement and sword E2E checks now wait on real floor ticks or the read-only sword `idle` phase before assessing cooldown/recovery/held movement. Stamina cost, moved distance, wall collision clearance, pause cancellation, attack outcome, native input, and all 25 floor replacements remain asserted. The 25-reroll loop in `tests/e2e/floor.spec.ts` is unchanged.
- CI Playwright uses one worker because the failed hosted run ran software Chromium on one runner and two full-resolution browser contexts contended for its frame budget. Local runs retain two workers.

## Local verification and pending hosted evidence

- `npm run typecheck`: passed.
- `npm test`: passed, 171 application tests and one tooling test.
- `npm run build`: passed; Vite emitted its bundle-size warning (671.58 KB minified JS).
- `git diff --check`: passed.
- Browser tests and screenshot were not run locally; `docs/environment-start.md` forbids retrying loopback access in this execution profile. No browser pass is claimed. The main coordinator will publish this frozen snapshot for the requested hosted verification and inspect the new production screenshot.
- No performance or comfort result is claimed beyond the draw-call count bound.

## Exact source manifest

The 23 implementation-owned files are hashed in `/tmp/cryptkeep-art-repaired-r1.json` (base `e225151713f33963dcae6ceef4dc20d302036439`, prior candidate `c2fbedc21f4f909c0e931a8e47a01ac89515fd29`). The manifest excludes coordinator-owned `CONTEXT.md`, `SPEC.md`, `decisions/cartoon-art-preview.md`, and reviewer records.

Main owns Git publication, hosted image/failure inspection and the same reviewer's repaired-snapshot verification. This handoff does not claim task acceptance.

## Coordinator source-freeze receipt

The frozen implementation hashes are preserved here for recovery after temporary files expire. Main corrected the light-count receipt from “three removed” to four→two; source is unchanged.

```json
{
  "base": "e225151713f33963dcae6ceef4dc20d302036439",
  "priorCandidate": "c2fbedc21f4f909c0e931a8e47a01ac89515fd29",
  "files": {
    ".github/workflows/verify.yml": "0e816dc90234cbed89f8a9bf8487b8f28bb3d298103f17928316aed7df237550",
    "playwright.config.ts": "f0842005204a54136095320266aa47ab657ff3143f9ebb1b98fd2f1e97216a6d",
    "src/app/shell.ts": "171f4a305633b78b526451d12d3460cb6795b5bad11fb95c0620973f8e1afc8e",
    "src/render/floor.test.ts": "935244d54ef0361b527a36b5dc4be6a3aaa185356dd08ef95f3d78b4940cdc87",
    "src/render/floor.ts": "3ee93210c0d339b095561a744f64b118962ee76ee7884122b7c91b08aae4591a",
    "src/render/materials.test.ts": "0d0629b85c25f909e65fe2a82c76cb6bcfa98ba31322ed30c6679e75f5706c9a",
    "src/render/materials.ts": "e499074e090374915e6a1e4b94f15bd82481a4e8bb34229b7de27e07b8c68242",
    "src/render/renderer.ts": "5e322482d283a797c334f8ee50883332c92fd6a5201a617fc3dbbdae4a16ab28",
    "src/render/textures/base.test.ts": "8af1de40666725febc73a0639128234d7690b1f5811d894041896d433114f70c",
    "src/render/textures/base.ts": "9895744f399f0c1bb1cecc26a42a0880c72b2b5f158da5563165d1b631a72d0f",
    "src/render/viewmodel.test.ts": "51a023465b3ff83d01a074df178727b8f3f5dbe6178cb944cc8d8376ad77e3a8",
    "src/render/weapons/sword.ts": "d158f4b818a3c66f1bce53f04672f76877564f2e75d3957b2c41fd8ab7590bbf",
    "src/ui/shell.css": "499716c6745d4a94612e38e50f5116b4b9d411f0a5eb3b91830cf7cac7120b79",
    "tests/e2e/production.spec.ts": "d060782031248e4d4ba9855eb183cbba54c15aa62af1b89b7225c9e1646cc7cf",
    "tests/e2e/renderer.spec.ts": "c82ce70a8328d62b3e829144484cbfa6d7d2d2c9fe1dde01a7421f0b5d771090",
    "tests/e2e/shell.spec.ts": "ce18a8dc95d67e9aaff59511646a3c5818c732fd2701fdd8a9189f741f984cac",
    "tests/e2e/viewmodel.spec.ts": "97d7a243278e684af890ef2b13ab95c1a3d2661532bd36c37b2522d6f0efe2ef",
    "tests/e2e/dash.spec.ts": "dfdbd33692c8322c34b13dcfb3d1dc007be3a978a475b25e1539902dcf66eb1e",
    "tests/e2e/movement.spec.ts": "0e87148e53b8d0a0064d88871510a84c2a1ad3252634ebc84ced2abed6d8bb69",
    "tests/e2e/sword.spec.ts": "41f45a1f0d68d22c1326deb4ce9a9f55c22e116a48eca0157786b9949f9ed9a8",
    "tests/harness/combat-room.html": "e81e1f3f12b310e6002a3da549cc2b315543147e62e8a2e3fe4c52164654ba4a",
    "tests/harness/renderer.html": "e36e67a727b074002c376a7b4d5871c2a97e48dfed15885263804ac866bba579",
    "tests/harness/viewmodel.html": "77b137a35cd643e3cb9c316b6f57f8c7d1a0560e637b1eed95720f8530a2aed7"
  }
}
```
