# CK-03-06 review — round 1

- **Task:** CK-03-06, Create sword viewmodel and attack animation
- **Reviewer/model/agent:** independent reviewer, `gpt-6-luna`, `/root/ck_03_06_reviewer_r1`
- **Builder:** `/root/ck_03_06_builder` (`gpt-6-luna`)
- **Baseline:** `722f61df82993572b39efe186c4084498f92c190`
- **Candidate:** `a36a13f8d5c17a44991262ab05b1ec1e4f3886b7` on `codex/cryptkeep-m03-review`
- **Scope:** sword viewmodel, controller, unit/browser fixture tests, scoped verification workflow, and CK-03-06 handoff/evidence. Existing coordinator edits to `CONTEXT.md` were preserved and excluded.

## Submission identity

All eight frozen implementation/test/workflow hashes in `/tmp/cryptkeep-CK-03-06-source.json` match the inspected candidate. The handoff and evidence manifest `/tmp/cryptkeep-CK-03-06-submission.json` also matches its current files. Full SHA-256 manifest:

| File | SHA-256 |
| --- | --- |
| `.github/workflows/verify.yml` | `b6022ac7d3f7744e9308c077e77b7a1af9251ab74b337afc45a64c798d5d4ba5` |
| `src/render/weapons/sword.ts` | `29208e5986c5030cea9c61ce1bb45810943ceb355e1e788b30af60da418c51e7` |
| `src/render/viewmodel.ts` | `a1d8aeb65afceed7cecea14eeb1d34955145601e118572e7cc78eafc5d1c1597` |
| `src/render/viewmodel.test.ts` | `72d63783078eb0dcca328624048c438d885fc8eecda63eb19ae374001227f274` |
| `tests/e2e/viewmodel.spec.ts` | `7db0adc753d40219cc58520d4ad29590db450d394e5d4a92dd1860638dd1db33` |
| `tests/harness/viewmodel-fixture.ts` | `333f6cfb0a57b1ea5e27d83705b6629a1fa8a532a6a0c474b4cf7eff8a3d9e4e` |
| `tests/harness/viewmodel.html` | `89602209191940bcfd341b67e47012591a414c75dbe0f70271332091cc4fca0b` |
| `progress/CK-03-06.md` | `3ece4a723bba516dfd8f1b3790ac18f9be1e109291d73a6d5c29b52df86f2009` |
| `docs/evidence/CK-03-06/tap.png` | `0866e8dc40bc0ab69571ab1894cd4f9295e40d212b2c3f50c983b8b566d11c48` |
| `docs/evidence/CK-03-06/charge.png` | `e988c916a11f1d755ceba8d9ec13b660b2e731ebc2afb3f212f0e69e780d118f` |

## Review and checks

The CK-03-05 handoff supplies immutable `SwordState` snapshots with anticipation, committed attack kind/timing, and windup/active/recovery phases. CK-00-03 grants the viewmodel no renderer/context ownership; the renderer camera is not a child of its scene. The candidate now attaches its own root to the traversed scene and computes its world transform from the camera pose on each update, leaving camera parentage/siblings unchanged. The state reader does not mutate simulation or emit attacks. Its active pose corresponds to the simulation `active` phase; charge appears during anticipation; recovery returns to idle; cancellation returns an idle pose. Disposal removes its root and disposes only the model's geometries, materials, and texture.

Commands run independently on the candidate:

- `npm run typecheck` — passed.
- `npm test` — passed: 28 Vitest files, 161 tests, plus the integrated tooling check.
- `node --test --test-isolation=none tools/verify.test.mjs` — passed: all seven named cases.
- `npm run build` — passed; Vite emitted the existing 614.91 kB minified-chunk advisory.
- `node_modules/.bin/vitest run src/render/viewmodel.test.ts` — passed: 1 file, 3 cases.
- `git diff --check` — passed.

I opened and inspected the submitted tap and charge screenshots. Both show a distinct, unclipped, pixel-textured sword at the 480×270 logical buffer; the charge screenshot shows the illuminated blue rune. The screenshots are synthetic-state component evidence, not integrated native combat or GPU performance evidence. The builder's hosted run 37580926939/job 112660163954 passed 21 Chromium cases and its artifact/image hashes match the submission manifest. This is builder-run evidence; the required source-identical independent hosted run has not yet been supplied, so browser verification remains pending for this review.

The initial builder candidate `acf5d5c` failed its new browser case because it parented the model beneath a camera that is not traversed by `WorldRenderer.scene`; its images were blank. The corrected candidate fixes the scene traversal issue and preserves camera children. The original failure is accurately retained in the handoff and is not counted as verification of the corrected source.

## Finding

### CK-03-06-R1-F01 — P3 — browser disposal assertion does not check the scene root

- **Location:** `tests/harness/viewmodel-fixture.ts`, `dispose()` result construction.
- **Requirement:** The assigned browser fixture checks model disposal; review checks must exercise the behavior they claim to cover.
- **Reproduction:** The corrected implementation adds `model.root` to `renderer.scene`. The fixture currently calculates `rootRemoved` as `!renderer.camera.children.includes(model.root)`. Since the root is never a camera child, this returns `true` even if `model.dispose()` leaves the root attached to the scene.
- **Expected:** The browser fixture reports root removal based on the owning scene after model disposal.
- **Actual:** The `rootRemoved` assertion is vacuously true for the corrected scene-owned root.
- **Correction guidance:** Check `renderer.scene.children` for the root after disposal. Keep the existing camera-preservation and context-retirement checks.

The colocated unit test independently verifies that `scene.children` no longer contains the root and that owned geometry/material/texture dispose events fire once, so this finding is limited to the browser fixture's disposal assertion. No product behavior defect was found in the inspected source.

## Verdict

**CHANGES REQUIRED.** Local checks and the builder's corrected hosted run pass, and the visual evidence is readable. Resolve F01 in the explicitly owned browser fixture, rerun relevant local checks, and provide the required independent hosted verification of the exact repaired source. No other confirmed findings.
