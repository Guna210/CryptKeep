# CK-03-04 independent review — round 1

- **Reviewer:** `/root/ck_03_04_reviewer_r1` (GPT-6 Luna)
- **Builder:** `/root/ck_03_04_builder` (GPT-6 Luna)
- **Snapshot:** baseline `350c1d8cc97b4cfe86cd3be23b5cd72e7612f4a6`; submitted uncommitted files matched `/tmp/cryptkeep-CK-03-04-submission.json` hashes.
- **Scope:** `src/weapons/sword.ts`, `src/weapons/sword.test.ts`, `progress/CK-03-04.md`, plus the accepted CK-03-03 dispatcher/types and shared resource behavior used by the adapter.
- **Requirements read:** `REVIEW.md`; `CONTEXT.md`; `SPEC.md` Sections 0, 3, 5.2 and CK-03-04 card; `docs/environment-start.md`; `progress/CK-03-03.md`; `decisions/M03-combat-defaults.md`; submitted handoff and manifest.

## Inspection and checks

- Confirmed the submitted sword source, test and progress hashes equal the manifest: `0a65b3d9a242772e84f8c07d72d5ee33d86aa75357d2d098d2aaa5cea2557012`, `e8ac10dec975b08d7986a6320b4cb7e2a9466b0e62b18416ff7068b8b0b684c7`, and `06122f4572f5169ccd8a82b27e8cbedf34472a878caf6ceee8b261caa8d6ce13`.
- `npm run typecheck` — passed.
- `npm test` — passed: 27 test files, 151 tests, plus the package's tooling test invocation.
- `npm run build` — passed; Vite emitted the existing advisory about the 614.91 kB app chunk.
- `node --test --test-isolation=none tools/verify.test.mjs` — passed: all seven named tooling cases.
- Browser verification was not run. This change is a pure weapon adapter with no visible integration, and the task acceptance evidence is unit behavior.

## Behavioral review

The adapter is generic as `CurrentWeapon<SwordState>`, publishes frozen state and result objects, and uses immutable phase/attack data. Primary press enters anticipation without spending or emitting an attack. Ordered release obtains an ID and invokes the shared stamina transaction once; rejection returns idle without an attack. Accepted release starts the 0.06 s windup, emits one 18-damage request when the active phase begins, runs the 0.12 s active interval, and blocks new initiation through the 0.30 s recovery. The shared dispatcher filters requests against its committed-ID ledger, updates shared stamina and regeneration timers, and keeps the runtime sequence when sword state resets.

Elapsed time is carried across phase boundaries, including multi-phase ticks and exact boundaries; tests compare equivalent tick schedules. Long holds remain anticipation and only a later release commits the light attack. Cancellation returns to idle without synthesizing release and preserves any already committed spend. Insufficient stamina is covered as a clean idle result without damage or cost. Non-finite/negative direct-adapter time throws `RangeError`; zero is allowed. No heavy, guard/parry, render, or main-loop behavior was added.

The documented active-onset-only request is an allowed CK-03-04 choice: the adapter makes one hit request at active onset and does not re-query targets during the rest of the active window. The same-ID repeated active query remains optional for a later integration. Long holds are deliberately light until CK-03-05 adds charging.

## Findings

No confirmed in-scope defects.

## Verdict

**PASS.** The inspected submission meets the CK-03-04 acceptance cases and its declared constraints. No repair is requested. The onset-only target-query behavior is an explicit, permitted limitation, and browser integration remains outside this pure-adapter task.
