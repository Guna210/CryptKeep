# CK-ART-02 independent review — round 1

- **Reviewer:** `/root/cartoon_refinement_reviewer_r1` (independent reviewer)
- **Snapshot:** source-identical implementation commit `57fda824ebff464ca9ccb2d1af38d96caf06caf2`, tree `237a3813630f29e16e445d0ff145b0ccbb5a445c`; independent receipt `fe969f9faa68af1314ac1ab5e9fe67bea26fe0c0` changes only `CONTEXT.md`.
- **Baseline:** `d62fb2dc298588e05b782fc2ca8fe5791bbe4bb1` on `cartoon-art-preview`.
- **Scope:** render geometry/material changes, sword viewmodel changes, tests, and scoped workflow artifact change. No source edits made by reviewer. Master was not touched.

## Independent checks and evidence

- Confirmed all ten implementation-owned files match the frozen SHA-256 manifest in `progress/CK-ART-02.md`.
- `npx vitest run src/render/floor.test.ts src/render/textures/base.test.ts src/render/materials.test.ts src/render/viewmodel.test.ts`: three files passed; `base.test.ts` hit its 5-second test timeout under parallel workers. Isolated rerun `npx vitest run src/render/textures/base.test.ts --maxWorkers=1` passed 3/3. The timeout was not reproduced in isolation.
- Orchestrator reports the full 171 application tests and seven verification-tool cases passed; builder reports typecheck, targeted checks, and production build passed. Hosted run [37635817859](https://github.com/Guna210/CryptKeep/actions/runs/37635817859) independently passed typecheck, 171 app tests, seven tooling cases, and build. Its browser suite failed 1/25: existing `tests/e2e/floor.spec.ts:66` timed out after 30 seconds in the final DOM evaluation following 25 floor rerolls and repeated `pagehide`; the other 24 browser checks passed. Historical results are mixed: the same test passed on baseline run `37625873118` and failed on source-identical baseline run `37626870404`. The current failure is confirmed, but its cause and attribution are unknown.
- The first hosted run `37635581985` was cancelled by concurrency before verification completed and produced no artifact; it is neither a pass nor a source failure. Baseline hosted run [37625873118](https://github.com/Guna210/CryptKeep/actions/runs/37625873118) on the prior accepted source passed the full workflow, including this same 25-reroll lifecycle test; another source-identical baseline run [37626870404](https://github.com/Guna210/CryptKeep/actions/runs/37626870404) failed it, so baseline evidence is inconsistent.
- Downloaded and inspected both production PNGs from artifact `cryptkeep-cartoon-art-02-37635817859-1` (artifact ID `11490650200`): `production-entry-yaw-0.png` and `production-entry-angle-native-mouse.png`. The yaw-zero view clearly shows the torch fixture, but the orange flame has no visible yellow core. The angled screenshot contains no torch in frame, so it does not provide the requested angled torch proof. It does show a room corner. Both screenshots show repeated square panel-like stones with hard rectangular face corners and broad bevel frames.

## Findings

### CK-ART-02-R1-F01 — Yellow flame core is hidden and the flame does not read as attached to the torch head (P2)

**Location:** `src/render/floor.ts`, torch mesh transforms near `set(flameMesh, 2.39, .07)` and `set(coreMesh, 2.43, .075)`.

**Evidence/reproduction:** Open the hosted `production-entry-yaw-0.png` at default entry yaw. The visible fire is a plain orange pointed shape; no distinct yellow core can be seen. The flame also sits visibly above the wrapped head/shaft rather than reading as a joined torch assembly. The opaque core is only 0.005m farther outward than the larger orange mesh, consistent with it being occluded.

**Expected:** A recognizable attached flame with a visibly distinct yellow center, as required by the art direction.

**Correction guidance:** Adjust the flame/head/core geometry and relative placement/material treatment so both orange outline and yellow center are clearly visible from the normal first-person view, while the flame visibly joins the torch head. Verify using the production screenshot.

### CK-ART-02-R1-F02 — The required angled screenshot does not show a torch (P2)

**Location:** `tests/e2e/production.spec.ts:18-34`.

**Evidence/reproduction:** The test captures `production-entry-angle-native-mouse.png` after moving the mouse 115 pixels. The actual hosted image shows the camera turned into the room with no torch visible.

**Expected:** The second normal-input production view shows a complete torch from an angle and mortar continuity across a corner/room.

**Correction guidance:** Choose a normal mouse movement/view that retains a complete torch and exposes corner joints, or adjust fixture placement so a torch is in that view. Keep native input and capture actual output.

### CK-ART-02-R1-F03 — Wall stones still read as hard square panels rather than rounded painted masonry (P2)

**Location:** `src/render/floor.ts` `blockShape` construction and masonry setup; `src/render/textures/base.ts` stone recipe.

**Evidence/reproduction:** Both hosted production screenshots show square-cornered rectangular faces surrounded by a broad, hard bevel frame. The shape path is a four-line rectangle (`blockShape` at `src/render/floor.ts:21`), so added extrusion bevel segments do not round the visible XY face corners. Surface variation is sparse and low contrast; the overall wall still reads as repeated framed panels, preserving the rejected hard-edged/low-poly impression.

**Expected:** Clearly rounded corners and softer painted stone faces with broad, readable tonal variation and restrained wear, matching the explicit refinement acceptance.

**Correction guidance:** Round the 2D face outline itself and tune normals/bevel width so the face edges and corners look soft in the production view. Strengthen authored broad painted variation enough to read at first-person distance without adding noisy speckle or a second brick grid. Inspect the resulting hosted images.

### CK-ART-02-R1-F04 — 25-reroll lifecycle check times out in the hosted run (P2)

**Location:** `tests/e2e/floor.spec.ts:48-66`; investigate floor rendering and teardown paths in `src/render/floor.ts` and `src/render/materials.ts`.

**Evidence/reproduction:** Hosted run `37635817859` passed typecheck, 171 app tests, seven tooling cases, and build, then timed out after 30 seconds at the final DOM evaluation in `floor.spec.ts:66`, following 25 rerolls and double `pagehide`. The same test passed on baseline run `37625873118` and failed on source-identical baseline run `37626870404`. Thus the current required check is unresolved, but these results do not establish a source regression or its cause. The separate floor-renderer replacement test took 8.2 seconds in the candidate hosted run.

**Expected:** The required 25-floor replacement and teardown check completes within its 30-second browser budget.

**Correction guidance:** Measure the reroll and teardown path to identify the stall or determine whether the timeout is environmental. Preserve the 25-reroll and teardown assertions, then rerun hosted verification and record the evidence. Do not attribute the timeout to texture size, instance count, or any particular source change without measurements.

## Verdict

**CHANGES REQUIRED.** The three confirmed visual findings remain open. The required 25-reroll lifecycle check also failed on the current hosted run; its cause is unresolved and the historical baseline results are inconsistent. Core gameplay/RNG source was not changed in the diff, and the scoped render tests pass independently in isolation. No acceptance or PASS is claimed.
