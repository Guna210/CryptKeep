# CK-03-01 round 1 repaired-snapshot verification

**Reviewer/model:** `/root/ck_03_01_reviewer_r1` / GPT-6 Luna
**Builder:** `/root/ck_03_01_builder` / GPT-6 Luna
**Baseline:** `d7829fab60fabfeca7fb842aa19232fffa2bae5d`
**Reviewed snapshot:** `/tmp/cryptkeep-CK-03-01-repaired-r1.json`; every listed file's actual SHA256 matches the frozen manifest.
**Verdict:** **PASS**

## Snapshot identity

| File | SHA256 |
|---|---|
| `src/combat/damage.ts` | `b228ac430b7042398833ff763925fd29ef6854dad31bec22f295c6b69f737a0d` |
| `src/combat/damage.test.ts` | `722ba9ceb72ed49abcea40c0fff845dfefc00a4cce6eb8d23ba1ace9df01b19a` |
| `src/combat/types.ts` | `0fb91b128e7f0142952b7a0831842a40da5074c04d323282874e2865f81df8a9` |
| `src/core/events.ts` | `4e16973610e5dd1fc00c57cda6e4f0ebdb9f18dea0fcfdd81b2a4450d879466a` |
| `src/core/events.test.ts` | `262296e2daefb5f4d3b47ea967ad88adbd99312c2f461c059fae94d000c1c4c9` |
| `progress/CK-03-01.md` | `6806ab68cc3aa0ac01744e186ade3ddd4f54818c4645bc8c30ea4c069eb758ae` |
| `progress/CK-03-01.round-1-fix.md` | `912f2c49d7f3a3d0f76dc77d30840393956db4df3c50cf8ba2585130472ce77c` |

## Finding verification

- `CK-03-01-R1-F01` — **RESOLVED.** `PhysicalDamageResolver` now records target IDs when lethal damage commits, then rejects all later packets for those IDs as `dead-target` before processing an attack-target pair. The added regression uses two distinct attack IDs against the same one-HP stale snapshot, observes only one death event, and confirms later-tick rejection both with and without an `EventCollector`.
- Adopted-target contract — **PASS.** Successful resolution returns a detached target with health set to zero on a lethal hit. Passing that returned target to a later attack is rejected by the existing `target.health.current <= 0` guard, so ordinary callers that adopt returned state also get once-only death behavior. The added stale-snapshot test exercises the stronger case where callers have not yet adopted the returned value.
- Lifetime and caller preconditions — the dead-ID and attack-target ledgers are resolver-instance state. Discarding the resolver when its combat runtime/floor is replaced discards both ledgers. Combatant IDs must be unique within one resolver lifetime, as stated in the repair handoff; returned target snapshots remain caller-owned and must be adopted for nonlethal HP changes.

## Commands and results

All commands ran independently from `/workspace/CryptKeep`:

- `npm run typecheck` — PASS.
- `npm test` — PASS: Vitest 24 files / 127 tests. The default Node invocation reports one top-level file test and one pass; it does not list nested subtests individually.
- `node --test --test-isolation=none tools/verify.test.mjs` — PASS: seven named tooling cases / seven passes. The supplemental run confirms all seven named cases individually.
- `npm run build` — PASS; Vite reports the existing advisory for a minified chunk over 500 kB.
- Browser checks were not run; the repaired code remains standalone combat and event logic with no app wiring.

The frozen repair manifest includes all changed task implementation, tests and handoffs; no other task implementation file was part of the repaired submission. No unresolved confirmed findings remain.
