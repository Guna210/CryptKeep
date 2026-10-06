# CK-01-04 same-reviewer verification — round 1

- **Reviewer/model:** `/root/ck_01_04_reviewer_r1` / GPT-6 Luna
- **Builder:** `/root/ck_01_04_builder`
- **Baseline:** accepted CK-01-03 snapshot `cc6c32f47552b3b2c86d8a54b710c645f4a102db`
- **Verdict:** **CHANGES REQUIRED**
- **Scope:** Repaired roles source/tests and both CK-01-04 handoffs; concurrent `CONTEXT.md` work excluded.

## Repaired snapshot identity

All four files matched `/tmp/cryptkeep-CK-01-04-r1-verification-manifest.json` at review:

```json
{
  "task": "CK-01-04",
  "round": 1,
  "baseline": "cc6c32f47552b3b2c86d8a54b710c645f4a102db",
  "files": [
    { "path": "src/dungeon/roles.ts", "sha256": "1ec18941809bd51f792cafbfa891b22cad8f8cec54e477b764e85eb31d305735" },
    { "path": "src/dungeon/roles.test.ts", "sha256": "ca111e2df26be3aec9e9cb963efa22f1c62f36feecc5f18732630a9203dcdd9b" },
    { "path": "progress/CK-01-04.md", "sha256": "bac23fcb1c3f57153f6a8fc33c14dac0a9818ed3c4883a9432cbdd58a56243a4" },
    { "path": "progress/CK-01-04.round-1-fix.md", "sha256": "83ec8a2643380ae782eeb96b1e1c0160909c2e305e325b4c27f3d6436a92b5b6" }
  ]
}
```

## Checks and review

- `npm test` — passed: Vitest 9 files / 48 tests; Node tooling 1/1.
- `npm run typecheck` — passed.
- `npm run build` — passed; Vite emitted the existing advisory for a minified chunk over 500 kB.
- Browser checks are not applicable to this standalone data/geometry module.
- The repair's tests cover missing/malformed endpoints, disagreement with path endpoints, unknown or repeated room IDs, an invalid endpoint anchor, and detached/frozen preserved metadata. Source inspection confirms `copyInput` validates both endpoint cells against path ends, verifies distinct existing room references, validates endpoint anchors, then copies/freezes the supplied metadata.
- The prior F01 reproduction is covered by these regressions: setting a nonexistent `toRoomId` or a mismatched `fromCell` now throws. The fix also rejects same-room references and anchors not wholly inside the named room.

## Finding disposition

- **CK-01-04-R1-F01 — RESOLVED.** The repair validates the endpoint metadata and preserves valid copied/frozen values. Targeted regression tests and source inspection confirm the correction.

## New finding

### CK-01-04-R1-F02 — P2: reject corridor paths that cross blocked occupancy

**Location:** `src/dungeon/roles.ts:48-57` (`copyInput` path validation)

**Requirement:** A `ConnectedFloorPlan` edge represents a carved cardinal corridor centerline; the accepted corridor contract carves a walkable 2×2 footprint along every path point. The CK-01-04 contract also requires malformed input rejection. `copyInput` checks path bounds and cardinal adjacency, but does not check that the path's corridor footprint is walkable in the supplied occupancy.

**Reproduction:** Use the submitted three-room fixture and valid edge from `{x:7,z:6}` to `{x:20,z:6}`. Set `tiles[6 * width + 14]` to `Tile.Solid`, and carve a parallel walkable corridor row at `z=7` from `x=9` through `x=19` so the actual floor remains connected. `assignRoles` succeeds even though the preserved edge path crosses the solid cell at `{x:14,z:6}`. I reproduced this through Vite SSR; its restricted WebSocket bind emitted `EPERM`, but module loading and the call completed.

**Expected:** Reject an edge whose centerline/2×2 corridor footprint is blocked, as a malformed connected-plan record.

**Actual:** The invalid declared corridor edge is copied and accepted. Role placement itself uses actual grid BFS, so this reproduction does not grant a false reachable route; the defect is accepting and returning an invalid `ConnectedFloorPlan` record.

**Correction guidance:** Validate every edge path point's 2×2 footprint against walkable occupancy before role selection, and add a disconnected-edge-path regression with an alternate actual route to demonstrate that acceptance is not relying on the malformed edge.

## Limitations

All required build and test checks passed, but F02 remains a confirmed malformed-input contract gap. No source, tests, handoff, or context file was changed by the reviewer.
