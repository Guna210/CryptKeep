# CK-ART-03 independent review — round 2

- **Reviewer:** fresh GPT-6 Luna reviewer `/root/painted_asset_reviewer_r2`
- **Reviewed source:** `c920119de4f3436ededfeea73d9420502fad0949` (tree `62226f0b48bf5bf545693f18f1a8ff88163532de`), branch `cartoon-art-preview`
- **Baseline:** `0f771edf92d16f394eed4b259a48bba6a1a5e27b`
- **Hosted verification:** run `37684067688`, job `113007227148`, artifact `11509454642`, ZIP SHA-256 `c7670b67973e8da4ad49a9f5ba526568b43482fd28ff18731b194c2a93a2f2f9`.
- **Scope:** independent re-review of the frozen source, current hosted failures, and actual artifact screenshots. No application, test, or Git changes were made by the reviewer. This report is the only file created.

## Evidence reviewed

- Read the task decision, `REVIEW.md`, task handoffs, round-one review and round-one verification; checked the baseline diff and the current floor renderer, lifecycle, renderer-resource and movement tests.
- Opened the exact hosted `default-entry.png`, `native-room-angle.png`, `sword-stone-detail.png`, `materials.png`, `floor-seed-a.png`, and `floor-seed-b.png` from `/tmp/cryptkeep-art03-r1-images/`.
- Hosted typecheck, app/tool tests, build, materials and production screenshot cases pass. Browser suite remains 21 passed / 4 failed; the reported failing cases are lifecycle rerolls (F03), swept-wall stamina wait (F04), cross-seed renderer geometry count (F06), and native-input movement ticks (F07). All 25 cases ran.
- No local server or duplicate full browser run was attempted. No GPU performance or hardware frame-rate measurement is available.

## Prior finding disposition

- **CK-ART-03-R1-F01 — resolved.** The renderer now uses one atlas-offset instanced batch per occupied 8m masonry chunk, and the hosted draw-call bound passes. Per-seed masonry chunk totals legitimately differ.
- **CK-ART-03-R1-F02 — resolved.** Hosted material coverage passes for all 13 recipes.
- **CK-ART-03-R1-F03 — unresolved.** The 25 native rerolls still exceed the required 60-second test limit at reroll 23/25 in the hosted run. The timeout is correctly scoped with `test.setTimeout(60_000)`, and all rerolls and lifecycle assertions remain. This is a confirmed hosted failure.
- **CK-ART-03-R1-F04 — unresolved / unverified.** The hosted stamina poll still fails to reach its minimum real simulation tick before the 30-second test deadline; the observed poll result is `undefined`, so the artifact does not show an incorrect stamina value. The exact 100 assertion, actual elapsed-tick condition and collision assertions remain. The state proof is incomplete.
- **CK-ART-03-R1-F05 — resolved.** The actual room screenshots show the ceiling using the restrained floor/slab texture. Wall atlas selection remains visible and coherent.

## Confirmed remaining findings

### CK-ART-03-R1V-F06 — P2 — repeated lifecycle resource check compares different seed geometry totals

`tests/e2e/floor-renderer.spec.ts:24-29` matches each replacement's floor counts to its own seed, but compares every `rendererCounts.geometries` against seed B. Hosted seed A reports 72 geometries and 52 masonry chunks; seed B reports 76 geometries and 56 chunks. The source allocates one owned stone geometry clone per occupied chunk, so these seed totals are legitimately different. The assertion fails on seed A even though the repeated-cycle results are stable for each seed.

Keep the repeated disposal/resource stability check, but compare the geometry count against the recorded expected count for that report's seed, as the test already does for floor counts. Do not require different plans to allocate the same number of chunk geometries.

### CK-ART-03-R1V-F07 — P2 — native-input movement proof misses its real-tick threshold within the test deadline

`tests/e2e/movement.spec.ts:72-74` requires 24 additional simulation ticks after a fresh native W press. In the hosted run, the test reaches tick 128 while requiring at least 133 before its existing 30-second test deadline. The test's earlier native input and movement assertions remain, but this final fresh-input proof fails under the actual production renderer and hosted software WebGL.

Investigate and reduce the real render/startup work that is starving simulation progress. Preserve native input and the 24-tick assertion. Do not inject diagnostic state, remove the assertion, or apply a broad timeout increase.

### CK-ART-03-R1-F03 — P2 — 25 floor rerolls still exceed the required 60-second lifecycle limit

`tests/e2e/floor.spec.ts:3-4, 39-45` correctly applies the 60-second limit to the full test and retains all 25 fill/click/reroll cycles and lifecycle/disposal checks. Hosted run `37684067688` times out during reroll 23. The candidate therefore does not establish that the required repeated floor replacement and cleanup completes within the task's limit.

Reduce the per-reroll work or resource allocation cost in the tested rendering path enough for all 25 cycles to finish within 60 seconds. Preserve every native reroll, listener/root/resource stability and disposal assertion, and the 60-second cap. Do not reduce viewport/display cap or weaken checks.

### CK-ART-03-R1-F04 — P2 — swept-wall stamina reaches neither the required elapsed ticks nor a verified full refill

`tests/e2e/movement.spec.ts:184-202` derives a real refill interval from the player's observed stamina and idle timer, then requires both that many simulation ticks and exact stamina 100. In the hosted run the poll returns `undefined` because the minimum tick has not been reached before the test's 30-second deadline. This remains an unverified required assertion, not evidence that the stamina algorithm produced a wrong value.

Resolve the simulation/render throughput issue in the actual tested path, or propose a narrowly scoped test orchestration adjustment supported by measured evidence and bounded to this case. Keep the actual elapsed-tick requirement, exact 100 value, real sprint/wall collision setup and 25-cycle 60-second lifecycle limit. No fake state, skipped ticks/assertions, or blanket timeout expansion.

## Source and visual assessment

The main candidate source is unchanged from the reviewed repair snapshot, and its eight repair source hashes remain the ones recorded in `progress/CK-ART-03.round-1-fix.md`. The 224-vertex / 444-triangle rounded stone geometry is instantiated many times across each generated room; the task explicitly calls for checking actual allocation/render cost. A materially smaller indexed rounded mesh is a bounded path to investigate if its rounded face/bevel silhouette and visible normals still match the supplied screenshots. This is a correction avenue, not a measured finding that geometry alone caused the observed slowdowns; the hosted artifact does not isolate CPU allocation, GPU work, or browser scheduling.

The actual screenshots show the previous visual repairs hold: the ceiling is restrained, floor seams and wall variants remain legible, and the bright steel blade, fuller, brass guard and wrapped grip remain distinct. The torch and alcove are readable; the crate is visible at the room edge. No new artwork or clearance defect is confirmed. The material sheet check passes. Owner aesthetic approval remains separate.

## Verdict

**CHANGES REQUIRED.** F01, F02 and F05 remain resolved. F03 remains a confirmed lifecycle timeout; F04 does not reach its required state proof; F06 and F07 remain confirmed test/runtime failures in the hosted run. These four issues need a single bounded repair, followed by hosted verification of the exact repaired source. No change to the 60-second lifecycle cap or gameplay algorithm is authorized by this review.
