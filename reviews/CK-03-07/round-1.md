# CK-03-07 — Round 1 independent review

**Reviewer/model:** `/root/ck_03_07_reviewer_r1` / GPT-6 Luna
**Builder:** `/root/ck_03_07_builder`
**Verdict:** **PASS**

## Submission and scope

Reviewed the uncommitted candidate frozen at `/tmp/cryptkeep-CK-03-07-submission.json`, based on accepted master `24b3ca4a6726f87121682eb218846742d79ddaf6`. The independently hosted run used child commit `5a16b1110b379dca1ebafff36b7c58a0a4da8070`, whose tree `a75c80869457e51001dc7d8ed58cb07b205612e8` is identical to the frozen candidate tree. Local source, test, and durable evidence hashes matched the full manifest below. The separately authored root metadata `CONTEXT.md` and `decisions/M03-feedback-defaults.md` are outside this review's implementation scope and remain unmodified.

Reviewed the training room fixture and tests, target renderer and tests, isolated browser harness and e2e test, progress handoff, production entry-point imports, relevant damage/event interfaces, and all three durable screenshots.

## Findings

No confirmed in-scope findings.

The room is explicitly DEV-labeled and guarded to development/test mode. It uses the accepted `PhysicalDamageResolver`, adopts the immutable resulting target state, emits tick-stamped damage/death events, blocks repeat attack-target hits, emits death once, and removes dead targets from collision queries. The clear and wall variants use the real grid/query path; the supplied player pose passes the real circle collision check and the target collider clears solids in both variants. The target renderer has changing HP presentation and a visible fallen state, disposes its owned geometries/materials/texture idempotently, and leaves caller-owned scene/world resources intact. A search found no production app import of the fixture or renderer.

## Verification

Local commands run independently:

- `npm run typecheck` — PASS.
- `npm test` — PASS: 30 Vitest files / 164 tests; tooling runner passed.
- `npm run build` — PASS; existing 614.91 kB minified chunk advisory remains.
- `node --test --test-isolation=none tools/verify.test.mjs` — PASS: 7 named tooling tests.
- `npx tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --types vite/client,@playwright/test,node tests/harness/combat-room-fixture.ts tests/e2e/combat-room.spec.ts` — PASS.
- `git diff --check` — PASS.
- Production import search for `combat-room` and `training-target` in `src/main.ts`, `src/app`, `src/render`, and `src/debug` — no imports from production entry or app composition; references are the isolated fixture and its tests.

Independent hosted verification: run `37594273305`, attempt 1, job `112702929876`, succeeded on child `5a16b1110b379dca1ebafff36b7c58a0a4da8070` / tree `a75c80869457e51001dc7d8ed58cb07b205612e8`. The run log reports typecheck, 164 app tests, 7 tooling tests, build, and all 22 browser checks passing, including `tests/e2e/combat-room.spec.ts`; no page or console errors were reported by that test. Artifact `11470306440`, `cryptkeep-m03-37594273305-1`, downloaded and inspected. Its ZIP SHA-256 is `d0cf4963871d3eb193aa5c5885f2366300444b2aed7f3a8557f4e56ba11102f6`, matching the hosted upload log.

Opened the fresh hosted clear, obstructed, and dead PNGs from that artifact. Their hashes match the durable handoff captures: clear `51350ca4ec7247c84a60d0022a5c9db0739034c55cc3f3b723bb0611a401dfa4`, obstructed `457a51ad2490dc7869e6d20de7e8fbd25638e2b7fd4d3050fc062e50e0459408`, dead `caac11f3ec02e102b45e7108397ec5d8b787f95626f0a63e2b8d0d716adf812e`. The clear image crops the target's top, the obstruction hides most of it, and the dead pose is clipped by the lower edge; the handoff accurately states these limitations. The shots still show the expected diagnostic room label, health/alive/dead state, and obstruction variant. This card requires setup evidence; it does not require a full silhouette or native sword integration.

## Frozen implementation and evidence manifest

```text
src/debug/fixtures/combat-room.ts                 8ee6122ddcf26483b788ccaea3d9bba3347216304c9c8201a8485bf0909a2367
src/debug/fixtures/combat-room.test.ts             7e29cfe22a386733ab042f0144ea8e9050c9e72ee16005bb38eca8e2d34c4aff
src/render/training-target.ts                     b4c6776d44152e2f0db72d4835ed0c6bb5d4bcf0766113f5b07fbf92777f3598
src/render/training-target.test.ts                ec43c5f7c2a5f05788c1997cba1e03b7b63866edacd203f36598b6379bcf7645
tests/harness/combat-room-fixture.ts               9abea120cdbeb383530c5dff6cf8654eed3f374195d84667a6db32e6883fd0bd
tests/harness/combat-room.html                     810ee541cbd75c62977e4f7ab119b56419a0b1ffaf8aeaec91db715f02f5928b
tests/e2e/combat-room.spec.ts                      3deb5de31c55cd75557c844d7ae760ff5813fbf8cf8b71d8d7b509e66d0355a1
progress/CK-03-07.md                               d7f03a0245be895d4c4ddcdada7d9c7348941d96ec208173c5538e1e99da341d
docs/evidence/CK-03-07/training-clear.png          51350ca4ec7247c84a60d0022a5c9db0739034c55cc3f3b723bb0611a401dfa4
docs/evidence/CK-03-07/training-obstructed.png     457a51ad2490dc7869e6d20de7e8fbd25638e2b7fd4d3050fc062e50e0459408
docs/evidence/CK-03-07/training-dead.png           caac11f3ec02e102b45e7108397ec5d8b787f95626f0a63e2b8d0d716adf812e
```

## Limitations

This is an isolated diagnostic component and setup harness. Its component-level damage event ticks and fixed fixture pose are not evidence of app simulation-tick integration or live player-pose adaptation. The browser controls apply physical packets directly; they do not prove native sword input or campaign combat. Those are outside CK-03-07 and remain for later integration work.
