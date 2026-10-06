# CK-00-05 — Round 1 repaired-snapshot verification

**Reviewer:** `/root/ck_00_05_reviewer_r1` (`gpt-6-luna`)
**Builder/fixer:** `/root/ck_00_05_builder`
**Baseline:** `02eaa26d16d6217c73908624603fccbbe94b0372`
**Verdict:** **PASS**

## Frozen repaired snapshot

Actual SHA-256 values matched every entry in the supplied six-file manifest:

```json
{
  "task": "CK-00-05",
  "round": 1,
  "baseline": "02eaa26d16d6217c73908624603fccbbe94b0372",
  "files": {
    "src/core/rng.ts": "2195e50afa7f5809c2f06beec276bee873948fb1661724ddd3ffe39b709fc06e",
    "src/core/rng.test.ts": "bb085ede758e1523126dd42a1a7ff7736809955e4cc26f2c3bf552a3058494d4",
    "src/core/ids.ts": "3c9ae9b514f6b87fc212f327437786c110ac79e25f47b4cde0b599e7ea890f9b",
    "src/core/ids.test.ts": "79f6d0405dbff513a0ccaa2daf31153d5e27b142161cd7a97adc96a21f164a8a",
    "progress/CK-00-05.md": "5af0fd320af93dc884c383f9ad65bda5f2cb4bba1482dd8473de1d7b364976a5",
    "progress/CK-00-05.round-1-fix.md": "856e0ddcdd4d9caae61a30d524b3034d93992d1960a237d27a998e8933a83c6f"
  }
}
```

## Findings

- **CK-00-05-R1-F01 — RESOLVED.** `nextUint32` now performs all reference transition updates sequentially, including both dependencies (`next1 ^= next2` after `next2 ^= next0`, and `next0 ^= next3` after `next3 ^= next1`). The test vector for initial `[1,2,3,4]` is `[11520, 0, 5927040, 70819200, 2031721883, 1637235492]`. I independently ran the sequential reference transition and obtained the same vector.
- **CK-00-05-R1-F02 — RESOLVED.** `validateState` checks each indexed word is an own property and a number/integer in uint32 range before copying, and rejects all-zero state. Tests cover sparse, undefined, NaN, fractional, out-of-range, and all-zero constructor inputs; restore rejects a sparse cursor state. This closes the reproduced undefined snapshot word.

## Regression and checks

- `npm test`: passed, 3 files / 13 tests, including the corrected independent vector and malformed constructor/restore cases.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite retained the advisory for a minified chunk above 500 kB.
- `git diff --check`: passed.
- Reviewed remaining contracts against the repaired source and tests: FNV-1a UTF-8 vectors; trimmed/NFC seed normalization and 64 code-point boundary; deterministic canonical JSON tuple stream derivation; named source/cosmetics isolation; bounded unbiased `nextInt`; detached cursor snapshots and strict algorithm/shape/state validation; stable IDs with normalized seed/domain, floors 1–100, nonnegative safe ordinals and delimiter-safe tuple encoding. No regression or additional in-scope defect found.
- Browser checks remain inapplicable to this standalone core task.

No source or test files were modified by the reviewer. Verification applies to the exact manifest snapshot above.
