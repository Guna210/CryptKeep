# CK-02-04 review — round 2 repair verification

- **Task/round:** CK-02-04, round 2 verification
- **Reviewer/model/agent:** same independent reviewer, GPT-6 Luna, `/root/ck_02_04_reviewer_r2`
- **Fixer:** `/root/ck_02_04_builder`; repair handoff: `progress/CK-02-04.round-2-fix.md`.
- **Baseline:** `eaf442ed35e3ad53feefbd767aaaaca9a01e7d14`; submission is uncommitted.
- **Scope:** Re-read `REVIEW.md`, the CK-02-04 requirements and round-2 finding, prior round-1 report and verification, the round-2 repair handoff, all ten task-owned snapshot files, accepted CK-00-02/CK-00-06 handoffs and CK-00-06 review, and `docs/environment-start.md`. Inspected all pointer capture/look source and tests, harness and browser spec. `CONTEXT.md` has concurrent orchestrator edits and is excluded.
- **Ownership:** All implementation, tests, harness, configuration, SPEC and CONTEXT files remained read-only. This verification report is the only repository file written by this reviewer.

## Repaired snapshot identity

The exact ten-path manifest is `/tmp/cryptkeep-CK-02-04-repaired-r2.json`. Independently recomputed SHA-256 values matched the manifest at the start and end of verification:

```json
{
  "src/app/pointer-capture.ts": "7a681445afab0184ad3cd80d1188a9c03a0f64ea6281203cd9ede02beb774282",
  "src/app/pointer-capture.test.ts": "8c8ff9ca4f75979e198510d74e631cc25fc25f3e5f39dc9df2806a6c32d714f5",
  "src/player/look.ts": "6d2d487f28068c7a4810061acad390aa4830733a9d41075abd16a41f9f08f87e",
  "src/player/look.test.ts": "a2c492624469b618146ed8458188f623238f8cf352f3d8d3f7b5a46187fc8e4a",
  "tests/harness/pointer-capture.html": "5d276a85d701ed70b4a6b1d396c249a6f5eb0140e64f96e7891cc7b435ba0f0e",
  "tests/harness/pointer-capture.ts": "d2d109ae1af35da7009656fb711c00897d1d4a765559fe175dbcbc79f6dac2f3",
  "tests/e2e/pointer-capture.spec.ts": "a1aa281c2713a87a64ea4843e3e09e19aef21ceef669c3047acd6ac52c858c95",
  "progress/CK-02-04.md": "b01163ae68df3319b7fc049a05c6353e63f44fdab4b2e9b8d9e6b151c9842fc7",
  "progress/CK-02-04.round-1-fix.md": "4923e36640178ce0215843eb0524ab4dffb38d6aabbb95f54be54c5ca72ebc41",
  "progress/CK-02-04.round-2-fix.md": "208c05323cc422afbe570df6322c1f123538e2d71f0122c93e6c55deb74e50e3"
}
```

## Checks and evidence

- `npm test` — passed: 20 Vitest files / 107 tests, then Node tooling test passed.
- `npm run typecheck` — passed.
- `npm run build` — passed; Vite emitted its existing advisory for a minified chunk over 500 kB.
- `node --test tools/verify.test.mjs` — independently rerun and passed, 1 tooling test.
- `npm run test:e2e -- tests/e2e/pointer-capture.spec.ts` with the documented network-enabled sandbox grant — passed 2/2 in system Chromium. Native tests exercised trusted-click capture, relative movement, Escape cancellation, explicit recapture, blur, external unlock and disposal; the denial branch is deliberately simulated. No page or console errors were reported.
- `git diff --check -- reviews/CK-02-04/round-2-verification.md` — passed.
- Recomputed the ten manifest hashes after the checks; all still match. No temporary servers were left running.

## Finding outcomes

- **CK-02-04-R1-F01 — Resolved.** Request serialization means a canceled promise request remains the only outstanding native request. A later gesture while it is outstanding produces `waiting` and issues no native request; it is not queued. Tests exercise both late resolve and late reject, stale lock-change/error handling, no movement input while waiting, return to idle at settlement, and a new explicit gesture before request C. This prevents a stale promise settlement from corrupting a concurrently active request.
- **CK-02-04-R1-F02 — Resolved.** Disposal with an active pending legacy request retains only terminal guards. The late owned acquisition is released and removes guards; a late error removes guards without changing disposed state. Ordinary listeners are removed immediately.
- **CK-02-04-R1-F03 — Resolved.** Cancellation preserves the physical request record separately from logical input state. For both promise and legacy modes, an explicit gesture while canceled request A remains outstanding reports `waiting`, starts no native request, and is not auto-queued. Late A acquisition is released only when this surface owns the lock; a late error/rejection returns to idle. A fresh explicit gesture after terminal settlement can capture. Legacy cancel-then-dispose retains only minimal document guards through an unrelated lock change and removes them after A's late acquisition/error. After disposal, request and input are ignored, no observer transitions follow `disposed`, and an unrelated owner's lock is not released.

The serialization cases, including legacy `void` requests and their terminal events, use fake event targets and controlled promises; this environment has no native legacy pointer-lock implementation. The E2E verifies native promise-based Chromium behavior for the regular capture path, not native execution of the exceptional legacy lifecycle. Browser denial is simulated.

## Verdict

**PASS.** All three review findings are resolved on the exact current ten-file snapshot, the requested checks pass, and no additional confirmed in-scope defect was found. The documented legacy lifecycle and denial limits are simulated rather than native-browser evidence.
