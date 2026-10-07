# CK-ART-02 builder handoff

Baseline: `d62fb2dc298588e05b782fc2ca8fe5791bbe4bb1` on `cartoon-art-preview`. This is a source submission for hosted review; no commit, push, or master change was made by the builder.

## Changes

- Replaced random width/height scaling and stagger offsets with two fixed 0.97m-wide stones in each 2m module. Their measured geometry bounds leave a 0.03m mortar gap within and across adjacent modules. Rounded profiles use four bevel segments, five curve segments, and shared instanced geometry. Painted 128px stone faces use normalized face UVs, broad teal/slate tonal patches, broken edge scuffs, and restrained cracks. Floor and ceiling use calmer 128px slab recipes.
- Replaced the cone placeholder with five bounded instanced batches: merged iron plate/curved arm, wood shaft, wrapped head, smooth orange lathed flame, and yellow lathed core. The yaw-zero entry-facing fixture uses the first forward wall in the unchanged spawn view; active point lights remain capped at two. No player, occupancy, or combat state changed.
- Rounded the sword blade and brass guard profiles; replaced the box grip and pommel with a cylinder, helix wrap, and sphere. The existing pose, attack windows, and charge update code are unchanged.
- Added layout/clearance/material-ownership/geometry and UV assertions, sword silhouette/resource assertions, two production screenshot captures, and a CK-ART-02-only hosted artifact path.

## Verification

- `npm run typecheck` — passed.
- `npx vitest run src/render/floor.test.ts src/render/textures/base.test.ts src/render/materials.test.ts src/render/viewmodel.test.ts` — 4 files, 11 tests passed.
- `npm run build` — passed. Vite reports the existing-style advisory that the minified app chunk exceeds 500 kB (682.53 kB).
- `git diff --check` — passed.
- Browser E2E and screenshots were not run locally. Local Vite SSR inspection hit `listen EPERM` on `0.0.0.0:24678`; the task instructions prohibit retrying or bypassing the local loopback restriction. The hosted workflow should capture `test-results/CK-ART-02/production-entry-yaw-0.png` and `test-results/CK-ART-02/production-entry-angle-native-mouse.png` and upload them as `cryptkeep-cartoon-art-02-<run>-<attempt>` with seven-day retention. Those images, browser console/page errors, and the preserved 25-browser regression result remain pending hosted inspection.
- No FPS or GPU-comfort claim is made.

Exact source SHA-256 manifest: `/tmp/cryptkeep-art02-source.json`. The manifest covers the ten builder-owned implementation, test, workflow, and production screenshot files at source freeze.

## Frozen source manifest

```json
{
  "task": "CK-ART-02",
  "baseline": "d62fb2dc298588e05b782fc2ca8fe5791bbe4bb1",
  "source_files": [
    {
      "path": ".github/workflows/verify.yml",
      "sha256": "266d7f3cd58971f57c886f7bdf933bc630318d6f450a7e28ef9a58c9a95d7a00"
    },
    {
      "path": "src/render/floor.ts",
      "sha256": "e25f2aced8af068e6453f8c6c5a3c4eb794ed8885b58f8a1817bb13fb7881ec7"
    },
    {
      "path": "src/render/floor.test.ts",
      "sha256": "422d71a0a36275b13adb394168def92ceee78cd12f4a5fd05c32b994414721eb"
    },
    {
      "path": "src/render/materials.ts",
      "sha256": "4e97d67df22e54173689c8a7fd891d4a9aaed1a84efd60e2b6b5923b4f205415"
    },
    {
      "path": "src/render/textures/base.ts",
      "sha256": "d6d907e1fea792219a53c0c6b6276a580869562efcf9964842754e0f71c5e5fd"
    },
    {
      "path": "src/render/textures/base.test.ts",
      "sha256": "f9d3a5fd5316ccdc01fa47269874d095d6887fb06b3d05f63a872d6bc7f9b47b"
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
      "sha256": "e950f3eea8e561c8983b6c1a505c4cbcff3f54ce6498fd4563f731f264d64875"
    }
  ]
}
```

Orchestrator validation: full 171 application tests and 7 verification-tool cases pass. Hosted browser checks and visual review pending.

## Round 2 performance repair

Round 2 reduces the shared rounded-stone geometry to 224 indexed vertices / 444 triangles per stone and spatially batches stones in 8m chunks for frustum culling. The `floor-render-contract` fixture contains 1,716 stones in 57 chunks (dimension-derived upper bound 64). A local pure module 25-cycle measurement took 838ms total (316ms generation, 471ms construction, 3ms disposal); this does not diagnose the prior hosted browser failures or establish an FPS result. Typecheck, 173 app tests plus tooling verification, production build, and diff check pass. Hosted 25-case verification and exact-snapshot screenshots remain pending; local E2E was not run due loopback restrictions. Full round-2 details: `progress/CK-ART-02.round-2-fix.md`; exact source hashes: `/tmp/cryptkeep-art02-repaired-r2.json`.
