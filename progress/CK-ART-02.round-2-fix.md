# CK-ART-02 round 2 repair handoff

Repair of `reviews/CK-ART-02/round-2.md` finding F01, based on frozen source `02f15af0db60c13a1b862294584fbc24940e9733` on `cartoon-art-preview`. This submission changes only rendered stone batching/geometry, related assertions, floor session test fixtures for the extended counts type, and the floor renderer E2E budget/evidence path. It does not change game generation, RNG, player pose, movement/combat, or Git refs. Source is frozen for hosted verification; no commit, push, master edit, or hosted publish was performed by the builder.

## Finding resolution

- Reduced the rounded stone profile from bevel/curve segments 4/5 to 3/3, preserving the rounded XY arcs, narrow bevel, fixed 0.97m bounds and 0.03m mortar gaps. The shared stone is now welded into indexed geometry before smooth normals are recomputed, while UV seams remain explicit.
- Split stone instances into 8m × 8m spatial InstancedMesh chunks. Every chunk shares the same geometry and material, stores transforms in the floor's local coordinate frame, computes its own bounding sphere, and retains standard frustum culling. This allows distant map regions to be excluded by the renderer without changing instance placements.
- Measured geometry per stone is 224 indexed vertices / 444 triangles, down from round-2 review's 2,628 nonindexed vertices / 876 triangles. On `floor-render-contract`, the floor has 1,716 stone instances in 57 chunks; the dimension-derived chunk grid bound is 64. These are geometry and batching measures, not frame-rate results.
- Kept the accepted round-one artwork and torch/sword construction unchanged. Expanded the floor contract test to verify indexed geometry and its triangle ceiling, unit normals, curved profile samples, shared geometry/material, chunk count, computed bounds, floor occupancy clearance, constant joints across modules, and actual frustum visibility and exclusion. Existing resource disposal and 25-cycle browser checks remain enabled. The floor-renderer draw budget is now `12 + actual masonry chunks`, and the chunk count is bounded from fixture dimensions. Screenshot paths now live under `test-results/CK-ART-02/`.
- A pure module 25-cycle benchmark on this source measured 838ms total wall time: 316ms generation, 471ms floor construction, 3ms disposal; mean 2,817 total instances and 50.9 chunks per generated seed. This local synchronous module benchmark does not explain or reproduce the hosted browser DOM/movement timeouts and does not establish a GPU performance result.

## Checks and limits

- `npm run typecheck` — passed.
- `npm test` — 32 Vitest files / 173 tests passed; tooling verification passed.
- `npm run build` — passed; Vite reports its advisory that the app JavaScript chunk exceeds 500kB.
- `git diff --check` — passed.
- Browser E2E was not run locally because local loopback is denied. No workaround or retry was attempted. Existing hosted run `37638610509` had 21/25 browser checks pass on the prior source; four failures occurred across floor replacement/reroll and movement checks. The baseline has inconsistent outcomes, so root cause is not established. The exact repaired source still needs hosted 25-check verification and production PNG review. Hosted production screenshots should remain at `test-results/CK-ART-02/production-entry-yaw-0.png` and `test-results/CK-ART-02/production-entry-angle-native-mouse.png`; floor-renderer fixture screenshots are `floor-seed-a.png` and `floor-seed-b.png` in the same directory.
- No FPS or software-Chromium comfort claim is made. The accepted prior production screenshots were inspected in round 1; this round changes only stone geometry batching and preserves those materials/placements, but new exact-snapshot screenshots remain for hosted inspection.

Exact eleven-file source SHA-256 manifest: `/tmp/cryptkeep-art02-repaired-r2.json`.

## Durable complete experiment source manifest

Includes unchanged supporting files and all source/test/workflow changes since d62fb2d, verified by orchestrator.

```json
{
  "task": "CK-ART-02",
  "round": 2,
  "baseline": "02f15af0db60c13a1b862294584fbc24940e9733",
  "source_files": [
    {
      "path": ".github/workflows/verify.yml",
      "sha256": "266d7f3cd58971f57c886f7bdf933bc630318d6f450a7e28ef9a58c9a95d7a00"
    },
    {
      "path": "src/app/floor-session.test.ts",
      "sha256": "cc6b49fda89c728fbbe297a1dafa67a01a316cec6d7dcae665eafad4ba54f9ef"
    },
    {
      "path": "src/render/floor.test.ts",
      "sha256": "7c84b58763d34caf57d1314e087b42ff882bbcc65ccd576f44af4ac8d0c40078"
    },
    {
      "path": "src/render/floor.ts",
      "sha256": "9ca9beac1d202bc7f412c25e56847f61ab1a9815a57419342d858e6b9a611dc0"
    },
    {
      "path": "src/render/materials.ts",
      "sha256": "4e97d67df22e54173689c8a7fd891d4a9aaed1a84efd60e2b6b5923b4f205415"
    },
    {
      "path": "src/render/textures/base.test.ts",
      "sha256": "8e2f050d39ffc644eaeac48ec48ff6dc286d8a47021bfc767368ca647aed6d05"
    },
    {
      "path": "src/render/textures/base.ts",
      "sha256": "fa6ec703ea3538018cee914281a51dcb4e0e6014ca243e100e54013cc7165af7"
    },
    {
      "path": "src/render/viewmodel.test.ts",
      "sha256": "4c00fd4248ea0b3bec0c2dc9db2920ed7c6695155a3d69317188844ae97b23ee"
    },
    {
      "path": "src/render/weapons/sword.ts",
      "sha256": "873ccc26003dc7bb7c6c834437105f08f3fa7638effb6bdbb84f47d5cd2508ad"
    },
    {
      "path": "tests/e2e/floor-renderer.spec.ts",
      "sha256": "e3f17fc7133db9e4c26061bba22b126481c9151062e536986f34bd7db8babc87"
    },
    {
      "path": "tests/e2e/production.spec.ts",
      "sha256": "fa95b9d1a090f6dfa790c27ed7cfdd335c5d3a3dd54d38c81eb34790a627fb28"
    },
    {
      "path": "tests/harness/floor-renderer.ts",
      "sha256": "56f6ab841133e61c6a527ae2ae27772799ab7d588ff7db008b6c90629c509519"
    }
  ]
}
```
