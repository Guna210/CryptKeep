# CK-03-05 — Round 1 independent review

- **Reviewer:** `/root/ck_03_05_reviewer_r1` (GPT-6 Luna)
- **Builder:** `/root/ck_03_05_builder`
- **Baseline:** `032a4fd49e460d4f920af101d5efa0a3e8a50546` (current `HEAD`)
- **Submission:** `/tmp/cryptkeep-CK-03-05-submission.json`
- **Scope:** `src/weapons/sword.ts`, `src/weapons/sword.test.ts`, `progress/CK-03-05.md`; consumed contracts in `src/combat/weapon-dispatch.ts` and `src/weapons/types.ts`; accepted prerequisite `progress/CK-03-04.md`.
- **Excluded owner changes:** existing edits in `CONTEXT.md` and `decisions/M03-hosted-verification.md` were preserved and not included in the submission review.

## Snapshot manifest

Frozen submission hashes match the checked files:

| File | SHA-256 | Match |
| --- | --- | --- |
| `src/weapons/sword.ts` | `2bd9115c5f86623b624832aa6eab7190a3cd3a67e2fb93a6e1a88ff9fb4f17aa` | yes |
| `src/weapons/sword.test.ts` | `f5976a19ecb3e59ccc3f78785a5793cb8957c15e71d7a5c6be20fae9b0c67252` | yes |
| `progress/CK-03-05.md` | `b2dcc41fe308c4d77343cd8cb9bb269ac3f14d1f472149a5e478bae4fd2e931e` | yes |

## Review and checks

Reviewed SPEC 5.2 and card CK-03-05, `REVIEW.md`, `CONTEXT.md`, `docs/environment-start.md`, M03 combat defaults, the CK-03-04 handoff, sword implementation/tests, and actual adapter/dispatcher contracts. Dispatcher cancellation occurs before fresh ordered edges; stamina commitment uses the shared transaction ledger; active-hit requests are filtered against committed IDs. The implementation retains light values and release-time commitment, exposes concrete committed state and charge selectors, carries elapsed time through attack phases, caps charge output, does not auto-fire, and does not refund committed stamina on cancellation. Scope is confined to the assigned pure adapter and handoff.

Commands run independently:

- `sha256sum src/weapons/sword.ts src/weapons/sword.test.ts progress/CK-03-05.md` — all frozen manifest hashes match.
- `npm run typecheck` — passed.
- `npm test` — passed: 27 test files, 157 tests; integrated tooling test passed.
- `npm run build` — passed; Vite emitted the existing 500 kB chunk advisory (614.91 kB JS).
- `node --test --test-isolation=none tools/verify.test.mjs` — passed, all seven named cases.
- Numeric boundary reproduction (plain JS): with `heldSeconds = 0.25 - 1e-16`, the value is `0.2499999999999999`, while `reachesChargeThreshold`'s tolerance is `Number.EPSILON * 0.25 * 8 = 4.440892098500626e-16`; the current predicate classifies it heavy. `0.25 - 2e-16` is also classified heavy. At `0.25 - 1e-15`, it classifies light.

No browser run was needed for this pure state adapter; no render or UI behavior is part of this card. No network/browser check was attempted. The report is limited to the trusted typed adapter boundary and does not claim hostile-plugin fuzzing.

## Finding

### CK-03-05-R1-F01 — P2: Threshold tolerance changes genuine below-threshold holds into heavy attacks

- **Location:** `src/weapons/sword.ts:129-130`; current tests at `src/weapons/sword.test.ts` only separate near-boundary inputs by `1e-8`.
- **Requirement:** SPEC 5.2 and M03 defaults specify light for a release strictly below 0.25 seconds and heavy at or above it. This review packet also explicitly requires floating tolerance not to collapse genuine boundary cases.
- **Reproduction:** release after `0.25 - 1e-16` seconds (`0.2499999999999999`). The tolerance is approximately `4.44e-16`, so the value satisfies `0.25 - seconds <= tolerance` and `reachesChargeThreshold` returns true. It commits heavy at minimum power (30 damage, 18 stamina) instead of the expected light (18 damage, 10 stamina). This is a representable input strictly below the threshold; the same defect occurs at `0.25 - 2e-16`.
- **Expected:** strict below-threshold durations remain light, while the accumulated 15 × 1/60-second case and exact 0.25-second input select heavy.
- **Correction guidance:** retain recognition of the intended exact 60 Hz threshold after accumulated floating-point time while tightening or otherwise restructuring the comparison so valid representable below-threshold cases such as the reproduction remain light. Add a regression for this near-boundary input alongside the 15-tick release case; do not merely widen the test epsilon.

## Verdict

**CHANGES REQUIRED.** The supplied checks pass and the implementation is otherwise consistent with the reviewed contracts, but the threshold classification defect violates the explicit below/at/above boundary requirement. No repair is made by the reviewer.
