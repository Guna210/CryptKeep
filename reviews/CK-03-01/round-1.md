# CK-03-01 independent review — round 1

**Reviewer/model:** `/root/ck_03_01_reviewer_r1` / GPT-6 Luna
**Builder:** `/root/ck_03_01_builder` / GPT-6 Luna
**Baseline:** `d7829fab60fabfeca7fb842aa19232fffa2bae5d`
**Reviewed snapshot:** frozen submitted files listed in `/tmp/cryptkeep-CK-03-01-submission.json`; all six on-disk SHA256 values match that manifest.
**Verdict:** **CHANGES REQUIRED**

## Scope and evidence

Read `REVIEW.md`, SPEC sections 0, 3, 5.1, 5.4 and card CK-03-01, `CONTEXT.md`, `docs/environment-start.md`, and accepted prerequisite handoffs `progress/CK-02-01.md` and `progress/CK-00-07.md`. Inspected all submitted files, including the untracked combat module and handoff, and checked the existing `EventCollector` callers and resource helpers. The working tree includes an orchestrator-owned `CONTEXT.md` modification; it is outside the frozen submission and was not reviewed as builder work.

The submitted code uses immutable replacement targets and returns the new health snapshot, so its callers must adopt `result.target` into simulation state. The only current production `EventCollector` use is `FloorSession`; CK-03-01 intentionally does not wire combat into that composition root. Damage events are flat copied frozen records, and successful resolutions emit actual HP lost followed by a death event on lethal damage.

Submission SHA256 checks (actual values equal manifest values):

| File | SHA256 |
|---|---|
| `src/combat/damage.ts` | `a446896d3b51ed5b90aa420637adf7eb69fb6e74dcef563a7b9803d90be938d5` |
| `src/combat/damage.test.ts` | `fd375d8ba03c3f4772af3c6a53171dd5f4931107584dec045a3785b0b9ea3dc8` |
| `src/combat/types.ts` | `0fb91b128e7f0142952b7a0831842a40da5074c04d323282874e2865f81df8a9` |
| `src/core/events.ts` | `4e16973610e5dd1fc00c57cda6e4f0ebdb9f18dea0fcfdd81b2a4450d879466a` |
| `src/core/events.test.ts` | `262296e2daefb5f4d3b47ea967ad88adbd99312c2f461c059fae94d000c1c4c9` |
| `progress/CK-03-01.md` | `5e3538029b55e357e05813ffc30b9480d14e99a4573908998b1256ffcc074ef3` |

Checks run from `/workspace/CryptKeep`:

- `npm run typecheck` — PASS.
- `npm test` — PASS: Vitest reports 24 files and 126 tests; Node's tooling runner reports 1 top-level test and 1 pass. The builder handoff's “tooling 1 / 1” is the top-level count; it is not evidence of seven reported subtests in this run.
- `npm run build` — PASS, with the existing Vite advisory for a minified chunk over 500 kB.
- Browser checks were not run; this is standalone logic and event typing with no app wiring.

## Findings

### CK-03-01-R1-F01 — Lethal event can be emitted twice for one entity

**Priority:** P1
**Location:** `src/combat/damage.ts`, `PhysicalDamageResolver.resolve` lethal path (around lines 34–46)
**Requirement:** CK-03-01 requires once-only death events and that dead targets cannot receive another reward event. The SPEC tick contract also requires emitting each kill/reward once.

The ledger records only `(attackId, targetId)` pairs. It does not record that an entity has already died. If two distinct attacks are resolved against the same pre-hit target snapshot (or a caller accidentally fails to adopt the first returned snapshot), both calls see positive HP and emit `entity-died`. For example, with one HP remaining, resolve attack `a1` for 1 damage against target snapshot `goblin@1HP`, then resolve attack `a2` for 1 damage against that same snapshot before flushing: the resolver emits two death events. The second call returns a separate zero-HP snapshot, but cannot retract the duplicate event.

Expected: after a lethal result, later packets for that target during this runtime are rejected without damage/death events, including packets with a different attack ID. Track dead target IDs in the resolver ledger (or provide an equally explicit once-only death guard), and add a regression covering distinct attacks against a stale snapshot. Retain the returned-target adoption contract for ordinary nonlethal health updates.

## Acceptance coverage

Confirmed in code/tests: bounded immutable HP reduction; minimum 1 HP for valid positive physical packets followed by clamp to remaining HP; actual HP lost in damage events; nonempty matching source/target/attack IDs; zero, negative and nonfinite amount rejection; self/friendly, identity mismatch and already-dead filtering; one attack hitting distinct targets once each; deduplication of nonlethal attack-target pairs; rejected packets emitting no events; and frozen tick-stamped physical damage/death variants. The resolver is instance-scoped, so its ledger can be retired with the combat runtime/floor. No armor, status, reward module, or composition-root wiring was introduced.

The focused submitted tests do not cover a stale target snapshot across distinct attack IDs after a lethal result; that is the confirmed gap above. No independent `/tmp` reproduction was executed: Vitest excludes tests outside `src/**/*.test.ts` and the standalone Node attempt could not resolve Vitest from `/tmp`. The failure is evident from the inspected branch and ledger logic; the requested regression should be added by the builder in the repair.
