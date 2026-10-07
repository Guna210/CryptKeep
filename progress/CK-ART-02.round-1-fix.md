# CK-ART-02 round 1 repair handoff

Repair of the four findings in `reviews/CK-ART-02/round-1.md`, on the same `cartoon-art-preview` branch. Baseline repair snapshot: `fe969f9faa68af1314ac1ab5e9fe67bea26fe0c0`. No Git refs, master, gameplay, floor occupancy, player pose, or combat timing were changed. Source is frozen pending the round-one reviewer’s verification and the main agent’s hosted screenshot review.

## Finding resolutions

- **R1-F01, flame core hidden / detached flame:** replaced the opaque lathed volume with a curved extruded orange teardrop ring containing a separate yellow teardrop face. The core occupies the flame’s front plane and protrudes 0.04m beyond the orange center plane. Its base begins at the cloth helix height, visibly joining the bound shaft head. The floor test checks the orange geometry contains an opening, that the core is separate, and that their instance centers have the designed front offset. Hosted visual confirmation remains pending.
- **R1-F02, angled frame misses torch:** moved the primary forward sconce to the forward-left entry wall selected near one tile left of the unchanged spawn. The placement test checks the `cryptkeep-preview` torch bearing in yaw-zero and the 0.2rad left-turn view. The production test now clicks Explore at its measured native position, captures yaw zero, then moves left 100px from that click location under pointer lock; it no longer recenters the pointer and adds an unintended large turn. The hosted angle screenshot must still confirm both torch and corner.
- **R1-F03, square framed panels:** rounded each XY stone face with four 0.13m-radius corner arcs and narrowed the four-segment bevel from 0.095m to 0.035m. The resulting measured 0.97m extent, 0.03m mortar, solid footprint clearance, 3m wall height, and shared instancing remain tested. Painted stone recipes now carry stronger broad directional patches and soft tonal change, with thinner, lighter cracks and broken scuffs. The test requires four curved face corners, normalized face UVs, and broad pixel-value range. Hosted visual confirmation remains pending.
- **R1-F04, intermittent 25-reroll browser timeout:** preserved all 25 rerolls, final DOM checks, double `pagehide`, and listener/resource assertions. I ran a temporary single-worker Vitest measurement on the repaired source: 25 distinct floor generation/render/dispose cycles took 610ms synchronous total; generation averaged 9.39ms, rendering 14.97ms, and disposal 0.045ms, with a maximum combined cycle of 94.4ms and 2,604–3,268 instances. This does not reproduce or identify the hosted 30s DOM-evaluation timeout, and the baseline had both a pass and a failure. No timeout was broadened and no workload claim is made from this module-level measurement. The next hosted run must determine whether the original browser failure recurs.

## Checks and limits

- `npm run typecheck` — passed.
- `npm test` — 32 files / 173 application tests passed; tooling test passed.
- `npm run build` — passed; Vite reports the minified app chunk advisory at 682.40kB.
- `git diff --check` — passed.
- Browser tests were not run locally because the configured local loopback is denied. Hosted run `37635817859` previously passed 24/25 browser checks and failed `tests/e2e/floor.spec.ts` after the repeated rerolls; the same test has inconsistent baseline outcomes. Repaired screenshots and the browser suite are pending the main agent’s hosted run. Existing 25 rerolls and teardown checks remain enabled.
- No software-Chromium FPS or GPU-comfort claim is made.

Exact eleven-file SHA-256 source manifest: `/tmp/cryptkeep-art02-repaired-r1.json`.

## Durable frozen source manifest

```json
{
  "task": "CK-ART-02",
  "round": 1,
  "baseline": "fe969f9faa68af1314ac1ab5e9fe67bea26fe0c0",
  "source_files": [
    {
      "path": ".github/workflows/verify.yml",
      "sha256": "266d7f3cd58971f57c886f7bdf933bc630318d6f450a7e28ef9a58c9a95d7a00"
    },
    {
      "path": "src/render/floor.ts",
      "sha256": "2f157e8eae0109571d83ad0c3a131bf4c5c8ef038e2968b38387adcd8c760075"
    },
    {
      "path": "src/render/floor.test.ts",
      "sha256": "bd9f5a55d8c01ccc5512e55c0d7832e33ad07d0dac9bff8b60bd3c9b0f2a8e83"
    },
    {
      "path": "src/render/materials.ts",
      "sha256": "4e97d67df22e54173689c8a7fd891d4a9aaed1a84efd60e2b6b5923b4f205415"
    },
    {
      "path": "src/render/materials.test.ts",
      "sha256": "0d0629b85c25f909e65fe2a82c76cb6bcfa98ba31322ed30c6679e75f5706c9a"
    },
    {
      "path": "src/render/textures/base.ts",
      "sha256": "fa6ec703ea3538018cee914281a51dcb4e0e6014ca243e100e54013cc7165af7"
    },
    {
      "path": "src/render/textures/base.test.ts",
      "sha256": "8e2f050d39ffc644eaeac48ec48ff6dc286d8a47021bfc767368ca647aed6d05"
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
      "sha256": "7237593acd2497af3b65dc7c27d26e926db8e2c809540f3042b1429b84d7503b"
    },
    {
      "path": "tests/e2e/production.spec.ts",
      "sha256": "fa95b9d1a090f6dfa790c27ed7cfdd335c5d3a3dd54d38c81eb34790a627fb28"
    }
  ]
}
```
