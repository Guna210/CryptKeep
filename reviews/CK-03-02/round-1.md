# CK-03-02 — Round 1 independent review

**Reviewer/model:** `/root/ck_03_02_reviewer_r1` / GPT-6 Luna
**Builder/model:** `/root/ck_03_02_builder` / GPT-6 Luna
**Baseline:** `72d8d7eecc19b973a2ca318059c979c5fc4b9c02`
**Reviewed submission:** frozen manifest `/tmp/cryptkeep-CK-03-02-submission.json` (SHA-256 `1240e6e675f5e4a09d06f3e8d852218042bc4bee8bf11e2b98d122f30da7fcea`). The manifest's file hashes matched the submitted files.

## Scope and evidence

Reviewed `src/combat/queries.ts`, `src/combat/queries.test.ts`, and `progress/CK-03-02.md`, plus the relevant contracts in `REVIEW.md`, `SPEC.md` sections 1.8, 5.2 and the CK-03-02 card, `decisions/M03-combat-defaults.md`, and accepted prerequisite handoffs `progress/CK-03-01.md` and `progress/CK-01-01.md`. The task-owned files match the recorded snapshot. No changes were made to implementation or tests. The concurrent `CONTEXT.md` and decisions-file changes are outside this review's owned scope.

The query is renderer-independent and applies the correct Three.js horizontal yaw convention, 2 m tile geometry, requested default 2 m reach/90° arc, tile LOS, out-of-map blocking, invalid collider filtering, duplicate-ID suppression, and sorted unique results. Existing fixtures meaningfully exercise requested boundaries, wrapping, corner/thin-wall blocking and invalid inputs. However, the implementation's finite candidate set does not satisfy its documented nearest clear eligible contact behavior; see F01.

## Commands and results

- `npm run typecheck` — PASS.
- `npm test` — PASS: 25 Vitest files / 134 tests; default Node tooling runner reports one file-level pass.
- `npm run build` — PASS; Vite reports the existing 614.91 kB minified chunk size advisory.
- `node --test --test-isolation=none tools/verify.test.mjs` — PASS: 7 named tests / 7 passes.
- `git status --short`, `git rev-parse HEAD`, and `sha256sum` over all three submitted files — source snapshot hashes match manifest; HEAD remains baseline. Working tree also contains unrelated parent coordination changes, excluded from this task review.

No browser check was run because this is a pure geometry query with no app integration point; browser execution is not required by CK-03-02.

## Findings

### CK-03-02-R1-F01 — P2: Misses a clear eligible part of a collider when the nearest candidate is wall-blocked

**Location:** `src/combat/queries.ts:75-90, 94-102`
**Requirement:** The function documentation and handoff claim it returns the nearest eligible point with clear tile LOS. A target circle may extend into the attack sector/range, and the reported hit point must be within that geometry and have a clear wall segment. The query must not miss a collider that has an eligible clear contact merely because its closest radial point is blocked.

**Reproduction:** Use a 6×6 all-walkable grid except solid cell `(2,3)` (world rectangle `x=[4,6]`, `z=[6,8]`); origin `(5.99,9)`, yaw `0`, reach `5`, full arc `π/2`; one target circle centered at `(5.99,5)` with radius `1.5`. Its centerline closest point `(5.99,6.5)` is blocked by that tile. But point `(7.2,5.5)` lies on the circle (center offset about `1.309 m`), is within the 90° arc and reach (about `3.70 m` from origin), and its segment passes to the right of the tile (at `z=8`, `x≈6.34`). Thus a clear eligible target contact exists.

**Actual:** Candidate generation adds only the centerline closest point because the collider's full angular extent is inside the arc; neither arc-edge ray intersects the collider. LOS rejects the centerline candidate, so the query returns no hit. It does not search the rest of the eligible circle for a visible point.

**Expected:** Return a deterministic eligible clear point on that collider, or otherwise explicitly narrow the contract and task handoff. For the current claimed behavior, candidate generation/visibility handling needs to account for blocker boundaries or another complete method for finding the nearest visible eligible point. Add this blocker-plus-partially-exposed-circle case as a regression.

## Verdict

**CHANGES REQUIRED.** Required checks pass, but F01 is a confirmed functional miss against the implementation's documented query contract and collider-intersection requirement. No unrelated performance or future integration expectations were applied.

## Frozen submission manifest

```json
{
  "task": "CK-03-02",
  "baseline": "72d8d7eecc19b973a2ca318059c979c5fc4b9c02",
  "files": {
    "src/combat/queries.ts": "23f09872ded4caf4eddbf659fd188eb520cb7df373ad3ee66e69968ab08c2d2b",
    "src/combat/queries.test.ts": "66a7c02c9054b96184ed522a64426e6ae05f4e54be75797a0003e069d11e1b73",
    "progress/CK-03-02.md": "d913194649cd133b9391b950ceff6198ebf8786abb1de9814f1a2ada23efd559"
  }
}
```
