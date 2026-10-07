# CK-ART-03 round-one repair verification

- **Reviewer:** same independent GPT-6 Luna reviewer `/root/painted_asset_reviewer_r1`
- **Frozen repaired candidate:** `c920119de4f3436ededfeea73d9420502fad0949` (tree `62226f0b48bf5bf545693f18f1a8ff88163532de`)
- **Baseline / pre-repair candidate:** `0f771edf92d16f394eed4b259a48bba6a1a5e27b` / `8cc819775515072494b8934e28398c36804383f8`
- **Hosted verification:** run `37684067688`, job `113007227148`; artifact `11509454642`, ZIP SHA-256 `c7670b67973e8da4ad49a9f5ba526568b43482fd28ff18731b194c2a93a2f2f9`.
- **Scope:** verify all round-one findings F01–F05 against the exact repaired source, hosted browser results and actual screenshots. No source or test edits were made by the reviewer.

## Checks and inspected evidence

- Confirmed all eight repaired source hashes in `progress/CK-ART-03.round-1-fix.md` match the current source files. `git diff --cached --check` passes.
- The fixer reported typecheck, 174 app tests, one tooling test, production build, and focused floor tests passing. Hosted run confirms typecheck, app/tool tests, build, materials browser test, and production screenshot test pass.
- Hosted browser suite result: 21 passed, 4 failed. Failures are the floor-renderer resource equality assertion, the 25-reroll lifecycle timeout, the native movement case timing out, and the swept stamina case not reaching its required state before the test deadline.
- Opened the hosted `default-entry.png`, `native-room-angle.png`, `sword-stone-detail.png`, `materials.png`, `floor-seed-a.png`, and `floor-seed-b.png` from `/tmp/cryptkeep-art03-r1-images/`.
- No local browser server was started. The exact hosted run supplies browser evidence; no hardware frame-rate measurement is claimed.

## Round-one finding status

- **CK-ART-03-R1-F01 — Resolved.** The hosted floor-renderer draw-call assertion now passes with one atlas-offset instanced mesh per 8m masonry chunk. The seeds have different legitimate chunk/geometry totals (seed A: 52 chunks and 72 renderer geometries; seed B: 56 chunks and 76 geometries), while draw calls equal the accepted bound of 20 fixed non-masonry batches plus occupied chunks. The source restores 8m culling granularity and owns/disposes each chunk geometry and its instance offset attribute. A newly exposed cross-seed geometry-count assertion is recorded as F06 below.
- **CK-ART-03-R1-F02 — Resolved.** The hosted materials test passes for all 13 library recipes. The repaired material screenshot shows the new recipes are present; its viewport screenshot only displays the first eight figures, but the browser check verifies all 13 figures and captions.
- **CK-ART-03-R1-F03 — Unresolved.** The hosted lifecycle case still times out at 60 seconds while processing reroll 23 of 25 (`tests/e2e/floor.spec.ts`). The timeout remains correctly scoped and effective; all 25 native rerolls and lifecycle assertions are retained. This required behavior is not verified on the repaired candidate.
- **CK-ART-03-R1-F04 — Unresolved / unverified.** The hosted swept-wall stamina test still does not reach the required tick/state result before its 30-second test deadline. At the failing poll the callback returns `undefined` because the required simulation-tick minimum has not yet been reached; the hosted result does not show that stamina reached an incorrect value. Preserve the exact 100 assertion and real tick/state condition while making the case complete in hosted software WebGL. Avoid fabricated state or weakened movement assertions; a scoped timeout adjustment needs evidence and must not be blanket.
- **CK-ART-03-R1-F05 — Resolved.** The repaired production default and native-angle images show the ceiling using the calmer slab/floor artwork, instead of the four-cell wall atlas. Floor and wall appearance, sword face/reflection bands and wrapped leather remain intact in the production views.

## New confirmed findings

### CK-ART-03-R1V-F06 — P2 — lifecycle test compares different seeds' legitimate geometry totals

`tests/e2e/floor-renderer.spec.ts:24-29` correctly checks each replacement's floor counts against the matching seed, but compares every `rendererCounts.geometries` value to seed B's total. The hosted test reports 72 for seed A and 76 for seed B. The source creates one owned stone geometry clone per occupied spatial chunk, so these totals legitimately differ with each plan (52 versus 56 chunks); the 25-cycle run otherwise reports stable values per seed. This equality assertion fails on seed A despite no demonstrated leak.

Track expected renderer geometry counts by seed, just as the test already does for `report.counts`, and retain repeated-cycle disposal checks. Do not force identical geometry allocations across different plans or drop the lifecycle/resource checks.

### CK-ART-03-R1V-F07 — P2 — native-input movement case exceeds its existing test deadline

`tests/e2e/movement.spec.ts:72-74` waits for 24 real ticks after fresh W input. Hosted run `37684067688` hit the test's existing 30-second deadline with tick 128 where the assertion required at least 133. The same hosted run also fails to advance the swept-wall stamina poll to its computed tick minimum before the deadline (F04). The first movement case passed in the initial candidate run but now misses its deadline, so the repaired render/candidate path has not preserved the required native-input proof under hosted software WebGL.

Investigate startup/render cost and tick progress in the actual test path, preserving the 24-tick movement assertion and native input. Correct execution/performance in the tested path; do not convert the check to diagnostic state injection or apply a broad timeout increase.

## Visual review and verdict

The production images confirm that the ceiling repair is effective: it now reads as subdued painted slabs with linear seams, while the wall atlas remains legible and varied. The sword's bright steel face, darker fuller, painted edge, brass guard and shaded wrapped grip remain clearly visible at first-person scale. The warm torch and framed surround read in both room angles. The materials fixture contains all 13 recipes, although its screenshot viewport crops the lower figures; the passing assertions confirm the complete list exists. I saw no new clipping or walkable-clearance problem in the supplied views. These checks do not establish a hardware frame-rate target or owner aesthetic approval.

**CHANGES REQUIRED.** F01, F02, and F05 are resolved. F03 remains unresolved and F04 remains unverified because required hosted simulation time was not reached. F06 and F07 are confirmed new issues in this repaired snapshot. Round one has used its single repair pass; this report requests no further repair in round one.
