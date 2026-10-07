# CK-03-09 independent review — round 1

**Result: CHANGES REQUIRED.** The combat integration and native sword case pass independent source review and local checks. Two review gates remain: the required same-source hosted run fails an existing pause regression because its assertion reads a stale pre-pause sample, and the submitted artifact receipt records a truncated ZIP digest. This report reviews the uncommitted working tree at candidate commit `52199ef0fa7e597c32654a8be993fa0cb984f2ec`, tree `f9438c5871cdc718a9813f7ebb8b5e74a0b6be79`. The independent trigger was source-identical child `4a15688c8d70a72f14eee85e36fae7f7a51c6c09`; its tree is the same.

## Findings

### CK-03-09-R1-F01 — Correct the recorded hosted artifact digest

**Priority: P2.** The durable handoff and `/tmp/cryptkeep-CK-03-09-submission.json` record the builder archive SHA-256 as `46c027ca153e8b74578d91f0cbf3ae092265b523bcb1128f3a5a303096f9efc`, which is 63 hexadecimal characters. I independently hashed the submitted archive at `/workspace/attachments/306d5acb-ea4d-4137-8270-0dddfd5d5316/CK-03-09-builder.zip`; its SHA-256 is `46c027ca153e8b74578d91f0cbf3ae092265b523bcb1128f3a5a303096f9efc5`. Correct the receipt in `progress/CK-03-09.md` and the submission manifest, then refresh any manifest checksum that depends on those files. The hosted run and artifact ID/name otherwise agree with the run metadata.

### CK-03-09-R1-F02 — Wait for a post-resume simulation sample in the pause regression

**Priority: P1.** The independent same-source workflow run `37607685172`, job `112747093096`, failed 1 of 24 browser checks. The native sword test passed; the failure was `tests/e2e/pause.spec.ts:36`, where the test polls only until `lastSample` is non-null. That value is already non-null before pausing, so after Resume the assertion reads the old sample (`held: ["moveForward", "sprint", "primary"]`) and reports a false replay failure. `PlayerSession` intentionally leaves `lastSample` as the last sampled diagnostic record while paused; the report does not establish a source replay defect. Change this regression to wait until the floor tick advances beyond the paused tick (and then inspect the newly sampled command) before checking that primary/secondary edges and held state are absent. Preserve its other pause, resource-freeze, and fresh-input assertions. Re-run the complete hosted workflow on the repaired snapshot; acceptance requires the full browser suite to pass.

Independent run details: checkout SHA `4a15688c8d70a72f14eee85e36fae7f7a51c6c09`; typecheck, 171 app tests, tooling, and build passed; browser suite was 23 passed / 1 failed. The native sword case itself passed. Failure artifact `11475309000` (`playwright-failure-evidence`) has digest `edd1ca51fb587a797f730f2b537832726d3ef377667c687d3b5581d0eed17faa`; scoped artifact `11475597783` (`cryptkeep-m03-37607685172-1`) has digest `0f137caf4dccefa549f70bf321f6026c01a50294e21892b46052cc77d33c9715`. I independently downloaded the scoped ZIP and verified its digest. Its CK-03-09 screenshot SHA-256 is `8cc5242268de8d4c3051e93c34d1cf627edd9cc854135b71c22ea637dd1be62f`; it shows the sword, target, room, centered reticle, and the same live HUD values as the selected builder image.

## Independent review and checks

I traced the live path from native `PlayerSession` input through look/movement/dash/sprint spending, the combat hook, shared stamina/timers, fixed-tick combat resolution, current Grid melee/LOS query, actor health, sword viewmodel, HUD snapshots, and simulation-time feedback. Cancellation is immediate at pause, blur, hidden state, pointer-lock loss, editable focus, loading/replacement, and teardown; it does not create a release. The diagnostic Grid is guarded to development/test installation, rendered from the same occupancy used for collision and melee LOS, and absent from production controls. CombatSession owns the runtime, IDs, resolver, actor health and stable event collector. No additional source defect was confirmed.

