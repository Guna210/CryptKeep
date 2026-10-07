# CK-03-03 — Round 1 independent review

**Reviewer/model:** `/root/ck_03_03_reviewer_r1` / GPT-6 Luna
**Builder:** `/root/ck_03_03_builder`
**Baseline:** `440346d404d40396bd7bc21a601e09ccfbfa66ee`
**Snapshot:** uncommitted submission; the four owned paths match the frozen manifest below.
**Scope:** sword-only typed weapon update/cancel contract, dispatcher, tests, and handoff. The concurrent `CONTEXT.md` edit is outside the submitted manifest and was left untouched.

## Submission manifest

| File | SHA-256 | Match |
| --- | --- | --- |
| `src/weapons/types.ts` | `595fcd89161431b2f0a348e341c942428c614407dfe2e09bed1e9b47a57fe06d` | yes |
| `src/combat/weapon-dispatch.ts` | `e9a5b9f5e502bb961eabaff67736f6898b3d7ddaef670f6c2079caefb4e48d68` | yes |
| `src/combat/weapon-dispatch.test.ts` | `90ee96e05d19290f7088a6889cdaab180764b969c0526474a746ed5944443201` | yes |
| `progress/CK-03-03.md` | `900833fac457aa429ade5fe49fc0f4820984609d7b666cabd05d1eaa5066324b` | yes |

The submitted baseline matches `git rev-parse HEAD`. The review inspected the task card in SPEC 5.2/CK-03-03, REVIEW.md, CONTEXT.md and its CK-00-06/CK-03-01 handoffs, and `decisions/M03-combat-defaults.md`. No future-class placeholders or out-of-scope app/render/equipment logic were added.

## Independent checks

- `npm run typecheck` — PASS.
- `npm test` — PASS: Vitest 26 files / 142 tests; built-in tooling test 1 file / 1 pass.
- `npm run build` — PASS; Vite reports the existing large-chunk advisory (614.91 kB minified JS).
- `node --test --test-isolation=none tools/verify.test.mjs` — PASS: all 7 named tooling cases.
- Browser check — not applicable to this pure contract/transaction adapter; no real input/render path is in scope.

The submitted tests meaningfully cover shared stamina and regen delay, insufficient-resource rejection, duplicate commitments, repeat active-hit dispatch without repeat charging, ordered press/release edges, cancellation followed by fresh edges, normal release preservation, and generic state extension preservation. Inspection confirms cancellation is processed before fresh edges, cancellation markers are removed from the update command, and no release is synthesized. Runtime-issued IDs and commitment ledger are validated; successful costs update the shared stamina/timer values and cancelled committed costs are not refunded.

## Findings

No confirmed in-scope findings.

**CK-03-03-R1-F01 — DISMISSED by orchestrator.** The initial review raised a concern that malformed runtime `AttackRequest` payloads, such as `damage: Infinity`, were not independently validated at the dispatcher boundary. The orchestrator dismissed this concern on requirements-based grounds: CK-03-03 defines an internal statically typed adapter, and attack amount validation occurs downstream in `PhysicalDamageResolver` when requests become damage packets. Hostile forged JavaScript objects and save-schema validation are outside this card's scope. The review therefore does not count F01 as a confirmed finding or require a repair.

The dispatcher is an internal boundary between the trusted, statically typed `CurrentWeapon` implementation and combat. Its `AttackRequest` type restricts class, kind, and phase to the sword contract; the dispatcher additionally gates emitted requests on matching attack/cost IDs and an accepted runtime commitment. Request damage validation remains the responsibility of the downstream `PhysicalDamageResolver` when the request is converted into a damage packet. This review did not treat forged JavaScript objects or unsafe casts as a CK-03-03 requirement.

## Verdict

**PASS.** The transaction, shared-resource, edge-order, cancellation, and typed active-hit commitment behavior match the scoped requirements. All listed checks pass. The contract remains an internal typed adapter; browser/input integration and damage resolution are outside this task's scope.
