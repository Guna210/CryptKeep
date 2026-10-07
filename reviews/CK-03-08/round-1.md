# CK-03-08 round 1 review

**Reviewer/model:** `/root/ck_03_08_reviewer_r1` / GPT-6 Luna
**Builder:** `/root/ck_03_08_builder` / GPT-6 Luna
**Reviewed candidate:** `bd8ba45cb5d397da0d9fed0b89580f9137e208f9`, tree `4b7b33100b0605a6f7c7876018a4cce4c0bdafb3`; independent same-tree child `a6c5979fa96e3a00a244483cd0b56b43aaf7c79b`
**Baseline:** `f0ea368525664b8a3336830c4b7ba4e919626f38`

## Scope and inspection

Reviewed the owned HUD/feedback implementation, unit and browser tests, fixture, CSS, progress handoff, prerequisite interfaces, and M03 decisions. Candidate file SHA-256 values match `/tmp/cryptkeep-CK-03-08-submission.json` for all eight source/test/handoff paths and the submitted screenshot. No implementation changes were made.

The HUD renders caller-supplied health/stamina/mana snapshots with finite bounded text and bars, marks health at or below 25% for nonzero maximum (including zero current), and reads charge via `swordChargeFraction`, showing it only during held anticipation. `CombatFeedback` consumes immutable `damage-applied` batches and filters player-source/different-target hits and player-target hurt events. Its timers are reset to fixed maxima, advance only from explicit nonnegative seconds, freeze when paused, and cap hurt opacity at 0.22. Flash disabling renders hurt opacity as zero without clearing timers or hit markers. One collector subscription is created at component construction and removed on idempotent disposal; updates add no subscriptions or input listeners.

The fixture uses `PhysicalDamageResolver`, actual event batches, resource snapshots and accepted sword state. Browser assertions exercise resource boundaries (25 HP, 0 HP, zero maximum), charge, real incoming/outgoing/irrelevant damage events, flash suppression, paused and elapsed caller time, centered reticle, repeated updates, and teardown. The submitted screenshot was opened: 960×600, centered reticle at the visual stage center, readable HP 80/100, STA 75/100, MP 42/60, and visible labeled fixture controls. This is component-fixture evidence only, consistent with the CK-03-09 boundary.

## Independent checks

- `npm run typecheck` — PASS.
- `npm test` — PASS, 31 files / 165 tests; tooling entry point passed.
- `node --test --test-isolation=none tools/verify.test.mjs` — PASS, 7 named tooling tests.
- `npm run build` — PASS; existing 614.91 kB chunk advisory.
- `npx tsc --ignoreConfig --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --types vite/client,node --skipLibCheck tests/harness/hud-fixture.ts tests/e2e/hud.spec.ts` — PASS.
- `git diff --check` — PASS.
- Submitted screenshot opened and inspected as described above.
- Independent same-tree hosted run `37597292282`, job `112712924323` — PASS. I independently fetched job steps/logs and artifact metadata: typecheck, 165 app tests, build, and all 23 browser checks passed; the HUD case passed, page/console checks stayed clean, and the job uploaded artifact `11471276415`, `cryptkeep-m03-37597292282-1`, SHA-256 `3083c1ace872e151365e76969f633c729af5e2c14abc97dc90f97315a79ba1b9`. The artifact run metadata points to same-tree child `a6c5979fa96e3a00a244483cd0b56b43aaf7c79b` on `codex/cryptkeep-m03-review`; its tree equals the reviewed candidate tree.
- Independently opened the refreshed run screenshot at `/tmp/cryptkeep-CK-03-08-independent-r1-evidence/hud-combat.png`: 960×600, centered reticle, readable HP 80/100, STA 75/100 and MP 42/60. Its SHA-256 is `0fba6cc1d220daba09317633bdb6c014482af9f8ef3700f7a7fd045b256e6b41`; it differs bytewise from the originally submitted durable image (`c8ce447f7b8f9a5770557d79329d6f676c692e052cb8d5d51e81919cf1259998`). Both are 960×600 and have the same visible layout; a pixel comparison found differences only inside bounding box `(0,1)-(864,44)` (5,864 pixels), confined to the native fixture controls/label; the HUD bars, reticle and background are pixel-identical. No pixel-golden comparison is required, and the run is evidence of the exact same source tree.

## Findings

No confirmed implementation or test defects found in the inspected frozen candidate.

## Verdict

**PASS** — no confirmed in-scope findings. Local logic, type checks/build, and the independently triggered hosted browser run all passed for the exact reviewed source tree. The evidence is a labeled component fixture and does not claim trusted native sword input, live combat-session integration, or measured native GPU performance.
