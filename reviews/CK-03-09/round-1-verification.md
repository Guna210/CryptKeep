# CK-03-09 round-one repaired-snapshot verification

**Result: PASS.** Both round-one findings are resolved on the exact frozen repair. The pause regression now waits until the floor tick advances after Resume before checking the fresh input sample. The full same-reviewer hosted suite passed on the repaired source, including that pause case and the native sword case. No unresolved or new findings remain.

## Finding resolution

- **CK-03-09-R1-F01 — RESOLVED.** The durable handoff and submission receipt now record the original builder ZIP digest as the verified 64-character value `46c027ca153e8b74578d91f0cbf3ae092265b523bcb1128f3a5a303096f9efc5`. It matches the downloaded `/workspace/attachments/306d5acb-ea4d-4137-8270-0dddfd5d5316/CK-03-09-builder.zip`.
- **CK-03-09-R1-F02 — RESOLVED.** `tests/e2e/pause.spec.ts` waits for `floor.tick > paused.floor.tick` and a non-null `lastSample` before asserting no primary/secondary held, pressed, or released input. The remaining pause freeze, fresh gesture, ignored repeated keydown, fresh movement, and browser error assertions remain. The hosted repaired run passed this test. No runtime source changes were needed.

## Exact hosted verification

The candidate is commit `e3dc1e08bed8d2ca55bb814161ce99cc1e2e6517`, tree `518bf35166048783e156968e97d0a9b1b2f40b3a`, on `codex/cryptkeep-m03-review`, parent `4a15688c8d70a72f14eee85e36fae7f7a51c6c09`. I independently fetched the recursive GitHub tree and confirmed the submitted tree identity. GitHub Actions run [37608951586](https://github.com/Guna210/CryptKeep/actions/runs/37608951586), attempt 1, job `112751230711`, completed successfully. I independently fetched the job logs, job steps, and run artifact metadata. Typecheck, 171 app tests, tooling, build, and all 24 Chromium browser checks passed. The pause fresh-sample regression and native trusted sword test both passed.

The scoped artifact is ID `11476571301`, named `cryptkeep-m03-37608951586-1`, archive SHA-256 `1e243c05ca7d300936389fc3862235cc4a95d37e80121d0255b5d7a5008c6a23`. I downloaded the ZIP and independently confirmed its digest. The screenshot within the run artifact is SHA-256 `8cc5242268de8d4c3051e93c34d1cf627edd9cc854135b71c22ea637dd1be62f`; I opened it and confirmed the pixel sword, dummy, tiled grid, centered reticle, and actual HUD values. It is a timing variant of the builder's durable image: the target health bar is cropped and no hit marker is visible. The assertions and read-only combat diagnostics supply the damage/resource evidence. The durable selected image remains byte-identical at `docs/evidence/CK-03-09/native-sword-hit.png`, SHA-256 `3af1ad122a777429f3b693902fb872940ed9c689251e0ec29e8eb4312c428670`.

The previous independent attempt `37607685172` remains recorded as a failure of the stale-sample assertion; it is not overwritten or counted as a pass. The repaired run is a fresh complete verification, not a retry of that failed job.

## Independent local verification

On the frozen repaired snapshot I independently ran:

- `npm run typecheck` — passed.
- `npm test` — passed: 32 Vitest files / 171 tests; tooling entry passed.
- `node --test --test-isolation=none tools/verify.test.mjs` — passed: 7 / 7.
- `npx tsc --ignoreConfig --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --types vite/client,@playwright/test,node --skipLibCheck tests/e2e/pause.spec.ts tests/e2e/sword.spec.ts tests/e2e/production.spec.ts` — passed.
- `git diff --check` — passed.

The repaired snapshot changes no application source, native sword test, production test, or selected screenshot. The original source build passed in both the builder run `37607147444` and independent round-one run `37607685172`; it was not rerun for this test-only repair. Local Playwright remains unavailable because the sandbox denies loopback binding with EPERM. Hosted software rendering does not measure native GPU performance or game balance.

## Repaired reviewed manifest

Manifest file `/tmp/cryptkeep-CK-03-09-repaired-r1.json` SHA-256 `d986727068391a1619e34ef1bf73a5e7596e8791265833bc4cd042bbd96f57fc`; its nested submission metadata `/tmp/cryptkeep-CK-03-09-submission.json` SHA-256 `ecc07ad3830c18412c2207a9f6bd2bbd3eb4c1f199f4494fb13d0d2cb490ec0f`. I recomputed all 22 listed file hashes, with no mismatches:

```text
README.md 761f74813b9db0b914033a1d7b5264586059955285618bb2d0a511d8616a1ba7
docs/environment-start.md 851d64c2e0f95d3040974cf4e59a444e703879fec3c8f7769a927655e0e50a76
progress/CK-03-09.md 1e619b734895b7675e372d26bf7bbc7530720d9a7f1969a9ad74d66b85e2d7f5
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
tests/e2e/pause.spec.ts 468f9b8b294c56c3008b3c883233fb3f4c157c2acead955b708291f2baacfb04
docs/evidence/CK-03-09/native-sword-hit.png 3af1ad122a777429f3b693902fb872940ed9c689251e0ec29e8eb4312c428670
progress/CK-03-09.round-1-fix.md ea58f0260a672d59db153d820dc2341022daabbe714a6080744eeb321a5fb381
```
