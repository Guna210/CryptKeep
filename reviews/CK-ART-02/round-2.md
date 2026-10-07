# CK-ART-02 independent review — round 2

- **Reviewer:** `/root/cartoon_refinement_reviewer_r2` (`gpt-6-luna`)
- **Snapshot:** `02f15af0db60c13a1b862294584fbc24940e9733`, tree `e190079b0dc36c098da70d1d6bd7c3a4a5ad297e`, branch `cartoon-art-preview`.
- **Scope:** Frozen round-one repair and its hosted verification, including floor geometry cost and the production screenshots. No source, test, Git ref, or master edits were made by this reviewer.
- **Prior review:** `reviews/CK-ART-02/round-1.md`; repaired-snapshot verification: `reviews/CK-ART-02/round-1-verification.md`.

## Evidence checked

- Read the task decision, repair handoff, initial independent findings, and round-one repaired-snapshot verification. The current checkout matches the repaired snapshot named above. Its only current worktree changes are the main agent's `CONTEXT.md` update and round-one verification report.
- Independently fetched GitHub Actions job details and decoded logs for [run 37638610509](https://github.com/Guna210/CryptKeep/actions/runs/37638610509), job `112851310849`. Typecheck, 173 application tests, seven tooling tests, and build passed. The browser suite passed 21/25 and failed four cases; it took about five minutes. Failures were: `floor-renderer.spec.ts:28` disposal evaluation after 25 replacements (35.5s test); `floor.spec.ts:50` reroll click after its 25-cycle loop (31.9s); `movement.spec.ts:11` player snapshot evaluation (30.6s); and swept-wall progress timing out at 3.9067m versus the asserted >4.66m (30.1s). The floor lifecycle test preserves its 25 rerolls and final teardown/listener assertions.
- Downloaded and opened both production PNGs from artifact `cryptkeep-cartoon-art-02-37638610509-1` (artifact `11491446121`). The yaw-zero view clearly shows the orange flame around a yellow core connected to the wrapped head. The native-angle view retains the torch and shows corner mortar. Both show rounded stone faces and narrower softened edges, so the repaired visual findings remain resolved.
- Inspected `src/render/floor.ts`, `src/render/floor.test.ts`, `tests/e2e/floor-renderer.spec.ts`, `tests/harness/floor-renderer.ts`, and `src/app/floor-session.ts`. The current stone geometry uses bevel segments 4 and curve segments 5, then places every wall stone in one `rounded-stone-course` InstancedMesh for the whole floor. The browser log reports 2,988 total floor instances and 13 draw calls for the floor-renderer fixture. A one-off construction of the exact rounded stone geometry produced 2,628 non-indexed vertices (876 triangles) per stone. At the specification minimum of 3 bevel and 3 curve segments, the same shape construction produced 1,332 vertices (444 triangles), about 49% fewer; 4 and 4 produced 2,148 vertices (716 triangles), about 18% fewer. These are geometry-cost measurements, not FPS measurements. One whole-floor batch also prevents per-region frustum culling of wall stones.
- Historical evidence remains inconsistent: the unchanged baseline browser suite passed in run `37625873118` and failed in run `37626870404`. The round-one repair's isolated 25-cycle module measurement did not reproduce the hosted delay. Neither that history nor this source inspection proves which factor caused the four current browser failures. In particular, the swept-wall result alone does not prove a movement regression.

## Finding

### CK-ART-02-R2-F01 — Required hosted browser suite still fails under repeated rendering load (P2)

**Location:** `src/render/floor.ts` masonry geometry and whole-floor instancing; affected acceptance checks include `tests/e2e/floor-renderer.spec.ts:28` and `tests/e2e/floor.spec.ts:48-51`.

**Evidence/reproduction:** On the exact repaired snapshot, hosted run `37638610509` passed only 21 of 25 browser checks. Repeated floor replacement stalled before the renderer disposal evaluation, the generated-floor reroll loop stalled on a button click, and two movement checks failed their browser-time budget/progress assertion in the same run. The render path creates a 2,628-vertex stone and submits the full floor's stones through one instanced batch; the floor-render fixture reports 2,988 total instances. Earlier source-identical baseline runs disagree, so these observations do not establish a regression or root cause.

**Expected:** The complete existing 25-case browser suite, including all 25 floor rerolls, disposal, native input, and collision assertions, completes successfully on the repaired branch within its existing time limits.

**Correction guidance:** First reduce repeated stone geometry work while preserving the accepted silhouettes and fixed 0.97m extent: test bevel and curve subdivisions at 3 or another measured setting no lower than three, and replace the current loose `position.count > 200` assertion with bounds that enforce both the rounded outline/bevel minimum and a documented per-stone geometry budget. Keep antialiasing, pixel ratio, and the existing 25-reroll and lifecycle assertions unchanged. If that measured reduction is insufficient, consider a small documented increase to the draw-call bound and spatial batches for masonry so the production camera can cull distant groups; the current whole-floor batch has one bound covering the whole map. Compare browser suite outcomes and geometry counts on the same hosted runner. Do not claim an FPS improvement or assign causation without measurements; do not resolve this by broadly increasing the Playwright timeout or deleting/weakening checks.

## Verdict

**CHANGES REQUIRED.** The repaired visual findings F01–F03 remain resolved on inspected production images. F04 remains unresolved, and the exact repaired snapshot has four hosted browser failures. Cause is unconfirmed. No acceptance or performance claim is made.
