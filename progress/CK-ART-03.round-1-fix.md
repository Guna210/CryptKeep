# CK-ART-03 round-one repair handoff

Repair of `reviews/CK-ART-03/round-1.md` findings F01–F05 against candidate `8cc819775515072494b8934e28398c36804383f8`, on `cartoon-art-preview`. Main owns publication and hosted verification. The implementation is frozen after this report and source hash manifest; no commit, push, merge, gameplay change, or local browser-server retry was performed.

## Finding resolutions

- **F01 — resolved in source; hosted draw-count proof pending.** Restored `MASONRY_CHUNK_METERS` to 8m. Each occupied spatial chunk now has one cullable `InstancedMesh` with one owned clone of the rounded indexed stone geometry. A two-float `InstancedBufferAttribute` selects the per-instance quadrant in the existing 2×2 atlas; the standard material applies the offset after its normal map UV transform. This retains all four authored patterns, per-instance tone colors, 0.03m joints, 224 indexed vertices / 444 triangles per stone, and spatial frustum bounds. The renderer fixture now checks one masonry batch per chunk and bounds total draw calls at **20 measured fixed non-masonry batches + actual occupied masonry chunks**. The previous hosted count of 52 was 20 fixed batches plus four variant draws in each of eight 32m chunks; this repair changes the batch structure and restores 8m culling. The fixture's dimension-derived maximum uses 8m chunks. No GPU frame-rate claim is made.
- **F02 — resolved.** The contact sheet now builds all 13 actual library recipes: the original stone/floor/door and four role recipes plus steel/leather/brass/wood/iron/trim. It checks all 13 captions and ties both material and texture counts to the complete library. Screenshot output is under `test-results/CK-ART-03/`.
- **F03 — code path optimized; 25-cycle browser result pending hosted verification.** The lifecycle retains its 25 native fill/click rerolls, effective `test.setTimeout(60_000)`, root/resource stability checks, listener count and disposal assertions. The floor renderer now submits one masonry draw per 8m spatial chunk instead of up to four variant draws in each broader 32m chunk. Each chunk owns its geometry clone and instanced attributes; floor disposal releases meshes and geometries once, while the material library remains borrowed. No viewport, display cap, assertion, or timeout was reduced or extended.
- **F04 — resolved in source; browser state proof pending.** The swept-circle wall and exact 100 stamina assertions remain. The test snapshots actual stamina, idle timer, and simulation tick, calculates the delay-plus-refill duration from the existing 0.65s / 22-per-second resource contract, adds one fixed-step boundary tick, then uses one poll to require both elapsed simulation ticks and the actual value of 100. It no longer spends separate cumulative waits on a fixed 45-tick boundary and a second refill wait.
- **F05 — resolved.** Ceiling slabs now borrow the existing authored floor material with the BoxGeometry's complete slab UVs. This uses the restrained painted floor recipe instead of sampling all four high-contrast wall atlas quadrants. It adds no texture or material allocation; the ceiling and floor share the library-owned material and texture.

## Resource and artwork budget

Artwork remains deterministic vector-authored painted-style TypeScript with no external assets or image-generation service. The library owns 13 textures/materials; the sword owns three additional 128×128 textures. At the default 128px recipe size, CPU RGBA data remains **1,245,184 bytes (1.19 MiB)**: a 256×256 stone atlas, twelve 128×128 library maps, and three 128×128 sword maps. Estimated mip texels are about **1,660,245 bytes (1.58 MiB)** before driver alignment/metadata. The ceiling reuses the floor map and does not change this budget.

Each stone instance carries its transform (64 bytes), atlas offset (8 bytes), and tone color (12 bytes); its chunk uses a 224-vertex / 444-triangle indexed rounded geometry. Every chunk owns one geometry clone and one mesh, both released by the floor's idempotent disposer. The renderer fixture checks stable reported renderer resources through all 25 replacements. Hosted checks still need to confirm the actual browser draw count and lifecycle timing for this snapshot.

## Changed source, fixture, and test files

- `src/render/floor.ts`
- `src/render/floor.test.ts`
- `src/render/materials.ts`
- `tests/e2e/floor-renderer.spec.ts`
- `tests/e2e/materials.spec.ts`
- `tests/e2e/movement.spec.ts`
- `tests/harness/materials.html`
- `tests/harness/materials.ts`

## Checks

- `npm run typecheck` — pass.
- `npm test` — pass: 174 application tests and one tooling test.
- `npm run build` — pass; Vite reports its existing large-chunk advisory (695.49 kB minified JS, 183.68 kB gzip).
- `git diff --check` — pass.
- `npx vitest run src/render/floor.test.ts` after exact geometry budget assertions — pass, 4/4.
- Browser E2E was not run locally. The task explicitly reserves it for hosted CI after publication; no local server retry or bypass was attempted.

## Frozen source SHA-256 manifest

Hashes cover every application/test/fixture source file changed in this repair and exclude this report and parent-owned `CONTEXT.md`.

```text
c6802426c014adfd159d3830866c60234d4cce2b1e358430b64fef4218e4466e  src/render/floor.ts
b67afa3a1ee8bfa956e3e67a482222f79206eb3a3398d15264dc3a3e89b7f3c2  src/render/floor.test.ts
4863d78125e579ed02abc06f8e5fcd906e09ee9015b906dec93e7a6ff85a165c  src/render/materials.ts
651e3cdf980b14c8247e8289d146da69ef8092bc54574b59dff701ce51f09c41  tests/e2e/floor-renderer.spec.ts
822a206d54405474a3e50a2b3e400af38facc8e754897fb625e4b8c9610d6e0f  tests/e2e/materials.spec.ts
98602628140007ad267643ec7c2eaea453809d07dedabf9aa4a0043f2808c828  tests/e2e/movement.spec.ts
3184a212810de810e541d8540d4c08546413a1319226f318214d75774ca46d15  tests/harness/materials.html
705127b94185e84c1ec824bacead4defa7899d6a213fba8ad03dfdefabd751a1  tests/harness/materials.ts
```

Orchestrator metadata verification: recomputed all eight source hashes before publication. Corrected a truncated HTML fixture digest in this report; application/fixture source bytes remain frozen. Artwork was authored by the Luna AI agent, using vector/raster recipes rather than an image-generation service.
