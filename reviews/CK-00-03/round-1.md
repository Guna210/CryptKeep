# CK-00-03 review — round 1

- **Task:** CK-00-03, Implement renderer resource lifecycle
- **Reviewer/model/agent:** independent reviewer, `gpt-6-luna`, `/root/ck_00_03_reviewer_r1`
- **Builder:** `/root/ck_00_03_builder` (`gpt-6-luna`)
- **Baseline:** `master` at `dc31ce4f034b98f6b505e2d890acbc06311fd540`
- **Reviewed snapshot:** uncommitted CK-00-03 submission. Parent-owned `CONTEXT.md` was excluded.
- **Scope reviewed:** `README.md`, `docs/environment-start.md`, `progress/CK-00-03.md`, `src/app/shell.ts`, `src/main.ts`, `src/render/renderer.ts`, `src/ui/shell.css`, `tests/e2e/renderer.spec.ts`, `tests/e2e/shell.spec.ts`, `tests/harness/renderer-fixture.ts`, and `tests/harness/renderer.html`; related package, browser, and renderer library behavior was inspected. No applicable `AGENTS.md` was found.

## Submission identity

The supplied snapshot manifest `/tmp/cryptkeep-CK-00-03-r1-manifest.json` matched all listed paths before review. All hashes matched again after inspection and checks:

| File | SHA-256 |
| --- | --- |
| `README.md` | `f4bea04f37b2aee45e97a634dacc97c661159db2abb500e89decb8691877b005` |
| `docs/environment-start.md` | `34235fa74ff06d827fedf48522639505915a6431dc6aadfda015afb2042ac095` |
| `progress/CK-00-03.md` | `17fb9db27b93a9e25ef9a9ce363c858c67825f5fa60c9d4ef4cbc358b675817a` |
| `src/app/shell.ts` | `ea12e64bbca8ccab81d2240775efaf84e393cf90d4fafe7caf912d4d317e3235` |
| `src/main.ts` | `935340e7fb088fd125d0b3df2a71d6bae04f26fe3a6fb7e7e0b5f1051acfd9a7` |
| `src/render/renderer.ts` | `e814c094a6096fab883e3d65d1aea55d498630374956fc5f804f0337f997017b` |
| `src/ui/shell.css` | `a951c380bd77f513d4a893e5e3ccf8c808590a0a30121cbfc2ee567f84ebb43a` |
| `tests/e2e/renderer.spec.ts` | `e2185e04050d63e4d94dcb7cf7e8b434ce2a4927402449b5ec4d96af938c610a` |
| `tests/e2e/shell.spec.ts` | `b270a23d0f5e9017d6ee8b487156c2363f9ce78e59f7b161fc92478b9d031192` |
| `tests/harness/renderer-fixture.ts` | `0e852b6dce19bd17870cf095583fe6fe632ac0f995417480956bf70fabc41a99` |
| `tests/harness/renderer.html` | `518b5eed54855021f1398ac71eae5236b85554c3df71ed3d5aedff690f2ffcdc` |

## Independent checks and evidence

- `npm run typecheck` — passed.
- `npm run build` — passed; Vite emitted its >500 kB minified chunk warning.
- `npm run test:e2e` — passed, 3/3. This covers visible renderer output, viewport and logical-buffer resize, unsupported WebGL2 fallback, repeat disposal, `ResizeObserver` count, canvas count, and page/console errors.
- `git diff --check` — passed.
- Opened and inspected `test-results/CK-00-03/shell.png`, `test-results/CK-00-03/renderer-fixture.png`, and `test-results/CK-00-03/unsupported-webgl2.png`. The diagnostic scene is visibly rendered, status/DOM text stays sharp, and fallback copy is readable.
- Independently reproduced texture allocation in headless system Chromium using `/tmp/cryptkeep-gl-track.mjs`. The script instrumented the active `WebGL2RenderingContext`'s `createTexture` and `deleteTexture`, loaded the isolated test fixture, and ran ten create/dispose cycles on its reused context. Initial render: 5 `createTexture`, 0 `deleteTexture`; after cycle 1: 10 created/0 deleted; after cycle 10: 55 created/0 deleted. `renderer.info` still reported exactly 1 texture for each newly created renderer and 1 after its disposal. The browser suite's per-renderer counter assertion therefore did not detect accumulating context allocations.
- Library source inspection: `MeshStandardMaterial` triggers Three.js `getDFGLUT()` (`node_modules/three/src/renderers/WebGLRenderer.js`, `DFGLUTData.js`), a module-global shared `DataTexture`. Each WebGL renderer uploads its own GPU texture for that JS texture; the `WebGLRenderer.dispose()` path does not dispose that shared `DataTexture`. The global object also remains live across renderer instances. This aligns with the observed repeated allocations and lack of explicit deletion.
- Temporary repro was outside the repository. I stopped the dev server started for that repro. No application/config/document files were edited; `git status` shows only the submitted snapshot and the parent-owned `CONTEXT.md` change.

## Findings

### CK-00-03-R1-F01 — Renderer disposal leaves renderer-owned texture allocations alive

- **Priority:** P2
- **Affected behavior:** `src/render/renderer.ts:44-46, 120-128`; repeated renderer creation/disposal on the same WebGL2 context.
- **Requirement:** CK-00-03 requires explicit renderer disposal and no resource leaks across lifecycle cycles; it also requires truthful GPU resource counts.
- **Reproduction:** Load `/tests/harness/renderer.html` in Chromium, instrument `WebGL2RenderingContext.createTexture/deleteTexture`, then repeatedly call the fixture's `active.dispose()` and `create()` on the same canvas/context. Ten cycles yielded 55 created texture handles and zero explicit deletions. In contrast, the submitted assertion at `tests/e2e/renderer.spec.ts` checks only each disposed renderer's `renderer.info.memory.textures` (1) and accepts that baseline, so it misses aggregate context growth.
- **Expected:** After each disposed renderer's owned resources are released, repeated cycles on one context should not grow live GPU texture allocations; counts should represent or directly validate resources across those cycles.
- **Actual:** Every new renderer allocates five additional WebGL textures in this fixture, and `dispose()` emits no `deleteTexture` calls. A renderer-local `renderer.info` counter resets with each new renderer and reports one stable texture, masking the aggregate allocations. The diagnostic's standard materials invoke Three.js' module-global DFG LUT, whose underlying GPU upload is renderer-specific and is not explicitly disposed by `WebGLRenderer.dispose()`.
- **Correction guidance:** Release all texture resources allocated by the renderer before returning from `dispose()`, including handling the shared Three.js LUT lifecycle safely, or restructure ownership so renderer cycles do not upload fresh per-instance GPU resources. Add a lifecycle assertion that measures the reused WebGL context across repeated cycles rather than only a new renderer's counters.

## Assessment

Aspect-preserving logical buffer sizing, camera aspect updates, visible fixture, fallback behavior, DOM separation, and `ResizeObserver` cleanup work in the exercised cases. The test-only `window.rendererFixture` is confined to the isolated harness page and does not appear in the production entry point. Browser checks found no page or console errors. The texture allocation finding is the sole confirmed in-scope defect.

**Verdict: CHANGES REQUIRED.**
