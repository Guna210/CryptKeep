# CK-ART-03 independent review — round 1

- **Reviewer:** fresh GPT-6 Luna reviewer `/root/painted_asset_reviewer_r1`
- **Implementation snapshot:** `8cc819775515072494b8934e28398c36804383f8` (`cartoon-art-preview`)
- **Baseline:** `0f771edf92d16f394eed4b259a48bba6a1a5e27b`
- **Scope:** frozen CK-ART-03 source, browser checks and hosted production screenshots. No application, asset, test, or Git changes were made by the reviewer.

## Checks and evidence

- Read `decisions/painted-asset-preview.md`, `REVIEW.md`, relevant `SPEC.md`/`CONTEXT.md`, and `progress/CK-ART-03.md`; compared the task diff against the baseline.
- Inspected the exact hosted artifact for run `37659555902`, job `112923273237` (artifact ZIP SHA-256 `84db16f95b655a1aca8c75ba5b4e846249ea28b312e63ff85e3c5328b6a7796a`) and opened all three production screenshots: `/tmp/cryptkeep-art03-initial-images/default-entry.png`, `native-room-angle.png`, and `sword-stone-detail.png`.
- Hosted results: typecheck, 174 app tests, tooling test, and production build passed. Browser suite: 21 passed, 4 failed. The exact failures are recorded below.
- I did not repeat the hosted checks or attempt a local browser server. The hosted run is the independent runtime evidence for this frozen candidate.

## Findings

### CK-ART-03-R1-F01 — P2 — renderer draw-call budget exceeded

`src/render/floor.ts:112-146` creates up to four instanced masonry meshes per spatial chunk to select atlas variants, and raises `MASONRY_CHUNK_METERS` from the baseline 8 to 32. On the hosted floor-renderer seed B, the floor has 8 masonry chunks and 52 renderer draw calls. `tests/e2e/floor-renderer.spec.ts:21` still enforces the existing bounded budget of `12 + masonryChunks`, which is 20 for this seed; the hosted assertion fails at 52. The broader chunks also make frustum-culling less spatially precise.

Preserve the required stable stone variation and spatial culling while bringing actual draws back within a defensible bounded budget. If a different budget is proposed, tie it to measured draw/culling cost and update the check to count the actual batch structure; do not pass by only raising the assertion or by coarsening chunks further.

### CK-ART-03-R1-F02 — P2 — the browser material showcase still expects only the old seven materials

`tests/e2e/materials.spec.ts:6-8` and `tests/harness/materials.ts` still enumerate the seven base tile recipes. The production material library now reports 13 materials, so the hosted check fails at line 7 (`data-material-count`: expected `7`, actual `13`) after its seven-figure assertion passes. This leaves the newly authored steel, leather, brass, wood, iron, and trim recipes out of the material showcase and makes the full browser suite fail.

Update the fixture and its assertions to exercise the new authored materials as well as the original base recipes, with the displayed count tied to what the fixture actually renders. Keep the original seven recipes covered.

### CK-ART-03-R1-F03 — P2 — lifecycle reroll case does not finish within its authorized timeout

`tests/e2e/floor.spec.ts:50-54` retains all 25 rerolls and correctly applies `test.setTimeout(60_000)`. In hosted run `37659555902`, the test exceeded that 60-second timeout while clicking reroll 23. The fixed timeout is effective, so this is a real runtime regression in the repeated floor creation path, not an ineffective Playwright timeout declaration.

Reduce the work or allocation cost per reroll so all 25 cycles complete within 60 seconds. Preserve every reroll, lifecycle/disposal/listener assertion, and the timeout; do not weaken assertions or expand the timeout.

### CK-ART-03-R1-F04 — P2 — swept-wall stamina check samples one simulation tick before full refill

`tests/e2e/movement.spec.ts:191-193` waits 45 real simulation ticks, then expects stamina to equal 100. The hosted run reached `99.83333333333348` (one 1/60-second regeneration step short) and subsequently hit the test's 30-second deadline. The test does wait for simulation ticks as authorized, but its current boundary does not establish the expected final state.

Keep the full-refill assertion and wait on real elapsed simulation/state until it reaches 100, allowing the required additional simulation step or steps. Do not seed or fabricate stamina state, reduce the expected value, or weaken the swept-wall assertions.

### CK-ART-03-R1-F05 — P2 — ceiling renders the full four-cell wall atlas on every slab

`src/render/floor.ts:82-83` applies `library.materials.stone` to each default `BoxGeometry` ceiling instance. That geometry retains full `[0,1]` UVs, while `src/render/materials.ts` builds the stone texture as a 2×2 atlas and wall geometry explicitly remaps each block into one quadrant (`floor.ts:112-115`). As a result, each ceiling slab samples all four wall designs together. The default and native-angle screenshots show a ceiling covered in the same large, high-contrast polygon patches as the wall; it does not read as painted ceiling slabs with restrained grout as required.

Give the ceiling an appropriate slab recipe or intentional UV mapping, with calmer grout and visual treatment coordinated with the floor and masonry. Keep the wall atlas selection behavior intact.

## Visual assessment and limitations

The three actual production screenshots show a readable, bright steel blade with broad painted reflection bands and a dark fuller; the wrapped leather handle and seam/shading detail also survive at first-person scale. The sword's material treatment is visibly more developed than flat solid coloring. The orange/yellow torch remains recognizable and lit, and the base course and framed torch surround are present. The seedB/production views show the designed wall chips and warm/cool changes, but the four broad polygon/crack patterns repeat plainly across the room. The ceiling atlas issue above dominates the overhead view. The default screenshot is partly covered by the existing preview panel; the native-angle and close-detail screenshots provide the usable view of the room and sword.

The atlas has no gutters and uses mipmapped linear filtering, so cross-cell bleed is a source-level risk; these screenshots do not establish a user-visible bleed defect at the inspected views. I am not recording it as a confirmed finding. I found no screenshot evidence that the props obstruct clearance or clip through the walkable room. The texture ownership/disposal paths inspected here keep borrowed floor-library materials separate from floor-owned resources, and the sword disposes its own three textures, five materials, and geometries once. No failure in the stated two-light limit or display-cap behavior was evident in the reviewed source/evidence.

## Verdict

**CHANGES REQUIRED.** Five confirmed round-one findings remain. Hosted typecheck, app/tool tests, and build pass, but the hosted browser suite has four failures and the rendered ceiling misses the stated painted-slab treatment. This is not an aesthetic acceptance of the full scene; the sword and leather detail are visually promising, with owner aesthetic approval remaining separate.
