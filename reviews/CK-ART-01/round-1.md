# CK-ART-01 round 1 review

- Reviewer: `/root/cartoon_art_reviewer_r1` (`gpt-6-luna`)
- Builder: `/root/cartoon_art_builder`
- Snapshot: candidate commit `c2fbedc21f4f909c0e931a8e47a01ac89515fd29`, tree `8283c58956693b29ce9cfc60479d0deeb0511543`; accepted base `e225151713f33963dcae6ceef4dc20d302036439`.
- Scope: task card `decisions/cartoon-art-preview.md`, applicable SPEC branch override, render/app/test/workflow diff and builder handoff. The current `CONTEXT.md` edit is coordinator-owned and excluded from source identity. No untracked implementation files were present.

## Checks and evidence

- `npm run typecheck` — passed.
- `npm test` — passed: 171 Vitest tests and the tooling suite.
- `node --test --test-isolation=none tools/verify.test.mjs` — passed, all seven named tooling cases.
- `npm run build` — passed; Vite reported the existing 671 KB minified bundle size warning.
- `git diff --check e225151713f33963dcae6ceef4dc20d302036439..HEAD` — passed.
- All 19 builder-owned source/test/workflow SHA-256 values match `progress/CK-ART-01.md` and `/tmp/cryptkeep-art-source.json`.
- Inspected actual implementation and test changes. Masonry is instanced in two batches; decorative lights are capped at four; moss is capped at sixteen instances; floor-owned new geometries/materials are disposed with the floor. Renderer pixel area is capped at 2.4 million with device ratio at most 1.5. The generated-floor placement test checks the actual transformed masonry bounds against walkable cells. No changes to generation, role placement, occupancy or combat simulation were found in the submitted diff.
- Opened the hosted production PNG at `/tmp/cryptkeep-art-initial-evidence/production-dungeon-entry.png` (1280×800; SHA-256 `8a2fc11c2868d7950912cd2819bb0e83a25025287d2505302a0c18b98ea120e0`). It shows a strongly dimensional sword and floor, but the wall is nearly black with two competing repeated grids (the masonry relief and a second small-block texture). The teal/slate wall color and mortar are not legible as broad masonry, and the torch does not lift the visible wall enough to make its surface readable.
- Read the full failure tail from hosted run `37623705432`, job `112800038333`. The workflow ran 19 browser checks successfully including the new production style test, but six existing development regressions failed: floor-renderer draw calls were 12 against the inherited cap of 10; 25-floor replacement timed out; dash cooldown remained 0.1 seconds after five real seconds; movement pose delta was 0 after a 700 ms native hold; wall approach achieved only 3.448 m against a required >4.66 m before its timeout; and the sword charge indicator was hidden after a 400 ms recovery wait. These are hosted browser observations, not an independent reproduction. Several errors are frame/timing-sensitive, but the movement/dash/sword and floor-cycle cases exercise required native behavior and must remain meaningful and pass. Browser console/page error and resize assertions in the successful production test passed according to the run's 19/25 result; the full workflow itself did not pass.

## Findings

### CK-ART-01-R1-F01 — Hosted native/browser regressions and render budget

- Priority: P1.
- Affected behavior: candidate's full hosted Playwright suite on Chromium, including existing native dash, movement, wall collision, sword charge and repeated floor lifecycle cases; hosted run `37623705432`, job `112800038333`.
- Expected: the task explicitly requires the existing browser regressions to pass, preserves native controls, and requires bounded draw calls. The new production test passing does not replace those regressions.
- Actual: six existing checks failed. Native dash and sword state did not advance within their current browser waits; a 700 ms native movement hold produced no pose change; movement stopped short in the wall-clearance case; repeated floor replacement timed out; and the draw-call assertion observed 12 versus its existing cap of 10.
- Correction guidance: establish why the new full-resolution scene makes the hosted app/browser suite miss its input and lifecycle windows, then reduce/contain render or synchronous replacement cost. Keep controls, collision, pause and disposal assertions intact; adjust timing-based assertions only where the fix provides evidence that the original wall-clock bound is incompatible with this task while the same simulation behavior is still verified. Explicitly revisit the 10-call bound and only raise it if a measured, fixed upper bound is justified by the required new batches; keep the total bounded.

### CK-ART-01-R1-F02 — Generated wall surface is too dark and reads as nested grids

- Priority: P2.
- Affected behavior: first generated production view, shown in `test-results/CK-ART-01/production-dungeon-entry.png` from hosted run `37623705432` (copied locally to `/tmp/cryptkeep-art-initial-evidence/production-dungeon-entry.png`).
- Requirement: task card calls for readable cool teal/slate masonry, broad shape variation, visible mortar and dimensional block edges, with lighting that keeps the walkable dungeon readable.
- Actual: visible wall blocks are nearly black. Their base stone texture repeats a second small rectangular grid inside every much larger beveled block, so the surface reads as nested shelving/black gridwork and the requested broad teal/slate tones and mortar separation are hard to see. This is visible in the submitted image at native resolution.
- Correction guidance: give the broad beveled blocks readable mid-value teal/slate faces under the task's lighting and preserve a distinct narrow mortar seam. Avoid multiplying the instance tint by a second dark block-grid texture on each face; use a neutral/suitable material for those blocks or an appropriately matched palette/texture.

Optional style note: the sword and calm floor read clearly in the submitted view. No comfort or GPU-performance conclusion follows from this screenshot or software-rendered hosted run.

## Verdict

**CHANGES REQUIRED** — F01 and F02 are confirmed in-scope findings. Local type, application/tooling tests, build, diff and hash checks pass; the hosted full browser workflow failed and its inspected production image does not meet the wall readability portion of the task. The task is not accepted. A fresh hosted run is still needed after repair; the next such run can serve as this round's repaired-snapshot verification.
