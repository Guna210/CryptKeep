# CK-ART-03 round-two repair

- **Builder/fixer:** `/root/painted_asset_fixer_r2` (`gpt-6-luna`)
- **Branch:** `cartoon-art-preview`
- **Frozen base:** `c920119de4f3436ededfeea73d9420502fad0949` (tree `62226f0b48bf5bf545693f18f1a8ff88163532de`)
- **Task baseline:** `0f771edf92d16f394eed4b259a48bba6a1a5e27b`
- **Scope:** one bounded repair for CK-ART-03 round-two findings F03, F04, R1V-F06, and R1V-F07. No commit, push, merge, Cloudflare administration, or gameplay simulation/input/combat/clock edits.

## Repairs

- **F03, throughput:** the authored rounded masonry keeps its 0.90m rounded face, 0.035m bevel size, 0.045m bevel thickness, 0.97m footprint, instancing, atlas offsets, tone colors, 0.03m joints and chunk frustum culling. Reducing outline curve tessellation from 3 to 2 and bevel segments from 3 to 1 changes each indexed stone from **224 vertices / 444 triangles to 80 vertices / 156 triangles**: **64.3% fewer vertices and 64.9% fewer triangles per stone**. This is a direct measured geometry-cost reduction; no frame-rate claim is made. All 25 native rerolls, cleanup checks and the 60-second hosted cap remain unchanged.
- **F04/F07, render scheduling:** `src/main.ts` still runs `player.advance`, snapshots, HUD updates, combat/viewmodel updates and schedules every RAF. Rendering now continues on every active gameplay frame. For inactive preview/pause frames, a small scheduler skips unchanged draws and redraws for changed camera pose, sword pose/state, canvas drawing-buffer dimensions or DPR; floor/world replacement explicitly invalidates it, and visibility restoration invalidates it. Renderer resize handling itself is unchanged. The helper's tests cover initial draw, stable-frame skipping, invalidation, viewport changes, visibility restoration and continuous active frames. No state is injected and simulation ticks or deadlines are untouched.
- **R1V-F06:** renderer geometry counts are now compared with the recorded renderer baseline for the matching seed. Both seed baselines and the 25-cycle root, resource and disposal checks remain.

## Changed application and test files

- `src/main.ts`
- `src/render/floor.ts`
- `src/render/floor.test.ts`
- `src/render/render-scheduler.ts`
- `src/render/render-scheduler.test.ts`
- `tests/e2e/floor-renderer.spec.ts`

## Verification and limits

- `npm run typecheck` — pass.
- `npm test` — pass: **176 application tests** and **1 tooling test**.
- `npm run build` — pass; existing Vite large-chunk advisory remains (695.93 kB minified JS, 183.85 kB gzip).
- `git diff --check` — pass.
- Exact hosted Chromium suite was not run by this fixer; the E2E findings, all 25 lifecycle cycles and exact movement/stamina tick proofs still require the orchestrator's hosted run against this frozen candidate. No local browser server was started. No GPU frame-rate measurement is available.
- Opened the prior hosted `default-entry.png` before changing mesh detail; the rounded blocks remain the intended shape. Automated floor tests continue to verify rounded profile points, unit normals, UV bounds, extents, culling, atlas variants and mortar gaps.

## Frozen source SHA-256 manifest

These hashes cover every application, test and fixture source file changed in this repair. This report and parent-owned context/decision documents are excluded.

```text
98f1e658e9782bee1b10f1df435387a5e136e69b5872646a37c2aabc52131807  src/main.ts
1722a47607f987484c778a9d3936c567c81e3aa6ab19f9b4ec404a3883ef12b1  src/render/floor.ts
a42731c50abf975d10536f986016356ff6006fe20311ccc5936fa2f2bedd626d  src/render/floor.test.ts
23aa2d992f07df82cf1ae3b488f51362b0f3ac14a1dbe11d918ec6c6d628fc13  src/render/render-scheduler.ts
c147e53953d9e1fe5eba50670ced8d9d48bed429bd7fceac72e5d24305d7d0aa  src/render/render-scheduler.test.ts
311921951e9c20583d0e7630327aefcca783a58d905be1fce8872575ed9a7c76  tests/e2e/floor-renderer.spec.ts
```

No application or test source edits were made after hashing.
