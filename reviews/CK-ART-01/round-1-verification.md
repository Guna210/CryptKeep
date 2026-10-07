# CK-ART-01 round 1 repaired-snapshot verification

- Reviewer: `/root/cartoon_art_reviewer_r1` (`gpt-6-luna`)
- Builder/fixer: `/root/cartoon_art_builder`
- Repaired snapshot: commit `66e5f46a748f4cd467d4be5c0154e72c617976a5`, tree `daca987abeb61dca3f933379368aff9105a0a50b`; branch `cartoon-art-preview`.
- Base/prior candidate: `e225151713f33963dcae6ceef4dc20d302036439` / `c2fbedc21f4f909c0e931a8e47a01ac89515fd29`.
- Review scope: exact repaired diff against the prior candidate, the round-one fix handoff, source manifest, local checks and the independently requested hosted same-source run and screenshot.

## Verification

- `npm run typecheck` — passed independently.
- `npm test` — passed independently: 171 Vitest tests plus the tooling test.
- `npm run build` — passed independently; Vite emitted the existing 671.58 KB minified bundle warning.
- `git diff --check e225151713f33963dcae6ceef4dc20d302036439..HEAD` — passed.
- All 23 implementation-owned source/test/workflow/config hashes match `/tmp/cryptkeep-art-repaired-r1.json` and the durable manifest in `progress/CK-ART-01.round-1-fix.md`. The checkout was clean at the frozen commit.
- Hosted exact-source verification: GitHub Actions run `37625873118`, job `112807347541`, passed the complete pipeline on this snapshot: typecheck, 171 application tests, tooling stage, production build, and all 25 browser tests. The full browser log is `/tmp/cryptkeep-art-repaired-browser-log.txt`. It records the repeated 25-floor replacement, prior draw-call cap, native dash, movement, wall clearance, pause, sword charge/blocked hit and production screenshot/resizing cases passing. CI ran one worker; local runs retain two.
- Opened the hosted production screenshot `/tmp/cryptkeep-art-repaired-evidence/production-dungeon-entry.png`, 1280×800, SHA-256 `dc2a2bc3a570061f3956bd077914dca4f1d981bcca46a761f868831d26ea0e7b`. Its large, untextured teal/slate blocks have readable face variation, chamfered edges and clear dark mortar. The previous nested dark grid is gone. The floor remains calm and the faceted sword remains legible. The wall has enough value separation to read against the floor and ceiling. The fixed entry framing does not show a torch fixture, although the submitted scene code places two amber sconces and the production browser case passes; the screenshot therefore does not independently demonstrate their geometry/color.

## Finding disposition

- `CK-ART-01-R1-F01` — **resolved**. The old floor-only draw-call assertion remains `<= 10`; the repaired renderer combines the two wall orientations into shared mortar and masonry batches and caps sconces at two. Hosted software Chromium passed all 25 browser cases. Native movement, dash, collision, pause, sword attack/cancellation and floor lifecycle assertions remain present and passed. Their simulation-state polling replaces short fixed waits while retaining stamina cost, movement distance, wall clearance and attack outcome checks. CI-only single-worker configuration is limited to hosted software Chromium; local runs use two workers.
- `CK-ART-01-R1-F02` — **resolved**. The blocks now use a single owned untextured material with readable mid-value instance colors and light emissive fill, plus distinct mortar. The opened production PNG demonstrates the repaired wall surface.
- New confirmed findings — **none**.

## Verdict

**PASS** — both round-one findings are resolved on the exact frozen snapshot; independent local checks and exact-source hosted browser verification pass. No GPU performance or comfort claim is made. The screenshot's framing limits direct visual review of torch fixtures, while source inspection confirms two are created and the remaining warm lighting is visible on the floor and ceiling.