Independent local checks all passed on the reviewed tree:

- `npm run typecheck`
- `npm test` — 32 Vitest files / 171 tests; default tooling entry passed
- `node --test --test-isolation=none tools/verify.test.mjs` — 7 / 7
- `npm run build` — passed; existing 663.63 kB minified chunk advisory
- `npx tsc --ignoreConfig --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --types vite/client,@playwright/test,node --skipLibCheck tests/e2e/sword.spec.ts tests/e2e/production.spec.ts`
- `git diff --check` — passed in the builder submission; no source changes were made during review

Local Playwright was not run because the environment denies loopback binding with EPERM. No permission override or network bypass was attempted.

## Reviewed file manifest

All 20 final submission hashes below were independently recomputed and matched `/tmp/cryptkeep-CK-03-09-submission.json`. The archive receipt defect above concerns the ZIP digest, not these source/evidence file hashes.

```text
README.md 761f74813b9db0b914033a1d7b5264586059955285618bb2d0a511d8616a1ba7
docs/environment-start.md 851d64c2e0f95d3040974cf4e59a444e703879fec3c8f7769a927655e0e50a76
progress/CK-03-09.md 255347d334591f57e484dd7776ab3521ce3d909c872c4d3c020aa81a0405251a
src/app/combat-session.test.ts 7032addeabc3e35e4cd36017cb67cae6a8d020627ab0041999f2b2ded8739967
src/app/combat-session.ts 17715c00d0dc8eeaf936d76bbf8ec8c1fa4a053dc8e8ed46eb6327b7e9dc0c2c
src/app/floor-session.test.ts 83ad42c6a4bee99b40e5361808f952ab6ec9d18c2819c1aca205c04cd4fd68ae
src/app/floor-session.ts efd6164e46cc0b99444daba68100a96b8dd7b7d5ba3e9045191e19359d92bdb0
src/app/player-session.ts 96c29400a68ed642ebafde98d2782e15a36e18a5cd13408b2ab007287f298868
src/app/shell.ts 5fd37b3b1f917f67cf535d30b33968f41d42acfe718a28a057e7d716aa6aa6de
src/debug/fixtures/native-training.ts ceba3803a9efea8b4fe00297b5b0344c209656349c7e1d1cee09980cfe2e0e49
src/debug/index.ts 44287b50279490371e04238d61a1e1af7a3496f1570beee49de901768c54c60d
src/main.ts c78c7f510b24c71c910a5432c2349f14f7562bd40f02353cb20cd21e9ae18847
src/player/state.test.ts 0251d8f903c84ce8fc928dfff1bc700773f0ff63bc2ee9293731834c62f20173
src/player/state.ts 773847191585fd0403edce539d2ede5edecd9f93ca29072976413f326801f55a
src/render/floor.test.ts b758f68735f6143404077e9a34f96f323adc6e2b3e70e0f472ba59187013b7f0
src/render/floor.ts 306d5dadfe4ec4642d86b66ca050b7dfcb63e6bbe863241633547fbc203df101
src/ui/shell.css 6d7e5eb43e5db8a5a405ea05d0b316118e7c8612281fd5d0698df004f4d8f189
tests/e2e/production.spec.ts b02f1e902c9c64253342074989587e0a85ba7d9c0e0091d06cd64e292e03ddd0
tests/e2e/sword.spec.ts ad25d8139f50918fbac85c5be2e7de96ffcde25fd7908a2fdabc0dcdf78664fb
docs/evidence/CK-03-09/native-sword-hit.png 3af1ad122a777429f3b693902fb872940ed9c689251e0ec29e8eb4312c428670
```

The selected durable image was opened and inspected. It shows the pixel-textured dummy and sword, tiled room, centered reticle, and HP `100/100`, stamina `90/100`, mana `60/60`; the target's upper health bar is cropped and no hit marker is visible in the capture. Browser assertions and detached diagnostics establish combat values. This hosted software-rendered evidence does not measure native GPU performance or balance.
