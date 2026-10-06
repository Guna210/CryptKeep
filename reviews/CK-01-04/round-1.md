# CK-01-04 independent review — round 1

- **Reviewer/model:** `/root/ck_01_04_reviewer_r1` / GPT-6 Luna
- **Builder:** `/root/ck_01_04_builder`
- **Baseline:** accepted CK-01-03 snapshot `cc6c32f47552b3b2c86d8a54b710c645f4a102db`
- **Verdict:** **CHANGES REQUIRED**
- **Scope:** Submitted `src/dungeon/roles.ts`, `src/dungeon/roles.test.ts`, and `progress/CK-01-04.md`; concurrent `CONTEXT.md` work excluded.

## Snapshot identity

All three files matched `/tmp/cryptkeep-CK-01-04-r1-manifest.json` before checks. Hashes:

```json
{
  "task": "CK-01-04",
  "round": 1,
  "baseline": "cc6c32f47552b3b2c86d8a54b710c645f4a102db",
  "files": [
    { "path": "src/dungeon/roles.ts", "sha256": "495159b78d40b5ae1dc2b385a424159ccaa1f5edcc199e0e7b92261ebba9eff0" },
    { "path": "src/dungeon/roles.test.ts", "sha256": "77d8fc12cdef23f3fa4c5ad242bed02e140aa43ef2e861d360addeab67c9b78d" },
    { "path": "progress/CK-01-04.md", "sha256": "66748520b2c421b6e2334b0a5d3c3c16e3c578eed1428062500ebb6262bb5c82" }
  ]
}
```

## Review and checks

Read `REVIEW.md`, SPEC Sections 0, 3.2–3.4, and 4.1, the CK-01-04 task card, `docs/environment-start.md`, accepted CK-01-01/02/03 handoffs, and the submitted handoff. No applicable `AGENTS.md` was present.

- `npm test` — passed: Vitest 9 files / 47 tests; Node tooling 1/1.
- `npm run typecheck` — passed.
- `npm run build` — passed; Vite emitted the existing advisory for a minified chunk over 500 kB.
- Browser checks do not apply to this standalone data/geometry module.
- A temporary Vite SSR reproduction altered a generated corridor edge's `fromCell` to `{x:0,z:0}` and its `toRoomId` to `"missing"`, leaving its path unchanged. `assignRoles` accepted the input; output retained `toRoomId: "missing"` but silently replaced `fromCell` with the first path point `{x:13,z:8}`. Vite logged a restricted-environment WebSocket `EPERM`; SSR loading and reproduction completed.

The role algorithm otherwise uses actual cardinal occupancy BFS, rejects fewer than three rooms, preserves occupancy and detached frozen records, selects a distinct entry and a farthest reachable arena room, and reserves walkable paths/pads/arena cells. The accepted three-room minimum supports the stated side-room foundation. The tests provide useful geometry and immutability checks, though they do not cover inconsistent edge metadata.

## Finding

### CK-01-04-R1-F01 — P2: reject inconsistent corridor edge metadata

**Location:** `src/dungeon/roles.ts:24-41` (`copyInput`)

**Requirement:** The submission contract requires malformed inputs to reject and input room/edge records to be preserved in detached frozen output. `CorridorEdge` defines `fromCell` and `toCell` as the ordered path endpoints and names endpoint rooms. `copyInput` validates the path coordinates/cardinality but ignores the supplied endpoint cells, reconstructs them from the path, and does not ensure the named rooms exist.

**Reproduction:** Starting from a valid `connectRooms` result, replace one edge with `{...edge, fromCell:{x:0,z:0}, toRoomId:"missing"}` without changing its path. `assignRoles` succeeds and outputs a changed `fromCell` while retaining the nonexistent room ID.

**Expected:** Reject malformed edge records with a clear type/range error before role selection; for valid records, preserve their endpoint metadata as detached frozen values consistent with the path and existing room IDs.

**Actual:** Contradictory endpoint metadata is silently normalized, while the invalid room reference passes through into the output.

**Correction guidance:** Validate that `fromCell`/`toCell` are valid cells equal to the first/last path point and that both room IDs refer to input rooms, then copy/freeze the validated record. Add focused malformed-edge regressions.

## Limitations

No browser integration was added or required. The current checks establish the tested geometry and build behavior; the submitted test suite does not cover this edge-record invariant.
