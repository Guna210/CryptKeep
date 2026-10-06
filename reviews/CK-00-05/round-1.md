# CK-00-05 — Round 1 independent review

**Reviewer:** `/root/ck_00_05_reviewer_r1` (`gpt-6-luna`)
**Builder:** `/root/ck_00_05_builder`
**Baseline:** `02eaa26d16d6217c73908624603fccbbe94b0372`
**Verdict:** **CHANGES REQUIRED**

## Snapshot and scope

Reviewed the uncommitted submitted snapshot in `/workspace/CryptKeep`: `src/core/rng.ts`, `src/core/rng.test.ts`, `src/core/ids.ts`, `src/core/ids.test.ts`, and `progress/CK-00-05.md`. `CONTEXT.md` is an orchestrator metadata change and was not treated as task implementation. The required untracked files were read directly. The hashes matched the supplied manifest at review time:

```json
{
  "task": "CK-00-05",
  "round": 1,
  "baseline": "02eaa26d16d6217c73908624603fccbbe94b0372",
  "files": {
    "src/core/rng.ts": "0ebc55c210ea53cff1954648c47efe606e04307aab10b7485e0224027bc5be17",
    "src/core/rng.test.ts": "f40c0109850ee434180ff25d786e872c28e48c5939448b6384ce0354c9eb2c98",
    "src/core/ids.ts": "3c9ae9b514f6b87fc212f327437786c110ac79e25f47b4cde0b599e7ea890f9b",
    "src/core/ids.test.ts": "79f6d0405dbff513a0ccaa2daf31153d5e27b142161cd7a97adc96a21f164a8a",
    "progress/CK-00-05.md": "fa9a08bc956c133dc6a2fba11c8fe38464c55db788a05e21a6662d395b45de7b"
  }
}
```

## Checks and inspected behavior

- `npm test`: passed, 3 files / 13 tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite emitted its known advisory for a minified chunk above 500 kB.
- Independent Python implementation of the sequential xoshiro128** reference transition, starting `[1,2,3,4]`: `[11520, 0, 5927040, 70819200, 2031721883, 1637235492]`.
- The submitted implementation returns `[11520, 5760, 5915520, 2972160, 3093661440, 509941403]`; its own test asserts this incorrect sequence. The stated FNV UTF-8 vectors and manual review of normalization, stream tuple separation, rejection sampling bounds, strict cursor restore, and JSON tuple stable IDs did not reveal other confirmed defects.
- Direct constructor reproduction with `new SeededRng([1, , 3, 4])` succeeds; `snapshot()` returns `{ algorithm: "xoshiro128**", state: [1, undefined, 3, 4] }`. This malformed instance produces invalid output and is relevant to the documented four-uint32 state contract.
- No browser check was run: this standalone deterministic core task has no browser integration point.

## Findings

### CK-00-05-R1-F01 — P1 — Incorrect xoshiro128** state transition

**Location:** `src/core/rng.ts:89-95`; incorrect asserted vector at `src/core/rng.test.ts:9-14`.

The xoshiro128** reference mutates words sequentially: `s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = rotl(s3,11)`. The code constructs parallel values and sets `b = s1 ^ s2`, omitting the already updated `s2` contribution (`^ s0`). Thus it is not the named/reference algorithm even though its self-authored vector passes. Reproduction from `[1,2,3,4]` gives the reference sequence above versus the submitted sequence in the checks section. Correct the transition to preserve the sequential dependencies and replace the test vector with the independently verified reference outputs. This affects every stream after its first output and therefore deterministic cursor continuations and derived gameplay values.

### CK-00-05-R1-F02 — P2 — Sparse direct state accepted as valid RNG state

**Location:** `src/core/rng.ts:139-145`.

`Array.prototype.some` skips holes, and `map` preserves them. The constructor accepts `[1, , 3, 4]` as four valid uint32s, then exposes `undefined` in its snapshot and will yield non-uint32 outputs. Reproduction: `new SeededRng([1, , 3, 4]).snapshot()` returns `[1, undefined, 3, 4]`. Validate all four indexed words as present numeric uint32 values (including sparse arrays) before copying. `restore` already rejects sparse cursor arrays via its key-count check; the defect is the public constructor path.

## Limits

No source, tests, config, docs, or handoff were modified. Only this assigned report was written. The baseline commit itself was not revalidated against GitHub; no browser test or gameplay behavior applies to this task.
