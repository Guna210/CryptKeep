# CK-01-04 independent review — round 2

- **Reviewer/model:** `/root/ck_01_04_reviewer_r2` / GPT-6 Luna
- **Builder:** `/root/ck_01_04_builder`
- **Baseline:** accepted CK-01-03 snapshot `cc6c32f47552b3b2c86d8a54b710c645f4a102db`
- **Verdict:** **CHANGES REQUIRED**
- **Scope:** Current submitted `src/dungeon/roles.ts`, `src/dungeon/roles.test.ts`, `progress/CK-01-04.md`, and `progress/CK-01-04.round-1-fix.md`. Concurrent `CONTEXT.md` work excluded.

## Snapshot identity

The four submitted files matched `/tmp/cryptkeep-CK-01-04-r1-verification-manifest.json` before checks and still matched afterward:

```json
{
  "src/dungeon/roles.ts": "1ec18941809bd51f792cafbfa891b22cad8f8cec54e477b764e85eb31d305735",
  "src/dungeon/roles.test.ts": "ca111e2df26be3aec9e9cb963efa22f1c62f36feecc5f18732630a9203dcdd9b",
  "progress/CK-01-04.md": "bac23fcb1c3f57153f6a8fc33c14dac0a9818ed3c4883a9432cbdd58a56243a4",
  "progress/CK-01-04.round-1-fix.md": "83ec8a2643380ae782eeb96b1e1c0160909c2e305e325b4c27f3d6436a92b5b6"
}
```

## Review and checks

Read `REVIEW.md`, `docs/environment-start.md`, SPEC Sections 0, 3.2–3.4, and 4.1, the CK-01-04 task card, accepted CK-01-01/02/03 handoffs, the round-one review and verification reports, the repair handoff, and the current source/tests. The source validates edge endpoint metadata, path ordering/cardinality, actual role reachability, pad geometry, reservations, stable role RNG and bounds. It does not validate the corridor footprint at every path anchor against grid bounds and walkable occupancy.

- `npm test` — passed: Vitest 9 files / 48 tests; Node tooling 1/1.
- `npm run typecheck` — passed.
- `npm run build` — passed; existing Vite advisory for a minified JS chunk above 500 kB.
- `git diff --check` — passed.
- Browser checks do not apply to this standalone generation module.
- Independent Vite SSR reproduction returned `accepted: true` after setting the edge's centerline tile `{x:14,z:6}` to solid and carving a parallel walkable row at `z=7` from `x=9` through `x=20`. The returned plan retained the solid edge-path tile while actual connectivity remained possible through the alternate row. Vite emitted the restricted-environment WebSocket `listen EPERM` diagnostic; SSR module loading and the reproduction completed.

## Finding

### CK-01-04-R1-F02 — P2: reject corridor centerlines with blocked or out-of-grid 2×2 footprints

This carries forward the round-one verification finding; the orchestrator's round-two packet confirms it remains outstanding.

**Location:** `src/dungeon/roles.ts:42-48` (`copyInput` path validation)

**Requirement:** The accepted corridor contract says each ordered path anchor describes a 2×2 footprint wholly inside the grid and walkable. Malformed `ConnectedFloorPlan` input must reject. Actual-grid BFS for role placement does not validate the semantic validity of the supplied edge records.

**Reproduction:** Starting with the submitted role fixture, keep its valid endpoints and cardinal path. Set `tiles[6 * width + 14]` to `Tile.Solid`; carve a parallel walkable corridor row at `z=7` for `x=9..20`. `assignRoles` succeeds and returns the declared edge with its path crossing the solid tile at `{x:14,z:6}`. The alternate row keeps the floor reachable, isolating edge-record validation from role reachability.

**Expected:** Reject any edge path anchor whose 2×2 footprint is not wholly in-grid and walkable. Preserve the current actual-grid reachability behavior for valid input.

**Actual:** `copyInput` checks each path point is an in-grid integer and that adjacent points are cardinal, but never checks the point's +X/+Z 2×2 footprint. It accepts and returns the blocked declared corridor even when a separate route preserves reachability.

**Correction guidance:** For every path anchor, validate all four footprint cells against bounds and `Tile.Walkable`; add a regression that keeps a real alternate route open while asserting the malformed edge rejects. Also cover a path anchor on the last grid row/column whose 2×2 footprint would extend out of bounds.

## Limits

No source or tests were changed by the reviewer. The role geometry checks and required npm checks passed; acceptance remains blocked only by the confirmed corridor-footprint validation gap.
