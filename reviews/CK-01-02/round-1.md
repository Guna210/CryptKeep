# CK-01-02 independent review — round 1

- **Reviewer/model:** `/root/ck_01_02_reviewer_r1` / GPT-6 Luna
- **Implementation agent:** `/root/ck_01_02_builder`
- **Baseline:** `4334843dde9b280486d6101d062af799040e3759`
- **Scope:** `src/dungeon/rooms.ts`, `src/dungeon/rooms.test.ts`, and the submitted handoff. `CONTEXT.md` is an unrelated owner edit and was excluded.
- **Verdict:** **CHANGES REQUIRED**

## Snapshot identity

The submitted files matched the supplied manifest before review. They still match after review; this reviewer changed no implementation or handoff files.

```json
{
  "task": "CK-01-02",
  "round": 1,
  "baseline": "4334843dde9b280486d6101d062af799040e3759",
  "files": [
    {
      "path": "src/dungeon/rooms.ts",
      "sha256": "a8a58b0dbf3e7dea3ebff11d7ae40a3225da3c023ab785b9b632a2bca950fefd"
    },
    {
      "path": "src/dungeon/rooms.test.ts",
      "sha256": "bb9d36a03e888296e3d9431ab49dc56eaa1f84c3d06854a6f735ff0437bc8e48"
    },
    {
      "path": "progress/CK-01-02.md",
      "sha256": "66ea3d06e1eb7dceb0e626db3d8bd41be3dee9e10cd68727b3ad6709fbd69e99"
    }
  ]
}
```

## Checks and evidence

- `npm test` — passed: Vitest 7 files / 37 tests; the separate Node tooling runner reported 1 test, 1 pass, 0 failures.
- `npm run typecheck` — passed.
- `npm run build` — passed; Vite emitted the existing advisory for a minified chunk larger than 500 kB.
- Reviewed the applicable `REVIEW.md`, SPEC Sections 0, 3.2–3.4, 4.1 and Appendix A.1, the CK-01-02 card, `docs/environment-start.md`, and accepted CK-01-01 / CK-00-05 handoffs.
- The submitted tests exercise seeded repeatability across floors 1, 10, 11, 50, 99 and 100, default borders/clearance, interior-only carving, stable IDs, bounded budgets, impossible geometry, immutability, and invalid options. The implementation's rectangle clearance predicate enforces the requested solid gap on at least one axis. Browser checks do not apply to this standalone logic task.

## Findings

### CK-01-02-R1-F01 — P2: validate and copy the input plan before sampling candidates

**Location:** `src/dungeon/rooms.ts:93-110, 115-128`

**Requirement:** The supplied builder contract requires validating/copying the input through accepted `createFloorPlan`, rejecting malformed dimensions or tile arrays before candidate processing. The implementation checks only that the `rooms` and `tiles` values are arrays and that each present tile is solid. Full dimension and tile-count validation occurs in `createFloorPlan` at lines 137-145, after stream derivation and the placement loop.

**Reproduction:** Pass a structurally cast plan with `floorNumber: 1`, `width: 81`, `height: 36`, a correctly sized all-solid tile array, and no rooms; request one room with `maxAttempts: 1`. The dimensions are invalid under `createFloorPlan`'s 80-cell limit, but placement reaches candidate sampling before final plan construction rejects the dimensions.

**Expected:** Reject/copy the malformed plan with the accepted constructor before deriving/using the placement stream or running candidate attempts.

**Actual:** The supplied `FloorPlan` object is used directly to derive the stream and calculate/sample candidate bounds; only the final output construction rejects the invalid width. A tile-count mismatch of an otherwise all-solid tile array follows the same late-validation path.

**Correction guidance:** Reconstruct and validate a detached canonical input plan with `createFloorPlan` before candidate processing, then apply the no-existing-rooms/all-solid preconditions to that validated copy. Keep existing bounded partial-result semantics for valid-but-impossible requests.
