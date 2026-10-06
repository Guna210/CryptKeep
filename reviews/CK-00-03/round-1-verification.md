# CK-00-03 review — round 1 verification

- **Task:** CK-00-03, Implement renderer resource lifecycle
- **Round/stage:** Round 1, post-repair verification
- **Reviewer/model/agent:** independent reviewer, `gpt-6-luna`, `/root/ck_00_03_reviewer_r1`
- **Builder/fixer:** `/root/ck_00_03_builder` (`gpt-6-luna`)
- **Baseline:** `master` at `dc31ce4f034b98f6b505e2d890acbc06311fd540`
- **Reviewed snapshot:** round-1 repaired submission. Parent-owned `CONTEXT.md` excluded.
- **Relevant instructions:** the orchestrator approved exclusive ownership of the supplied WebGL2 context and public `forceContextLoss()` at teardown. The caller retains canvas DOM ownership and must provide a fresh canvas/context to create a replacement renderer.

## Submission identity

The supplied verification manifest `/tmp/cryptkeep-CK-00-03-r1-verification-manifest.json` matched before checks and again afterward. Full SHA-256 manifest:

| File | SHA-256 |
| --- | --- |
| `README.md` | `f4bea04f37b2aee45e97a634dacc97c661159db2abb500e89decb8691877b005` |
| `docs/environment-start.md` | `27b5180fd54e583b857a11eada149f81ce9030c46b5f5829ddbe2abf5122ec9e` |
| `progress/CK-00-03.md` | `2236ff5946f58145476427e58f5d077cd24e965c6e33b5cfffbb7090277f345b` |
| `progress/CK-00-03.round-1-fix.md` | `8bea1b6a9c1029f384f9d6e4eb13776d67828926f3b842a8e61deab85e2f90cc` |
| `src/app/shell.ts` | `ea12e64bbca8ccab81d2240775efaf84e393cf90d4fafe7caf912d4d317e3235` |
| `src/main.ts` | `935340e7fb088fd125d0b3df2a71d6bae04f26fe3a6fb7e7e0b5f1051acfd9a7` |
| `src/render/renderer.ts` | `063133b9328131290540867779bc25e714ec030805659adc82da3a34eaf241ae` |
| `src/ui/shell.css` | `a951c380bd77f513d4a893e5e3ccf8c808590a0a30121cbfc2ee567f84ebb43a` |
| `tests/e2e/renderer.spec.ts` | `6daa01417e9e31f8e381d52d7dffb1b80953e48a74c37d45a72bf3de54fbc3f9` |
| `tests/e2e/shell.spec.ts` | `b270a23d0f5e9017d6ee8b487156c2363f9ce78e59f7b161fc92478b9d031192` |
| `tests/harness/renderer-fixture.ts` | `deff2f662bc50551f88a9a69a9c46085f961aaf2302b0d530640a6eaa36406fe` |
| `tests/harness/renderer.html` | `06c7764e44aaf9221b8b48a9987a693d4f498c695960226fcfbe81aed9bc3068` |

## Verification checks

- `npm run typecheck` — passed.
- `npm run build` — passed; Vite reported its existing >500 kB minified chunk warning.
- `npm run test:e2e` — passed, 3/3 in system Chromium. Renderer fixture lifecycle/native-handle case, application-shell render/resize case, and unavailable-WebGL2 fallback case all passed.
- `git diff --check` — passed.
- Opened and inspected refreshed `test-results/CK-00-03/shell.png`, `test-results/CK-00-03/renderer-fixture.png`, and `test-results/CK-00-03/unsupported-webgl2.png`. Rendered geometry is visible, DOM text remains sharp, and fallback text is readable.
- Browser tests reported no page or console errors.

## Finding status

### CK-00-03-R1-F01 — RESOLVED

The repaired `dispose()` disconnects the `ResizeObserver`, disposes fixture geometry/materials and the Three.js renderer, then invokes Three.js' public `forceContextLoss()` API. The implementation documents exclusive context ownership and the requirement for a fresh caller-owned canvas/context for a replacement renderer.

I independently ran the repaired native-handle fixture. It intercepted `createTexture` on each fixture context, retained the returned native handles, then checked actual context-loss and `isTexture` state. Across the initial render and three replacement cycles, four contexts created 20 texture handles total (5 per context). After each disposal, the retired context reported lost, all five handles were invalid, and the observer count was zero. Before each disposal, its one active context had five valid handles and rendered successfully. Each replacement checkpoint had exactly one live context. After final disposal: four created contexts, zero live contexts, zero valid handles, zero observers. The fixture's caller-owned canvas remained attached after renderer disposal, was removed by the fixture caller before replacement, and exactly one canvas remained after each new renderer.

This verifies actual handle invalidation through context retirement, rather than treating renderer-local `renderer.info` counters as evidence. It satisfies the agreed ownership contract and resolves the original same-context accumulation finding.

## Additional inspection

Viewport resize preserved aspect and produced the expected 405×270 buffer at 720×480. The unsupported-WebGL2 fallback regression passed. Test-only instrumentation and `window.rendererFixture` remain confined to the isolated harness page; the production app has no diagnostic global. No new confirmed findings were identified. The browser validation is limited to the configured headless system Chromium/software rendering; it does not claim target-GPU performance or measure driver memory. The reviewer started no server that remains running.

**Verdict: PASS.**
